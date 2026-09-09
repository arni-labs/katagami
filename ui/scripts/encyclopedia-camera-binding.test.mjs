import test from "node:test";
import assert from "node:assert/strict";
import { createFlush, loadUiModule } from "./react-harness.mjs";
const { React, createRoot, flush } = createFlush();
const { usePanZoom } = loadUiModule(
  "src/components/encyclopedia/use-pan-zoom.ts",
);
test("wheel is captured when a canvas mounts after the browse view", () => {
  let camera;
  function Probe({ show }) {
    camera = usePanZoom();
    return show
      ? React.createElement("div", {
          ref: camera.bindViewport,
          ...camera.handlers,
        })
      : null;
  }
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  flush(() => root.render(React.createElement(Probe, { show: false })));
  flush(() => root.render(React.createElement(Probe, { show: true })));
  const event = new window.WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    deltaY: 100,
    clientX: 100,
    clientY: 100,
  });
  flush(() => el.firstChild.dispatchEvent(event));
  assert.equal(event.defaultPrevented, true);
  assert.ok(camera.camera.k < 1);
  flush(() => root.unmount());
  el.remove();
});
