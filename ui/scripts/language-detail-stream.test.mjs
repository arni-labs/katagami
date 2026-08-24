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
  "omitted catalogs is pending, not empty — the island fetches; the page must not",
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
  false,
  "Bluet pending must not pulse at the page — that is catch-to-[] flash or #245 hold",
);
assert.equal(
  streamShowsPulse(remixStreamOutcome(bluet, { palettes: [], arts: [] })),
  false,
  "catalogs [] must not pulse",
);
assert.equal(streamShowsPulse(remixStreamOutcome(bluet, { palettes, arts })), true);

function pageFirstPaint(language) {
  const outcome = remixStreamOutcome(language);
  return {
    chromeReady: true,
    awaitsCatalogs: false,
    mountIsland: outcome !== "empty",
    pagePulse: streamShowsPulse(outcome),
  };
}

async function remixIslandDecision(language, listPalettes, listArts) {
  const catalogs = await resolveRemixCatalogs(listPalettes, listArts);
  const outcome = remixStreamOutcome(language, catalogs);
  return {
    outcome,
    showLane: outcome === "render",
    pulseThenNull: false,
  };
}

const bluetPaint = pageFirstPaint(bluet);
assert.equal(bluetPaint.chromeReady, true, "hero/spec/embodiments paint before catalogs");
assert.equal(bluetPaint.awaitsCatalogs, false);
assert.equal(bluetPaint.mountIsland, true, "Bluet mounts the remix island");
assert.equal(bluetPaint.pagePulse, false, "page remix fallback is not two h-72 pulses");

const noLandingPaint = pageFirstPaint(noLanding);
assert.equal(noLandingPaint.mountIsland, false, "no-landing stays dark");
assert.equal(noLandingPaint.pagePulse, false);
assert.equal(pageFirstPaint(landingOnly).mountIsland, false);

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

const caughtEmpty = await remixIslandDecision(
  bluet,
  async () => {
    throw new Error("listPaletteSystems failed");
  },
  async () => {
    throw new Error("listArtStyles failed");
  },
);
assert.equal(caughtEmpty.outcome, "empty");
assert.equal(caughtEmpty.showLane, false, "do not keep a fake remix lane after []");
assert.equal(caughtEmpty.pulseThenNull, false, "island decides after fetch — no pulse-then-null");

assert.equal(
  languageHasRemixComposition(noLanding),
  false,
  "no-landing never reaches the island fetch",
);

const ready = await remixIslandDecision(
  bluet,
  async () => palettes,
  async () => arts,
);
assert.equal(ready.outcome, "render");
assert.equal(ready.showLane, true);

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

assert.doesNotMatch(
  pageSrc,
  /await loadLanguageRemixCatalogs/,
  "LanguageDetailPage must not await catalogs — that holds first paint on loading.tsx",
);
assert.doesNotMatch(
  pageSrc,
  /await resolveRemixCatalogs/,
  "catalog await belongs in the remix island, not the page",
);
assert.doesNotMatch(
  pageSrc,
  /remixStreamOutcome\(lang,/,
  "the page must not pass catalogs — it does not have them at first paint",
);
assert.match(
  pageSrc,
  /remixStreamOutcome\(lang\)/,
  "page mount gate uses lang only so no-landing stays unmounted",
);
assert.match(
  remixSrc,
  /await loadLanguageRemixCatalogs\(\)/,
  "pending vs empty is decided where the catalog fetch runs",
);
assert.match(
  loadingSrc,
  /LanguageDetailSkeleton/,
  "route loading.tsx is the #245 click shell — it must not wait on remix catalogs",
);
assert.match(pageSrc, /identityStreamOutcome/);
assert.match(pageSrc, /streamShowsPulse/);
assert.match(remixSrc, /canRemixLanguage/);
assert.match(remixSrc, /loadLanguageRemixCatalogs/);

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
assert.match(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageRemixSection/,
  "remix pending is not a page pulse — island fetches, then render or null",
);
assert.doesNotMatch(
  pageSrc,
  /streamShowsPulse\(remixOutcome\)/,
  "page must not turn remix pending into LanguageSectionSkeleton",
);

console.log(
  "language-detail stream: first paint vs catalog await; catch-to-[] stays in the island",
);
