/** Truthy check for a featured flag (boolean, "true", or 1). */
export function isFeaturedFlag(v: unknown): boolean;

/** Catalog featured predicate: fields OR booleans, `featured`/`Featured`. */
export function isFeaturedRecord(row: {
  fields?: Record<string, unknown> | null;
  booleans?: Record<string, unknown> | null;
}): boolean;
