import { NextResponse } from "next/server";
import { askLibrary } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { JevUnavailableError } from "@/lib/jev.mjs";
import { trackServerEvent } from "@/lib/server-telemetry";
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 8) {
    return NextResponse.json(
      { error: "missing 'q' — describe the product in a sentence (at least 8 characters)" },
      { status: 400 },
    );
  }
  const kindParam = url.searchParams.get("kind");
  if (kindParam && kindParam !== "language" && kindParam !== "art_style") {
    return NextResponse.json(
      { error: `unknown kind '${kindParam}' — use language or art_style, or omit for both` },
      { status: 400 },
    );
  }
  const kind = kindParam === "language" || kindParam === "art_style" ? kindParam : undefined;
  const kRaw = Number.parseInt(url.searchParams.get("k") ?? "", 10);
  const limit = Number.isFinite(kRaw) ? Math.min(Math.max(kRaw, 1), 20) : undefined;

  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const key = JSON.stringify([tier, kind ?? "", limit ?? "", normalise(query)]);
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < RECENT_MS) {
    return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
  }

  const started = Date.now();
  try {
    let pending = inFlight.get(key);
    if (!pending) {
      if (!mayStart("ask", callerOf(request), tier)) {
        return NextResponse.json(
          { error: TOO_MANY },
          { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
        );
      }
      pending = askLibrary(tier, { query, kind, limit }).finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
    }
    const body = await pending;
    if (recent.size >= RECENT_MAX) recent.delete(recent.keys().next().value as string);
    recent.set(key, { at: Date.now(), body });
    trackServerEvent("ask_library", { tier, kind: kind ?? "all", results: body.results.length, duration_ms: Date.now() - started });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Every failure answers in JSON the page can show. Only a Jev fault is a
    // 503 "try again"; anything else is ours and is logged as such.
    const jev = err instanceof JevUnavailableError;
    trackServerEvent("ask_library_failed", { tier, reason: jev ? "jev" : "other", message: String(err).slice(0, 200) }, "error");
    return NextResponse.json(
      { error: jev ? "asking is temporarily unavailable — try again shortly" : "asking failed on our side — it has been logged" },
      { status: jev ? 503 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
