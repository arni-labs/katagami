import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";
import { Window } from "happy-dom";

const here = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(here, "..");
const nodeRequire = createRequire(resolve(uiRoot, "package.json"));

const STUBS = {
  "next/cache": { unstable_cache: (fn) => fn },
};

function resolveModule(specifier, fromFile) {
  if (specifier in STUBS) return { stub: STUBS[specifier] };

  let base;
  if (specifier.startsWith("@/")) base = resolve(uiRoot, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return { external: nodeRequire(specifier) };

  for (const ext of ["", ".ts", ".tsx", ".json", "/index.ts"]) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return { file: candidate };
    }
  }
  throw new Error(`cannot resolve ${specifier} from ${fromFile}`);
}

const moduleCache = new Map();

function loadModule(file) {
  if (moduleCache.has(file)) return moduleCache.get(file);

  if (file.endsWith(".json")) {
    const json = JSON.parse(readFileSync(file, "utf8"));
    moduleCache.set(file, json);
    return json;
  }

  const { code } = transform(readFileSync(file, "utf8"), {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
    filePath: file,
  });
  const mod = { exports: {} };
  moduleCache.set(file, mod.exports);
  const req = (specifier) => {
    const resolved = resolveModule(specifier, file);
    if (resolved.stub) return resolved.stub;
    if (resolved.external) return resolved.external;
    return loadModule(resolved.file);
  };
  new Function("require", "module", "exports", code)(req, mod, mod.exports);
  return mod.exports;
}

const {
  advanceThumbnailPreviewState,
  alignThumbnailPreviewState,
  thumbnailSourcesKey,
} = loadModule(resolve(uiRoot, "src/lib/thumbnail-sources.ts"));

function initial(sources) {
  return alignThumbnailPreviewState(sources, {
    sourcesKey: "",
    failed: true,
    loaded: true,
    srcIndex: 99,
  });
}

// ── Rei's QA sequence against the same helpers the component uses ──
{
  const deadUrl = "https://cdn.example/dead.jpg";
  const goodUrl = "https://cdn.example/good.jpg";
  const otherGood = "https://cdn.example/other-good.jpg";

  let view = initial([deadUrl, goodUrl]);
  assert.equal(view.src, deadUrl);
  assert.equal(view.srcIndex, 0);

  view = advanceThumbnailPreviewState([deadUrl, goodUrl], view);
  assert.equal(view.srcIndex, 1, "first 404 must advance to the fallback URL");
  assert.equal(view.src, goodUrl);

  view = alignThumbnailPreviewState([otherGood], view);
  assert.equal(view.srcIndex, 0, "srcIndex must reset when sources identity changes");
  assert.equal(view.src, otherGood, "the replacement list must be tried from the start");
  assert.equal(view.failed, false);
  assert.equal(view.loaded, false);
  assert.notEqual(view.src, "");
}

// First URL + length is not a sufficient key.
{
  const landing = "https://cdn.example/landing.jpg";
  const oldEmbodiment = "https://cdn.example/old-embodiment.jpg";
  const newEmbodiment = "https://cdn.example/new-embodiment.jpg";

  let view = initial([landing, oldEmbodiment]);
  view = advanceThumbnailPreviewState([landing, oldEmbodiment], view);
  view = advanceThumbnailPreviewState([landing, oldEmbodiment], view);
  assert.equal(view.failed, true);
  assert.equal(view.srcIndex, 1);

  const nextSources = [landing, newEmbodiment];
  assert.equal(nextSources[0], landing);
  assert.equal(nextSources.length, 2);
  assert.notEqual(
    thumbnailSourcesKey([landing, oldEmbodiment]),
    thumbnailSourcesKey(nextSources),
    "same first URL and length must still be a new identity",
  );

  view = alignThumbnailPreviewState(nextSources, view);
  assert.equal(view.failed, false);
  assert.equal(view.srcIndex, 0);
  assert.equal(view.src, landing);
}

// Same URLs as a new array must not reset — cards rebuild srcs every render.
{
  const a = "https://cdn.example/a.jpg";
  const b = "https://cdn.example/b.jpg";
  let view = initial([a, b]);
  view = advanceThumbnailPreviewState([a, b], view);
  const again = alignThumbnailPreviewState([a, b], view);
  assert.equal(again.srcIndex, 1);
  assert.equal(again.src, b);
}

// ── Same sequence on a mounted ThumbnailPreview instance ───────────
const window = new Window({ url: "https://katagami.ai/" });
const { document } = window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = window;
globalThis.document = document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Image = window.Image;
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const React = nodeRequire("react");
const { act } = nodeRequire("react");
const { createRoot } = nodeRequire("react-dom/client");
const { ThumbnailPreview } = loadModule(
  resolve(uiRoot, "src/components/thumbnail-preview.tsx"),
);

