import test from "node:test";
import assert from "node:assert/strict";
import { createFlush, loadUiModule } from "./react-harness.mjs";
createFlush();
const { GraphIndex } = loadUiModule("src/lib/encyclopedia-graph.ts");
const { disclosureLayout, categoryEntries } = loadUiModule(
  "src/components/encyclopedia/disclosure.ts",
);
const { cellFaces } = loadUiModule("src/components/encyclopedia/material.ts");
const { expandCell } = loadUiModule(
  "src/components/encyclopedia/graph-layout.ts",
);
const cell = (id, parents = []) => ({
  id,
  name: id,
  description: "Test scope",
  maps: [{ map: "art", explanation: "", sourceIds: [] }],
  broader: parents.map((cellId) => ({
    cellId,
    explanation: "",
    sourceIds: [],
  })),
  relations: [],
  studies: [],
  manifestations: [],
  sources: [],
  questions: [],
  state: "Draft",
  provenance: { basis: "recollected", note: "test" },
});
const index = (cells) =>
  new GraphIndex({ cells, total: cells.length, withheld: 0 });
test("only explicitly opened branches reveal their children", () => {
  const i = index([
    cell("A"),
    cell("B"),
    cell("A1", ["A"]),
    cell("B1", ["B"]),
    cell("A2", ["A1"]),
  ]);
  const categories = new Map([["art", 8]]);
  assert.equal(
    disclosureLayout(i, new Map(), new Map(), new Set()).plates.length,
    0,
  );
  const closed = disclosureLayout(i, categories, new Map(), new Set());
  assert.deepEqual(closed.plates.map((p) => p.id).sort(), ["A", "B"]);
  const open = disclosureLayout(i, categories, new Map([["A", 8]]), new Set());
  assert.deepEqual(open.plates.map((p) => p.id).sort(), ["A", "A1", "B"]);
  const collapsed = disclosureLayout(
    i,
    categories,
    new Map([["A1", 8]]),
    new Set(),
  );
  assert.deepEqual(collapsed.plates.map((p) => p.id).sort(), ["A", "B"]);
});
test("shared children, cycles and direct search stay reachable without duplicate nodes", () => {
  const i = index([cell("A", ["B"]), cell("B", ["A"]), cell("C", ["A", "B"])]);
  assert.ok(categoryEntries(i, "art").length);
  const l = disclosureLayout(
    i,
    new Map([["art", 8]]),
    new Map([
      ["A", 8],
      ["B", 8],
    ]),
    new Set(["C"]),
  );
  assert.deepEqual(l.plates.map((p) => p.id).sort(), ["A", "B", "C"]);
});
test("linked record image is not presented as a topic study", () => {
  const c = cell("Impressionism");
  c.manifestations = [
    {
      entitySet: "ArtStyles",
      entityId: "photo",
      record: {
        set: "ArtStyles",
        name: "Related photo style",
        image: "/photo.jpg",
        href: "/art-styles/photo",
      },
    },
  ];
  assert.equal(cellFaces(c)[0].kind, "name");
  assert.match(cellFaces(c)[0].caption, /related record/i);
});
test("repeated links to one record produce one map node", () => {
  const c = cell("A");
  c.manifestations = [
    { entitySet: "ArtStyles", entityId: "same" },
    { entitySet: "ArtStyles", entityId: "same" },
  ];
  const nodes = expandCell(
    {
      kind: "plate",
      id: "A",
      cell: c,
      x: 0,
      y: 0,
      w: 232,
      h: 180,
      scale: 1,
      level: 0,
    },
    0,
  );
  assert.equal(nodes.filter((n) => n.role === "record").length, 1);
});

test("secondary categories have visual entries without duplicating shared topics", () => {
  const c = cell("Shared");
  c.maps.push({ map: "design", explanation: "", sourceIds: [] });
  const i = index([c]);
  const l = disclosureLayout(
    i,
    new Map([
      ["art", 8],
      ["design", 8],
    ]),
    new Map(),
    new Set(),
  );
  assert.deepEqual(
    l.categories.map((h) => h.map),
    ["art", "design"],
  );
  assert.equal(l.plates.length, 1);
  assert.deepEqual(l.categories.find((h) => h.map === "design").rootIds, [
    "Shared",
  ]);
});
