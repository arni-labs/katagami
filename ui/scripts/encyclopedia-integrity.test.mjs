import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { breadthTell, checkCollection, creditOf, descendantsOf, placement, placementSummary, reconcileRead, RULES } from "../../scripts/encyclopedia-integrity.mjs";

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

// The verifier found that a wrong-typed field threw out of the checker, so one
// malformed cell aborted the sweep and the rest went unreported.
test("a field of the wrong type is a finding on that cell, and the sweep carries on", () => {
  for (const [field, value] of [["sources", null], ["manifestations", {}], ["broader", "no"], ["name", 7]]) {
    const broken = doc("Broken");
    broken[field] = value;
    const rows = [cell("broken", broken), cell("fine", doc("Fine"))];
    const { violations, context } = checkCollection(rows);
    assert.equal(violations.length, 1, field);
    assert.equal(violations[0].rule, "unparseable", field);
    assert.equal(violations[0].cell, "broken", field);
    assert.match(violations[0].detail, new RegExp(field), field);
    assert.equal(context.cells, 1, `${field}: the healthy cell is still checked`);
  }
});

test("a null or non-object entry inside a list is a finding, not a crash", () => {
  const rows = [cell("a", doc("A", { manifestations: [null], maps: [{ map: "art", explanation: "x", sourceIds: "s1" }] }))];
  const { violations } = checkCollection(rows);
  assert.ok(violations.every((violation) => violation.rule === "unparseable"));
  assert.ok(violations.length >= 2);
});

// The verifier found the null guard reached every list but the cycle walk, and
// that a malformed source was dropped in silence rather than reported. Neither
// occurs in production today, which is why they would have survived until they did.
test("a null inside broader is a finding, and the cycle walk does not throw on it", () => {
  const rows = [
    cell("a", doc("A", { broader: [null, { cellId: "b", explanation: "x", sourceIds: ["s1"] }] })),
    cell("b", doc("B", { broader: [{ cellId: "a", explanation: "x", sourceIds: ["s1"] }] })),
  ];
  const { violations } = checkCollection(rows);
  assert.ok(violations.some((violation) => violation.rule === "unparseable" && violation.cell === "a"));
  assert.equal(violations.filter((violation) => violation.rule === "broader-cycle").length, 2, "the cycle is still found around the null");
});

test("a malformed source is reported rather than quietly dropped", () => {
  const rows = [cell("a", doc("A", { sources: [null, { id: 7 }, { id: "s1", title: "t", url: "https://example.org/" }] }))];
  const { violations } = checkCollection(rows);
  const unparseable = violations.filter((violation) => violation.rule === "unparseable");
  assert.equal(unparseable.length, 2, "one for the null, one for the non-string id");
  assert.ok(violations.every((violation) => violation.rule !== "unresolved-source"), "the good source still resolves");
});

// Valid JSON that is not an object crashed the sweep before any field could be
// inspected, because the type checks all reached through `doc`.
test("a document that is valid JSON but not an object is a finding, not a crash", () => {
  for (const literal of ["null", "42", '"a string"', "[]", "true"]) {
    const rows = [cell("broken", literal), cell("fine", doc("Fine"))];
    const { violations, context } = checkCollection(rows);
    assert.equal(violations.length, 1, literal);
    assert.equal(violations[0].rule, "unparseable", literal);
    assert.match(violations[0].detail, /not an object/, literal);
    assert.equal(context.cells, 1, `${literal}: the healthy cell is still checked`);
  }
});

// A manifestation names an entity set and an id. Checking the id alone let a
// record that exists in a different set read as present.
test("a record id that exists in another set does not satisfy the reference", () => {
  const rows = [cell("a", doc("A", { manifestations: [manifestation("en-1", 'credits name "A"')] }))];
  const elsewhere = new Map([["WritingStyles:en-1", "Draft"]]);
  const { violations } = checkCollection(rows, elsewhere);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "dangling-manifestation");
  assert.match(violations[0].detail, /no ArtStyles record/);
  const here = new Map([["ArtStyles:en-1", "Draft"]]);
  assert.deepEqual(checkCollection(rows, here).violations, []);
});

// A claim compared across two runs is a claim about a moving collection. The
// count is taken both ways over one snapshot so count-neutrality is provable.
test("the archived tell is counted both ways over one snapshot", () => {
  const rows = [cell("a", doc("A", { manifestations: [manifestation("en-1", 'credits name "A"')] }))];
  const agreeing = new Map([["ArtStyles:en-1", "Archived"]]);
  const both = checkCollection(rows, agreeing).context;
  assert.equal(both.archivedManifestations, 1);
  assert.equal(both.archivedManifestationsByBareId, 1, "count-neutral, which is the property actually claimed");

  // The set-qualified answer is 0 and the bare answer is 1: the keying changed
  // what is counted, and the run has to be able to say so.
  const differing = new Map([["WritingStyles:en-1", "Archived"]]);
  const split = checkCollection(rows, differing).context;
  assert.equal(split.archivedManifestations, 0);
  assert.equal(split.archivedManifestationsByBareId, 1);
});

