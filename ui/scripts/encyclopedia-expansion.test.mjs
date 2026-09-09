// What the map's expansion state must hold. Expansion decides what is on the
// paper; zoom decides how much of it is drawn; the two never read each other.
import assert from "node:assert/strict";
import test from "node:test";
import { GraphIndex } from "../src/lib/encyclopedia-graph.ts";
import { BATCH, computeVisible, hubKey, initialExpansion, revealPath, showMore, toggle } from "../src/components/encyclopedia/expansion.ts";

function cell(id, name, { broader = [], maps = ["art"], manifestations = 0, relations = [] } = {}) {
  return {
    id,
    name,
    description: "",
    provenance: { basis: "recollected", note: "fixture" },
    maps: maps.map((map) => ({ map, explanation: "fixture" })),
    broader: broader.map((cellId) => ({ cellId, explanation: "fixture", sourceIds: [] })),
    relations: relations.map((cellId) => ({ cellId, label: "influenced", explanation: "fixture", sourceIds: [] })),
    questions: [],
    sources: [],
    studies: [],
    state: "Draft",
    manifestations: Array.from({ length: manifestations }, (_, i) => ({ entitySet: "ArtStyles", entityId: `${id}-m${i}`, explanation: "fixture", sourceIds: [], unread: false, record: null })),
  };
}

const index = (cells) => new GraphIndex({ cells, withheld: 0, total: cells.length });
const MAPS = ["art", "writing"];

/** Thirty art roots, the first with twelve narrower cells, one of which has
 *  three of its own; four writing roots. */
function library() {
  return [
    cell("big", "Big", { manifestations: 5 }),
    ...Array.from({ length: 12 }, (_, i) => cell(`k${i}`, `Kid ${i}`, { broader: ["big"], manifestations: i === 0 ? 3 : 0 })),
    ...Array.from({ length: 3 }, (_, i) => cell(`g${i}`, `Grandkid ${i}`, { broader: ["k0"] })),
    ...Array.from({ length: 29 }, (_, i) => cell(`r${i}`, `Root ${i}`)),
    ...Array.from({ length: 4 }, (_, i) => cell(`w${i}`, `Writing ${i}`, { maps: ["writing"] })),
  ];
}

test("the map opens on each category's first group, most prominent first, and nothing deeper", () => {
  const graph = index(library());
  const visible = computeVisible(graph, MAPS, initialExpansion(MAPS));
  assert.equal(visible.shown.get(hubKey("art")).length, BATCH);
  assert.equal(visible.shown.get(hubKey("art"))[0].id, "big", "the cell with the most under it opens first");
  assert.equal(visible.hidden.get(hubKey("art")), 30 - BATCH);
  assert.equal(visible.shown.get(hubKey("writing")).length, 4, "a map with fewer cells than a group shows all of them");
  assert.equal(visible.hidden.get(hubKey("writing")), 0);
  assert.equal(visible.cells.size, BATCH + 4);
  assert.ok(!visible.cells.has("k0"), "no narrower cell is on the paper until its cell is opened");
  assert.equal(visible.hidden.get("big"), 12, "a closed cell reports everything under it as not shown");
});

test("opening a cell reveals its first group; more reveals the next; folding takes the branch away", () => {
  const graph = index(library());
  let state = toggle(initialExpansion(MAPS), "big");
  let visible = computeVisible(graph, MAPS, state);
  assert.equal(visible.shown.get("big").length, BATCH);
  assert.equal(visible.hidden.get("big"), 2);
  assert.ok(visible.cells.has("k0"));
  assert.ok(!visible.cells.has("g0"), "and not the layer under that");

  state = showMore(state, "big");
  visible = computeVisible(graph, MAPS, state);
  assert.equal(visible.shown.get("big").length, 12);
  assert.equal(visible.hidden.get("big"), 0);

  state = toggle(state, "k0");
  visible = computeVisible(graph, MAPS, state);
  assert.ok(visible.cells.has("g0"));

  state = toggle(state, "big");
  visible = computeVisible(graph, MAPS, state);
  assert.ok(!visible.cells.has("k0") && !visible.cells.has("g0"), "folding a cell takes everything under it off the paper");
  assert.ok(state.open.has("k0"), "but what was open under it is remembered");
  assert.equal(computeVisible(graph, MAPS, toggle(state, "big")).cells.has("g0"), true, "so opening it again brings the branch back as it was");
  assert.equal(computeVisible(graph, MAPS, toggle(state, "big")).shown.get("big").length, BATCH, "paged from the first group again");
});

test("a cell reached by search is put on the paper with the chain above it, paged far enough to include it", () => {
  const graph = index(library());
  const state = revealPath(graph, initialExpansion(MAPS), "g2");
  const visible = computeVisible(graph, MAPS, state);
  assert.ok(visible.cells.has("g2"));
  assert.ok(visible.cells.has("k0") && visible.cells.has("big"));
  assert.ok(!state.open.has("g2"), "the cell itself is not opened, only reached");
  // A root past the first group: the category pages out to it.
  const far = graph.rootsOn("art")[BATCH + 3];
  const reached = computeVisible(graph, MAPS, revealPath(graph, initialExpansion(MAPS), far.id));
  assert.ok(reached.cells.has(far.id));
  assert.equal(reached.shown.get(hubKey("art")).length, 2 * BATCH);
});

test("a cell with two parents is on the paper when either is open, and once", () => {
  const cells = [cell("a", "A"), cell("b", "B"), cell("both", "Both", { broader: ["a", "b"] })];
  const graph = index(cells);
  const state = toggle(initialExpansion(["art"]), "b");
  const visible = computeVisible(graph, ["art"], state);
  assert.ok(visible.cells.has("both"));
  assert.equal([...visible.cells].filter((id) => id === "both").length, 1);
});

test("a containment cycle no root reaches still opens from its category", () => {
  const cells = [cell("x", "X", { broader: ["y"] }), cell("y", "Y", { broader: ["x"] }), cell("r", "Root")];
  const graph = index(cells);
  const visible = computeVisible(graph, ["art"], initialExpansion(["art"]));
  assert.ok(visible.cells.has("x") && visible.cells.has("y"), "the cycle's members are reachable from the top");
  assert.ok(visible.cells.has("r"));
});

test("a record named by several cells is one record", () => {
  const shared = { entitySet: "ArtStyles", entityId: "shared", explanation: "fixture", sourceIds: [], unread: false, record: null };
  const cells = [cell("a", "A"), cell("b", "B"), cell("c", "C")];
  cells[0].manifestations.push(shared);
  cells[1].manifestations.push(shared);
  const graph = index(cells);
  assert.deepEqual(graph.ownersOf("ArtStyles", "shared").map((c) => c.id), ["a", "b"]);
  assert.deepEqual(graph.ownersOf("ArtStyles", "nobody"), []);
});
