// Open full hold (locked): language detail embodiment preview
// (landing / dashboard). Exactly one Open full. It opens the page
// currently in the preview. Live Bluet now has zero. Two is fail.
// Zero is fail.
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

// Bluet-shaped: landing leads, then embodiment, then dashboard.
const tabs = [
  { key: "landing", label: "Landing", url: "/api/file/fl-bluet-landing" },
  { key: "embodiment", label: "Embodiment", url: "/api/file/fl-bluet-embodiment" },
  { key: "dashboard", label: "Dashboard", url: "/api/file/fl-bluet-dashboard" },
];

const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);

flush(() => {
  root.render(React.createElement(EmbodimentTabs, { tabs }));
});

function openFullLinks() {
  return [...container.querySelectorAll('a[target="_blank"]')].filter((a) =>
    /open full/i.test(`${a.getAttribute("aria-label") ?? ""} ${a.textContent ?? ""}`),
  );
}

function assertOne(href, surface) {
  const links = openFullLinks();
  assert.notEqual(links.length, 0, `zero is fail (${surface})`);
  assert.notEqual(links.length, 2, `two is fail (${surface})`);
  assert.equal(links.length, 1, `exactly one Open full on ${surface}`);
  assert.equal(
    links[0].getAttribute("href"),
    href,
    `Open full opens the ${surface} currently in the preview`,
  );
}

assertOne(tabs[0].url, "landing");

const dashboard = [...container.querySelectorAll("button")].find(
  (b) => b.textContent === "Dashboard",
);
assert.ok(dashboard, "dashboard tab is present");
flush(() => dashboard.click());
assertOne(tabs[2].url, "dashboard");

const landing = [...container.querySelectorAll("button")].find(
  (b) => b.textContent === "Landing",
);
assert.ok(landing, "landing tab is present");
flush(() => landing.click());
assertOne(tabs[0].url, "landing after return");

flush(() => root.unmount());
container.remove();
console.log("Open full hold: exactly 1; landing and dashboard open the previewed URL");
