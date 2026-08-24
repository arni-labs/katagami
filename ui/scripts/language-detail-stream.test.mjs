import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canRemixLanguage,
  identityStreamOutcome,
  languageHasRemixComposition,
  resolveRemixCatalogs,
  remixIslandPaint,
  remixPageMountsIsland,
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
  true,
  "Bluet pending pulses inside the remix island, not on the page",
);
assert.equal(
  streamShowsPulse(remixStreamOutcome(bluet, { palettes: [], arts: [] })),
  false,
  "catalogs [] is not a remix lane",
);
assert.equal(streamShowsPulse(remixStreamOutcome(bluet, { palettes, arts })), true);

function pageFirstPaint(language) {
  const outcome = remixStreamOutcome(language);
  const mountIsland = remixPageMountsIsland(outcome);
  return {
    chromeReady: true,
    awaitsCatalogs: false,
    mountIsland,
    pageRemixFallbackNull: false,
    islandPaint: remixIslandPaint(outcome, mountIsland),
  };
}

async function islandAfterLists(language, listPalettes, listArts) {
  const mounted = remixPageMountsIsland(remixStreamOutcome(language));
  if (!mounted) {
    return { paint: remixIslandPaint("empty", false), showLane: false, fetch: false };
  }
  let catalogs;
  let failed = false;
  try {
    catalogs = await Promise.all([listPalettes(), listArts()]).then(
      ([p, a]) => ({ palettes: p, arts: a }),
    );
  } catch {
    failed = true;
    catalogs = { palettes: [], arts: [] };
  }
  const outcome = remixStreamOutcome(language, catalogs);
  const paint = remixIslandPaint(failed ? "empty" : outcome, true);
  return {
    paint,
    showLane: paint === "lane",
    fetch: true,
    foreverSkeleton: paint === "pulse" && outcome !== "pending",
  };
}

const bluetPaint = pageFirstPaint(bluet);
assert.equal(bluetPaint.chromeReady, true, "1: hero/spec/embodiments paint before catalogs");
assert.equal(bluetPaint.awaitsCatalogs, false, "1: LanguageDetailPage must not await catalogs");
assert.equal(bluetPaint.mountIsland, true, "2: Bluet mounts the remix island");
assert.equal(bluetPaint.pageRemixFallbackNull, false, "2: remix pending is not page fallback={null}");
assert.equal(bluetPaint.islandPaint, "pulse", "2: island paints the #245 pulse while catalogs are in flight");

const noLandingPaint = pageFirstPaint(noLanding);
assert.equal(noLandingPaint.mountIsland, false, "4: no-landing stays dark");
assert.equal(noLandingPaint.islandPaint, "dark");
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
  "catch-to-[] helper still exists — the island settles that empty to dark",
);

const caught = await islandAfterLists(
  bluet,
  async () => {
    throw new Error("listPaletteSystems failed");
  },
  async () => {
    throw new Error("listArtStyles failed");
  },
);
assert.equal(caught.showLane, false, "3: do not invent a fake remix lane after []");
assert.equal(caught.paint, "dark", "5: throw listArtStyles → slot goes dark");
assert.equal(caught.foreverSkeleton, false, "5: resolved throw is not a forever skeleton");

const emptyLists = await islandAfterLists(bluet, async () => [], async () => []);
assert.equal(emptyLists.showLane, false, "3: [] is not a remix lane");
assert.equal(emptyLists.paint, "dark", "5: resolved [] → slot goes dark");
assert.equal(emptyLists.foreverSkeleton, false, "5: resolved [] is not a forever skeleton");

assert.equal(
  remixIslandPaint("pending", true),
  "pulse",
  "2: still in flight still pulses",
);
assert.equal(
  remixIslandPaint("empty", true),
  "dark",
  "5: resolved empty is dark, not a lying shell",
);

const noLandingIsland = await islandAfterLists(
  noLanding,
  async () => palettes,
  async () => arts,
);
assert.equal(noLandingIsland.fetch, false, "4: no-landing must not fetch catalogs");
assert.equal(noLandingIsland.paint, "dark");

const ready = await islandAfterLists(
  bluet,
  async () => palettes,
  async () => arts,
);
assert.equal(ready.paint, "lane");
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
  "1: LanguageDetailPage must not await catalogs",
);
assert.doesNotMatch(
  pageSrc,
  /await resolveRemixCatalogs/,
  "1: catalog await belongs in the remix island, not the page",
);
assert.doesNotMatch(
  pageSrc,
  /remixStreamOutcome\(lang,/,
  "1: the page must not pass catalogs — it does not have them at first paint",
);
assert.match(
  pageSrc,
  /remixStreamOutcome\(lang\)/,
  "4: page mount gate uses lang only so no-landing stays unmounted",
);
assert.match(
  pageSrc,
  /<LanguageRemixIsland/,
  "2: remix pending lives in the island, not page fallback={null}",
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageRemix/,
  "2: do not solve pending with remix fallback={null}",
);
assert.match(
  remixSrc,
  /<Suspense fallback=\{<LanguageSectionSkeleton/,
  "2: island paints the #245 pulse while listArtStyles is in flight",
);
assert.match(
  remixSrc,
  /await loadLanguageRemixCatalogs\(\)/,
  "pending vs empty is decided where the catalog fetch runs",
);
assert.doesNotMatch(
  remixSrc,
  /return <LanguageSectionSkeleton/,
  "5: resolved [] / throw must not keep LanguageSectionSkeleton up",
);
assert.match(
  remixSrc,
  /\} catch \{\s*\/\/ Resolved throw[\s\S]*return null;/,
  "5: throw after the fetch settles to dark",
);
assert.match(
  remixSrc,
  /if \(!canRemixLanguage\([^)]*\)\) \{\s*\/\/ Resolved \[\][\s\S]*return null;/,
  "5: resolved [] goes dark after the fetch, not during pending",
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
assert.doesNotMatch(
  pageSrc,
  /streamShowsPulse\(remixOutcome\)/,
  "page must not turn remix pending into a page-level LanguageSectionSkeleton",
);

console.log(
  "language-detail stream: five holds — first paint, island pulse, no fake lane, no-landing, resolved empty is dark",
);
