// BRIEF.md leftovers: a slug like ui=gust 404s at DesignLanguages('gust')
// (HTTP 404, never 500). Featured pal/art slugs must match membership the
// same way entity ids do — the gate used to be id-keyed only.
import assert from "node:assert/strict";
import { isODataNotFound } from "../src/lib/odata-not-found.mjs";
import { rowMatchesIdOrSlug } from "../src/lib/catalog-membership.mjs";

assert.equal(
  isODataNotFound(
    new Error(
      `OData 404: {"error":{"code":"ResourceNotFound","message":"Entity 'DesignLanguages' with key 'gust' not found"}}`,
    ),
  ),
  true,
  "Temper by-key miss for a slug is a not-found",
);
assert.equal(
  isODataNotFound(new Error("OData 500: backend exploded")),
  false,
  "a real Temper fault must not become a 404",
);
assert.equal(isODataNotFound(new Error("network down")), false);
assert.equal(isODataNotFound("OData 404: missing"), true);

console.log("ok: isODataNotFound maps by-key miss → 404, fault → not 404");

const featuredPal = {
  entity_id: "en-palette-1",
  fields: { slug: "komawari-plates" },
};
const featuredArt = {
  entity_id: "en-art-1",
  fields: { slug: "cathode-ray" },
};
const offShelfLang = {
  entity_id: "en-gust-1",
  fields: { slug: "gust" },
};

assert.equal(rowMatchesIdOrSlug(featuredPal, "en-palette-1"), true);
assert.equal(rowMatchesIdOrSlug(featuredPal, "komawari-plates"), true, "featured palette slug");
assert.equal(rowMatchesIdOrSlug(featuredArt, "cathode-ray"), true, "featured art slug");
assert.equal(rowMatchesIdOrSlug(featuredPal, "no-such-palette"), false, "miss palette slug");
assert.equal(rowMatchesIdOrSlug(featuredArt, "no-such-art"), false, "miss art slug");
assert.equal(rowMatchesIdOrSlug(offShelfLang, "gust"), true, "gust slug identifies the row");
assert.equal(rowMatchesIdOrSlug(offShelfLang, "komawari"), false);
assert.equal(rowMatchesIdOrSlug(null, "komawari-plates"), false);
assert.equal(rowMatchesIdOrSlug(featuredPal, ""), false);

console.log("ok: membership matches featured pal/art slugs; miss slugs do not");
