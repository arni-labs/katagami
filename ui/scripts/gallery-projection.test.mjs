import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  normalizeDesignLanguageRow,
} from "../src/lib/design-language-row.mjs";

// The gallery card fetch and the family facet project with $select (ARN-97
// comment retired — the kernel returns list fields under $select now, verified
// live). Under $select a row comes back FLATTENED (top-level fields, no
// `.fields`), so this locks (a) that odata.ts wires the family_id projection and
// the shape-agnostic reads, and (b) that the REAL normalizer — imported and run
// here, not reimplemented — recovers the entity id from a flat row and refuses
// an id-less one loudly.
const here = fileURLToPath(new URL(".", import.meta.url));
const src = fs.readFileSync(`${here}/../src/lib/odata.ts`, "utf8");

// (a) Source wiring — the live latency fix (family_id $select) is present, the
// gallery-families reader is shape-agnostic, and the dead languageTaxonomyMap +
// the stale ARN-97 claim are gone.
assert.match(src, /\$select=family_id/, "galleryFamilies must project family_id");
assert.match(
  src,
  /const f = \(row\.fields \?\? row\)/,
  "galleryFamilies must read family_id from both flat and nested shapes",
);
assert.doesNotMatch(
  src,
  /languageTaxonomyMap/,
  "the dead languageTaxonomyMap must be removed (zero callers)",
);
assert.doesNotMatch(
  src,
  /silently drops list\s*\n?\s*\* fields like `taxonomy_ids`/,
  "the stale ARN-97 'select drops list fields' claim must be gone",
);

// (b) Behavioral — execute the REAL normalizeDesignLanguageRow against captured
// FLAT $select fixtures. This is the exact code the gallery card path runs
// (listDesignLanguages(..., select) -> collectDesignLanguageRows -> map).

// A flat $select row: the id is NOT a top-level `entity_id`, it must be
// recovered from the OData control field `@odata.id`.
const flatByODataId = normalizeDesignLanguageRow({
  "@odata.id": "DesignLanguages('en-019f-print')",
  Status: "Published",
  name: "Broadsheet",
  family_id: "fam-print",
  featured: true,
  fork_count: 3,
});
assert.equal(
  flatByODataId.entity_id,
  "en-019f-print",
  "entity_id recovered from @odata.id on a flat row",
);
assert.equal(flatByODataId.status, "Published", "flat Status lifts to top-level status");
assert.equal(flatByODataId.fields.family_id, "fam-print", "native family_id lands in fields");
assert.equal(flatByODataId.fields.name, "Broadsheet", "other flat fields land in fields");
assert.equal(flatByODataId.booleans.featured, true, "flat boolean lifts into booleans");
assert.equal(flatByODataId.counters.fork_count, 3, "flat counter lifts into counters");

// A flat row that carries `Id` instead of @odata.id also recovers the id.
const flatById = normalizeDesignLanguageRow({ Id: "en-xyz", family_id: "fam-ink" });
assert.equal(flatById.entity_id, "en-xyz", "entity_id recovered from a flat Id field");
assert.equal(flatById.fields.Id, "en-xyz", "flat Id is preserved in fields");

// The already-nested shape passes through with its id intact.
const nested = normalizeDesignLanguageRow({
  entity_id: "en-nested",
  status: "Published",
  fields: { family_id: "fam-a" },
});
assert.equal(nested.entity_id, "en-nested", "nested rows keep their entity_id");
assert.equal(nested.fields.family_id, "fam-a", "nested family_id is read the same way");

// A flat row with NEITHER an Id field NOR a recoverable @odata.id has no usable
// identity. That is an observable error (a thrown exception), never a silent
// drop that would key a map on `undefined` or render a card with no link.
assert.throws(
  () => normalizeDesignLanguageRow({ family_id: "fam-orphan", name: "no id" }),
  /no Id and no recoverable @odata\.id/,
  "an id-less flat row must throw, not silently normalize",
);

console.log(
  "ok: family_id $select wired + the real normalizer recovers ids from flat rows and refuses id-less ones",
);
