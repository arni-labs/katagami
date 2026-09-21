import { NextResponse } from "next/server";
import { searchDesigns } from "@/lib/catalog";
import { askJev, noul } from "@/lib/jev.mjs";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { callerOf, mayStart, TOO_MANY } from "@/lib/spend-guard";
import { INTENTS, INTENT_TEXT, type Intent } from "@/lib/genui/intent";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/lab/intent?q=<what was typed>
 *
 * Lab only. One Jev call reads the shape of the question — find, compare,
 * palette or wall — and, for a comparison, which library names appear in it.
 * When Jev cannot be asked the shape is `find` (the ordinary list) and `error`
 * says why.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 400);
  if (q.length < 3) return NextResponse.json({ error: "missing 'q'" }, { status: 400 });
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  if (!mayStart("lab-intent", callerOf(request), tier)) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const started = Date.now();
  // Names mentioned are found in code, not by the model: every visible
  // language whose name appears in the text, longest name first.
  const named: { id: string; name: string }[] = [];
  let cursor: number | null = 0;
  const lower = q.toLowerCase();
  while (cursor !== null) {
    const page = await searchDesigns("language", tier, { limit: 100, cursor });
    for (const r of page.results) {
      if (r.name.length >= 3 && lower.includes(r.name.toLowerCase()) && !named.some((n) => n.name.toLowerCase() === r.name.toLowerCase())) named.push({ id: r.id, name: r.name });
    }
    cursor = page.next_cursor;
  }
  named.sort((a, b) => b.name.length - a.name.length);
  const readMs = Date.now() - started;

  let intent: Intent = "find";
  let scores: Record<Intent, number> | null = null;
  let model: string | null = null;
  let error: string | undefined;
  const jevStarted = Date.now();
  try {
    const res = await askJev(`Typed into a design library's search box: ${q}`, Object.fromEntries(INTENTS.map((i) => [i, noul(INTENT_TEXT[i])])), { timeoutMs: 6_000, retries: 1 });
    model = res.model;
    scores = Object.fromEntries(INTENTS.map((i) => [i, Number(res.answers[i]?.noul ?? 0)])) as Record<Intent, number>;
    intent = INTENTS.reduce((best, i) => (scores![i] > scores![best] ? i : best), "find" as Intent);
    // A comparison needs two names on the page; with fewer it is an ordinary find.
    if (intent === "compare" && named.length < 2) intent = "find";
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return NextResponse.json(
    { q, tier, intent, scores, named: named.slice(0, 4), model, timings_ms: { read: readMs, jev: Date.now() - jevStarted }, ...(error ? { error } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
