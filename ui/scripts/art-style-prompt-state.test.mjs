import assert from "node:assert/strict";
import {
  artStyleGallerySources,
  artStyleManifestationFileIds,
} from "../src/lib/art-style-prompt-state.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const privateGallery = artStyleGallerySources({
  status: "UnderReview",
  promptVerified: false,
  referenceUrls: [],
  manifestationUrls: ["old-bicycle", "old-lighthouse"],
  thumbnailUrl: "thumbnail",
});
assert.deepEqual(privateGallery, { hero: "thumbnail", gallery: [] });

const publishedGallery = artStyleGallerySources({
  status: "Published",
  promptVerified: false,
  referenceUrls: ["reference"],
  manifestationUrls: ["proof-1", "proof-2"],
  thumbnailUrl: "thumbnail",
});
assert.deepEqual(publishedGallery, {
  hero: "thumbnail",
  gallery: ["proof-1", "proof-2", "reference"],
});

const verifiedGallery = artStyleGallerySources({
  status: "UnderReview",
  promptVerified: true,
  referenceUrls: ["reference"],
  manifestationUrls: ["proof-1", "proof-2"],
  thumbnailUrl: "thumbnail",
});
assert.deepEqual(verifiedGallery, {
  hero: "thumbnail",
  gallery: ["proof-1", "proof-2", "reference"],
});

const proofItems = [
  ["portrait-a", "human_portrait"],
  ["animal-a", "nonhuman_living"],
  ["object-a", "still_life_object"],
  ["landscape-a", "landscape_environment"],
  ["portrait-b", "human_portrait"],
  ["animal-b", "nonhuman_living"],
  ["object-b", "still_life_object"],
  ["landscape-b", "landscape_environment"],
].map(([file_id, category]) => ({ file_id, category }));
const proofFileIds = proofItems.map((item) => item.file_id);

assert.deepEqual(
  artStyleManifestationFileIds({
    proofManifest: JSON.stringify({ schema_version: "3", items: proofItems }),
    proofFileIds,
    thumbnailFileId: "portrait-b",
  }),
  ["portrait-b", "animal-a", "object-a", "landscape-a"],
);

assert.deepEqual(
  artStyleManifestationFileIds({
    proofManifest: JSON.stringify({
      schema_version: "3",
      items: proofItems,
      presentation: {
        schema_version: "1",
        hero_file_id: "landscape-b",
        items: [
          { file_id: "landscape-b", category: "landscape_environment", selection_reason: "hero" },
          { file_id: "portrait-a", category: "human_portrait", selection_reason: "figure" },
          { file_id: "object-b", category: "still_life_object", selection_reason: "object" },
          { file_id: "animal-a", category: "nonhuman_living", selection_reason: "animal" },
        ],
      },
    }),
    proofFileIds,
    thumbnailFileId: "landscape-b",
  }),
  ["landscape-b", "portrait-a", "object-b", "animal-a"],
);

const here = path.dirname(fileURLToPath(import.meta.url));
const detailPage = fs.readFileSync(
  path.join(here, "../src/app/(site)/art-styles/[id]/page.tsx"),
  "utf8",
);
const demoCatalog = fs.readFileSync(
  path.join(here, "../src/lib/demo-catalog.ts"),
  "utf8",
);
assert.match(detailPage, /rounded-\[2px\]/);
assert.match(detailPage, /rounded-\[3px\] p-3 font-mono text-\[12px\]/);
assert.match(detailPage, /space-y-1\.5 text-\[13px\]/);
assert.match(detailPage, /mb-4 max-w-2xl text-\[14px\]/);
assert.match(
  detailPage,
  /An engine-agnostic style recipe: curated manifestations across subjects and one portable prompt\./,
);
assert.match(detailPage, />Prompt template</);
assert.match(detailPage, /label="Copy recipe"/);
assert.match(detailPage, /label="Copy prompt only"/);
assert.match(detailPage, /\{gallery\.map\(\(src, i\) => \(/);
assert.doesNotMatch(detailPage, /gallery\.slice\(/);
assert.doesNotMatch(detailPage, /ArtStyleEvidence/);
assert.doesNotMatch(detailPage, /artStylePromptLabel/);
assert.doesNotMatch(detailPage, /negative_prompt/);
assert.doesNotMatch(detailPage, /engine_hints/);
assert.doesNotMatch(detailPage, />Negative prompt</);
assert.doesNotMatch(detailPage, />Engine hints</);
assert.doesNotMatch(demoCatalog, /\{subject\}|\{palette\}/);
assert.equal(
  (demoCatalog.match(/prompt: "Reconstruct the supplied subject entirely/g) ?? [])
    .length,
  8,
);

console.log("art-style prompt presentation states: pass");
