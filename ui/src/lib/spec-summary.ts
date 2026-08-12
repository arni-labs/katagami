import { parseSpecField } from "@/lib/odata";

/**
 * One-line summaries for search hits.
 *
 * These live outside `search.ts` because that module is `server-only` and pulls
 * in the embedding model, so nothing there can be exercised from a plain node
 * test — which is exactly how the summary path shipped untested. The logic here
 * is pure and covered by scripts/spec-prose.test.mjs.
 */

/** `summary` rides along in every hit of every search response, so prose has to
 *  be clamped: a language whose philosophy is ten paragraphs would otherwise
 *  push its whole text into each of k results. */
export const MAX_SUMMARY_CHARS = 200;

/** First sentence (or first line) of free text, clamped and ellipsised. */
export function oneLine(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const stop = flat.search(/(?<=[.!?])\s/);
  const first = stop > 0 ? flat.slice(0, stop) : flat;
  if (first.length <= MAX_SUMMARY_CHARS) return first;
  const clipped = first.slice(0, MAX_SUMMARY_CHARS);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
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
    return oneLine(data.summary);
  }
  return prose ? oneLine(prose) : null;
}
