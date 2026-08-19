import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ART_STYLE_HEADING,
  MUST_GENERATE_REAL_IMAGES,
  bindingForLanguage,
  hasBindingArtStyleContract,
  resolvePairedArtStyle,
  withArtStyleContract,
} from "../src/lib/design-md-art-style.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const route = fs.readFileSync(
  `${here}/../src/app/(site)/language/[id]/DESIGN.md/route.ts`,
  "utf8",
);
const actions = fs.readFileSync(
  `${here}/../src/components/spec-actions.tsx`,
  "utf8",
);
const lint = fs.readFileSync(
  `${here}/../../katagami-curation/agents/curator/skills/review-quality/SKILL.md`,
  "utf8",
);
assert.match(route, /withArtStyleContract/);
assert.match(actions, /language\/\$\{encodeURIComponent\(languageId\)\}\/\$\{suffix\}/);
assert.match(lint, /missing_art_style_link/);
assert.match(lint, /MUST generate real images/);

const galleyMd = `---
version: alpha
name: Galley
description: Agent-curated design language exported from Katagami as DESIGN.md.
colors:
  bg: "#FFFFFF"
typography:
  body:
    fontFamily: Inter
---

# Galley

## Overview

A proofing language.

## Don'ts

- No artwork without captions

## shadcn/ui Usage

Import from \`@/components/ui/*\`.
`;

const arts = [
  {
    entity_id: "as-hardline",
    fields: {
      name: "Hardline",
      slug: "hardline",
      medium: "ink",
      prompt_template: "Render {subject} as a hard-edge ink diagram. Palette {palette}.",
      negative_prompt: "no gradients, no photorealism",
    },
  },
  {
    entity_id: "as-galley",
    fields: {
      name: "Galley",
      slug: "galley",
      medium: "india ink",
      prompt_template: "Loose black India-ink line drawing of {subject}.",
      negative_prompt: "no photorealism",
    },
  },
];

assert.equal(
  resolvePairedArtStyle(
    { default_art_style_id: "as-hardline", imagery_direction: '{"pairs_with":"galley"}' },
    arts,
  )?.entity_id,
  "as-hardline",
  "default_art_style_id wins over pairs_with",
);

assert.equal(
  resolvePairedArtStyle(
    { imagery_direction: '{"pairs_with":"hardline"}' },
    arts,
  )?.entity_id,
  "as-hardline",
  "pairs_with slug resolves",
);

assert.equal(
  resolvePairedArtStyle({ name: "Galley", slug: "galley" }, arts)?.entity_id,
  "as-galley",
  "name/slug fallback resolves an unlinked language",
);

assert.equal(
  resolvePairedArtStyle(
    { imagery_direction: '{"pairs_with":"photogram"}' },
    [
      {
        entity_id: "as-photogram-draft",
        status: "Draft",
        fields: { name: "Photogram", slug: "photogram" },
      },
      {
        entity_id: "as-photogram-pub",
        status: "Published",
        fields: { name: "Photogram", slug: "photogram" },
      },
    ],
  )?.entity_id,
  "as-photogram-pub",
  "prefer the published art style when a draft twin exists",
);

const bound = bindingForLanguage(
  { name: "Galley", slug: "galley" },
  arts,
  "https://katagami.ai",
);
assert.equal(bound?.url, "https://katagami.ai/art-styles/as-galley");

const injected = withArtStyleContract(galleyMd, bound);
assert.match(
  injected,
  /^---\n[\s\S]*art_style:\n {2}name: Galley\n {2}slug: galley\n {2}url: "?https:\/\/katagami.ai\/art-styles\/as-galley"?\n/,
);
assert.match(injected, new RegExp(ART_STYLE_HEADING));
assert.match(injected, new RegExp(MUST_GENERATE_REAL_IMAGES));
assert.match(injected, /https:\/\/katagami.ai\/art-styles\/as-galley/);
assert.match(injected, /Loose black India-ink line drawing/);
assert.ok(
  injected.indexOf(ART_STYLE_HEADING) < injected.indexOf("## shadcn/ui Usage"),
  "Art Style section sits before shadcn usage",
);
assert.equal(hasBindingArtStyleContract(injected), true);
assert.equal(hasBindingArtStyleContract(galleyMd), false);

const again = withArtStyleContract(injected, bound);
assert.equal(
  again.split(ART_STYLE_HEADING).length - 1,
  1,
  "re-injection replaces, does not duplicate",
);
assert.equal(again.split("art_style:").length - 1, 1);

const techniqueOnly = withArtStyleContract(galleyMd, {
  name: "Galley imagery",
  technique: "Loose black India-ink line drawing",
  negative: "no photorealism",
});
assert.match(techniqueOnly, /MUST generate real images/);
assert.match(techniqueOnly, /no first-class ArtStyle entity/);
assert.match(techniqueOnly, /Loose black India-ink line drawing/);

console.log("design-md art style contract: resolve + inject passes");
