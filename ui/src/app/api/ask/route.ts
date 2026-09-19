import { NextResponse } from "next/server";
import { askLibrary } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { JevUnavailableError } from "@/lib/jev.mjs";
import { trackServerEvent } from "@/lib/server-telemetry";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import { callerOf, mayStart, TOO_MANY } from "@/lib/spend-guard";

export const dynamic = "force-dynamic";
// A cold catalog read (15s) plus two Jev calls with one retry each (about 12s
// apiece at worst) must still leave time to answer in JSON.
export const maxDuration = 60;

/**
 * GET /api/ask — describe a product in a sentence; get the design languages and
 * art styles that fit it, by judgment rather than keywords (see askLibrary in
 * lib/catalog.ts). Anonymous callers are matched against the visitor shelf,
 * signed-in callers against the full library — the same gate as /api/search.
 *
 *   ?q=<sentence>                 required, 8..400 characters
 *   ?kind=language|art_style      optional — omit for both
 *   ?k=<1..20>                    optional — how many results (default 8)
 *   ?stage=match                  optional — answer after the first model call: the match
 *                                 by style DNA, with `want` (how the sentence was read).
 *
 * POST the same fields as JSON, plus `want` from a stage=match answer, to get the
 * judged fit without paying for the reading twice. The page does exactly that, so
 * results are on screen after one call and settle after the second.
 */

// An answer costs two model calls, so the route spends them once: the same
// sentence (case, spacing and end punctuation aside) within ten minutes is
// answered from memory, a second request for a sentence already being answered
// waits for the first, and one address may only start so many new answers a
// minute. All of it is per server instance — a floor under abuse, not a wall.
const recent = new Map<string, { at: number; body: unknown }>();
const inFlight = new Map<string, Promise<Awaited<ReturnType<typeof askLibrary>>>>();
const RECENT_MS = 10 * 60_000;
const RECENT_MAX = 500;

const normalise = (q: string) => q.toLowerCase().replace(/\s+/g, " ").replace(/[\s.!?…]+$/u, "");

type Ask = { query: string; kind?: "language" | "art_style"; limit?: number; stage?: "match"; want?: Record<string, number> };

function parse(input: { q?: unknown; kind?: unknown; k?: unknown; stage?: unknown; want?: unknown }): Ask | { error: string } {
  const query = typeof input.q === "string" ? input.q.trim() : "";
  if (query.length < 8) return { error: "missing 'q' — describe the product in a sentence (at least 8 characters)" };
  if (input.kind != null && input.kind !== "" && input.kind !== "language" && input.kind !== "art_style") {
    return { error: `unknown kind '${String(input.kind)}' — use language or art_style, or omit for both` };
  }
  const kRaw = Number.parseInt(String(input.k ?? ""), 10);
  return {
    query,
    kind: input.kind === "language" || input.kind === "art_style" ? input.kind : undefined,
    limit: Number.isFinite(kRaw) ? Math.min(Math.max(kRaw, 1), 20) : undefined,
    stage: input.stage === "match" ? "match" : undefined,
    want: wholeReading(input.want),
  };
}

/** A reading is accepted only whole and in range; anything else is no reading, and the ask is an ordinary one. */
function wholeReading(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const given = value as Record<string, unknown>;
  const reading: Record<string, number> = {};
  for (const q of STYLE_DNA_QUESTIONS) {
    const n = given[q.id];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) return undefined;
    reading[q.id] = n;
  }
  return reading;
}

async function answer(request: Request, ask: Ask) {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  // An answer built from a caller's reading is stored under that reading: the
  // page's own second step is reused when the sentence is asked again, and a
  // forged reading can only ever answer someone who sends the same forgery.
  const reading = ask.want ? STYLE_DNA_QUESTIONS.map((q) => Math.round((ask.want?.[q.id] ?? 0) * 1000)).join(",") : "";
  const key = JSON.stringify([tier, ask.kind ?? "", ask.limit ?? "", ask.stage ?? "", normalise(ask.query), reading]);
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < RECENT_MS) {
    return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
  }

  const started = Date.now();
  try {
    let pending = inFlight.get(key);
    if (!pending) {
      // The fit stage of an answer already begun is the second half of one ask
      // and costs one model call, so it draws on its own allowance.
      if (!mayStart(ask.want ? "ask-fit" : "ask", callerOf(request), tier)) {
        return NextResponse.json(
          { error: TOO_MANY },
          { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
        );
      }
      const mine = askLibrary(tier, ask);
      pending = mine;
      inFlight.set(key, mine);
      void mine.finally(() => inFlight.delete(key)).catch(() => undefined);
    }
    const body = await pending;
    if (recent.size >= RECENT_MAX) recent.delete(recent.keys().next().value as string);
    recent.set(key, { at: Date.now(), body });
    if (!body.provisional) {
      trackServerEvent("ask_library", { tier, kind: ask.kind ?? "all", results: body.results.length, duration_ms: Date.now() - started, read_ms: body.timings_ms.read, want_ms: body.timings_ms.want, fit_ms: body.timings_ms.fit });
    }
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Every failure answers in JSON the page can show. Only a Jev fault is a
    // 503 "try again"; anything else is ours and is logged as such.
    const jev = err instanceof JevUnavailableError;
    trackServerEvent("ask_library_failed", { tier, reason: jev ? "jev" : "other" }, "error");
    return NextResponse.json(
      { error: jev ? "asking is temporarily unavailable — try again shortly" : "asking failed on our side — it has been logged" },
      { status: jev ? 503 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ask = parse(Object.fromEntries(url.searchParams));
  return "error" in ask ? NextResponse.json(ask, { status: 400 }) : answer(request, ask);
}

export async function POST(request: Request) {
  const ask = parse(((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>);
  return "error" in ask ? NextResponse.json(ask, { status: 400 }) : answer(request, ask);
}