test("the archived tell keys on the set too, so it counts the right record", () => {
  const rows = [cell("a", doc("A", { manifestations: [manifestation("en-1", 'credits name "A"')] }))];
  const records = new Map([["ArtStyles:en-1", "Archived"], ["WritingStyles:en-1", "Published"]]);
  const { violations, context } = checkCollection(rows, records);
  assert.deepEqual(violations, []);
  assert.equal(context.archivedManifestations, 1);
});

test("a manifestation of an Archived record is counted as a tell, never a violation", () => {
  const rows = [cell("a", doc("A", { manifestations: [manifestation("en-old", 'credits name "A"')] }))];
  const records = new Map([["ArtStyles:en-old", "Archived"], ["ArtStyles:en-live", "Published"]]);
  const { violations, context } = checkCollection(rows, records);
  assert.deepEqual(violations, [], "an archived record is a legal manifestation target");
  assert.equal(context.archivedManifestations, 1);
});

test("the output states where the depth rule is active and how literal it is", () => {
  const rows = [
    cell("parent", doc("Parent", { manifestations: [manifestation("en-1", 'credits name "Parent"'), manifestation("en-2", 'credits name "something else"')] })),
    cell("leaf", doc("Leaf", { broader: [{ cellId: "parent", explanation: "x", sourceIds: ["s1"] }] })),
  ];
  const { context } = checkCollection(rows);
  assert.equal(context.depthRuleActiveOn, 1, "only the parent has anything below it");
  assert.equal(context.cells, 2);
  assert.equal(context.creditsNamingTheirOwnCell, 1, "one of the two credits literally names its own cell");
  assert.equal(context.creditsTotal, 2);
});

test("a Set of ids still works where a Map of statuses is not available", () => {
  const rows = [cell("a", doc("A", { manifestations: [manifestation("en-1", "x")] }))];
  assert.deepEqual(checkCollection(rows, new Set(["en-1"])).violations, []);
  assert.equal(checkCollection(rows, new Set(["en-2"])).violations[0].rule, "dangling-manifestation");
});

// The verifier stopped the paging early and the sweep still reported zero, with
// a broken cell unread on page two. A read that cannot account for every row
// must fail the run rather than report a clean result.
test("distinct entities, not row objects, are what reconcile a read", () => {
  // Four rows where one is a repeat is three entities, and the set counts four.
  assert.equal(reconcileRead("EncyclopediaCells", 3, 4).detail.includes("1 row(s) were never seen"), true);
  assert.equal(reconcileRead("EncyclopediaCells", 4, 4), null);
});

test("a read that saw every row reconciles, and one that did not is reported", () => {
  assert.equal(reconcileRead("EncyclopediaCells", 738, 738), null);
  const short = reconcileRead("EncyclopediaCells", 500, 738);
  assert.match(short.detail, /238 row\(s\) were never seen/);
  assert.equal(short.set, "EncyclopediaCells");
});

test("a server that counts fewer rows than it returns is reported as disagreeing with itself", () => {
  assert.match(reconcileRead("DesignLanguages", 1279, 1278).detail, /disagrees with itself/);
});

