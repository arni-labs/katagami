import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { breadthTell, checkCollection, creditOf, descendantsOf, RULES } from "../../scripts/encyclopedia-integrity.mjs";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// A live attested Draft row, the shape the deployment returns.
function cell(id, document, { status = "Draft", validated = true, hash = null } = {}) {
  const text = typeof document === "string" ? document : JSON.stringify(document);
  return {
    entity_id: id,
    status,
    booleans: { document_validated: validated },
    fields: { document: text, document_hash: hash ?? sha256(text) },
  };
}

function doc(name, extra = {}) {
  return {
    version: 3,
    name,
    description: "",
    provenance: { basis: "cited" },
    maps: [{ map: "art", explanation: "why", sourceIds: ["s1"] }],
    broader: [],
    relations: [],
    questions: [],
    sources: [{ id: "s1", title: "A source", url: "https://example.org/" }],
    manifestations: [],
    studies: [],
    ...extra,
  };
}

const manifestation = (entityId, explanation) => ({ entitySet: "ArtStyles", entityId, explanation, sourceIds: ["s1"] });

test("a clean collection reports nothing", () => {
  const { violations, context } = checkCollection([cell("chiaroscuro", doc("Chiaroscuro"))]);
  assert.deepEqual(violations, []);
  assert.equal(context.cells, 1);
});

test("every rule the script reports has a description", () => {
  for (const rule of ["unattested", "unparseable", "dangling-cell-link", "dangling-manifestation",
    "unresolved-source", "broader-cycle", "misplaced-record", "duplicate-manifestation"]) {
    assert.ok(RULES[rule], rule);
  }
});

test("an unattested Draft is reported and not checked further", () => {
  const rows = [cell("a", doc("A"), { validated: false })];
  const { violations } = checkCollection(rows);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "unattested");
});

test("a document whose bytes do not match its recorded hash is unattested", () => {
  const rows = [cell("a", doc("A"), { hash: sha256("something else") })];
  assert.equal(checkCollection(rows).violations[0].rule, "unattested");
});

test("an archived cell is not checked at all", () => {
  const rows = [cell("a", doc("A"), { status: "Archived", validated: false })];
  assert.deepEqual(checkCollection(rows).violations, []);
});

test("a document that is not JSON, or is missing contract fields, is unparseable", () => {
  assert.equal(checkCollection([cell("a", "{ not json")]).violations[0].rule, "unparseable");
  const partial = doc("A");
  delete partial.manifestations;
  const { violations } = checkCollection([cell("a", partial)]);
  assert.equal(violations[0].rule, "unparseable");
  assert.match(violations[0].detail, /manifestations/);
});

test("a broader or relations link to a cell that is not a live attested Draft is dangling", () => {
  const rows = [
    cell("child", doc("Child", { broader: [{ cellId: "gone", explanation: "x", sourceIds: ["s1"] }] })),
    cell("other", doc("Other", { relations: [{ cellId: "archived", label: "influenced", explanation: "x", sourceIds: ["s1"] }] })),
    cell("archived", doc("Archived one"), { status: "Archived" }),
  ];
  const rules = checkCollection(rows).violations.map((violation) => violation.rule);
  assert.deepEqual(rules.filter((rule) => rule === "dangling-cell-link").length, 2);
});

test("a manifestation of a record that does not exist is dangling, and only when the record set is known", () => {
  const rows = [cell("a", doc("A", { manifestations: [manifestation("en-missing", 'credits name "A"')] }))];
  assert.deepEqual(checkCollection(rows).violations, []);
  const { violations } = checkCollection(rows, new Set(["en-other"]));
  assert.equal(violations[0].rule, "dangling-manifestation");
  assert.equal(violations[0].record, "en-missing");
});

test("a sourceId that is not in the cell's own sources is reported, on every field that carries one", () => {
  const rows = [cell("a", doc("A", {
    maps: [{ map: "art", explanation: "x", sourceIds: ["nope"] }],
    manifestations: [{ entitySet: "ArtStyles", entityId: "en-1", explanation: "x", sourceIds: ["also-nope"] }],
  }))];
  const { violations } = checkCollection(rows);
  assert.equal(violations.filter((violation) => violation.rule === "unresolved-source").length, 2);
});

test("the same record listed twice in one cell is reported once", () => {
  const rows = [cell("a", doc("A", {
    manifestations: [manifestation("en-1", 'credits name "A"'), manifestation("en-1", 'credits name "A"')],
  }))];
  const { violations } = checkCollection(rows);
  assert.equal(violations.filter((violation) => violation.rule === "duplicate-manifestation").length, 1);
});

test("a cycle through broader is reported, including a two-cell loop", () => {
  const rows = [
    cell("a", doc("A", { broader: [{ cellId: "b", explanation: "x", sourceIds: ["s1"] }] })),
    cell("b", doc("B", { broader: [{ cellId: "a", explanation: "x", sourceIds: ["s1"] }] })),
  ];
  const cycles = checkCollection(rows).violations.filter((violation) => violation.rule === "broader-cycle");
  assert.equal(cycles.length, 2);
});

