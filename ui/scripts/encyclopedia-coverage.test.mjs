import assert from "node:assert/strict";
import test from "node:test";
import { loadSources, summarize, validateSource, danglingCellIds } from "../../scripts/encyclopedia-coverage.mjs";

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
  const cleanup = { ...base, use: "cleanup", terms: [{ ...term, decision: "archive", cellId: "old-cell" }] };
  assert.deepEqual(validateSource(cleanup, "example.json"), []);
  assert.ok(validateSource({ ...cleanup, terms: [{ ...term, decision: "archive" }] }, "example.json").some((error) => error.includes("cellId")));
  assert.ok(validateSource({ ...cleanup, terms: [{ ...term, decision: "declined" }] }, "example.json").length > 0);
});

test("a term is decided once, by name and by ref, and never more terms than the source holds", () => {
  assert.ok(validateSource({ ...base, terms: [term, { ...term, term: "gothic  fiction" }] }, "example.json").some((error) => error.includes("twice")));
  assert.ok(validateSource({ ...base, terms: [term, { ...term, term: "Gothic novels" }] }, "example.json").some((error) => error.includes("ref")));
  assert.ok(validateSource({ ...base, terms: [null] }, "example.json").some((error) => error.includes("must be an object")));
  assert.ok(validateSource(null, "example.json").length === 1);
  const many = Array.from({ length: 11 }, (_, index) => ({ ...term, term: `t${index}` }));
  assert.ok(validateSource({ ...base, terms: many }, "example.json").some((error) => error.includes("more terms")));
});

test("a row naming a cell minted from another vocabulary is tracked but is not one of the source's terms", () => {
  const minted = { ...term, decision: "live", cellId: "regulated-verse", namedFrom: "https://en.wikipedia.org/wiki/Regulated_verse" };
  assert.deepEqual(validateSource({ ...base, terms: [minted] }, "example.json"), []);
  assert.deepEqual(summarize({ ...base, terms: [term, minted] }), { decided: 1, counts: { cell: 1, minted: 1 }, coverage: 0.1 });
  assert.ok(validateSource({ ...base, terms: [{ ...minted, decision: "declined" }] }, "example.json").some((error) => error.includes("namedFrom")));
  assert.ok(validateSource({ ...base, terms: [{ ...minted, namedFrom: "" }] }, "example.json").some((error) => error.includes("namedFrom")));
});

test("coverage is decided over total, and null totals have no coverage", () => {
  assert.deepEqual(summarize({ ...base, terms: [term, { ...term, term: "Haiku", decision: "declined" }] }), {
    decided: 2,
    counts: { cell: 1, declined: 1 },
    coverage: 0.2,
  });
  assert.equal(summarize({ ...base, total: null }).coverage, null);
  assert.equal(summarize({ ...base, use: "backbone", total: 6198, terms: [{ ...term, decision: "live", cellId: "x" }] }).coverage, null);
});

test("a cellId naming a cell that exists is fine, and one naming nothing is not", () => {
  const sources = [{ source: "s", terms: [
    { term: "Diaries", cellId: "diaries" },
    { term: "Plainhand", cellId: "technical-reports" },
    { term: "Undecided" },
  ] }];
  const findings = danglingCellIds(sources, new Set(["diaries"]));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /Plainhand/);
  assert.match(findings[0], /technical-reports/);
  assert.match(findings[0], /does not exist/);
});

test("the rule takes an array as readily as a set, and reports nothing when all resolve", () => {
  const sources = [{ source: "s", terms: [{ term: "A", cellId: "a" }, { term: "B", cellId: "b" }] }];
  assert.deepEqual(danglingCellIds(sources, ["a", "b"]), []);
});

test("a blank cellId is left to the format validator rather than reported twice", () => {
  const sources = [{ source: "s", terms: [{ term: "A", cellId: "  " }] }];
  assert.deepEqual(danglingCellIds(sources, []), []);
});

test("findings name the ledger they came from, since a row is only findable there", () => {
  const sources = [{ source: "lcgft-literature", terms: [{ term: "Ghost", cellId: "nowhere" }] }];
  assert.match(danglingCellIds(sources, [])[0], /^lcgft-literature: /);
});
