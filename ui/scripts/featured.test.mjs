// Featured predicate + listFeatured / ⌘K contract (PR 253 leftovers 4–5).
// The MCP catalog is the source of truth: featured = fields OR booleans,
// and the featured set is uncapped (page, then follow nextLink).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isFeaturedFlag, isFeaturedRecord } from "../src/lib/featured.mjs";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

// --- Predicate (the catalog boolean) ----------------------------------------

assert.equal(isFeaturedFlag(true), true);
assert.equal(isFeaturedFlag("true"), true);
assert.equal(isFeaturedFlag(1), true);
assert.equal(isFeaturedFlag("1"), true);
assert.equal(isFeaturedFlag(false), false);
assert.equal(isFeaturedFlag("false"), false);
assert.equal(isFeaturedFlag(undefined), false);

assert.equal(
  isFeaturedRecord({ fields: { featured: true } }),
  true,
  "fields.featured",
);
assert.equal(
  isFeaturedRecord({ booleans: { featured: true } }),
  true,
  "booleans.featured — the leftover-5 case ⌘K used to miss",
);
assert.equal(
  isFeaturedRecord({ fields: { Featured: "true" } }),
  true,
  "fields.Featured string",
);
assert.equal(
  isFeaturedRecord({ booleans: { Featured: 1 } }),
  true,
  "booleans.Featured",
);
assert.equal(
  isFeaturedRecord({ fields: { featured: false }, booleans: { featured: true } }),
  true,
  "booleans win when fields is falsey",
);
assert.equal(
  isFeaturedRecord({ fields: { name: "Gust" }, counters: { featured: 1 } }),
  false,
  "counters.featured is not the catalog boolean",
);
assert.equal(isFeaturedRecord({ fields: {}, booleans: {} }), false);
assert.equal(isFeaturedRecord({}), false);

console.log("ok: isFeaturedRecord matches the catalog boolean (fields OR booleans)");

// --- Source lock ------------------------------------------------------------

const catalog = read("src/lib/catalog.ts");
const odata = read("src/lib/odata.ts");
const layout = read("src/app/(site)/layout.tsx");
const membership = read("src/lib/catalog-membership.mjs");

const required = [
  [
    "MCP catalog uses the shared isFeaturedRecord",
    catalog,
    /isFeaturedRecord as isFeatured/,
  ],
  [
    "⌘K sample index uses the shared isFeaturedRecord (not fields-only)",
    layout,
    /isFeaturedRecord/,
  ],
  [
    "⌘K no longer has a fields-only isSearchFeatured helper",
    layout,
    /^(?![\s\S]*isSearchFeatured)[\s\S]*$/,
  ],
  [
    "listFeatured pages at 500 (page size) via collectODataPages",
    odata,
    /collectFeaturedRows[\s\S]*collectODataPages[\s\S]*\$top=\$\{FEATURED_PAGE\}/,
  ],
  [
    "FEATURED_PAGE is 500 — same page size as catalog.readAll, not a set cap",
    odata,
    /const FEATURED_PAGE = 500/,
  ],
  [
    "listFeaturedDesignLanguages has no $top set-cap parameter",
    odata,
    /export async function listFeaturedDesignLanguages\(\): Promise/,
  ],
  [
    "listFeaturedArtStyles has no $top set-cap parameter",
    odata,
    /export async function listFeaturedArtStyles\(\): Promise/,
  ],
  [
    "listFeaturedPaletteSystems has no $top set-cap parameter",
    odata,
    /export async function listFeaturedPaletteSystems\(\): Promise/,
  ],
  [
    "listFeatured* do not clip with a 100-row default limit",
    odata,
    /^(?![\s\S]*limit = 100)[\s\S]*$/,
  ],
  [
    "listFeatured* filter with the catalog featured predicate",
    odata,
    /collectFeaturedRows\("ArtStyles"\)[\s\S]*\.filter\(isFeaturedRecord\)/,
  ],
  [
    "anonMaySee matches entity id OR slug (not featuredIds.has(id) only)",
    catalog,
    /rowMatchesIdOrSlug\(r, idOrSlug\)/,
  ],
  [
    "membership helper compares entity_id and fields.slug",
    membership,
    /row\.entity_id === idOrSlug/,
  ],
];

let failed = 0;
for (const [name, source, pattern] of required) {
  if (pattern.test(source)) {
    console.log(`ok: ${name}`);
  } else {
    console.error(`MISSING: ${name}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} featured contract check(s) failed.`);
  process.exit(1);
}
console.log("\nfeatured list + ⌘K contract holds.");