test("a record whose credit names a cell below the one it sits on is misplaced", () => {
  const rows = [
    cell("intaglio-printmaking", doc("Intaglio printmaking", {
      manifestations: [manifestation("en-1", 'The record\'s credits name "Line engraving (intaglio)" (Published).')],
    })),
    cell("line-engraving", doc("Line engraving", { broader: [{ cellId: "intaglio-printmaking", explanation: "x", sourceIds: ["s1"] }] })),
  ];
  const { violations } = checkCollection(rows);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "misplaced-record");
  assert.equal(violations[0].cell, "intaglio-printmaking");
  assert.match(violations[0].detail, /Line engraving/);
});

test("the depth test reaches grandchildren, not only direct children", () => {
  const rows = [
    cell("root", doc("Root", { manifestations: [manifestation("en-1", 'credits name "Deep leaf"')] })),
    cell("middle", doc("Middle", { broader: [{ cellId: "root", explanation: "x", sourceIds: ["s1"] }] })),
    cell("deep-leaf", doc("Deep leaf", { broader: [{ cellId: "middle", explanation: "x", sourceIds: ["s1"] }] })),
  ];
  assert.equal(checkCollection(rows).violations[0].rule, "misplaced-record");
});

// The invariant as first proposed was "a record on a cell that has children is at
// the wrong depth". Over the live collection that flagged 103 records and none of
// them was real, so the check is narrower and the broad number is only context.
test("a record on a parent whose credit names the parent itself is NOT misplaced", () => {
  const rows = [
    cell("chiaroscuro", doc("Chiaroscuro", {
      manifestations: [manifestation("en-1", 'The record\'s credits name "Chiaroscuro still-life painting" (Published).')],
    })),
    cell("tenebrism", doc("Tenebrism", { broader: [{ cellId: "chiaroscuro", explanation: "x", sourceIds: ["s1"] }] })),
  ];
  const { violations, context } = checkCollection(rows);
  assert.deepEqual(violations, []);
  assert.equal(context.onAParent, 1, "the tell still counts it, as context rather than a defect");
});

// The breadth tell, reported and never enforced. These assert what it counts,
// not that the live collection is free of them.
test("the tell counts a record on a parent, and says which cells carry the most", () => {
  const rows = [
    cell("parent", doc("Parent", { manifestations: [manifestation("en-1", "x"), manifestation("en-2", "y")] })),
    cell("leaf", doc("Leaf", { broader: [{ cellId: "parent", explanation: "x", sourceIds: ["s1"] }] })),
  ];
  const { context } = checkCollection(rows);
  assert.equal(context.onAParent, 2);
  assert.deepEqual(context.onAParentByCell, [["parent", 2]]);
});

test("the tell counts a record held at differing breadth, and not one held at one depth", () => {
  const differing = [
    cell("parent", doc("Parent", { manifestations: [manifestation("en-1", "x")] })),
    cell("leaf", doc("Leaf", { broader: [{ cellId: "parent", explanation: "x", sourceIds: ["s1"] }], manifestations: [manifestation("en-1", "x")] })),
  ];
  assert.equal(checkCollection(differing).context.atTwoDepths, 1);
  const sameDepth = [
    cell("a", doc("A", { manifestations: [manifestation("en-1", "x")] })),
    cell("b", doc("B", { manifestations: [manifestation("en-1", "x")] })),
  ];
  const { context } = checkCollection(sameDepth);
  assert.equal(context.atTwoDepths, 0, "two childless homes are two claims at one depth");
  assert.equal(context.recordsOnSeveralCells, 1);
});

test("the tell is a pure function of the parsed cells and their children", () => {
  const parsed = new Map([["p", { name: "P", manifestations: [{ entityId: "en-1" }] }]]);
  const children = new Map([["p", ["c"]]]);
  const tell = breadthTell(parsed, children);
  assert.equal(tell.onAParent, 1);
  assert.equal(tell.cells, 1);
  assert.equal(tell.manifestations, 1);
});

test("a record on two childless cells is two claims, not a violation", () => {
  const rows = [
    cell("field-notes", doc("Field notes", { manifestations: [manifestation("en-1", 'credits name "the field-journal tradition"')] })),
    cell("nature-writing", doc("Nature writing", { manifestations: [manifestation("en-1", 'credits name "the field-journal tradition"')] })),
  ];
  const { violations, context } = checkCollection(rows);
  assert.deepEqual(violations, []);
  assert.equal(context.recordsOnSeveralCells, 1);
});

test("creditOf takes the quoted credit, and falls back to the whole sentence", () => {
  assert.equal(creditOf('The record\'s credits name "Ligne claire" (Draft).'), "Ligne claire");
  assert.equal(creditOf("no quotes here"), "no quotes here");
  assert.equal(creditOf(undefined), "");
});

test("descendantsOf walks the whole subtree and tolerates a cycle", () => {
  const children = new Map([["a", ["b"]], ["b", ["c"]], ["c", ["a"]]]);
  assert.deepEqual([...descendantsOf("a", children)].sort(), ["a", "b", "c"]);
});
