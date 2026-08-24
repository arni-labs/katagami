import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  thumbnailPreviewSources,
  thumbnailSourcesKey,
  alignThumbnailPreviewState,
  advanceThumbnailPreviewState,
} from "../src/lib/thumbnail-sources.ts";

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
  card,
  /getFileUrl\(thumbnailFileId\)/,
  "a missing published asset URL must still have the file-id fallback",
);
assert.match(
  preview,
  /thumbnailSourcesKey/,
  "ThumbnailPreview must reset on the full src-list identity, not sources[0]+length",
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
  assert.ok(img, "first 404 must advance to the second slot");
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

console.log("thumbnail fallback contract: ok");
console.log("thumbnail src reset: ok");
