import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";
import {
  canRemixLanguage,
  identityStreamOutcome,
  languageHasRemixComposition,
  resolveRemixCatalogs,
  remixIslandEverSkeleton,
  remixIslandPaint,
  remixPageFallback,
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
    everSkeleton: remixIslandEverSkeleton(failed ? "empty" : outcome, true),
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
assert.equal(caught.showLane, false, "do not invent a fake remix lane after []");
assert.equal(caught.paint, "dark", "throw listArtStyles → slot goes dark");
assert.equal(caught.foreverSkeleton, false, "throw is not a forever skeleton");
assert.equal(
  caught.everSkeleton,
  false,
  "throw must never have painted two h-72",
);

const emptyLists = await islandAfterLists(bluet, async () => [], async () => []);
assert.equal(emptyLists.showLane, false, "[] is not a remix lane");
assert.equal(emptyLists.paint, "dark", "resolved [] → slot goes dark");
assert.equal(emptyLists.foreverSkeleton, false);
assert.equal(
  emptyLists.everSkeleton,
  false,
  "[] must never have painted two h-72",
);

assert.equal(remixIslandEverSkeleton("pending", true), true, "replay 1: Bluet in-flight may pulse");
assert.equal(
  remixIslandEverSkeleton("empty", true),
  false,
  "replay 2: empty / throw result path never painted a skeleton",
);
assert.equal(remixIslandEverSkeleton("render", true), true);

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
  /<LanguageRemixPageSlot/,
  "2: remix pending lives in the page slot, not page fallback={null}",
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageRemix/,
  "2: do not solve pending with remix fallback={null}",
);
assert.doesNotMatch(
  pageSrc,
  /fallback=\{<LanguageRemixIsland/,
  "pending pulse and empty/throw must not share one page-level fallback",
);
assert.match(
  remixSrc,
  /fallback: <LanguageRemixIsland lang=\{lang\} \/>/,
  "2: Bluet pending fallback is LanguageRemixIsland from fields",
);
assert.match(
  remixSrc,
  /<Suspense fallback=\{fallback\}>/,
  "2: pending pulse is the slot fallback, not a shared empty/throw fallback",
);
assert.match(remixSrc, /languageRemixPageBoundary/);
assert.match(remixSrc, /remixPageFallback/);
assert.doesNotMatch(
  remixSrc,
  /:has\(/,
  "do not hide two h-72 with :has after [] / throw and call replay 2 closed",
);
assert.doesNotMatch(remixSrc, /data-remix-empty/);
assert.doesNotMatch(remixSrc, /data-remix-pulse/);
assert.doesNotMatch(
  remixSrc,
  /<Suspense fallback=\{<LanguageSectionSkeleton/,
  "do not wrap the fetch that can resolve empty or throw",
);
assert.match(
  remixSrc,
  /await loadLanguageRemixCatalogs\(\)/,
  "lists run in LanguageRemixIslandResolved, not on the page",
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

const nodeRequire = createRequire(import.meta.url);
const React = nodeRequire("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server");
const jsxRuntime = nodeRequire("react/jsx-runtime");

function loadTsx(filePath, mocks = {}) {
  const src = fs.readFileSync(filePath, "utf8");
  const { code } = transform(src, {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
    filePath,
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (spec) => {
      if (Object.hasOwn(mocks, spec)) return mocks[spec];
      if (spec === "react/jsx-runtime") return jsxRuntime;
      if (spec === "react") return React;
      return nodeRequire(spec);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const skeletonMod = loadTsx(
  path.join(here, "../src/components/gallery-skeleton.tsx"),
);
const streamForIsland = await import("../src/lib/language-detail-stream.ts");
const islandMod = loadTsx(
  path.join(here, "../src/components/language-remix-section.tsx"),
  {
    "@/lib/odata": {
      listPaletteSystems: async () => {
        throw new Error("replay must not fetch to paint");
      },
      listArtStyles: async () => {
        throw new Error("replay must not fetch to paint");
      },
    },
    "@/lib/remix-options": {
      toLanguageOpts: () => [],
      toPaletteOpts: () => [],
      toArtOpts: () => [],
    },
    "@/lib/language-detail-stream": streamForIsland,
    "@/components/gallery-skeleton": skeletonMod,
    "@/components/remix/inline-remix": { InlineRemix: () => null },
    "@/components/remix/remix-lane-blurb": { RemixLaneBlurb: () => null },
    "@/components/scrapbook": {
      SectionHeading: ({ children }) => children,
      Perforation: () => null,
    },
  },
);

function renderNode(node) {
  if (node == null || node === false) return "";
  return renderToStaticMarkup(node);
}

function h72Count(html) {
  return (html.match(/h-72/g) || []).length;
}

/** The page remix tree: fallback and resolved as separate paints. */
function renderPageSwap(language, catalogs) {
  const props =
    catalogs === undefined
      ? { lang: language }
      : { lang: language, catalogs };
  const boundary = islandMod.languageRemixPageBoundary(language, catalogs);
  const fallbackHtml = renderNode(boundary.fallback);
  const resolvedHtml =
    remixPageFallback(language, catalogs) === null
      ? renderNode(boundary.resolved)
      : "";
  return {
    fallbackHtml,
    resolvedHtml,
    slotHtml: renderToStaticMarkup(
      React.createElement(islandMod.LanguageRemixPageSlot, props),
    ),
  };
}

assert.equal(remixPageFallback(bluet), "pulse");
assert.equal(remixPageFallback(bluet, { palettes: [], arts: [] }), null);
assert.equal(remixPageFallback(noLanding), null);

const pendingSwap = renderPageSwap(bluet);
assert.equal(
  h72Count(pendingSwap.fallbackHtml),
  2,
  "replay 1: page fallback is two h-72 from fields, before canRemixLanguage",
);
assert.equal(
  h72Count(pendingSwap.slotHtml),
  2,
  "replay 1: page slot first paint is the pending pulse",
);

const emptySwap = renderPageSwap(bluet, { palettes: [], arts: [] });
assert.equal(
  h72Count(emptySwap.fallbackHtml),
  0,
  "replay 2: Bluet + [] must not put h-72 in the fallback",
);
assert.equal(
  h72Count(emptySwap.resolvedHtml),
  0,
  "replay 2: Bluet + [] resolved tree is dark",
);
assert.equal(
  h72Count(emptySwap.slotHtml),
  0,
  "replay 2: page slot first paint has no h-72",
);
assert.doesNotMatch(emptySwap.slotHtml, /try a remix/, "do not fake a remix lane after []");

const thrownCatalogs = await resolveRemixCatalogs(
  async () => {
    throw new Error("listPaletteSystems failed");
  },
  async () => {
    throw new Error("listArtStyles failed");
  },
);
const throwSwap = renderPageSwap(bluet, thrownCatalogs);
assert.equal(
  h72Count(throwSwap.fallbackHtml),
  0,
  "replay 2: throw must not put h-72 in the fallback",
);
assert.equal(
  h72Count(throwSwap.resolvedHtml),
  0,
  "replay 2: throw resolved tree is dark",
);
assert.equal(h72Count(throwSwap.slotHtml), 0, "replay 2: throw page slot is dark from first paint");
assert.doesNotMatch(throwSwap.slotHtml, /try a remix/, "do not fake a remix lane after throw");

const noLandSwap = renderPageSwap(noLanding);
assert.equal(h72Count(noLandSwap.fallbackHtml), 0);
assert.equal(h72Count(noLandSwap.slotHtml), 0);

console.log(
  "language-detail stream: page swap — replay 1 pulses; replay 2 never h-72 in fallback or resolved",
);
