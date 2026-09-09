// What the encyclopedia map's layout must hold whatever the library does to
// it. None of this needs a browser: the layout is a pure function of the
// cells and of what is open.
import assert from "node:assert/strict";
import test from "node:test";
import { GraphIndex } from "../src/lib/encyclopedia-graph.ts";
import { BATCH, computeVisible, hubKey, initialExpansion, revealPath, showMore, toggle } from "../src/components/encyclopedia/expansion.ts";
import {
  expandCell,
  HUB_H,
  HUB_W,
  layoutVisible,
  levelOf,
  levelScale,
  LEVEL_SHRINK,
  MAX_LEVEL,
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

const MAPS = ["art", "writing", "palettes", "design"];
const index = (cells) => new GraphIndex({ cells, withheld: 0, total: cells.length });
const mapsOf = (graph) => MAPS.filter((m) => graph.graph.cells.some((c) => graph.primaryMap(c) === m));

/** Lay out a library with everything opened. */
function openAll(graph) {
  let state = initialExpansion(mapsOf(graph));
  for (const map of mapsOf(graph)) for (let i = 0; i < 40; i++) state = showMore(state, hubKey(map));
  for (const c of graph.graph.cells) {
    if (!graph.childrenOf(c.id).length) continue;
    state = toggle(state, c.id);
    for (let i = 0; i < 20; i++) state = showMore(state, c.id);
  }
  return state;
}

function overlapping(a, b, slack = 2) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - slack && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - slack;
}

// ── the hierarchy is data, not a proven tree ────────────────────────────────

test("a containment cycle under a root does not run the placement away", () => {
  // C → B → A → B, reached from a real root.
  const cells = [
    cell("R", "Root"),
    cell("A", "Alpha", { broader: ["R", "B"] }),
    cell("B", "Beta", { broader: ["A"] }),
    cell("C", "Gamma", { broader: ["B"] }),
  ];
  const graph = index(cells);
  const layout = layoutVisible(graph, computeVisible(graph, ["art"], openAll(graph)), ["art"]);
  assert.equal(layout.plates.length, 4, "every cell is placed");
  assert.equal(new Set(layout.plates.map((p) => p.id)).size, 4, "and placed once");
});

test("a cycle no root reaches still puts every cell on the paper", () => {
  const cells = [cell("X", "Xi", { broader: ["Z"] }), cell("Y", "Ypsilon", { broader: ["X"] }), cell("Z", "Zeta", { broader: ["Y"] })];
  const graph = index(cells);
  assert.equal(layoutVisible(graph, computeVisible(graph, ["art"], openAll(graph)), ["art"]).plates.length, 3);
});

test("a cell that names itself as its own broader cell is placed once", () => {
  const graph = index([cell("S", "Self", { broader: ["S"] })]);
  assert.equal(layoutVisible(graph, computeVisible(graph, ["art"], openAll(graph)), ["art"]).plates.length, 1);
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
      maps: [MAPS[i % 4]],
      manifestations: i % 5,
    }),
  );
  const graph = index(cells);
  const visible = computeVisible(graph, MAPS, openAll(graph));
  const a = layoutVisible(graph, visible, MAPS);
  const b = layoutVisible(graph, visible, MAPS);
  assert.deepEqual(
    a.plates.map((p) => `${p.id}:${p.x},${p.y},${p.w},${p.h}`),
    b.plates.map((p) => `${p.id}:${p.x},${p.y},${p.w},${p.h}`),
  );
  assert.deepEqual(a.satellites.map((s) => `${s.id}:${s.x},${s.y}`), b.satellites.map((s) => `${s.id}:${s.x},${s.y}`));
});

// ── nothing on the paper sits on anything else ──────────────────────────────

