/** Truthy check for a featured flag (boolean, "true", or 1). */
export function isFeaturedFlag(v: unknown): boolean;

/** Highlight predicate: fields OR booleans, `featured`/`Featured`. */
export function isFeaturedRecord(row: {
  fields?: Record<string, unknown> | null;
  booleans?: Record<string, unknown> | null;
}): boolean;

/** Visitor-visibility predicate: fields OR booleans,
 *  `shown_to_visitors`/`Shown_to_visitors` — the anonymous allowlist. */
export function isShownToVisitorsRecord(row: {
  fields?: Record<string, unknown> | null;
  booleans?: Record<string, unknown> | null;
}): boolean;
