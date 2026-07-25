import assert from "node:assert/strict";
import {
  artStyleGallerySources,
  artStylePromptLabel,
  artStylePromptState,
} from "../src/lib/art-style-prompt-state.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

assert.equal(artStylePromptState("Published", true), "verified");
assert.equal(artStylePromptState("UnderReview", true), "verified");
assert.equal(artStylePromptState("Published", false), "published-legacy");
assert.equal(artStylePromptState("UnderReview", false), "owner-review");
assert.equal(artStylePromptState("Draft", false), "owner-review");

assert.equal(artStylePromptLabel("verified"), "Canonical aesthetic prompt");
assert.equal(artStylePromptLabel("published-legacy"), "Published legacy prompt");
assert.equal(artStylePromptLabel("owner-review"), "Draft prompt · owner review");

const privateGallery = artStyleGallerySources({
  status: "UnderReview",
  promptVerified: false,
  referenceUrls: [],
  proofUrls: ["old-bicycle", "old-lighthouse"],
  thumbnailUrl: "thumbnail",
});
assert.deepEqual(privateGallery, { hero: "thumbnail", gallery: [] });

const publishedGallery = artStyleGallerySources({
  status: "Published",
  promptVerified: false,
  referenceUrls: ["reference"],
  proofUrls: ["proof-1", "proof-2"],
  thumbnailUrl: "thumbnail",
});
assert.deepEqual(publishedGallery, {
  hero: "reference",
  gallery: ["proof-1", "proof-2"],
});

const verifiedGallery = artStyleGallerySources({
  status: "UnderReview",
  promptVerified: true,
  referenceUrls: ["reference"],
  proofUrls: ["proof-1", "proof-2"],
  thumbnailUrl: "thumbnail",
});
assert.deepEqual(verifiedGallery, {
  hero: "reference",
  gallery: ["proof-1", "proof-2"],
});

const here = path.dirname(fileURLToPath(import.meta.url));
const detailPage = fs.readFileSync(
  path.join(here, "../src/app/(site)/art-styles/[id]/page.tsx"),
  "utf8",
);
assert.match(detailPage, /rounded-\[2px\]/);
assert.match(detailPage, /rounded-\[3px\] p-3 font-mono text-\[12px\]/);
assert.match(detailPage, /space-y-1\.5 text-\[13px\]/);
assert.match(detailPage, /mb-4 max-w-2xl text-\[14px\]/);
assert.match(
  detailPage,
  /An engine-agnostic style recipe: a wide hero, proof shots across subjects, and a portable prompt\./,
);
assert.match(detailPage, />Prompt template</);
assert.match(detailPage, /label="Copy recipe"/);
assert.match(detailPage, /label="Copy prompt only"/);
assert.doesNotMatch(detailPage, /ArtStyleEvidence/);
assert.doesNotMatch(detailPage, /artStylePromptLabel/);

console.log("art-style prompt presentation states: pass");
