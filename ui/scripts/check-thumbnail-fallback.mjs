import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { transform } from "sucrase";

const srcPath = resolve("src/lib/thumbnail-sources.ts");
const { code } = transform(readFileSync(srcPath, "utf8"), {
  transforms: ["typescript", "imports"],
  production: true,
  filePath: srcPath,
});
const sourcesMod = { exports: {} };
new Function("module", "exports", code)(sourcesMod, sourcesMod.exports);
const {
  thumbnailPreviewSources,
  thumbnailSourcesKey,
  thumbnailSourcesNeedReset,
  alignThumbnailPreviewState,
  advanceThumbnailPreviewState,
} = sourcesMod.exports;

assert.deepEqual(
  thumbnailPreviewSources(
    "https://katagami.ai/api/file/landing",
    "https://katagami.ai/api/file/embodiment",
  ),
  [
    "https://katagami.ai/api/file/landing",
    "https://katagami.ai/api/file/embodiment",
  ],
  "landing thumb is first; embodiment is the fallback",
);

assert.deepEqual(
  thumbnailPreviewSources("  /api/file/a  ", "/api/file/a", "/api/file/b"),
  ["/api/file/a", "/api/file/b"],
  "blank and duplicate URLs are dropped",
);

assert.deepEqual(
  thumbnailPreviewSources("", undefined, "  "),
  [],
  "no URLs means the card should use a placeholder, not a dead src",
);

const card = readFileSync(resolve("src/components/language-card.tsx"), "utf8");
assert.match(
  card,
  /thumbnailPreviewSources\(/,
  "language cards must build a fallback list, not a single dead-end src",
);
assert.match(
  card,
  /srcs=\{previewSrcs\}/,
  "ThumbnailPreview must receive the fallback list",
);
assert.doesNotMatch(
  card,
  /previewSrc = landingThumbUrl \|\| thumbnailAssetUrl/,
  "a 404 landing thumb must not hide the embodiment thumb",
);

const preview = readFileSync(
  resolve("src/components/thumbnail-preview.tsx"),
  "utf8",
);
assert.match(
  preview,
  /srcs\?: string\[\]/,
  "ThumbnailPreview must accept multiple sources",
);
assert.match(
  preview,
  /advanceOrFail/,
  "a failed src must try the next URL instead of swapping to the swatch",
);
assert.match(
  preview,
  /THUMBNAIL_LOAD_TIMEOUT_MS = 8000/,
  "a hung source must advance in 8s, not sit on a blank image",
);
assert.match(
  preview,
  /IntersectionObserver/,
  "the 8s hang clock must wait until the card is near the viewport",
);
assert.match(
  preview,
  /rootMargin/,
  "near-viewport load must start before the card is on screen",
);
assert.match(
  card,
  /getFileUrl\(thumbnailFileId\)/,
  "a missing published asset URL must still have the file-id fallback",
);
assert.match(
  preview,
  /thumbnailSourcesKey/,
  "ThumbnailPreview must use thumbnailSourcesKey so a sources[0]+length key cannot hide a same-landing replace",
);
assert.match(
  preview,
  /key=\{src\}/,
  "key={src} keeps a loaded first URL mounted when the fallback list grows",
);
assert.match(
  preview,
  /attempt=\{aligned\.srcIndex\}/,
  "srcIndex hops must reset GalleryImage failed without changing key={src}",
);
assert.doesNotMatch(
  preview,
  /srcIndex\}:\$\{src/,
  "key={srcIndex:src} remounts a loaded thumb when the list grows and the 8s timer can swap it",
);

const deadUrl = "https://example.com/dead.jpg";
const goodUrl = "https://example.com/good.jpg";
const otherGood = "https://example.com/other-good.jpg";

function initial(sources) {
  return alignThumbnailPreviewState(sources, {
    sourcesKey: "",
    failed: true,
    loaded: true,
    srcIndex: 99,
  });
}

{
  let view = initial([deadUrl, goodUrl]);
  assert.equal(view.src, deadUrl);
  view = advanceThumbnailPreviewState([deadUrl, goodUrl], view);
  assert.equal(view.src, goodUrl, "first 404 must advance to the fallback URL");
  view = alignThumbnailPreviewState([otherGood], view);
  assert.equal(view.srcIndex, 0, "srcIndex must reset when sources identity changes");
  assert.equal(view.src, otherGood);
  assert.equal(view.failed, false);
}

{
  const exhausted = [deadUrl, deadUrl];
  const replaced = [deadUrl, goodUrl];
  assert.equal(replaced[0], exhausted[0]);
  assert.equal(replaced.length, exhausted.length);
  assert.equal(
    `${exhausted[0]}:${exhausted.length}`,
    `${replaced[0]}:${replaced.length}`,
    "a sources[0]+length key would treat this replace as unchanged",
  );
  assert.notEqual(
    thumbnailSourcesKey(exhausted),
    thumbnailSourcesKey(replaced),
    "same first URL and length must still be a new identity",
  );

  let view = initial(exhausted);
  view = advanceThumbnailPreviewState(exhausted, view);
  view = advanceThumbnailPreviewState(exhausted, view);
  assert.equal(view.failed, true);
  view = alignThumbnailPreviewState(replaced, view);
  assert.equal(view.failed, false);
  assert.equal(view.srcIndex, 0);
  assert.equal(view.src, deadUrl);
}

{
  const a = "https://example.com/a.jpg";
  const b = "https://example.com/b.jpg";
  let view = initial([a, b]);
  view = advanceThumbnailPreviewState([a, b], view);
  const again = alignThumbnailPreviewState([a, b], view);
  assert.equal(again.srcIndex, 1, "same URLs as a new array must not reset");
  assert.equal(again.src, b);
}

{
  const good = "https://example.com/good.jpg";
  const other = "https://example.com/other.jpg";
  let view = initial([good]);
  view = { ...view, loaded: true };
  assert.equal(
    thumbnailSourcesNeedReset([good, other], view),
    false,
    "array grew but [0] is the same loaded URL — not a remount",
  );
  view = alignThumbnailPreviewState([good, other], view);
  assert.equal(view.loaded, true, "must not zero loaded when [0] is unchanged and already loaded");
  assert.equal(view.srcIndex, 0);
  assert.equal(view.src, good);
  assert.equal(view.failed, false);
}

{
  const landing = "https://example.com/landing.jpg";
  const emb = "https://example.com/emb.jpg";
  let view = initial([landing, emb]);
  view = advanceThumbnailPreviewState([landing, emb], view);
  view = { ...view, loaded: true };
  assert.equal(view.srcIndex, 1);
  assert.equal(view.src, emb);
  assert.equal(
    thumbnailSourcesNeedReset([landing], view),
    true,
    "shrink that drops the showing slot must reset — srcIndex is past the new list",
  );
  view = alignThumbnailPreviewState([landing], view);
  assert.equal(view.srcIndex, 0, "shrink while showing a later source must retry landing");
  assert.equal(view.src, landing);
  assert.equal(view.failed, false);
  assert.equal(view.loaded, false, "the loaded flag belonged to the dropped URL");
}

// ── Same sequence on a mounted ThumbnailPreview instance ───────────
const { loadUiModule, createFlush } = await import("./react-harness.mjs");
const { ThumbnailPreview } = loadUiModule("src/components/thumbnail-preview.tsx");
const { React, createRoot, flush } = createFlush();

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
  return container.querySelector("img");
}

