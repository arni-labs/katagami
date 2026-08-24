import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canRemixLanguage,
  identityStreamOutcome,
  languageHasRemixComposition,
  lineageStreamOutcome,
  relatedStreamOutcome,
  remixStreamOutcome,
  streamShowsPulse,
} from "../src/lib/language-detail-stream.ts";

function lang(fields) {
  return { entity_id: "dl-1", status: "Published", fields };
}

const noLanding = lang({ name: "No landing" });
const landingOnly = lang({
  name: "Landing only",
  landing_file_id: "fl-land",
});
const withComposition = lang({
  name: "Galley",
  landing_file_id: "fl-land",
  dashboard_file_id: "fl-dash",
});
const palettes = [{ entity_id: "ps-1", status: "Published", fields: {} }];
const arts = [
  {
    entity_id: "as-1",
    status: "Published",
    fields: { prompt_template: "paint {subject}" },
  },
];
const artsNoPrompt = [
  { entity_id: "as-2", status: "Published", fields: { name: "empty shell" } },
];

assert.equal(languageHasRemixComposition(noLanding), false);
assert.equal(languageHasRemixComposition(landingOnly), false);
assert.equal(languageHasRemixComposition(withComposition), true);

assert.equal(remixStreamOutcome(noLanding), "empty");
assert.equal(remixStreamOutcome(landingOnly), "empty");
assert.equal(
  remixStreamOutcome(withComposition),
  "unknown",
  "catalogs pending — remix is not known to render",
);
assert.equal(
  remixStreamOutcome(withComposition, { palettes: [], arts: [] }),
  "empty",
  "listArtStyles / listPaletteSystems catch to [] is a legal no-remix lane",
);
assert.equal(
  remixStreamOutcome(withComposition, { palettes, arts: artsNoPrompt }),
  "empty",
);
assert.equal(
  remixStreamOutcome(withComposition, { palettes, arts }),
  "render",
);

assert.equal(canRemixLanguage(withComposition, [], []), false);
assert.equal(canRemixLanguage(withComposition, palettes, arts), true);
assert.equal(canRemixLanguage(noLanding, palettes, arts), false);

for (const [label, outcome] of [
  ["no landingUrl", remixStreamOutcome(noLanding)],
  ["no dashboard", remixStreamOutcome(landingOnly)],
  ["catalogs pending", remixStreamOutcome(withComposition)],
  ["catalogs empty", remixStreamOutcome(withComposition, { palettes: [], arts: [] })],
]) {
  assert.equal(
    streamShowsPulse(outcome),
    false,
    `${label} must not paint a remix pulse (that pulse would then vanish)`,
  );
}

assert.equal(
  streamShowsPulse(remixStreamOutcome(withComposition, { palettes, arts })),
  true,
  "a language that will remix may show the loading.tsx pulse",
);

assert.equal(identityStreamOutcome({}), "empty");
assert.equal(
  identityStreamOutcome({
    tokens: JSON.stringify({ colors: { primary: "#111111" } }),
  }),
  "render",
);
assert.equal(
  identityStreamOutcome({ default_art_style_id: "as-1" }),
  "unknown",
);
assert.equal(
  streamShowsPulse(identityStreamOutcome({ default_art_style_id: "as-1" })),
  false,
  "linked art can 404 — a pulse would collapse",
);
assert.equal(
  streamShowsPulse(
    identityStreamOutcome({
      tokens: JSON.stringify({ colors: { primary: "#111111" } }),
    }),
  ),
  true,
);

assert.equal(lineageStreamOutcome(), "unknown");
assert.equal(relatedStreamOutcome(), "unknown");
assert.equal(
  streamShowsPulse(lineageStreamOutcome()),
  false,
  "lineage can return null (unpublished parents, no children)",
);
assert.equal(
  streamShowsPulse(relatedStreamOutcome()),
  false,
  "related can return null (no neighbours / no tag overlap)",
);

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSrc = fs.readFileSync(
  path.join(here, "../src/app/(site)/language/[id]/page.tsx"),
  "utf8",
);
const remixSrc = fs.readFileSync(
  path.join(here, "../src/components/language-remix-section.tsx"),
  "utf8",
);
const remixOpts = fs.readFileSync(
  path.join(here, "../src/lib/remix-options.ts"),
  "utf8",
);
const identitySrc = fs.readFileSync(
  path.join(here, "../src/components/language-identity.tsx"),
  "utf8",
);
const streamSrc = fs.readFileSync(
  path.join(here, "../src/lib/language-detail-stream.ts"),
  "utf8",
);
assert.match(
  remixOpts,
  /Boolean\(l\.fields\.landing_file_id\) && Boolean\(l\.fields\.dashboard_file_id\)/,
);
assert.match(
  streamSrc,
  /Boolean\(lang\.fields\.landing_file_id\) && Boolean\(lang\.fields\.dashboard_file_id\)/,
  "remix composition gate must stay the same as toLanguageOpts",
);
assert.match(remixOpts, /prompt_template/);
assert.match(streamSrc, /prompt_template/);
assert.match(identitySrc, /colors\.primary, colors\.accent, colors\.secondary/);
assert.match(streamSrc, /colors\.primary, colors\.accent, colors\.secondary/);

assert.match(pageSrc, /remixStreamOutcome/);
assert.match(pageSrc, /identityStreamOutcome/);
assert.match(pageSrc, /lineageStreamOutcome/);
assert.match(pageSrc, /relatedStreamOutcome/);
assert.match(pageSrc, /streamShowsPulse/);
assert.match(remixSrc, /canRemixLanguage/);

assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{<RemixLaneSkeleton/,
  "remix must not unconditionally paint RemixLaneSkeleton",
);
assert.match(
  pageSrc,
  /remixOutcome === "empty" \? null/,
  "no-remix languages must not mount the remix island at all",
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageIdentity/,
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageLineage/,
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<RelatedLanguages/,
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageRemixSection/,
);

console.log("language-detail stream: collapse replay ok");
