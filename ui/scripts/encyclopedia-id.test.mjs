import assert from "node:assert/strict";
import test from "node:test";
import { identifierFor } from "../../scripts/encyclopedia-id.mjs";

test("identifiers drop diacritics and modifier letters instead of turning them into dashes", () => {
  assert.equal(identifierFor("Muwashshaḥāt"), "muwashshahat");
  assert.equal(identifierFor("Muʻāraḍāt"), "muaradat");
  assert.equal(identifierFor("Kāfī (Poetry)"), "kafi-poetry");
  assert.equal(identifierFor("Lü shi"), "lu-shi");
  assert.equal(identifierFor("Ship's log"), "ships-log");
});

test("identifiers of plain names are unchanged", () => {
  assert.equal(identifierFor("Cut-ups (Literature)"), "cut-ups-literature");
  assert.equal(identifierFor("Impressionism"), "impressionism");
  assert.equal(identifierFor("Stream of consciousness fiction"), "stream-of-consciousness-fiction");
  assert.throws(() => identifierFor("漢詩"));
});
