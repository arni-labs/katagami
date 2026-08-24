import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canRemixLanguage,
  identityStreamOutcome,
  languageHasRemixComposition,
  resolveRemixCatalogs,
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
// Bluet: published language with landing + dashboard (ARN-380 class).
const bluet = lang({
  name: "Bluet",
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
assert.equal(languageHasRemixComposition(bluet), true);

assert.equal(remixStreamOutcome(noLanding), "empty");
assert.equal(remixStreamOutcome(landingOnly), "empty");
assert.equal(
  remixStreamOutcome(bluet),
  "pending",
  "omitted catalogs is pending, not empty — Bluet must pulse while listArtStyles loads",
);
assert.equal(
  remixStreamOutcome(bluet, { palettes: [], arts: [] }),
  "empty",
  "listArtStyles / listPaletteSystems catch to [] is a legal no-remix lane",
);
assert.equal(
  remixStreamOutcome(bluet, { palettes, arts: artsNoPrompt }),
  "empty",
);
assert.equal(remixStreamOutcome(bluet, { palettes, arts }), "render");

assert.equal(canRemixLanguage(bluet, [], []), false);
assert.equal(canRemixLanguage(bluet, palettes, arts), true);
assert.equal(canRemixLanguage(noLanding, palettes, arts), false);

assert.equal(
  streamShowsPulse(remixStreamOutcome(noLanding)),
  false,
  "no landingUrl must not pulse",
);
assert.equal(
  streamShowsPulse(remixStreamOutcome(landingOnly)),
  false,
  "landing without dashboard must not pulse",
);
assert.equal(
  streamShowsPulse(remixStreamOutcome(bluet)),
  true,
  "Bluet pending (landing+dashboard, catalogs omitted) must pulse",
);
assert.equal(
  streamShowsPulse(remixStreamOutcome(bluet, { palettes: [], arts: [] })),
  false,
  "catalogs [] must not pulse",
);
assert.equal(streamShowsPulse(remixStreamOutcome(bluet, { palettes, arts })), true);

async function pageRemixDecision(language, listPalettes, listArts) {
  if (!languageHasRemixComposition(language)) {
    const outcome = remixStreamOutcome(language);
    return {
      outcome,
      pulse: streamShowsPulse(outcome),
      mount: outcome !== "empty",
    };
  }
  const catalogs = await resolveRemixCatalogs(listPalettes, listArts);
  const outcome = remixStreamOutcome(language, catalogs);
  return {
    outcome,
    pulse: streamShowsPulse(outcome),
    mount: outcome !== "empty",
  };
}

const caughtEmpty = await pageRemixDecision(
  bluet,
  async () => {
    throw new Error("listPaletteSystems failed");
  },
  async () => {
    throw new Error("listArtStyles failed");
  },
);
assert.deepEqual(
  await resolveRemixCatalogs(
    async () => {
      throw new Error("listPaletteSystems failed");
    },
    async () => {
      throw new Error("listArtStyles failed");
    },
  ),
  { palettes: [], arts: [] },
  "listArtStyles / listPaletteSystems catch to [] — replay the catch, not omitted catalogs",
);
assert.equal(caughtEmpty.outcome, "empty");
assert.equal(
  caughtEmpty.pulse,
  false,
  "catch-to-[] on Bluet must not pulse — the page saw [] before any shell",
);
assert.equal(caughtEmpty.mount, false, "do not keep a fake remix lane after []");

let catalogLoads = 0;
const noLandingDecision = await pageRemixDecision(
  noLanding,
  async () => {
    catalogLoads += 1;
    return palettes;
  },
  async () => {
    catalogLoads += 1;
    return arts;
  },
);
assert.equal(noLandingDecision.outcome, "empty");
assert.equal(noLandingDecision.pulse, false, "no landingUrl must not pulse");
assert.equal(noLandingDecision.mount, false);
assert.equal(catalogLoads, 0, "no-landing must not fetch remix catalogs");

const ready = await pageRemixDecision(
  bluet,
  async () => palettes,
  async () => arts,
);
assert.equal(ready.outcome, "render");
assert.equal(ready.pulse, true);
assert.equal(ready.mount, true);

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

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSrc = fs.readFileSync(
  path.join(here, "../src/app/(site)/language/[id]/page.tsx"),
  "utf8",
);
const remixSrc = fs.readFileSync(
  path.join(here, "../src/components/language-remix-section.tsx"),
  "utf8",
);
const loadingSrc = fs.readFileSync(
  path.join(here, "../src/app/(site)/language/[id]/loading.tsx"),
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
const lineageSrc = fs.readFileSync(
  path.join(here, "../src/components/language-lineage.tsx"),
  "utf8",
);
const relatedSrc = fs.readFileSync(
  path.join(here, "../src/components/related-languages.tsx"),
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

assert.match(
  pageSrc,
  /languageHasRemixComposition\(lang\)/,
  "no-landing must not start a catalog fetch",
);
assert.match(
  pageSrc,
  /await loadLanguageRemixCatalogs\(\)/,
  "catalogs — including catch-to-[] — must resolve outside remix Suspense",
);
assert.match(
  pageSrc,
  /remixStreamOutcome\(lang, remixCatalogs\)/,
  "the page must pass resolved catalogs, not omit them as pending",
);
assert.doesNotMatch(
  pageSrc,
  /remixStreamOutcome\(lang\)/,
  "omitted catalogs on the page pulses, then the island's catch-to-[] collapses",
);
assert.match(
  loadingSrc,
  /LanguageDetailSkeleton/,
  "Bluet pending (catalogs in flight) pulses via the #245 route shell",
);
assert.match(pageSrc, /identityStreamOutcome/);
assert.match(pageSrc, /streamShowsPulse/);
assert.match(remixSrc, /canRemixLanguage/);
assert.match(remixSrc, /loadLanguageRemixCatalogs/);
assert.match(remixSrc, /catalogs \?\? \(await loadLanguageRemixCatalogs\(\)\)/);

assert.doesNotMatch(
  streamSrc,
  /export function lineageStreamOutcome/,
  "a constant-unknown lineage gate is not a fix",
);
assert.doesNotMatch(
  streamSrc,
  /export function relatedStreamOutcome/,
  "a constant-unknown related gate is not a fix",
);
assert.doesNotMatch(pageSrc, /lineageStreamOutcome/);
assert.doesNotMatch(pageSrc, /relatedStreamOutcome/);

assert.match(
  lineageSrc,
  /if \(parents\.length === 0 && children\.length === 0\) return null/,
);
assert.match(relatedSrc, /if \(scored\.length === 0\) return null/);
assert.match(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageLineage/,
  "lineage has no legal pulse from page fields — leftover not closed by a gate",
);
assert.match(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<RelatedLanguages/,
  "related has no legal pulse from page fields — leftover not closed by a gate",
);

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
  /<Suspense fallback=\{null\}>\s*<LanguageRemixSection/,
);

console.log(
  "language-detail stream: catch-to-[] replayed; Bluet pending is the route shell",
);