test("no two open cards overlap, whatever is open, and none sits on a category node", () => {
  const cells = Array.from({ length: 400 }, (_, i) =>
    cell(`c${i}`, `Cell ${i}`, { broader: i > 3 ? [`c${Math.floor(i / 4)}`] : [], maps: [MAPS[i % 4]], manifestations: i % 4 }),
  );
  const graph = index(cells);
  // Three states: the opening view, one branch opened, everything opened.
  const states = [initialExpansion(MAPS), toggle(showMore(initialExpansion(MAPS), hubKey("art")), "c4"), openAll(graph)];
  for (const state of states) {
    const visible = computeVisible(graph, MAPS, state);
    const layout = layoutVisible(graph, visible, MAPS);
    assert.equal(layout.plates.length, visible.cells.size, "every open cell is on the paper");
    let overlaps = 0;
    for (let i = 0; i < layout.plates.length; i++) for (let j = i + 1; j < layout.plates.length; j++) if (overlapping(layout.plates[i], layout.plates[j])) overlaps++;
    assert.equal(overlaps, 0, `${visible.cells.size} open cells: ${overlaps} overlapping pairs`);
    for (const hub of layout.hubs) {
      for (const p of layout.plates) assert.ok(!overlapping(p, hub), `${p.id} sits on the ${hub.map} category node`);
      for (const s of layout.satellites) assert.ok(!overlapping({ x: s.x, y: s.y, w: SAT_W * s.scale, h: SAT_H * s.scale }, hub), `a record of ${s.cellId} sits on the ${hub.map} category node`);
    }
    // Records never sit on a card, their own or another's.
    for (const s of layout.satellites) {
      for (const p of layout.plates) assert.ok(!overlapping({ x: s.x, y: s.y, w: SAT_W * s.scale, h: SAT_H * s.scale }, p, 1), `a record of ${s.cellId} sits on ${p.id}`);
    }
    // The category nodes stand apart from one another.
    for (let i = 0; i < layout.hubs.length; i++) for (let j = i + 1; j < layout.hubs.length; j++) assert.ok(!overlapping(layout.hubs[i], layout.hubs[j]));
  }
});

test("the paper is the size of what is open, not of the library", () => {
  const cells = Array.from({ length: 800 }, (_, i) => cell(`c${i}`, `Cell ${i}`, { broader: i > 3 ? [`c${Math.floor(i / 5)}`] : [], maps: [MAPS[i % 4]] }));
  const graph = index(cells);
  const opening = layoutVisible(graph, computeVisible(graph, MAPS, initialExpansion(MAPS)), MAPS);
  const everything = layoutVisible(graph, computeVisible(graph, MAPS, openAll(graph)), MAPS);
  assert.equal(opening.plates.length, 4);
  assert.equal(everything.plates.length, 800);
  assert.ok(opening.bounds.w * opening.bounds.h < (everything.bounds.w * everything.bounds.h) / 8, "the opening view is a small fraction of the whole");
});

test("the opening view holds one group per category", () => {
  const cells = Array.from({ length: 100 }, (_, i) => cell(`c${i}`, `Cell ${i}`, { maps: [MAPS[i % 2]] }));
  const graph = index(cells);
  const layout = layoutVisible(graph, computeVisible(graph, ["art", "writing"], initialExpansion(["art", "writing"])), ["art", "writing"]);
  assert.equal(layout.plates.length, 2 * BATCH);
  assert.equal(layout.hubs.length, 2);
});

test("a narrower cell is placed beside the cell it sits under, and drawn smaller", () => {
  const cells = [cell("hub", "Big"), ...Array.from({ length: 6 }, (_, i) => cell(`k${i}`, `Kid ${i}`, { broader: ["hub"] })), ...Array.from({ length: 5 }, (_, i) => cell(`r${i}`, `Root ${i}`))];
  const graph = index(cells);
  const layout = layoutVisible(graph, computeVisible(graph, ["art"], toggle(initialExpansion(["art"]), "hub")), ["art"]);
  const hub = layout.hubs[0];
  const parent = layout.byId.get("hub");
  for (let i = 0; i < 6; i++) {
    const kid = layout.byId.get(`k${i}`);
    assert.ok(kid, `Kid ${i} is on the paper`);
    assert.ok(Math.hypot(kid.x - parent.x, kid.y - parent.y) < Math.hypot(kid.x - hub.x, kid.y - hub.y), `Kid ${i} is nearer its cell than the category node`);
    assert.ok(kid.level === 1 && kid.scale < parent.scale, "and drawn smaller than it");
  }
});

test("a cell reached by search is on the paper once the chain above it opens", () => {
  const cells = [cell("a", "A"), cell("b", "B", { broader: ["a"] }), cell("c", "C", { broader: ["b"] }), ...Array.from({ length: 20 }, (_, i) => cell(`r${i}`, `Root ${i}`, { manifestations: 3 }))];
  const graph = index(cells);
  const state = revealPath(graph, initialExpansion(["art"]), "c");
  const layout = layoutVisible(graph, computeVisible(graph, ["art"], state), ["art"]);
  assert.ok(layout.byId.has("c") && layout.byId.has("b") && layout.byId.has("a"));
});

// ── layers ──────────────────────────────────────────────────────────────────

