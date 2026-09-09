import test from "node:test";
import assert from "node:assert/strict";
import {
  makeGrid,
  visibleTiles,
  zoomAt,
  cameraFor,
} from "../src/components/encyclopedia/scene.ts";
test("zoom preserves the world point under the finger", () => {
  const c = { x: 40, y: -20, k: 0.5 },
    n = zoomAt(c, 2, 140, 80);
  assert.equal((140 - n.x) / n.k, (140 - c.x) / c.k);
  assert.equal((80 - n.y) / n.k, (80 - c.y) / c.k);
});
test("a million entries draw a viewport-sized set at every zoom", () => {
  const g = makeGrid(1000000);
  for (const k of [0.0005, 0.005, 0.05, 0.5, 1, 3]) {
    const tiles = visibleTiles(g, { x: 0, y: 0, k }, { w: 1440, h: 900 });
    assert.ok(tiles.length < 200, String(tiles.length));
    for (const t of tiles) assert.ok(t.count > 0);
  }
});
test("all entries remain reachable at reading zoom", () => {
  const g = makeGrid(113),
    seen = new Set();
  for (let row = 0; row < g.rows; row++)
    for (const t of visibleTiles(
      g,
      { x: 0, y: -row * g.pitchY, k: 1 },
      { w: g.columns * g.pitchX, h: g.pitchY },
    ))
      for (const i of t.indices) seen.add(i);
  assert.equal(seen.size, 113);
});
test("empty and single entry grids have finite framing", () => {
  for (const n of [0, 1]) {
    const g = makeGrid(n),
      c = cameraFor(g, { w: 390, h: 500 });
    assert.ok(Number.isFinite(c.k) && c.k > 0);
    assert.ok(visibleTiles(g, c, { w: 390, h: 500 }).length <= 1);
  }
});
test("aggregated tiles partition entries without duplicates", () => {
  const g = makeGrid(987),
    c = cameraFor(g, { w: 1200, h: 800 }, true),
    tiles = visibleTiles(g, c, { w: 1200, h: 800 });
  assert.equal(
    tiles.reduce((n, t) => n + t.count, 0),
    987,
  );
});

test("fit includes space occupied by an expanded parent", () => {
  const g = makeGrid(20);
  const size = {w:390,h:500};
  const c = cameraFor(g,size,true,210);
  assert.ok(c.y >= 0);
  assert.ok(c.y + (g.rows*g.pitchY - 60 + 210)*c.k <= size.h);
});
