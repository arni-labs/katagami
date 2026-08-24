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
assert.equal(
  galleryImageSrc("https://katagami.ai/api/file/fl-abc?v=asset-cdn-v3"),
  "/api/file/fl-abc",
  "absolute same-origin file URLs become relative so next/image can resize them",
);
assert.equal(
  galleryImageSrc("https://www.katagami.ai/api/file/fl-abc"),
  "/api/file/fl-abc",
  "www host is treated as same-origin",
);
assert.equal(
  galleryImageSrc("https://katagami-abc.vercel.app/api/file/fl-abc?v=asset-cdn-v3"),
  "/api/file/fl-abc",
  "preview/deploy hosts must rewrite /api/file like production so next/image can resize them",
);
assert.equal(
  canOptimizeGallerySrc("https://katagami-abc.vercel.app/api/file/fl-abc"),
  true,
  "a rewritten vercel.app file URL must take the optimizer path",
);
assert.equal(
  galleryImageSrc("https://katagami-abc.vercel.app/other.jpg"),
  "https://katagami-abc.vercel.app/other.jpg",
  "non-file vercel URLs stay absolute",
);

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
assert.equal(
  artStyleCardHero({ thumb: "   ", refs: ["https://cdn/ref"] }),
  "https://cdn/ref",
  "whitespace is not a thumb — it must not hide refs[0]",
);
assert.equal(artStyleCardHero({ thumb: "", refs: [] }), "");
assert.equal(
  artStyleCardHero({ thumb: "   ", refs: ["   "] }),
  "",
  "whitespace refs are also not a hero",
);

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
assert.doesNotMatch(
  languageCard,
  /prefetch=\{false\}/,
  "do not disable Link prefetch — hover still warms the detail route",
);
assert.doesNotMatch(
  languageCard,
  /\bprefetch(?:=\{true\})?\s/,
  "do not force-prefetch every card — 60 language RSC payloads starve the thumbs",
);
assert.doesNotMatch(
  languageCard,
  /contentVisibility/,
  "content-visibility hid lazy thumbs from the loader and they timed out on dots",
);
assert.match(
  readFileSync(resolve("src/lib/gallery-image.ts"), "utf8"),
  /420px/,
  "language card sizes must cap below 1920w so a 250px card is not a 1920 fetch",
);

const languagePage = readFileSync(
  resolve("src/app/(site)/language/[id]/page.tsx"),
  "utf8",
);
assert.doesNotMatch(
  languagePage,
  /listArtStyles|listPaletteSystems/,
  "language first paint must not wait on the full remix catalogs",
);
assert.match(
  languagePage,
  /LanguageRemixIsland/,
  "remix catalogs stream in after the language itself paints",
);

const identity = readFileSync(
  resolve("src/components/language-identity.tsx"),
  "utf8",
);
assert.doesNotMatch(
  identity,
  /listArtStyles/,
  "identity resolves one art style — never the whole published lane",
);
assert.match(identity, /getArtStyle\b/, "identity fetches the paired style by id");

const artStylesPage = readFileSync(
  resolve("src/app/(site)/art-styles/page.tsx"),
  "utf8",
);
assert.match(
  artStylesPage,
  /unstable_cache/,
  "the art-style first page is a slim cached card list, not a live 4s collection",
);
assert.match(
  readFileSync(resolve("src/app/(site)/art-styles/loading.tsx"), "utf8"),
  /CardGridSkeleton/,
  "Art Styles nav must paint a shell immediately",
);
assert.match(
  readFileSync(resolve("src/app/(site)/language/[id]/loading.tsx"), "utf8"),
  /LanguageDetailSkeleton/,
  "language detail clicks must paint a shell immediately",
);

const homepage = readFileSync(resolve("src/app/(site)/page.tsx"), "utf8");
assert.doesNotMatch(
  homepage,
  /Browse gallery/,
  "the homepage hero no longer carries a Browse gallery button",
);

const laneItems = readFileSync(resolve("src/lib/lane-items.ts"), "utf8");
assert.match(
  laneItems,
  /artStyleCardHero/,
  "card items must pick the hero through artStyleCardHero so whitespace thumbs cannot hide refs[0]",
);
assert.match(
  laneItems,
  /proofs: \[\]/,
  "gallery card items still carry no proof-strip images",
);

