// A write announced to /api/revalidate has to reach the held library, or a
// curator who just wrote a cell is served the previous one for up to a minute
// — the stale-content complaint the endpoint exists to answer.
//
// Two things are checked here: which paths count as reading the encyclopedia,
// and that the route still does both halves of the drop. The second half is
// not decoration. Measured on a running build: a route handler and a page
// render do not share module state, so calling `forget()` from the handler
// dropped nothing; and revalidating the tag alone dropped nothing either,
// because the cached epoch belongs to the render that read it. Only tag plus
// `revalidatePath("/encyclopedia")` re-read the library, on every path.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ENCYCLOPEDIA_ROUTES, readsTheEncyclopedia } from "../src/lib/encyclopedia-paths.ts";

test("every page that renders cells is on the list", () => {
  for (const route of ["/encyclopedia", "/writing", "/voice"]) {
    assert.ok(ENCYCLOPEDIA_ROUTES.includes(route), `${route} renders cells and must invalidate the held library`);
  }
});

test("a path under one of them counts", () => {
  assert.ok(readsTheEncyclopedia("/writing/some-style"));
  assert.ok(readsTheEncyclopedia("/voice/anything"));
  assert.ok(readsTheEncyclopedia("/encyclopedia"));
});

test("a path that merely starts with the same letters does not", () => {
  // "/writings" is a different route, and dropping the library for it would be
  // a needless re-read of the whole collection.
  assert.equal(readsTheEncyclopedia("/writings"), false);
  assert.equal(readsTheEncyclopedia("/voiceover"), false);
  assert.equal(readsTheEncyclopedia("/palettes"), false);
  assert.equal(readsTheEncyclopedia("/"), false);
});

test("the route drops the held library both ways, not one", () => {
  const source = readFileSync(new URL("../src/app/api/revalidate/route.ts", import.meta.url), "utf8");
  assert.match(source, /revalidateTag\(ENCYCLOPEDIA_TAG/, "the tag the held read watches");
  assert.match(source, /revalidatePath\("\/encyclopedia"\)/, "and the path the cached epoch is scoped to");
  // Calling forget() from here is the thing that looked right and did nothing.
  assert.doesNotMatch(source, /forgetEncyclopedia\(/, "a handler cannot drop what a page render holds");
});