test("a missing count is a failure to check, not a pass", () => {
  for (const absent of [null, undefined, Number.NaN, "many"]) {
    assert.match(reconcileRead("ArtStyles", 512, absent).detail, /no @odata.count/);
  }
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


// ---- the placement pass: which records no cell holds
//
// Written from the two definitions the function states rather than from the
// collection as it stands today, because the collection is the thing being
// measured and a fixture copied from it can only agree with it.

// `parsed` as checkCollection builds it: live cells only, already JSON.
const parsedWith = (entries) => new Map(entries.map(([id, manifestations]) => [id, { manifestations }]));

test("a record no live cell names is unplaced, and one a cell names is placed", () => {
  const parsed = parsedWith([["chiaroscuro", [manifestation("held", "x")]]]);
  const records = new Map([["ArtStyles:held", "Draft"], ["ArtStyles:lonely", "Draft"]]);
  const { placed, unplaced } = placement(parsed, records);
  assert.deepEqual(placed.map((row) => row.entityId), ["held"]);
  assert.deepEqual(unplaced.map((row) => row.entityId), ["lonely"]);
});

test("an archived record is out of scope, so retiring one never grows the unplaced count", () => {
  const records = new Map([["ArtStyles:retired", "Archived"], ["ArtStyles:live", "Draft"]]);
  const before = placement(parsedWith([]), new Map([["ArtStyles:retired", "Draft"], ["ArtStyles:live", "Draft"]]));
  const after = placement(parsedWith([]), records);
  assert.equal(before.unplaced.length, 2);
  assert.equal(after.unplaced.length, 1, "archiving a record moved it out of scope rather than into the unplaced list");
});

test("an archived record a cell still names is reported on its own, not folded into either count", () => {
  const parsed = parsedWith([["cell", [manifestation("retired", "the record (Archived)")]]]);
  const { placed, unplaced, archivedButPlaced } = placement(parsed, new Map([["ArtStyles:retired", "Archived"]]));
  assert.deepEqual(placed, []);
  assert.deepEqual(unplaced, []);
  assert.deepEqual(archivedButPlaced.map((row) => row.entityId), ["retired"]);
});

test("a record is placed by a LIVE cell only, because a reader never reaches an unattested one", () => {
  // checkCollection drops unattested and non-Draft cells before `parsed`, so the
  // fixture is what it would hand over: the dead cell simply is not there.
  const records = new Map([["ArtStyles:orphan", "Draft"]]);
  assert.deepEqual(placement(parsedWith([]), records).unplaced.map((row) => row.entityId), ["orphan"]);
});

test("the same id in two sets is two records, so one being held does not place the other", () => {
  const parsed = parsedWith([["cell", [{ entitySet: "ArtStyles", entityId: "shared", explanation: "x", sourceIds: ["s1"] }]]]);
  const records = new Map([["ArtStyles:shared", "Draft"], ["WritingStyles:shared", "Draft"]]);
  const { placed, unplaced } = placement(parsed, records);
  assert.deepEqual(placed.map((row) => row.set), ["ArtStyles"]);
  assert.deepEqual(unplaced.map((row) => row.set), ["WritingStyles"]);
});

test("a record named by a cell but present in no set is reported as dangling, not as placed", () => {
  const parsed = parsedWith([["cell", [manifestation("ghost", "x")]]]);
  const { placed, unplaced, danglingIds } = placement(parsed, new Map([["ArtStyles:real", "Draft"]]));
  assert.deepEqual(placed, []);
  assert.deepEqual(unplaced.map((row) => row.entityId), ["real"]);
  assert.deepEqual(danglingIds, ["ArtStyles:ghost"]);
});

test("a record held by two cells is placed once and names both", () => {
  const parsed = parsedWith([["a", [manifestation("both", "x")]], ["b", [manifestation("both", "y")]]]);
  const { placed } = placement(parsed, new Map([["ArtStyles:both", "Draft"]]));
  assert.equal(placed.length, 1);
  assert.deepEqual(placed[0].cells, ["a", "b"]);
});

test("names are carried when supplied so the report can say which record is unplaced", () => {
  const names = new Map([["WritingStyles:w1", "Sherwood Anderson - Winesburg, Ohio (1919)"]]);
  const { unplaced } = placement(parsedWith([]), new Map([["WritingStyles:w1", "Draft"]]), names);
  assert.equal(unplaced[0].name, "Sherwood Anderson - Winesburg, Ohio (1919)");
});

test("no names supplied is not a crash and not a wrong name", () => {
  const { unplaced } = placement(parsedWith([]), new Map([["ArtStyles:a1", "Draft"]]));
  assert.equal(unplaced[0].name, null);
});

test("every entity set the schema allows is a set placement can report on", async () => {
  // The set list lived in two scripts as a copied array. A copied list rots: the
  // sweep would read three sets and report a clean placement count for a fourth
  // it never opened. This asserts the enum is the single source, by using it.
  const { MANIFESTATION_ENTITY_SETS } = await import("../src/lib/encyclopedia-schema.ts");
  assert.ok(MANIFESTATION_ENTITY_SETS.length >= 4);
  const records = new Map(MANIFESTATION_ENTITY_SETS.map((set) => [`${set}:x`, "Draft"]));
  const { unplaced } = placement(parsedWith([]), records);
  assert.deepEqual(new Set(unplaced.map((row) => row.set)), new Set(MANIFESTATION_ENTITY_SETS));
});

test("the summary the two output paths share reports per set, because one total describes no lane", () => {
  // The lanes are at completely different stages: on 2026-09-09 the writing lane
  // had one unplaced record and design languages had 784. A caller handed only
  // the combined 1287 cannot tell those apart, so both paths read `bySet`.
  const parsed = parsedWith([["cell", [{ entitySet: "WritingStyles", entityId: "w1", explanation: "x", sourceIds: ["s1"] }]]]);
  const records = new Map([
    ["WritingStyles:w1", "Draft"], ["WritingStyles:w2", "Draft"],
    ["DesignLanguages:d1", "Draft"], ["DesignLanguages:d2", "Draft"], ["DesignLanguages:d3", "Draft"],
  ]);
  const summary = placementSummary(placement(parsed, records));
  assert.deepEqual(summary.bySet, {
    DesignLanguages: { placed: 0, unplaced: 3 },
    WritingStyles: { placed: 1, unplaced: 1 },
  });
  assert.equal(summary.placed, 1);
  assert.equal(summary.unplaced, 4);
});

test("a set with no records at all does not appear as a lane with nothing in it", () => {
  const summary = placementSummary(placement(parsedWith([]), new Map([["ArtStyles:a", "Draft"]])));
  assert.deepEqual(Object.keys(summary.bySet), ["ArtStyles"]);
});
