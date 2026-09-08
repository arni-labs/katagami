import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHash } from "node:crypto";
import { cellDocumentSchema } from "../src/lib/encyclopedia-schema.ts";
import { buildCellGraph, mapEntryPoints, descendantIds } from "../src/lib/encyclopedia-graph.ts";
import { parsePublishedCell, visibleCells } from "../src/lib/encyclopedia-public.ts";

const fixture = JSON.parse(readFileSync(new URL("../../katagami-commons/fixtures/encyclopedia-cell.json", import.meta.url), "utf8"));
const invalidCases = JSON.parse(readFileSync(new URL("../../katagami-commons/fixtures/encyclopedia-invalid.json", import.meta.url), "utf8"));

test("a cell separates typed manifestations from direct studies", () => {
  const cell = cellDocumentSchema.parse(fixture);
  assert.deepEqual(cell.manifestations.map((entry) => entry.entitySet), ["ArtStyles", "DesignLanguages"]);
  assert.equal(cell.studies.length, 1);
  assert.equal(cell.studies[0].representations.length, 2);
  assert.equal(cell.studies[0].representations[0].colors.length, 6);
  assert.deepEqual(cell.maps, ["art", "palettes"]);
});

test("broad cells need not have examples or be leaves", () => {
  const cell = cellDocumentSchema.parse({ ...fixture, manifestations: [], studies: [] });
  assert.equal(cell.broader.length, 1);
});

test("an approved name and scope can exist before research and examples", () => {
  const cell = cellDocumentSchema.parse({
    ...fixture, broader: [], relations: [], sources: [], manifestations: [], studies: [], questions: [],
  });
  assert.equal(cell.sources.length, 0);
  assert.equal(cell.studies.length, 0);
  assert.equal(cell.manifestations.length, 0);
});

test("a name-only cell can have an empty description", () => {
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, description: "" }).success, true);
});

test("text limits count Unicode code points", () => {
  const description = "\u{10348}".repeat(100_000);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, description }).success, true);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, description: `${description}x` }).success, false);
});

test("serialized document limits count UTF-8 bytes", () => {
  const document = JSON.stringify({ ...fixture, questions: Array(7).fill("\u6f22".repeat(100_000)) });
  assert.ok(document.length < 2_000_000);
  assert.ok(Buffer.byteLength(document, "utf8") > 2_000_000);
  const hash = createHash("sha256").update(document).digest("hex");
  assert.throws(() => parsePublishedCell({
    entity_id: "test", status: "Published", booleans: { document_validated: true, review_approved: true },
    fields: { document, document_hash: hash, review_document_hash: hash },
  }));
});

for (const change of invalidCases) {
  test(`rejects ${change.name}`, () => {
    const input = structuredClone(fixture);
    const parent = change.path.slice(0, -1).reduce((value, key) => value[key], input);
    const key = change.path.at(-1);
    if (change.remove) delete parent[key];
    else parent[key] = change.value;
    assert.equal(cellDocumentSchema.safeParse(input).success, false);
  });
}

function cell(id, broader = [], relations = []) {
  return {
    id,
    document: cellDocumentSchema.parse({
      ...fixture,
      name: id,
      broader: broader.map((cellId) => ({ cellId, explanation: "Test containment", sourceIds: ["fixture"] })),
      relations: relations.map((cellId) => ({ cellId, label: "contrast", explanation: "Test comparison", sourceIds: ["fixture"] })),
    }),
  };
}

test("containment preserves depth while cross-links do not create children", () => {
  const graph = buildCellGraph([cell("root"), cell("child", ["root"]), cell("leaf", ["child"], ["root"]), cell("other")]);
  assert.deepEqual(graph.children.get("root"), ["child"]);
  assert.deepEqual(descendantIds(graph, "root"), ["child", "leaf"]);
  assert.equal(graph.cells.get("root").document.studies.length, 1);
  assert.equal(graph.cells.get("leaf").document.studies.length, 1);
  assert.deepEqual(mapEntryPoints(graph, "art"), ["other", "root"]);
});

test("multiple parents do not duplicate a cell or its example", () => {
  const graph = buildCellGraph([cell("a"), cell("b"), cell("shared", ["a", "b"])]);
  assert.equal(graph.cells.size, 3);
  assert.deepEqual(graph.children.get("a"), ["shared"]);
  assert.deepEqual(graph.children.get("b"), ["shared"]);
  assert.deepEqual(mapEntryPoints(graph, "palettes"), ["a", "b"]);
});

test("cycles terminate and do not erase their cells from the map", () => {
  const graph = buildCellGraph([cell("a", ["b"]), cell("b", ["a"]), cell("unclassified")]);
  assert.deepEqual(descendantIds(graph, "a"), ["b"]);
  assert.ok(graph.diagnostics.some((finding) => finding.kind === "containment-cycle"));
  const visible = new Set(mapEntryPoints(graph, "art").flatMap((id) => [id, ...descendantIds(graph, id)]));
  assert.deepEqual(visible, new Set(["a", "b", "unclassified"]));
});

test("missing references are reported, not silently treated as valid containment", () => {
  const graph = buildCellGraph([cell("orphan", ["missing"], ["also-missing"])]);
  assert.equal(graph.diagnostics.filter((finding) => finding.kind === "missing-cell").length, 2);
  assert.deepEqual(mapEntryPoints(graph, "art"), ["orphan"]);
});

test("duplicate cell ids are rejected before building the map", () => {
  assert.throws(() => buildCellGraph([cell("same"), cell("same")]), /Duplicate cell/);
});

test("public reads require published state, real booleans, and matching evidence hashes", () => {
  const document = JSON.stringify(fixture);
  const hash = createHash("sha256").update(document).digest("hex");
  const row = { entity_id: "test", status: "Published", booleans: { document_validated: true, review_approved: true }, fields: { document, document_hash: hash, review_document_hash: hash, review: "Private review material" } };
  assert.equal(parsePublishedCell(row).id, "test");
  assert.equal(JSON.stringify(parsePublishedCell(row)).includes("Private review"), false);
  assert.throws(() => parsePublishedCell({ ...row, status: "Draft" }));
  assert.throws(() => parsePublishedCell({ ...row, booleans: { document_validated: "true", review_approved: true } }));
  assert.throws(() => parsePublishedCell({ ...row, fields: { ...row.fields, document: document.replace("Spectrum", "Changed") } }));
  assert.throws(() => parsePublishedCell({ ...row, fields: { ...row.fields, review_document_hash: "0".repeat(64) } }));
});

test("a hidden linked language does not escape through a cell or its incoming links", () => {
  const privateCell = cell("private-cell");
  privateCell.document.manifestations = [{
    entitySet: "DesignLanguages", entityId: "private-language-id",
    explanation: "Synthetic private reference", sourceIds: ["fixture"],
  }];
  const linked = cell("visible-cell", ["private-cell"], ["private-cell"]);
  linked.document.manifestations = [];
  const result = visibleCells([privateCell, linked], new Set());
  assert.equal(result.length, 1);
  assert.equal(JSON.stringify(result).includes("private-"), false);
  assert.equal(visibleCells([privateCell, linked], new Set(["DesignLanguages:private-language-id"])).length, 2);
});
