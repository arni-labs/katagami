// Render-tree check: language-detail preview has exactly one Open full
// control, and it follows the tab that is currently previewing.
import assert from "node:assert/strict";
import { createFlush, ensureDom, loadUiModule } from "./react-harness.mjs";

ensureDom();
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.fetch = async () => ({
  ok: true,
  text: async () => "<html><body>preview</body></html>",
});

const { EmbodimentTabs } = loadUiModule("src/components/embodiment-tabs.tsx");
const { React, createRoot, flush } = createFlush();

const tabs = [
  { key: "landing", label: "Landing", url: "/api/file/landing-html" },
  { key: "embodiment", label: "Embodiment", url: "/api/file/embodiment-html" },
  { key: "dashboard", label: "Dashboard", url: "/api/file/dashboard-html" },
];

const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);

flush(() => {
  root.render(React.createElement(EmbodimentTabs, { tabs }));
});

const links = [...container.querySelectorAll('a[target="_blank"]')];
assert.equal(links.length, 1, "exactly one open-in-new control on the preview");
assert.equal(links[0].getAttribute("href"), tabs[0].url, "opens the landing being previewed");
assert.match(links[0].textContent ?? "", /open full|full/i, "control is labeled Open full");
assert.match(links[0].getAttribute("class") ?? "", /rounded-none/, "overlay is radius 0");
assert.doesNotMatch(links[0].getAttribute("class") ?? "", /rounded-\[3px\]/);

const embodiment = [...container.querySelectorAll("button")].find(
  (b) => b.textContent === "Embodiment",
);
assert.ok(embodiment, "embodiment tab is present");
flush(() => embodiment.click());

const after = [...container.querySelectorAll('a[target="_blank"]')];
assert.equal(after.length, 1, "tab switch does not add a second Open full");
assert.equal(
  after[0].getAttribute("href"),
  tabs[1].url,
  "Open full follows the embodiment being previewed",
);

flush(() => root.unmount());
container.remove();
console.log("language preview Open full: 1 control, follows the active preview URL");