const { alignGalleryImageState } = mod.exports;
{
  const cdnA = "https://example.com/a.jpg";
  const cdnB = "https://example.com/b.jpg";
  const proxy = "/api/file/fl-a";
  let view = alignGalleryImageState(cdnA, "", cdnA, false);
  assert.equal(view.current, cdnA);
  view = alignGalleryImageState(cdnA, view.seenSrc, proxy, false);
  assert.equal(
    view.current,
    proxy,
    "a 404 fallback must not snap back to the dead CDN URL",
  );
  view = alignGalleryImageState(cdnB, view.seenSrc, view.current, true);
  assert.equal(view.seenSrc, cdnB);
  assert.equal(view.current, cdnB, "src identity change must reset current");
  assert.equal(view.failed, false, "src identity change must clear failed");

  view = alignGalleryImageState(cdnA, cdnA, cdnA, true, 0, 0);
  assert.equal(view.failed, true, "same src + same attempt keeps failed");
  view = alignGalleryImageState(cdnA, view.seenSrc, view.current, view.failed, 1, view.seenAttempt);
  assert.equal(view.failed, false, "same src + attempt hop must clear failed");
  assert.equal(view.current, cdnA);
}

const galleryImageSrcFile = readFileSync(
  resolve("src/components/gallery-image.tsx"),
  "utf8",
);
assert.match(
  galleryImageSrcFile,
  /alignGalleryImageState/,
  "GalleryImage must reset current/failed when the src prop identity changes",
);

// ── Mounted replay: same instance, failed=true, then a new src ──
const { loadUiModule, createFlush } = await import("./react-harness.mjs");
const { GalleryImage } = loadUiModule("src/components/gallery-image.tsx");
const { React, createRoot, flush } = createFlush();

function GalleryHarness({ src, fallbackSrc, attempt }) {
  return React.createElement(GalleryImage, {
    src,
    fallbackSrc,
    attempt,
    alt: "art",
    sizes: "25vw",
    eager: true,
  });
}

const cdnA = "https://example.com/a.jpg";
const cdnB = "https://example.com/b.jpg";
const proxyA = "/api/file/fl-a";

const container = document.createElement("div");
document.body.appendChild(container);
const root = createRoot(container);

flush(() => {
  root.render(React.createElement(GalleryHarness, { src: cdnA }));
});

let img = container.querySelector("img");
assert.ok(img, "eager GalleryImage must render the first src");
assert.equal(img.getAttribute("src"), cdnA);

flush(() => {
  img.dispatchEvent(new window.Event("error", { bubbles: true }));
});
assert.equal(
  container.querySelector("img"),
  null,
  "onError with no fallback must set failed and return null",
);

flush(() => {
  root.render(React.createElement(GalleryHarness, { src: cdnB }));
});
img = container.querySelector("img");
assert.ok(
  img,
  "same instance after failed=true must render again when src identity changes",
);
assert.equal(
  img.getAttribute("src"),
  cdnB,
  "reused GalleryImage must show the new src, not stay null on the previous failed state",
);

flush(() => {
  root.render(React.createElement(GalleryHarness, { src: cdnA, fallbackSrc: proxyA }));
});
img = container.querySelector("img");
assert.equal(img.getAttribute("src"), cdnA);

flush(() => {
  img.dispatchEvent(new window.Event("error", { bubbles: true }));
});
img = container.querySelector("img");
assert.equal(img.getAttribute("src"), proxyA, "404 must heal to the proxy");

flush(() => {
  root.render(React.createElement(GalleryHarness, { src: cdnA, fallbackSrc: proxyA }));
});
img = container.querySelector("img");
assert.equal(
  img.getAttribute("src"),
  proxyA,
  "same src after fallback must keep the proxy, not retry the dead CDN URL",
);

flush(() => {
  root.unmount();
});

// Same src string, new attempt: parent hop after an error must retry,
// not stay null on the stale failed flag (key={src} does not remount).
{
  const hopRoot = createRoot(container);
  flush(() => {
    hopRoot.render(React.createElement(GalleryHarness, { src: cdnA, attempt: 0 }));
  });
  img = container.querySelector("img");
  assert.ok(img);
  flush(() => {
    img.dispatchEvent(new window.Event("error", { bubbles: true }));
  });
  assert.equal(container.querySelector("img"), null, "first error with no fallback returns null");

  flush(() => {
    hopRoot.render(React.createElement(GalleryHarness, { src: cdnA, attempt: 1 }));
  });
  img = container.querySelector("img");
  assert.ok(
    img,
    "attempt hop on the same src must clear failed without remounting via a new key",
  );
  assert.equal(img.getAttribute("src"), cdnA);

  flush(() => {
    hopRoot.unmount();
  });
}

console.log("gallery image contract: ok");
console.log("gallery image src reset: ok");
