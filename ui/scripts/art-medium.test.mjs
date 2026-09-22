import test from "node:test";
import assert from "node:assert/strict";
import { mediumBucket, mediumMatches, normaliseMedium } from "../src/lib/art-medium.mjs";

// The spellings the full library actually holds (describe_library, 2026-09-23).
const STORED = ["watercolor", "watercolour", "Watercolour", "gouache", "oil paint", "ink wash", "Tenebrist plate",
  "print", "letterpress", "relief print", "etching", "engraving", "line engraving", "photogravure", "gouache screen-print", "screentone",
  "photography", "chronophotograph", "long-exposure photograph", "collage", "cut paper", "cut-paper collage", "cut-paper gouache",
  "illustration", "pen plot", "editorial diagram", "screentone drawing", "3d", "embroidered textile", "mixed"];

test("one spelling for the same medium", () => {
  assert.equal(normaliseMedium("Watercolour"), "watercolor");
  assert.equal(normaliseMedium("long-exposure  photograph"), "long exposure photograph");
});

test("a search for watercolor finds every watercolour, not just the one spelled the American way", () => {
  assert.deepEqual(STORED.filter((m) => mediumMatches(m, "watercolor")), ["watercolor", "watercolour", "Watercolour"]);
});

test("a broad medium finds everything in it", () => {
  assert.deepEqual(STORED.filter((m) => mediumMatches(m, "painting")), ["watercolor", "watercolour", "Watercolour", "gouache", "oil paint", "ink wash", "Tenebrist plate"]);
  assert.deepEqual(STORED.filter((m) => mediumMatches(m, "collage")), ["collage", "cut paper", "cut-paper collage", "cut-paper gouache"]);
  assert.deepEqual(STORED.filter((m) => mediumMatches(m, "photography")), ["photography", "chronophotograph", "long-exposure photograph"]);
  assert.ok(mediumMatches("gouache screen-print", "print") && !mediumMatches("gouache screen-print", "painting"), "a screen-print is a print, whatever it was printed in");
  assert.ok(mediumMatches("photogravure", "print") && !mediumMatches("photogravure", "photography"));
});

test("every stored spelling lands in one of the seven advertised mediums", () => {
  for (const m of STORED) assert.ok(["illustration", "photography", "print", "painting", "3d", "collage", "mixed"].includes(mediumBucket(m)), m);
  assert.equal(mediumBucket("embroidered textile"), "mixed");
});
