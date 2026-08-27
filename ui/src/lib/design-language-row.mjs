// Pure OData row normalization for DesignLanguages. Authored as plain ESM (with
// a co-located .d.mts for the TS types) so it imports on ANY Node version — the
// gallery-projection contract test executes this exact code, not a copy, and
// the app (odata.ts) imports the same module. No `server-only`/Next imports, so
// pulling it in never drags in odata.ts's server surface.

// Booleans / counters that may arrive flattened on a $select response.
// Booleans we care about for gallery sort/filter:
const FLAT_BOOLEAN_KEYS = new Set([
  "featured",
  "shown_to_visitors",
  "embodiment_verified",
  "has_embodiment",
  "has_thumbnail",
  "thumbnail_verified",
  "has_design_md",
  "has_valid_design_md",
  "design_md_verified",
  "has_published_assets",
  "has_shadcn_export",
  "shadcn_export_verified",
  "has_shadcn_component_spec",
  "shadcn_component_spec_verified",
  "has_shadcn_preview_shots",
  "shadcn_preview_shots_verified",
  "quality_review_passed",
]);
// Counters used for sort/badge/usage:
const FLAT_COUNTER_KEYS = new Set([
  "display_order",
  "fork_count",
  "version",
  "element_count",
  "composition_count",
  "usage_count",
]);
// OData envelope keys (kept at top level when normalizing):
const ODATA_ENVELOPE_KEYS = new Set([
  "@odata.id",
  "@odata.context",
  "@odata.type",
  "entity_id",
  "entity_type",
  "status",
  "item_count",
  "fields",
  "booleans",
  "counters",
  "lists",
  "events",
  "sequence_nr",
  "total_event_count",
]);

export function parseODataEntityId(value) {
  if (typeof value !== "string") return undefined;
  const match = value.match(/DesignLanguages\('([^']+)'\)/);
  return match?.[1];
}

// When a query goes through Temper's catalog-fast-read path with $select,
// the row is returned FLAT — top-level Id/Status/name/tokens/... — instead
// of the nested {entity_id, status, fields:{...}, booleans:{...}, counters:{...}}
// shape the rest of this codebase reads. Normalize so callers see the
// nested shape regardless of how OData chose to project.
export function normalizeDesignLanguageRow(raw) {
  if (raw && typeof raw.fields === "object" && raw.fields !== null) {
    const fields = raw.fields;
    const booleans = { ...(raw.booleans ?? {}) };
    const counters = { ...(raw.counters ?? {}) };
    for (const [key, value] of Object.entries(fields)) {
      if (FLAT_BOOLEAN_KEYS.has(key) && typeof value === "boolean") {
        booleans[key] = value;
      }
      if (FLAT_COUNTER_KEYS.has(key) && typeof value === "number") {
        counters[key] = value;
      }
    }
    return { ...raw, booleans, counters };
  }
  const fields = {};
  const booleans = {};
  const counters = {};
  const top = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ODATA_ENVELOPE_KEYS.has(k)) {
      top[k] = v;
      continue;
    }
    if (k === "Id") {
      top.entity_id = v;
      fields.Id = v;
      continue;
    }
    if (k === "Status") {
      top.status = v;
      fields.Status = v;
      continue;
    }
    if (FLAT_BOOLEAN_KEYS.has(k) && typeof v === "boolean") {
      booleans[k] = v;
      continue;
    }
    if (FLAT_COUNTER_KEYS.has(k) && typeof v === "number") {
      counters[k] = v;
      continue;
    }
    fields[k] = v;
  }
  const canonicalId = parseODataEntityId(top["@odata.id"]);
  if (canonicalId) top.entity_id = canonicalId;
  // A flat row with neither an `Id` field nor a recoverable `@odata.id` has no
  // usable identity. Every real OData response carries `@odata.id`, so this is
  // an impossible-in-prod, broken-response case — surface it loudly instead of
  // returning an id-less row that a caller would silently key a map on
  // `undefined` (or render as a card with no link). Observable error, never a
  // silent drop.
  if (!top.entity_id) {
    throw new Error(
      "normalizeDesignLanguageRow: flat row has no Id and no recoverable @odata.id",
    );
  }
  return { ...top, fields, booleans, counters };
}
