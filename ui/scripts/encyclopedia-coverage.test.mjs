import assert from "node:assert/strict";
import test from "node:test";
import { loadSources, summarize, validateSource } from "../../scripts/encyclopedia-coverage.mjs";

const base = {
  source: "example",
  name: "Example source",
  url: "https://example.org/",
  licence: "CC0",
  use: "read-and-cite",
  total: 10,
  totalDerivedFrom: "counted by hand",
  lane: "writing",
  terms: [],
};
const term = { term: "Gothic fiction", ref: "https://id.loc.gov/authorities/genreForms/gf2014026339", decision: "cell", batch: "B6", note: "a practice with a body of work" };

test("the committed ledgers all validate and every source's file is named by its id", () => {
  const { sources, errors } = loadSources();
  assert.deepEqual(errors, []);
  assert.ok(sources.length >= 11);
  assert.ok(sources.every((source) => Array.isArray(source.terms)));
});

test("a decided term needs a ref, a batch and a one-line note", () => {
  assert.deepEqual(validateSource({ ...base, terms: [term] }, "example.json"), []);
  for (const missing of ["ref", "batch", "note", "term"]) {
    const broken = { ...term };
    delete broken[missing];
    assert.ok(validateSource({ ...base, terms: [broken] }, "example.json").length > 0, missing);
  }
});

test("merge and live rows must name the cell; cleanup ledgers use their own decision set", () => {
  assert.ok(validateSource({ ...base, terms: [{ ...term, decision: "merge" }] }, "example.json").some((error) => error.includes("cellId")));
  assert.deepEqual(validateSource({ ...base, terms: [{ ...term, decision: "live", cellId: "gothic-fiction" }] }, "example.json"), []);
  assert.ok(validateSource({ ...base, terms: [{ ...term, decision: "keep", cellId: "x" }] }, "example.json").length > 0);
  const cleanup = { ...base, use: "cleanup", terms: [{ ...term, decision: "archive" }] };
  assert.deepEqual(validateSource(cleanup, "example.json"), []);
  assert.ok(validateSource({ ...cleanup, terms: [{ ...term, decision: "declined" }] }, "example.json").length > 0);
});

test("a term is decided once, and never more terms than the source holds", () => {
  assert.ok(validateSource({ ...base, terms: [term, { ...term, term: "gothic fiction" }] }, "example.json").some((error) => error.includes("twice")));
  const many = Array.from({ length: 11 }, (_, index) => ({ ...term, term: `t${index}` }));
  assert.ok(validateSource({ ...base, terms: many }, "example.json").some((error) => error.includes("more terms")));
});

test("coverage is decided over total, and null totals have no coverage", () => {
  assert.deepEqual(summarize({ ...base, terms: [term, { ...term, term: "Haiku", decision: "declined" }] }), {
    decided: 2,
    counts: { cell: 1, declined: 1 },
    coverage: 0.2,
  });
  assert.equal(summarize({ ...base, total: null }).coverage, null);
});
