// What the encyclopedia map must hold whatever the library does to it. None of
// this needs a browser: the layout is a pure function of the cells.
import assert from "node:assert/strict";
import test from "node:test";
import { GraphIndex } from "../src/lib/encyclopedia-graph.ts";
import {
  displayLevels,
  expandCell,
  layoutGraph,
  levelScale,
  LEVEL_SHRINK,
  MAX_SATELLITES,
  plateBox,
  SAT_H,
  SAT_W,
} from "../src/components/encyclopedia/graph-layout.ts";

function cell(id, name, { broader = [], relations = [], maps = ["art"], manifestations = 0 } = {}) {
  return {
    id,
    name,
    description: `The scope of ${name}, written about as long as a real one.`,
    provenance: { basis: "recollected", note: "fixture" },
    maps: maps.map((map) => ({ map, explanation: "fixture" })),
    broader: broader.map((cellId) => ({ cellId, explanation: "fixture", sourceIds: [] })),
    relations: relations.map((cellId) => ({ cellId, label: "influenced", explanation: "fixture", sourceIds: [] })),
    questions: [],
    sources: [],
    studies: [],
    state: "Draft",
    manifestations: Array.from({ length: manifestations }, (_, i) => ({
      entitySet: "ArtStyles",
      entityId: `${id}-m${i}`,
      explanation: "fixture",
      sourceIds: [],
      unread: false,
      record: { set: "ArtStyles", id: `${id}-m${i}`, name: `Record ${i}`, status: "Draft", href: "#" },
    })),
  };
}

const index = (cells) => new GraphIndex({ cells, withheld: 0, total: cells.length });

// ── the hierarchy is data, not a proven tree ────────────────────────────────

test("a containment cycle under a root does not run the placement walk away", () => {
  // C → B → A → B, reached from a real root. Before the visited guard this
  // recursed until the stack gave out and the page came up blank.
  const cells = [
    cell("R", "Root"),
    cell("A", "Alpha", { broader: ["R", "B"] }),
    cell("B", "Beta", { broader: ["A"] }),
    cell("C", "Gamma", { broader: ["B"] }),
  ];
  const layout = layoutGraph(index(cells));
  assert.equal(layout.plates.length, 4, "every cell is still placed");
  assert.equal(new Set(layout.plates.map((p) => p.id)).size, 4, "and placed once");
});

test("a cycle no root reaches still puts every cell on the paper", () => {
  const cells = [cell("X", "Xi", { broader: ["Z"] }), cell("Y", "Ypsilon", { broader: ["X"] }), cell("Z", "Zeta", { broader: ["Y"] })];
  assert.equal(layoutGraph(index(cells)).plates.length, 3);
});

test("a cell that names itself as its own broader cell is placed once", () => {
  assert.equal(layoutGraph(index([cell("S", "Self", { broader: ["S"] })])).plates.length, 1);
});

test("levels stop at a cycle instead of counting round it forever", () => {
  const cells = [cell("A", "A", { broader: ["B"] }), cell("B", "B", { broader: ["A"] })];
  const graph = index(cells);
  for (const c of cells) assert.ok(Number.isFinite(graph.depthOf(c.id)));
});

// ── the same data always gives the same map ─────────────────────────────────

test("the layout is deterministic", () => {
  const cells = Array.from({ length: 120 }, (_, i) =>
    cell(`c${i}`, `Cell ${i}`, {
      broader: i > 0 ? [`c${Math.floor(i / 3)}`] : [],
      maps: [["art", "writing", "palettes", "design"][i % 4]],
      manifestations: i % 5,
    }),
  );
  const a = layoutGraph(index(cells));
  const b = layoutGraph(index(cells));
  assert.deepEqual(
    a.plates.map((p) => `${p.id}:${p.x},${p.y},${p.w},${p.h}`),
    b.plates.map((p) => `${p.id}:${p.x},${p.y},${p.w},${p.h}`),
  );
  assert.deepEqual(a.satellites.map((s) => `${s.id}:${s.x},${s.y}`), b.satellites.map((s) => `${s.id}:${s.x},${s.y}`));
});

test("no two cards overlap once the field has settled", () => {
  const cells = Array.from({ length: 160 }, (_, i) =>
    cell(`c${i}`, `Cell ${i}`, { broader: i > 0 ? [`c${Math.floor(i / 4)}`] : [], manifestations: i % 4 }),
  );
  const { plates } = layoutGraph(index(cells));
  let overlaps = 0;
  for (let i = 0; i < plates.length; i++) {
    for (let j = i + 1; j < plates.length; j++) {
      const a = plates[i];
      const b = plates[j];
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 2) overlaps++;
    }
  }
  assert.equal(overlaps, 0);
});

// ── one layer at a time ─────────────────────────────────────────────────────

test("a cell is never on a layer above the cell it sits under", () => {
  const cells = Array.from({ length: 200 }, (_, i) =>
    cell(`c${i}`, `Cell ${i}`, { broader: i > 0 ? [`c${Math.floor((i - 1) / 4)}`] : [] }),
  );
  const graph = index(cells);
  const levels = displayLevels(graph);
  for (const c of cells) {
    for (const parent of graph.parentsOf(c.id)) {
      assert.ok(
        levels.get(c.id) >= levels.get(parent.id),
        `${c.name} would be drawn before ${parent.name}, which contains it`,
      );
    }
  }
});

