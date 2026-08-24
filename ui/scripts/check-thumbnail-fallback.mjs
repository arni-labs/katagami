import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { thumbnailPreviewSources } from "../src/lib/thumbnail-sources.ts";

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

console.log("thumbnail fallback contract: ok");
