import test from "node:test";
import assert from "node:assert/strict";
import { createFlush, loadUiModule } from "./react-harness.mjs";

const { React, createRoot, flush } = createFlush();
const frames = new Map();
let nextFrame = 0;
globalThis.requestAnimationFrame = (fn) => {
  frames.set(++nextFrame, fn);
  return nextFrame;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
globalThis.ResizeObserver = class {
  observe() {
    this.callback();
  }
  disconnect() {}
  constructor(callback) {
    this.callback = callback;
  }
};
window.HTMLCanvasElement.prototype.getContext = () => null;
Object.defineProperty(window.HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get() {
    return 1200;
  },
});
Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get() {
    return 600;
  },
});
function drain() {
  for (let i = 0; i < 30 && frames.size; i++) {
    const batch = [...frames.values()];
    frames.clear();
    flush(() => {
      for (const fn of batch) fn(performance.now() + i * 20);
    });
  }
}
function cell(id, map = "art", parents = []) {
  return {
    id,
    name: id,
    description: "Interaction test fixture, not encyclopedia content.",
    maps: [{ map, explanation: "Fixture", sourceIds: [] }],
    broader: parents.map((cellId) => ({
      cellId,
      explanation: "Fixture",
      sourceIds: [],
    })),
    relations: [],
    manifestations: [],
    studies: [],
    sources: [],
    questions: [],
    state: "Draft",
    provenance: { basis: "recollected", note: "Fixture" },
  };
}
const { EncyclopediaMap } = loadUiModule(
  "src/components/encyclopedia/encyclopedia-map.tsx",
);
function mount(cells) {
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  flush(() =>
    root.render(
      React.createElement(EncyclopediaMap, {
        graph: { cells, total: cells.length, withheld: 0 },
      }),
    ),
  );
  drain();
  return {
    el,
    root,
    close() {
      flush(() => root.unmount());
      el.remove();
      frames.clear();
    },
  };
}
function click(el, selector) {
  const button = el.querySelector(selector);
  assert.ok(button, selector);
  flush(() => button.click());
  drain();
}

test("overview, child expansion and saved back navigation", () => {
  const view = mount([
    cell("Parent"),
    cell("Child", "art", ["Parent"]),
    cell("Grandchild", "art", ["Child"]),
    cell("Poetry", "writing"),
    cell("Color", "palettes"),
    cell("Layout", "design"),
  ]);
  assert.equal(view.el.querySelectorAll(".atlas-region").length, 4);
  click(view.el, ".atlas-region");
  assert.ok(view.el.querySelector('[aria-label="Read about Parent"]'));
  assert.equal(view.el.querySelector('[aria-label="Read about Child"]'), null);
  click(view.el, '[aria-label="Explore Parent"]');
  assert.ok(view.el.querySelector('[aria-label="Read about Child"]'));
  assert.equal(
    view.el.querySelector('[aria-label="Read about Grandchild"]'),
    null,
  );
  click(view.el, '[aria-label="Explore Child"]');
  assert.ok(view.el.querySelector('[aria-label="Read about Grandchild"]'));
  click(view.el, '[aria-label="Back to previous map"]');
  assert.ok(view.el.querySelector('[aria-label="Read about Child"]'));
  view.close();
});
test("a disconnected cycle has a reachable entry point", () => {
  const view = mount([
    cell("Cycle A", "art", ["Cycle B"]),
    cell("Cycle B", "art", ["Cycle A"]),
  ]);
  click(view.el, ".atlas-region");
  assert.equal(view.el.querySelectorAll(".atlas-topic").length, 1);
  click(view.el, '[aria-label^="Explore Cycle"]');
  assert.equal(view.el.querySelectorAll(".atlas-topic").length, 1);
  view.close();
});
test("reading opens and closes without expanding descendants", () => {
  const view = mount([cell("Parent"), cell("Child", "art", ["Parent"])]);
  click(view.el, ".atlas-region");
  click(view.el, '[aria-label="Read about Parent"]');
  assert.ok(view.el.querySelector('aside[aria-label="Topic details"]'));
  assert.equal(view.el.querySelector('[aria-label="Read about Child"]'), null);
  click(view.el, '[aria-label="Close topic details"]');
  assert.equal(view.el.querySelector("aside"), null);
  view.close();
});
test("twenty thousand roots mount only visible nodes", () => {
  const view = mount(
    Array.from({ length: 20000 }, (_, i) =>
      cell("Topic " + String(i).padStart(5, "0")),
    ),
  );
  click(view.el, ".atlas-region");
  assert.ok(
    view.el.querySelectorAll(".atlas-node,.atlas-cluster").length < 200,
  );
  assert.ok(
    view.el.querySelector('input[aria-label="Search the encyclopedia"]'),
  );
  view.close();
});
