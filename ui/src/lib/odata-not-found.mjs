// Temper by-key miss. The BRIEF.md route (and any other by-id-or-slug
// resolver) must treat this as HTTP 404, never as a 500 — a slug like
// `ui=gust` 404s at DesignLanguages('gust') before the slug fallback runs.

export function isODataNotFound(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return /\bOData 404\b/.test(msg);
}
