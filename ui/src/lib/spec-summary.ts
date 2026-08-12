import { parseSpecField } from "@/lib/odata";

/**
 * One-line summaries for search hits.
 *
 * These live outside `search.ts` because that module is `server-only` and pulls
 * in the embedding model, so nothing there can be exercised from a plain node
 * test — which is exactly how the summary path shipped untested. The logic here
 * is pure and covered by scripts/spec-prose.test.mjs.
 */

/** Prose rides along in every hit of every search response, so it has to be
 *  clamped: a philosophy of ten paragraphs would otherwise push its whole text
 *  into each of k results, where master fell back to a short tag join.
 *
 *  This bounds the PROSE fallback only. Authored `summary` strings pass through
 *  untouched — published ones already run 225–584 chars, and clamping them here
 *  would quietly rewrite the API output of every language in the library, which
 *  is a product decision, not a bug fix. */
export const MAX_SUMMARY_CHARS = 320;

/** First sentence (or first line) of free text, clamped and ellipsised.
 *
 *  The result is never longer than MAX_SUMMARY_CHARS — the ellipsis is counted,
 *  not added on top. Slicing walks code POINTS, not UTF-16 units, so a cut can
 *  never land inside a surrogate pair and emit a lone half (any emoji, or a
 *  CJK/astral character, would otherwise render as a replacement glyph). */
export function oneLine(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return null;

  // Sentence end: terminal punctuation, optionally closed by a quote or
  // bracket, then whitespace — so `"Hi!" Then louder.` ends at the quote.
  // CJK stops (。！？) terminate a sentence on their own; they are not
  // followed by a space, so requiring whitespace would swallow a whole
  // paragraph of Japanese or Chinese prose as "the first sentence".
  const cjk = flat.search(/[。！？]/);
  const ascii = flat.search(/[.!?]["'”’)\]]*\s/);
  let first = flat;
  if (cjk >= 0 && (ascii < 0 || cjk < ascii)) {
    first = flat.slice(0, cjk + 1);
  } else if (ascii > 0) {
    const space = flat.indexOf(" ", ascii);
    first = (space > 0 ? flat.slice(0, space) : flat).trimEnd();
  }

  const points = Array.from(first);
  if (points.length <= MAX_SUMMARY_CHARS) return first;

  const budget = MAX_SUMMARY_CHARS - 1; // the ellipsis occupies one
  const clipped = points.slice(0, budget).join("");
  const lastSpace = clipped.lastIndexOf(" ");
  const atBoundary = lastSpace > budget / 2 ? clipped.slice(0, lastSpace) : clipped;
  return `${atBoundary.trimEnd()}…`;
}

/** The `summary` of a spec field, only when it is really a string.
 *
 *  `parseSpecField<T>` casts to `T` without validating it — these fields are
 *  contributor-authored, so a language storing `{"summary": 42}` would reach
 *  `.trim()` on a number and throw, taking down /api/search for that query
 *  rather than degrading to the next fallback. */
export function specSummary(raw: unknown): string | null {
  const { data, prose } = parseSpecField<{ summary?: unknown }>(raw);
  if (typeof data?.summary === "string") {
    // Unchanged from master: an authored summary is already the one-liner.
    return data.summary.trim() || null;
  }
  return prose ? oneLine(prose) : null;
}
