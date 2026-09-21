import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { transform } from "sucrase";
import { createFlush } from "./react-harness.mjs";

const require = createRequire(import.meta.url);
function load(file, stubs) {
  const { code } = transform(readFileSync(file, "utf8"), {
    transforms: ["typescript", "jsx", "imports"], jsxRuntime: "automatic", production: true,
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)((id) => {
    if (id in stubs) return stubs[id];
    if (id.startsWith("@/")) throw new Error(`Unexpected dependency: ${id}`);
    return require(id);
  }, mod, mod.exports);
  return mod.exports;
}

const { React, createRoot, flush } = createFlush();
const settle = async (respond, check) => {
  const run = async () => { respond(); };
  if (typeof React.act === "function") await React.act(run);
  else await run();
  // Production React schedules promise-driven updates outside flushSync.
  // Wait for the asserted DOM state, not one assumed event-loop turn.
  const deadline = performance.now() + 2_000;
  while (true) {
    try { check(); return; }
    catch (error) { if (performance.now() >= deadline) throw error; }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

test("the site renders its gallery even when catalog and identity reads never resolve", () => {
  let reads = 0;
  const blocked = () => { reads++; return new Promise(() => {}); };
  const placeholder = () => null;
  const components = {
    "header-nav": "HeaderNav", "mobile-menu": "MobileMenu",
    "theme-toggle": "ThemeToggle", "user-menu": "UserMenu", "scroll-reveal": "ScrollReveal",
  };
  const stubs = {
    "next/cache": { unstable_cache: (fn) => fn },
    "next/link": { __esModule: true, default: "a" },
    "@/lib/entity-visibility": { hasFullGalleryAccess: blocked },
    "@/lib/odata": { listDesignLanguages: blocked, listArtStyles: blocked, listPaletteSystems: blocked },
    "@/lib/catalog": { featuredIds: blocked },
    "@/lib/featured.mjs": { isShownToVisitorsRecord: () => true },
    "@/components/command-palette": { CommandPalette: placeholder, CommandPaletteTrigger: placeholder },
  };
  for (const [path, name] of Object.entries(components)) stubs[`@/components/${path}`] = { [name]: placeholder };
  const Layout = load("src/app/(site)/layout.tsx", stubs).default;
  const tree = Layout({ children: React.createElement("main", null, "Gallery ready") });
  assert.equal(typeof tree?.then, "undefined", "layout must not await optional search/identity reads");
  assert.match(require("react-dom/server").renderToStaticMarkup(tree), /Gallery ready/);
  assert.equal(reads, 0, "initial gallery render must not build the search catalog");
});

test("search endpoint determines access server-side and never publicly caches a full index", async () => {
  let access = false;
  const tiers = [];
  const { GET } = load("src/app/api/command-palette/route.ts", {
    "@/lib/entity-visibility": { hasFullGalleryAccess: async () => access },
    "@/lib/command-palette-index": { buildSearchIndex: async (tier) => { tiers.push(tier); return [{ name: tier }]; } },
  });
  const sample = await GET(new Request("https://katagami.ai/api/command-palette?tier=full"));
  assert.deepEqual(await sample.json(), [{ name: "sample" }]);
  assert.equal(sample.headers.get("cache-control"), "private, no-store");
  access = true;
  const full = await GET();
  assert.deepEqual(await full.json(), [{ name: "full" }]);
  assert.equal(full.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(tiers, ["sample", "full"]);
});

test("palette loads on demand, retries, aborts on close and discards late results", async () => {
  const calls = [];
  const navigations = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => new Promise((resolve, reject) => calls.push({ url, options, resolve, reject }));
  const { CommandPalette } = load("src/components/command-palette.tsx", {
    "next/navigation": { useRouter: () => ({ push(href) { navigations.push(href); } }) },
    "@/lib/analytics": { track() {}, trackLanguageClick() {}, trackSearch() {} },
    "@/lib/chrome-stamp": { CHROME_STAMP: "", CHROME_STAMP_LABEL: "" },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const open = () => flush(() => window.dispatchEvent(new window.Event("katagami:palette")));
  const close = () => flush(() => host.querySelector('[aria-label="Close search"]').click());
  try {
    flush(() => root.render(React.createElement(CommandPalette)));
    assert.equal(calls.length, 0, "mounting the gallery must not fetch search");
    open();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/command-palette");
    assert.equal(calls[0].options.cache, "no-store");
    assert.match(host.textContent, /Loading search/);
    assert.doesNotMatch(host.textContent, /no matches/);
    await settle(
      () => calls[0].resolve(new Response("unavailable", { status: 503 })),
      () => assert.match(host.textContent, /Could not load search/),
    );
    flush(() => [...host.querySelectorAll("button")].find((b) => b.textContent === "Try again").click());
    assert.equal(calls.length, 2);
    close();
    assert.equal(calls[1].options.signal.aborted, true);
    open();
    assert.equal(calls.length, 3, "reopening rechecks current server-side identity");
    flush(() => host.querySelector("input").dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    await settle(() => {
      calls[1].resolve(Response.json([{ id: "old", name: "Stale private result", kind: "language", href: "/language/old" }]));
      calls[2].resolve(Response.json([{ id: "public", name: "Current result", kind: "language", href: "/language/public" }]));
    }, () => assert.match(host.textContent, /Current result/));
    assert.doesNotMatch(host.textContent, /Stale private result/);
    flush(() => host.querySelector("input").dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    assert.deepEqual(navigations, ["/language/public"], "ArrowDown during loading must not strand keyboard selection");
  } finally {
    flush(() => root.unmount());
    host.remove();
    globalThis.fetch = originalFetch;
  }
});