test("the layers hold a geometric share, so their count grows with the logarithm of the library", () => {
  for (const size of [60, 500, 5000]) {
    const cells = Array.from({ length: size }, (_, i) => cell(`c${i}`, `Cell ${i}`));
    const levels = [...displayLevels(index(cells)).values()];
    const deepest = Math.max(...levels);
    assert.ok(deepest <= 7, `${size} cells needed ${deepest + 1} layers`);
    const top = levels.filter((l) => l === 0).length;
    assert.ok(top <= 30, `${size} cells put ${top} cards on the far view`);
  }
});

test("each layer draws at half the one above it, so the map reads the same at every zoom", () => {
  assert.equal(levelScale(0), 1);
  assert.ok(Math.abs(levelScale(1) - LEVEL_SHRINK) < 1e-9);
  assert.ok(Math.abs(levelScale(3) - LEVEL_SHRINK ** 3) < 1e-9);
  const c = cell("c", "Cell");
  assert.ok(plateBox(c, 1).w < plateBox(c, 0).w);
  assert.ok(plateBox(c, 2).h < plateBox(c, 1).h);
});

test("a deep library still puts a readable number of cards on the far view", () => {
  const cells = Array.from({ length: 800 }, (_, i) =>
    cell(`c${i}`, `Cell ${i}`, { broader: i > 0 ? [`c${Math.floor(i / 5)}`] : [], maps: [["art", "writing", "palettes", "design"][i % 4]] }),
  );
  const layout = layoutGraph(index(cells));
  const top = layout.plates.filter((p) => p.level === 0);
  assert.ok(top.length > 0 && top.length <= 30, `far view would draw ${top.length} cards`);
  assert.ok(layout.plates.length === 800, "and every other cell is still on the map");
});

// ── the box the layout reserves is the card that gets drawn ─────────────────

test("a plate's reserved box is the size its own level draws at", () => {
  const cells = [cell("a", "Alpha", { manifestations: 2 }), cell("b", "Beta", { broader: ["a"] })];
  for (const p of layoutGraph(index(cells)).plates) {
    const box = plateBox(p.cell, p.level);
    assert.equal(p.w, box.w);
    assert.equal(p.h, box.h);
    assert.ok(Math.abs(p.scale - levelScale(p.level)) < 1e-9);
  }
});

// ── opening a cell's records onto the map ───────────────────────────────────

test("a folded ring holds the cap and one node that opens the rest", () => {
  const layout = layoutGraph(index([cell("big", "Big", { manifestations: 60 })]));
  const ring = layout.satellites.filter((s) => s.cellId === "big");
  assert.equal(ring.filter((s) => s.role === "record").length, MAX_SATELLITES);
  assert.equal(ring.filter((s) => s.role === "more").length, 1);
  assert.equal(ring.find((s) => s.role === "more").more, 60 - MAX_SATELLITES);
});

test("opening a cell gives every record a node of its own, none touching another or the card", () => {
  // Sizes on both sides of a full ring, because the bug this covers only
  // appeared once a ring had to turn a corner with nodes on it.
  for (const total of [9, 23, 40, 57, 68, 90, 120, 200]) {
    const layout = layoutGraph(index([cell("big", "Big", { manifestations: total })]));
    const plate = layout.byId.get("big");
    const opened = expandCell(plate, -Math.PI / 2);
    const records = opened.filter((s) => s.role === "record");

    assert.equal(records.length, total, `${total} records should each get a node`);
    assert.equal(new Set(records.map((s) => s.index)).size, total, "and each exactly once");
    assert.equal(opened.filter((s) => s.role === "fold").length, 1, "with one way to fold them away");

    // Box against box, not centre against centre. The nodes are squares, so two
    // of them 65px apart on a diagonal are 46px apart on each axis and their
    // 56px boxes overlap — which a distance check waves through. Separation on
    // either axis is what makes them clear.
    const clearance = (a, b) =>
      Math.max(
        Math.abs(a.x - b.x) - SAT_W * plate.scale,
        Math.abs(a.y - b.y) - SAT_H * plate.scale,
      );
    for (let i = 0; i < opened.length; i++) {
      for (let j = i + 1; j < opened.length; j++) {
        assert.ok(
          clearance(opened[i], opened[j]) >= 0,
          `${total}: two opened nodes overlap by ${(-clearance(opened[i], opened[j])).toFixed(1)}px`,
        );
      }
    }
    // Box against box: the card the ring belongs to stays the clearest thing
    // on screen. A ring drawn as an ellipse through the same clearances cuts
    // inside the card at its corners, which this is here to catch.
    for (const node of opened) {
      const clear = Math.max(
        Math.abs(node.x - plate.x) - (plate.w / 2 + (SAT_W * plate.scale) / 2),
        Math.abs(node.y - plate.y) - (plate.h / 2 + (SAT_H * plate.scale) / 2),
      );
      assert.ok(clear >= 0, `${total}: an opened node overlaps the card it belongs to`);
    }
  }
});

test("a cell with nothing made for it opens to nothing", () => {
  const layout = layoutGraph(index([cell("empty", "Empty")]));
  assert.deepEqual(expandCell(layout.byId.get("empty"), 0), []);
});

// ── the empty library ───────────────────────────────────────────────────────

test("an empty library lays out without throwing", () => {
  const layout = layoutGraph(index([]));
  assert.equal(layout.plates.length, 0);
  assert.ok(layout.bounds.w > 0 && layout.bounds.h > 0);
});
