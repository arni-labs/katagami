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


test("the original map, filters, reader tabs and rich focus remain on one page",()=>{
 const v=mount([cell("Parent"),cell("Child","art",["Parent"])]);
 assert.ok(v.el.querySelector('[role="application"]'));
 assert.ok(v.el.querySelector('[aria-label="Filter by map"]'));
 assert.ok(v.el.querySelector('[data-plate="Parent"]'));
 click(v.el,'[data-plate="Parent"]');
 assert.ok(v.el.querySelector('[data-plate="Parent"][aria-current="true"]'));
 assert.ok(v.el.querySelector(".encyclopedia-focus-material"));
 for(const word of ["Material","Connections","Notes"])assert.ok(v.el.textContent.includes(word),word);
 const depth=[...v.el.querySelectorAll("button")].find(b=>b.textContent.includes("Depth on"));assert.ok(depth);
 flush(()=>depth.click());drain();assert.ok(v.el.textContent.includes("Depth off"));
 v.close();
});
test("a disconnected cycle remains represented in the existing map",()=>{
 const v=mount([cell("Cycle A","art",["Cycle B"]),cell("Cycle B","art",["Cycle A"])]);
 assert.ok(v.el.querySelector('[data-plate="Cycle A"]'));assert.ok(v.el.querySelector('[data-plate="Cycle B"]'));v.close();
});