function isPlaceholder(container) {
  return currentImg(container) === null;
}

const pendingLoadTimeouts = [];
let timeoutHandle = 4000;
const realSetTimeout = window.setTimeout.bind(window);
const realClearTimeout = window.clearTimeout.bind(window);
window.setTimeout = (fn, ms, ...args) => {
  if (ms === 8000) {
    const handle = ++timeoutHandle;
    pendingLoadTimeouts.push({ handle, fn, args });
    return handle;
  }
  return realSetTimeout(fn, ms, ...args);
};
window.clearTimeout = (handle) => {
  const i = pendingLoadTimeouts.findIndex((t) => t.handle === handle);
  if (i >= 0) pendingLoadTimeouts.splice(i, 1);
  else realClearTimeout(handle);
};
function fireLoadTimeouts() {
  const due = pendingLoadTimeouts.splice(0);
  if (due.length === 0) return;
  flush(() => {
    for (const t of due) t.fn(...(t.args ?? []));
  });
}

const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);

flush(() => {
  root.render(React.createElement(Harness, { srcs: [deadUrl, goodUrl] }));
});

let img = currentImg(container);
assert.ok(img, "eager preview must render the first src, not the swatch");
assert.equal(img.getAttribute("src"), deadUrl);

flush(() => {
  img.dispatchEvent(new window.Event("error", { bubbles: true }));
});

img = currentImg(container);
assert.ok(img, "a 404 must try the next src instead of the placeholder");
assert.equal(img.getAttribute("src"), goodUrl);