test("a cell's layer is its depth, and each layer draws smaller than the one above until the shrink stops", () => {
  const cells = Array.from({ length: 200 }, (_, i) => cell(`c${i}`, `Cell ${i}`, { broader: i > 0 ? [`c${Math.floor((i - 1) / 4)}`] : [] }));
  const graph = index(cells);
  for (const c of cells) assert.equal(levelOf(graph, c.id), Math.min(MAX_LEVEL, graph.depthOf(c.id)));
  assert.equal(levelScale(0), 1);
  assert.ok(Math.abs(levelScale(1) - LEVEL_SHRINK) < 1e-9);
  assert.equal(levelScale(MAX_LEVEL + 2), levelScale(MAX_LEVEL));
  const c = cell("c", "Cell");
  assert.ok(plateBox(c, 1).w < plateBox(c, 0).w);
  assert.ok(plateBox(c, 2).h < plateBox(c, 1).h);
});

test("a plate's box is the size its own level draws at", () => {
  const cells = [cell("a", "Alpha", { manifestations: 2 }), cell("b", "Beta", { broader: ["a"] })];
  const graph = index(cells);
  for (const p of layoutVisible(graph, computeVisible(graph, ["art"], openAll(graph)), ["art"]).plates) {
    const box = plateBox(p.cell, p.level);
    assert.equal(p.w, box.w);
    assert.equal(p.h, box.h);
    assert.ok(Math.abs(p.scale - levelScale(p.level)) < 1e-9);
  }
});

// ── opening a cell's records onto the map ───────────────────────────────────

const single = (n) => {
  const graph = index([cell("big", "Big", { manifestations: n })]);
  return layoutVisible(graph, computeVisible(graph, ["art"], initialExpansion(["art"])), ["art"]);
};

test("a folded ring holds the cap and one node that opens the rest", () => {
  const ring = single(60).satellites.filter((s) => s.cellId === "big");
  assert.equal(ring.filter((s) => s.role === "record").length, MAX_SATELLITES);
  assert.equal(ring.filter((s) => s.role === "more").length, 1);
  assert.equal(ring.find((s) => s.role === "more").more, 60 - MAX_SATELLITES);
});

test("opening a cell gives every record a node of its own, none touching another or the card", () => {
  for (const total of [9, 23, 40, 57, 68, 90, 120, 200]) {
    const plate = single(total).byId.get("big");
    const opened = expandCell(plate, -Math.PI / 2);
    const records = opened.filter((s) => s.role === "record");
    assert.equal(records.length, total, `${total} records should each get a node`);
    assert.equal(new Set(records.map((s) => s.index)).size, total, "and each exactly once");
    assert.equal(opened.filter((s) => s.role === "fold").length, 1, "with one way to fold them away");
    const clearance = (a, b) => Math.max(Math.abs(a.x - b.x) - SAT_W * plate.scale, Math.abs(a.y - b.y) - SAT_H * plate.scale);
    for (let i = 0; i < opened.length; i++) {
      for (let j = i + 1; j < opened.length; j++) {
        assert.ok(clearance(opened[i], opened[j]) >= 0, `${total}: two opened nodes overlap by ${(-clearance(opened[i], opened[j])).toFixed(1)}px`);
      }
    }
    for (const node of opened) {
      const clear = Math.max(Math.abs(node.x - plate.x) - (plate.w / 2 + (SAT_W * plate.scale) / 2), Math.abs(node.y - plate.y) - (plate.h / 2 + (SAT_H * plate.scale) / 2));
      assert.ok(clear >= 0, `${total}: an opened node overlaps the card it belongs to`);
    }
  }
});

test("a cell with nothing made for it opens to nothing", () => {
  const graph = index([cell("empty", "Empty")]);
  const layout = layoutVisible(graph, computeVisible(graph, ["art"], initialExpansion(["art"])), ["art"]);
  assert.deepEqual(expandCell(layout.byId.get("empty"), 0), []);
});

// ── the empty library ───────────────────────────────────────────────────────

test("an empty library lays out without throwing", () => {
  const graph = index([]);
  const layout = layoutVisible(graph, computeVisible(graph, [], initialExpansion([])), []);
  assert.equal(layout.plates.length, 0);
  assert.ok(layout.bounds.w > 0 && layout.bounds.h > 0);
});

test("the category node is a box of the size the map draws it at", () => {
  const graph = index([cell("a", "A")]);
  const [hub] = layoutVisible(graph, computeVisible(graph, ["art"], initialExpansion(["art"])), ["art"]).hubs;
  assert.equal(hub.w, HUB_W);
  assert.equal(hub.h, HUB_H);
  assert.equal(hub.roots, 1);
});
