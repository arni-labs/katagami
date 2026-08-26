// The ONE featured predicate (ARN-360 / ARN-385). MCP catalog, the visitor
// shelf, artifact gate membership, and the ⌘K sample index must agree: a
// design is featured if `featured`/`Featured` is truthy on fields OR on
// booleans. Temper stores the pin in the boolean bag; a fields-only check
// hides a featured language from ⌘K while MCP still lists it.
//
// Plain ESM so the contract test imports this exact function, not a copy.

export function isFeaturedFlag(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

export function isFeaturedRecord(row) {
  const f = row?.fields ?? {};
  const b = row?.booleans ?? {};
  return (
    isFeaturedFlag(f.featured) ||
    isFeaturedFlag(f.Featured) ||
    isFeaturedFlag(b.featured) ||
    isFeaturedFlag(b.Featured)
  );
}
