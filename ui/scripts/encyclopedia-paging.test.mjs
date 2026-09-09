// How the encyclopedia walks an OData listing. A reader that stops early
// truncates the library without anything failing, which is the failure this
// covers: a hundred cells once went missing that way.
import assert from "node:assert/strict";
import test from "node:test";
import { checkPageCursor, MAX_PAGES, resolveNextLink } from "../src/lib/odata-paging.ts";

const BASE = "https://backend.example.com";
const FIRST = `${BASE}/tdata/EncyclopediaCells?$top=500`;

test("a nextLink relative to the request is resolved against the page just read", () => {
  // This is the shape the backend actually returns. Treated as absolute it is
  // not a URL at all, and the listing stops after one page.
  assert.equal(
    resolveNextLink("EncyclopediaCells?$skiptoken=abc", FIRST, BASE),
    `${BASE}/tdata/EncyclopediaCells?$skiptoken=abc`,
  );
});

test("a root-relative nextLink keeps the backend's origin", () => {
  assert.equal(resolveNextLink("/tdata/EncyclopediaCells?$skiptoken=x", FIRST, BASE), `${BASE}/tdata/EncyclopediaCells?$skiptoken=x`);
});

test("an absolute nextLink on the same origin is followed as given", () => {
  const link = `${BASE}/tdata/EncyclopediaCells?$skiptoken=x`;
  assert.equal(resolveNextLink(link, FIRST, BASE), link);
});

test("no nextLink is the end of the listing", () => {
  assert.equal(resolveNextLink(undefined, FIRST, BASE), null);
  assert.equal(resolveNextLink(null, FIRST, BASE), null);
});

test("a nextLink that is present but unusable is a fault, never a quiet end", () => {
  for (const bad of ["", 42, true, {}, []]) {
    assert.throws(() => resolveNextLink(bad, FIRST, BASE), /not a usable URL/, `${JSON.stringify(bad)} should be refused`);
  }
});

test("a nextLink pointing at another origin is refused", () => {
  // Following it would send the tenant's bearer token somewhere else.
  assert.throws(() => resolveNextLink("https://elsewhere.example/tdata/Cells", FIRST, BASE), /cross-origin/);
  assert.throws(() => resolveNextLink("//elsewhere.example/tdata/Cells", FIRST, BASE), /cross-origin/);
});

test("a listing that never ends is stopped", () => {
  assert.throws(() => checkPageCursor("x", new Set(), MAX_PAGES + 1, "Cells"), /exceeded 50 pages/);
});

test("a listing that sends the reader back where it has been is stopped", () => {
  assert.throws(() => checkPageCursor(FIRST, new Set([FIRST]), 2, "Cells"), /looped/);
});

test("an ordinary page is allowed through", () => {
  assert.doesNotThrow(() => checkPageCursor(FIRST, new Set(), 1, "Cells"));
});

test("paging walks to the end of a multi-page listing", () => {
  // The whole loop, driven the way the reader drives it.
  const pages = {
    [FIRST]: "EncyclopediaCells?$skiptoken=2",
    [`${BASE}/tdata/EncyclopediaCells?$skiptoken=2`]: "EncyclopediaCells?$skiptoken=3",
    [`${BASE}/tdata/EncyclopediaCells?$skiptoken=3`]: undefined,
  };
  const seen = new Set();
  let next = FIRST;
  let walked = 0;
  while (next) {
    checkPageCursor(next, seen, ++walked, "Cells");
    seen.add(next);
    next = resolveNextLink(pages[next], next, BASE);
  }
  assert.equal(walked, 3, "every page is read");
});