function Harness({ srcs }) {
  return React.createElement(ThumbnailPreview, {
    srcs,
    alt: "preview",
    placeholderTint: "#111111",
    paletteColors: ["#ff0000"],
    eager: true,
  });
}

function currentImg(container) {
  return container.querySelector("img[data-katagami-thumbnail='true']");
}

function isPlaceholder(container) {
  return currentImg(container) === null;
}

const deadUrl = "https://cdn.example/dead.jpg";
const goodUrl = "https://cdn.example/good.jpg";
const otherGood = "https://cdn.example/other-good.jpg";

const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);

await act(() => {
  root.render(React.createElement(Harness, { srcs: [deadUrl, goodUrl] }));
});

let img = currentImg(container);
assert.ok(img, "eager preview must render the first src, not the swatch");
assert.equal(img.getAttribute("src"), deadUrl);

await act(() => {
  img.dispatchEvent(new window.Event("error", { bubbles: true }));
});

img = currentImg(container);
assert.ok(img, "a 404 must try the next src instead of the placeholder");
assert.equal(img.getAttribute("src"), goodUrl);

await act(() => {
  root.render(React.createElement(Harness, { srcs: [otherGood] }));
});

img = currentImg(container);
assert.ok(
  img,
  "after srcs shrink, a reused card must not sit on the palette-dot placeholder",
);
assert.equal(
  img.getAttribute("src"),
  otherGood,
  "srcIndex must reset so the new list is read from the start",
);
assert.equal(isPlaceholder(container), false);

await act(() => {
  root.unmount();
});

// ── Same reuse class: CdnImg keeps useState(src) across src changes ──
const { CdnImg, alignCdnImgCurrent } = loadModule(
  resolve(uiRoot, "src/components/cdn-img.tsx"),
);

{
  const cdnA = "https://assets.katagami.ai/a.jpg";
  const cdnB = "https://assets.katagami.ai/b.jpg";
  const proxy = "/api/file/fl-a";

  let view = alignCdnImgCurrent(cdnA, "", "");
  assert.equal(view.current, cdnA);

  view = alignCdnImgCurrent(cdnA, view.seenSrc, proxy);
  assert.equal(
    view.current,
    proxy,
    "a 404 fallback must not snap back to the dead CDN URL",
  );

  view = alignCdnImgCurrent(cdnB, view.seenSrc, view.current);
  assert.equal(view.seenSrc, cdnB);
  assert.equal(view.current, cdnB, "src identity change must reset current");
}

function CdnHarness({ src, fallbackSrc }) {
  return React.createElement(CdnImg, {
    src,
    fallbackSrc,
    alt: "art",
  });
}

const cdnA = "https://assets.katagami.ai/a.jpg";
const cdnB = "https://assets.katagami.ai/b.jpg";
const proxyA = "/api/file/fl-a";

const cdnRoot = createRoot(container);

await act(() => {
  cdnRoot.render(React.createElement(CdnHarness, { src: cdnA, fallbackSrc: proxyA }));
});

let cdnImg = container.querySelector("img");
assert.ok(cdnImg);
assert.equal(cdnImg.getAttribute("src"), cdnA);

await act(() => {
  cdnRoot.render(React.createElement(CdnHarness, { src: cdnB, fallbackSrc: proxyA }));
});

cdnImg = container.querySelector("img");
assert.ok(cdnImg);
assert.equal(
  cdnImg.getAttribute("src"),
  cdnB,
  "reused CdnImg must show the new src, not the previous current",
);

await act(() => {
  cdnRoot.render(React.createElement(CdnHarness, { src: cdnA, fallbackSrc: proxyA }));
});
cdnImg = container.querySelector("img");
assert.equal(cdnImg.getAttribute("src"), cdnA);

await act(() => {
  cdnImg.dispatchEvent(new window.Event("error", { bubbles: true }));
});
cdnImg = container.querySelector("img");
assert.equal(cdnImg.getAttribute("src"), proxyA, "404 must heal to the proxy");

await act(() => {
  cdnRoot.render(React.createElement(CdnHarness, { src: cdnA, fallbackSrc: proxyA }));
});
cdnImg = container.querySelector("img");
assert.equal(
  cdnImg.getAttribute("src"),
  proxyA,
  "same src after fallback must keep the proxy, not retry the dead CDN URL",
);

await act(() => {
  cdnRoot.render(React.createElement(CdnHarness, { src: cdnB, fallbackSrc: "/api/file/fl-b" }));
});
cdnImg = container.querySelector("img");
assert.equal(cdnImg.getAttribute("src"), cdnB);

await act(() => {
  cdnRoot.unmount();
});

console.log("thumbnail src reset: ok");
console.log("cdn-img src reset: ok");
