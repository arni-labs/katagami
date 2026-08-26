// BRIEF.md leftover: a slug like ui=gust 404s at DesignLanguages('gust').
// That miss is HTTP 404, never a 500. The predicate is the same function
// the resolver uses — not a copy.
import assert from "node:assert/strict";
import { isODataNotFound } from "../src/lib/odata-not-found.mjs";

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