flush(() => {
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

flush(() => {
  root.unmount();
});

// Same landing URL and length after the list exhausted. A sources[0]+length
// key treats this as unchanged and stays on the placeholder; the full-list
// key must reset, retry, and reach the new fallback.
{
  const exhausted = [deadUrl, deadUrl];
  const replaced = [deadUrl, goodUrl];
  assert.equal(replaced[0], exhausted[0]);
  assert.equal(replaced.length, exhausted.length);

  const sameLandingRoot = createRoot(container);
  flush(() => {
    sameLandingRoot.render(React.createElement(Harness, { srcs: exhausted }));
  });

  img = currentImg(container);
  assert.ok(img);
  assert.equal(img.getAttribute("src"), deadUrl);

  flush(() => {
    img.dispatchEvent(new window.Event("error", { bubbles: true }));
  });
  img = currentImg(container);
  assert.ok(
    img,
    "identical dead URLs must hop/retry immediately, not sit on GalleryImage.failed until the 8s timer",
  );
  assert.equal(img.getAttribute("src"), deadUrl);
  flush(() => {
    img.dispatchEvent(new window.Event("error", { bubbles: true }));
  });
  assert.equal(
    isPlaceholder(container),
    true,
    "exhausting the list must swap to the palette-dot placeholder",
  );

  flush(() => {
    sameLandingRoot.render(React.createElement(Harness, { srcs: replaced }));
  });

  img = currentImg(container);
  assert.ok(
    img,
    "same first URL + length with a new fallback must leave the placeholder",
  );
  assert.equal(img.getAttribute("src"), deadUrl);

  flush(() => {
    img.dispatchEvent(new window.Event("error", { bubbles: true }));
  });
  img = currentImg(container);
  assert.ok(img, "after reset the new fallback must be reachable");
  assert.equal(
    img.getAttribute("src"),
    goodUrl,
    "a sources[0]+length key would have stayed failed; the new rest of the list must show",
  );
  assert.equal(isPlaceholder(container), false);

  flush(() => {
    sameLandingRoot.unmount();
  });
}

// [good] already loaded, then the list grows. key={src} plus a kept
// `loaded` flag must not let the 8s hang timer swap to the new fallback.
{
  const growRoot = createRoot(container);
  flush(() => {
    growRoot.render(React.createElement(Harness, { srcs: [goodUrl] }));
  });
  img = currentImg(container);
  assert.ok(img);
  assert.equal(img.getAttribute("src"), goodUrl);
  flush(() => {
    img.dispatchEvent(new window.Event("load", { bubbles: true }));
  });
  assert.equal(currentImg(container)?.getAttribute("src"), goodUrl);

  flush(() => {
    growRoot.render(React.createElement(Harness, { srcs: [goodUrl, otherGood] }));
  });
  img = currentImg(container);
  assert.ok(img, "growing the list must keep the loaded first URL");
  assert.equal(img.getAttribute("src"), goodUrl);
  fireLoadTimeouts();
  img = currentImg(container);
  assert.ok(img);
  assert.equal(
    img.getAttribute("src"),
    goodUrl,
    "key={src} plus a loaded [0] must not 8s-swap to the new fallback",
  );
  assert.notEqual(img.getAttribute("src"), otherGood);

  flush(() => {
    growRoot.unmount();
  });
}

// Leftover 1: [dead, dead] same URL twice. First error must not pin the
// card on a stale GalleryImage failed flag just because slot 1 equals slot 0.
{
  const dupRoot = createRoot(container);
  flush(() => {
    dupRoot.render(React.createElement(Harness, { srcs: [deadUrl, deadUrl] }));
  });
  img = currentImg(container);
  assert.ok(img);
  assert.equal(img.getAttribute("src"), deadUrl);
  flush(() => {
    img.dispatchEvent(new window.Event("error", { bubbles: true }));
  });
  img = currentImg(container);
  assert.ok(
    img,
    "same-URL hop must retry without waiting on the 8s hang timer",
  );
  assert.equal(img.getAttribute("src"), deadUrl);
  assert.equal(
    pendingLoadTimeouts.length > 0,
    true,
    "a hang timer may still be armed for the retry, but the hop itself already painted",
  );
  flush(() => {
    dupRoot.unmount();
  });
}

// Leftover 2: showing a later source, then the list shrinks. Must retry
// landing — not sit on sources[1] === undefined forever.
{
  const landing = "https://example.com/landing.jpg";
  const emb = "https://example.com/emb.jpg";
  const shrinkRoot = createRoot(container);
  flush(() => {
    shrinkRoot.render(React.createElement(Harness, { srcs: [landing, emb] }));
  });
  img = currentImg(container);
  assert.ok(img);
  assert.equal(img.getAttribute("src"), landing);
  flush(() => {
    img.dispatchEvent(new window.Event("error", { bubbles: true }));
  });
  img = currentImg(container);
  assert.ok(img, "404 landing must try the embodiment");
  assert.equal(img.getAttribute("src"), emb);
  flush(() => {
    img.dispatchEvent(new window.Event("load", { bubbles: true }));
  });

  flush(() => {
    shrinkRoot.render(React.createElement(Harness, { srcs: [landing] }));
  });
  img = currentImg(container);
  assert.ok(
    img,
    "shrink while showing embodiment must retry landing, not sit on an empty src",
  );
  assert.equal(img.getAttribute("src"), landing);
  assert.equal(isPlaceholder(container), false);

  flush(() => {
    shrinkRoot.unmount();
  });
}

console.log("thumbnail fallback contract: ok");
console.log("thumbnail src reset: ok");
