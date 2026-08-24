import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { transform } from "sucrase";

const srcPath = resolve("src/lib/gallery-image.ts");
const { code } = transform(readFileSync(srcPath, "utf8"), {
  transforms: ["typescript", "imports"],
  production: true,
  filePath: srcPath,
});
const mod = { exports: {} };
new Function("module", "exports", code)(mod, mod.exports);
const { artStyleCardHero, canOptimizeGallerySrc, galleryImageSrc } = mod.exports;

assert.equal(
  galleryImageSrc("/api/file/fl-abc?v=asset-cdn-v3"),
  "/api/file/fl-abc",
  "local file-proxy URLs drop the cache-bust query so next/image accepts them",
);
assert.equal(
  galleryImageSrc("https://assets.katagami.ai/katagami/x/thumbnail.webp"),
  "https://assets.katagami.ai/katagami/x/thumbnail.webp",
  "CDN URLs stay intact",
);
assert.equal(galleryImageSrc("  "), "", "blank src is empty");

assert.equal(canOptimizeGallerySrc("/api/file/fl-abc"), true);
assert.equal(
  canOptimizeGallerySrc("https://assets.katagami.ai/katagami/x.jpg"),
  true,
);
assert.equal(
  canOptimizeGallerySrc("https://temperpaw-assets.katagami.ai/x.jpg"),
  true,
);
assert.equal(
  canOptimizeGallerySrc("https://example.com/x.jpg"),
  false,
  "unknown hosts must not go through next/image (it throws at SSR)",
);

assert.equal(
  artStyleCardHero({ thumb: "https://cdn/thumb", refs: ["https://cdn/ref"] }),
  "https://cdn/thumb",
  "the dedicated thumbnail wins over a full-size reference",
);
assert.equal(
  artStyleCardHero({ thumb: "", refs: ["https://cdn/ref"] }),
  "https://cdn/ref",
);
assert.equal(artStyleCardHero({ thumb: "", refs: [] }), "");

const nextConfig = readFileSync(resolve("next.config.ts"), "utf8");
assert.match(
  nextConfig,
  /hostname: "assets\.katagami\.ai"/,
  "next/image must allowlist the published asset CDN",
);
assert.match(
  nextConfig,
  /hostname: "temperpaw-assets\.katagami\.ai"/,
  "legacy asset host stays allowlisted so old URLs still optimize",
);

const artCard = readFileSync(resolve("src/components/art-style-card.tsx"), "utf8");
assert.match(artCard, /artStyleCardHero/, "art-style cards pick a single hero");
assert.doesNotMatch(
  artCard,
  /stripShots/,
  "gallery cards must not mount the proof-strip images",
);
assert.match(
  artCard,
  /GalleryImage/,
  "art-style heroes go through the shared optimizer wrapper",
);

const preview = readFileSync(
  resolve("src/components/thumbnail-preview.tsx"),
  "utf8",
);
assert.doesNotMatch(
  preview,
  /MAX_CONCURRENT_THUMBNAILS/,
  "the 6-wide queue is what left 54/60 language cards on the swatch",
);
assert.doesNotMatch(
  preview,
  /arrayBuffer/,
  "do not prefetch full originals into memory ahead of the viewport",
);
assert.match(
  preview,
  /GalleryImage/,
  "language thumbs use the same optimizer as art styles",
);

const languageCard = readFileSync(
  resolve("src/components/language-card.tsx"),
  "utf8",
);
assert.match(
  languageCard,
  /getFileUrl\(thumbnailFileId\)/,
  "published cards fall back to the file id when the CDN URL is empty",
);
assert.doesNotMatch(
  languageCard,
  /isPublished \? undefined : thumbnailFileId/,
  "published status must not hide the file-id fallback",
);

console.log("gallery image contract: ok");
