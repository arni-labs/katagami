import { NextResponse } from "next/server";
import { askConcepts, askLibrary } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { JevUnavailableError, askJev, noul } from "@/lib/jev.mjs";
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
 *   ?q=<sentence>                 required, 2..400 characters: a word will do
 *   ?kind=language|art_style      optional — omit for both
 *   ?k=<1..20>                    optional — how many results (default 8)
 *   ?stage=concepts               optional — the encyclopedia's directions for the sentence,
 *                                 split into those with made work and those with none.
 *   ?stage=match                  optional — answer after the first model call: the match
 *                                 by style DNA, with `want` (how the sentence was read).
 *
 * POST the same fields as JSON, plus `want` from a stage=match answer, to get the
 * judged fit without paying for the reading twice. The page does exactly that, so
 * results are on screen after one call and settle after the second.
 *
 * To refine an answer instead of asking again, POST `want` with `refine` — a change
 * such as "quieter, warmer". The reading is moved, not re-read, and comes back as
 * `want` with `moved` (which traits went where) and `changes` (every change so far);
 * hand `changes` back with the next call so the fit is judged with them in mind.
 * A refinement belongs to ONE call: send it with stage=match, then ask for the fit
 * with the moved `want` and `changes` and no `refine`, or it is applied twice.
 * `like` (a style's id or slug) starts from that style's own reading instead of the
 * sentence's, and leaves the style out of its own results.
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

type Ask = { query: string; kind?: "language" | "art_style"; limit?: number; stage?: "match"; want?: Record<string, number>; refine?: string; changes?: string; like?: string };

function parse(input: { q?: unknown; kind?: unknown; k?: unknown; stage?: unknown; want?: unknown; refine?: unknown; changes?: unknown; like?: unknown }): Ask | { error: string } {
  const query = typeof input.q === "string" ? input.q.trim() : "";
  if (query.length < 2) return { error: "missing 'q' — a word or a sentence about what you are making" };
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
    refine: shortText(input.refine),
    changes: shortText(input.changes),
    like: shortText(input.like)?.slice(0, 120),
  };
}

const shortText = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : undefined);

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
  const key = JSON.stringify([tier, ask.kind ?? "", ask.limit ?? "", ask.stage ?? "", normalise(ask.query), reading, normalise(ask.refine ?? ""), normalise(ask.changes ?? ""), ask.like ?? ""]);
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
      if (!mayStart(ask.want && !ask.refine ? "ask-fit" : "ask", callerOf(request), tier)) {
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

// The encyclopedia's answer to the same sentence. Cells are not tiered — there is
// no shelf of them — so one stored answer serves every caller.
const recentConcepts = new Map<string, { at: number; body: unknown }>();
const conceptsInFlight = new Map<string, ReturnType<typeof askConcepts>>();

async function concepts(request: Request, query: string) {
  const key = normalise(query);
  const hit = recentConcepts.get(key);
  if (hit && Date.now() - hit.at < RECENT_MS) return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  try {
    // The fan-out is ten model calls: a second request for a sentence already
    // being answered waits for the first instead of starting its own.
    let pending = conceptsInFlight.get(key);
    if (!pending) {
      if (!mayStart("ask-concepts", callerOf(request), tier)) {
        return NextResponse.json({ error: TOO_MANY }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
      }
      const mine = askConcepts(query);
      pending = mine;
      conceptsInFlight.set(key, mine);
      void mine.finally(() => conceptsInFlight.delete(key)).catch(() => undefined);
    }
    const body = await pending;
    if (recentConcepts.size >= RECENT_MAX) recentConcepts.delete(recentConcepts.keys().next().value as string);
    recentConcepts.set(key, { at: Date.now(), body });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const jev = err instanceof JevUnavailableError;
    trackServerEvent("ask_library_failed", { tier, reason: jev ? "jev" : "other" }, "error");
    return NextResponse.json({ error: "the encyclopedia could not be asked just now" }, { status: jev ? 503 : 500, headers: { "Cache-Control": "no-store" } });
  }
}

// ---- ?stage=words: what each word of the sentence is doing ---------------------
// For setting the asker's own words back to them with the telling ones marked. One Jev call, a noul per word per
// role: does this word say what is being made, who it is for, or how it should look and feel? A word that does
// none of those (the grammar between them) is left plain. Cached like the rest; a failure is an empty answer,
// because an unmarked sentence is still a sentence.
const ROLES = [
  ["what", "is part of the name of the thing being made (the product, document or object itself)"],
  ["who", "is part of the description of who or where it is for: its audience, customer, place, organisation or community"],
  ["feel", "describes how it should look or feel: a mood, quality, style, colour, material or era"],
] as const;
// Jev reads a phrase as a whole, so the grammar inside one scores with it ("for a small island": all "who").
// These never carry a mark themselves; the page joins marked neighbours into one stroke.
const GLUE = new Set("a an the and or but for of to in on at by with from that which who is are be it its this these those feels feel looks look like as so very really kind sort".split(" "));
const recentWords = new Map<string, { at: number; body: { words: { text: string; role: string | null }[] } }>();
async function words(request: Request, query: string) {
  const key = normalise(query), hit = recentWords.get(key);
  if (hit && Date.now() - hit.at < RECENT_MS) return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
  const parts = query.split(/\s+/).filter(Boolean).slice(0, 40);
  const plain = { words: parts.map((text) => ({ text, role: null as string | null })) };
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  if (!mayStart("ask-words", callerOf(request), tier)) return NextResponse.json(plain, { headers: { "Cache-Control": "no-store" } });
  try {
    const questions = Object.fromEntries(parts.flatMap((text, i) => ROLES.map(([role, says]) => [`w${i}_${role}`, noul(`The word "${text.replace(/["\\]/g, "")}" (word ${i + 1} of the sentence) ${says}.`)])));
    const { answers } = await askJev(`A request to a design library.\nThe sentence: ${query}`, questions, { timeoutMs: 8000, retries: 1 });
    const body = { words: parts.map((text, i) => {
      // The strongest role, if it is strong at all; little words ("a", "for", "that") score low on every one.
      const best = ROLES.map(([role]) => ({ role, n: Number((answers[`w${i}_${role}`] as { noul?: number } | undefined)?.noul ?? 0) })).sort((a, b) => b.n - a.n)[0];
      return { text, role: best.n >= 0.55 && !GLUE.has(text.toLowerCase().replace(/[^a-z]/g, "")) ? best.role : null };
    }) };
    recentWords.set(key, { at: Date.now(), body });
    if (recentWords.size > 400) recentWords.delete(recentWords.keys().next().value as string);
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(plain, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("stage") === "words") {
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 400);
    return q.length < 2 ? NextResponse.json({ error: "missing 'q'" }, { status: 400 }) : words(request, q);
  }
  if (url.searchParams.get("stage") === "concepts") {
    const q = (url.searchParams.get("q") ?? "").trim();
    return q.length < 2 ? NextResponse.json({ error: "missing 'q'" }, { status: 400 }) : concepts(request, q);
  }
  const ask = parse(Object.fromEntries(url.searchParams));
  return "error" in ask ? NextResponse.json(ask, { status: 400 }) : answer(request, ask);
}

export async function POST(request: Request) {
  const ask = parse(((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>);
  return "error" in ask ? NextResponse.json(ask, { status: 400 }) : answer(request, ask);
}
