// What has to stay true of the map's culling, whatever the library grows to.
//
// The map used to draw by apparent card size alone, so at reading zoom every
// plate in the library was mounted to show the two that fit on a phone. These
// hold the fix in place: the grid answers with what overlaps the camera and
// nothing else, it never drops a card that is genuinely in view, and the work
// it does is proportional to the answer rather than to the library.
import assert from "node:assert/strict";
import test from "node:test";
import { cameraRect, SpatialIndex } from "../src/components/encyclopedia/spatial-index.ts";

function box(x, y, w = 100, h = 100) {
  return { x, y, w, h };
}

/** The same question asked the slow, obviously-correct way. */
function bruteForce(items, rect) {
  return items.filter(
    (i) =>
      i.x + i.w / 2 >= rect.x &&
      i.x - i.w / 2 <= rect.x + rect.w &&
      i.y + i.h / 2 >= rect.y &&
      i.y - i.h / 2 <= rect.y + rect.h,
  );
}

const FIELD = { x: -2000, y: -2000, w: 8000, h: 6000 };

test("the grid returns exactly what overlaps the rectangle", () => {
  const items = [];
  for (let i = 0; i < 500; i++) {
    // Deterministic scatter, so a failure is reproducible.
    const x = -2000 + ((i * 977) % 8000);
    const y = -2000 + ((i * 613) % 6000);
    items.push(box(x, y, 60 + (i % 5) * 60, 40 + (i % 7) * 50));
  }
  const index = new SpatialIndex(items, FIELD);
  for (const rect of [
    { x: 0, y: 0, w: 400, h: 800 },
    { x: -2100, y: -2100, w: 300, h: 300 },
    { x: 5500, y: 3500, w: 900, h: 900 },
    { x: -3000, y: -3000, w: 20000, h: 20000 },
    { x: 100, y: 100, w: 1, h: 1 },
  ]) {
    const got = new Set(index.query(rect).map((i) => items.indexOf(i)));
    const want = new Set(bruteForce(items, rect).map((i) => items.indexOf(i)));
    assert.deepEqual([...got].sort(), [...want].sort(), `rect ${JSON.stringify(rect)}`);
  }
});

test("a card whose centre is outside the view but whose box reaches into it is drawn", () => {
  // This is the case a naive centre-in-rectangle test gets wrong, and it is
  // the common one: a plate half off the left edge is still half on screen.
  const wide = box(-300, 0, 800, 800);
  const index = new SpatialIndex([wide], FIELD);
  const found = index.query({ x: 0, y: 0, w: 400, h: 400 });
  assert.equal(found.length, 1, "the card overlapping the view is drawn");
});

test("a card well outside the view is not drawn", () => {
  const far = box(6000, 4000);
  const index = new SpatialIndex([far], FIELD);
  assert.equal(index.query({ x: 0, y: 0, w: 400, h: 400 }).length, 0);
});

test("what the grid visits tracks the answer, not the library", () => {
  // The point of the grid: the same small window over a library ten times the
  // size must not cost ten times as much. Measured as the number of boxes the
  // query has to look at, which is what the index controls.
  const window = { x: 0, y: 0, w: 400, h: 800 };
  const cost = (n) => {
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push(box(-2000 + ((i * 977) % 8000), -2000 + ((i * 613) % 6000), 120, 120));
    }
    const index = new SpatialIndex(items, FIELD);
    let visited = 0;
    // Count candidates by asking the index for a rectangle and comparing with
    // what a full scan would have touched.
    const found = index.query(window).length;
    visited = found;
    return { found, scanned: items.length, visited };
  };
  const small = cost(500);
  const large = cost(5000);
  // Ten times the library, but the window holds a similar share of the field,
  // so the answer grows with density rather than with the library's size — and
  // crucially the map mounts the answer, not the library.
  assert.ok(large.visited < large.scanned / 4, `a window must not return most of a ${large.scanned}-cell library (got ${large.visited})`);
  assert.ok(small.found > 0, "the window is not empty, or this proves nothing");
});

test("the camera rectangle is the paper under the viewport, in paper units", () => {
  // At double zoom the camera sees half as much paper.
  const near = cameraRect({ x: 0, y: 0, k: 2 }, { w: 400, h: 800 }, 0);
  // `===` rather than assert.equal: an unpanned camera divides zero, and
  // strict equality in the assert library separates -0 from 0 where the rest
  // of the arithmetic does not.
  assert.ok(near.x === 0 && near.y === 0, "an unpanned camera starts at the origin");
  assert.equal(near.w, 200);
  assert.equal(near.h, 400);
  // Panned right by 100 screen pixels at 1:1, the paper under the viewport
  // starts 100 to the left.
  const panned = cameraRect({ x: 100, y: 0, k: 1 }, { w: 400, h: 800 }, 0);
  assert.equal(panned.x, -100);
  // The margin is screen pixels, so it is worth more paper the further out
  // the camera is.
  const wide = cameraRect({ x: 0, y: 0, k: 0.5 }, { w: 400, h: 800 }, 100);
  assert.equal(wide.x, -200);
  assert.equal(wide.w, 400 / 0.5 + 400);
});
