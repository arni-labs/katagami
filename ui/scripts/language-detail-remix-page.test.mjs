import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";
import {
  canRemixLanguage,
  languageHasRemixComposition,
  resolveRemixCatalogs,
  remixPageFirstPaint,
  remixStreamOutcome,
} from "../src/lib/language-detail-stream.ts";
import { injectTheme, themeOverrideStyle } from "../src/lib/remix-theme.ts";
import {
  cssPrimaryHex,
  pickRemixPaletteId,
} from "../src/lib/remix-palette-pick.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const nodeRequire = createRequire(import.meta.url);
const React = nodeRequire("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server");
const jsxRuntime = nodeRequire("react/jsx-runtime");

function lang(fields) {
  return { entity_id: "en-bluet", status: "Published", fields };
}

const noLanding = lang({ name: "No landing" });
const landingOnly = lang({
  name: "Landing only",
  landing_file_id: "fl-land",
});
const bluet = lang({
  name: "Bluet",
  landing_file_id: "fl-land",
  dashboard_file_id: "fl-dash",
});

const emberPalette = {
  entity_id: "ps-ember",
  status: "Published",
  fields: {
    name: "Ember Signal",
    signature: JSON.stringify([{ hex: "#C8442A", name: "ember" }]),
    neutrals: JSON.stringify({ bg: "#FFFFFF", surface: "#FFFFFF", text: "#14213D" }),
    semantic: JSON.stringify({}),
  },
};
const otherPalette = {
  entity_id: "ps-other",
  status: "Published",
  fields: {
    name: "Transformative teal",
    signature: JSON.stringify([{ hex: "#007C78", name: "teal" }]),
    neutrals: JSON.stringify({}),
    semantic: JSON.stringify({}),
  },
};
const arts = [
  {
    entity_id: "as-1",
    status: "Published",
    fields: { name: "Ink Wash", prompt_template: "paint {subject}" },
  },
];
const yellowPalette = {
  entity_id: "ps-yellow",
  status: "Published",
  fields: {
    name: "Risograph Pull",
    signature: JSON.stringify([{ hex: "#FFD400", name: "yellow" }]),
    neutrals: JSON.stringify({}),
    semantic: JSON.stringify({}),
  },
};
const catalogs = { palettes: [otherPalette, emberPalette], arts };
const liveShapedCatalogs = {
  palettes: [otherPalette, yellowPalette, emberPalette],
  arts,
};
const emptyCatalogs = { palettes: [], arts: [] };
const landingHtml = `<!doctype html><html><head></head><body>
<style>:root{--paper:#fff;--ink:#111;--primary:#122A47}</style>
<main>Bluet landing</main>
</body></html>`;

assert.equal(languageHasRemixComposition(noLanding), false);
assert.equal(languageHasRemixComposition(landingOnly), false);
assert.equal(languageHasRemixComposition(bluet), true);
assert.equal(remixStreamOutcome(noLanding), "empty");
assert.equal(remixStreamOutcome(landingOnly), "empty");
assert.equal(remixStreamOutcome(bluet), "pending");
assert.equal(remixStreamOutcome(bluet, emptyCatalogs), "empty");
assert.equal(remixStreamOutcome(bluet, catalogs), "render");
assert.equal(canRemixLanguage(bluet, [], []), false);
assert.equal(canRemixLanguage(bluet, catalogs.palettes, catalogs.arts), true);
assert.equal(remixPageFirstPaint(noLanding), "dark");
assert.equal(remixPageFirstPaint(bluet), "pulse");
assert.equal(remixPageFirstPaint(bluet, emptyCatalogs), "dark");
assert.equal(remixPageFirstPaint(bluet, catalogs), "lane");

assert.equal(cssPrimaryHex(landingHtml), "#122A47");
assert.equal(
  pickRemixPaletteId(
    [
      { id: "ps-other", roles: { accent: "#007C78" } },
      { id: "ps-ember", roles: { accent: "#C8442A" } },
    ],
    undefined,
    "#122A47",
  ),
  "ps-ember",
  "[other, ember] no default — Ember, not catalog[0] teal",
);
assert.equal(
  pickRemixPaletteId(
    [
      { id: "ps-other", roles: { accent: "#007C78" } },
      { id: "ps-ember", roles: { accent: "#C8442A" } },
    ],
    undefined,
    undefined,
  ),
  "ps-ember",
  "no landing primary: still skip palettes[0] when a later row exists",
);
assert.equal(
  pickRemixPaletteId(
    [
      { id: "ps-other", roles: { accent: "#007C78" } },
      { id: "ps-ember", roles: { accent: "#C8442A" } },
    ],
    "ps-other",
    "#122A47",
  ),
  "ps-other",
  "default_palette_id still wins when set",
);
assert.equal(
  pickRemixPaletteId(
    [
      { id: "ps-other", roles: { accent: "#007C78" } },
      { id: "ps-yellow", roles: { accent: "#FFD400" } },
      { id: "ps-ember", roles: { accent: "#C8442A" } },
    ],
    undefined,
    "#122A47",
  ),
  "ps-ember",
  "live-shaped catalog: Ember, not contrast-max #FFD400",
);

const thrown = await resolveRemixCatalogs(
  async () => {
    throw new Error("listPaletteSystems failed");
  },
  async () => {
    throw new Error("listArtStyles failed");
  },
);
assert.deepEqual(thrown, { palettes: [], arts: [] });
assert.equal(remixPageFirstPaint(bluet, thrown), "dark");

const pageSrc = fs.readFileSync(
  path.join(here, "../src/app/(site)/language/[id]/page.tsx"),
  "utf8",
);
const remixSrc = fs.readFileSync(
  path.join(here, "../src/components/language-remix-section.tsx"),
  "utf8",
);
const previewSrc = fs.readFileSync(
  path.join(here, "../src/components/remix/remix-preview.tsx"),
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
const remixOpts = fs.readFileSync(
  path.join(here, "../src/lib/remix-options.ts"),
  "utf8",
);
const inlineSrc = fs.readFileSync(
  path.join(here, "../src/components/remix/inline-remix.tsx"),
  "utf8",
);
const loadingPath = path.join(here, "../src/app/(site)/language/[id]/loading.tsx");
const trackedLink = fs.readFileSync(
  path.join(here, "../src/components/tracked-link.tsx"),
  "utf8",
);

assert.equal(
  fs.existsSync(loadingPath),
  false,
  "language loading.tsx stole <main> — two h-72 then footer, remix payload-only",
);
assert.match(trackedLink, /LinkPending/);
assert.doesNotMatch(pageSrc, /await loadLanguageRemixCatalogs/);
assert.doesNotMatch(pageSrc, /await resolveRemixCatalogs/);
assert.doesNotMatch(pageSrc, /listArtStyles|listPaletteSystems/);
assert.match(pageSrc, /<PageHero/, "hold: live Bluet paints hero, not two h-72");
assert.match(pageSrc, /eyebrow="the spec"/, "hold: spec is in the page tree");
assert.doesNotMatch(pageSrc, /LanguageDetailSkeleton/);
assert.match(pageSrc, /<LanguageDetailRemix lang=\{lang\} \/>/);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<Language(Remix|DetailRemix)/,
);
assert.doesNotMatch(pageSrc, /<Suspense fallback=\{<LanguageSectionSkeleton/);
assert.doesNotMatch(pageSrc, /lineageStreamOutcome|relatedStreamOutcome/);
assert.match(pageSrc, /<Suspense fallback=\{null\}>\s*<LanguageLineage/);
assert.match(pageSrc, /<Suspense fallback=\{null\}>\s*<RelatedLanguages/);
assert.match(
  lineageSrc,
  /if \(parents\.length === 0 && children\.length === 0\) return null/,
);
assert.match(relatedSrc, /if \(scored\.length === 0\) return null/);
assert.match(
  remixOpts,
  /Boolean\(l\.fields\.landing_file_id\) && Boolean\(l\.fields\.dashboard_file_id\)/,
);
assert.match(
  streamSrc,
  /Boolean\(lang\.fields\.landing_file_id\) && Boolean\(lang\.fields\.dashboard_file_id\)/,
);
assert.match(
  inlineSrc,
  /pickRemixPaletteId/,
  "live InlineRemix must seed palId from pickRemixPaletteId, not palettes[0]",
);
assert.doesNotMatch(
  inlineSrc,
  /useState\(fixed\.palette \?\? initial\?\.palId \?\? palettes\[0\]/,
);
assert.doesNotMatch(
  inlineSrc,
  /palettes\.find\(\(p\) => p\.id === palId\) \?\? palettes\[0\]/,
  "bound pal must not fall back to catalog[0] teal",
);
assert.match(remixSrc, /export function LanguageDetailRemix\(\{ lang \}/);
assert.doesNotMatch(remixSrc, /LanguageRemixPageTree/);
assert.doesNotMatch(
  remixSrc,
  /catalogs\?: RemixCatalogs/,
  "live slot is lang only — catalogs prop is not what page.tsx mounts",
);
assert.doesNotMatch(
  remixSrc,
  /export async function LanguageDetailRemix/,
  "LanguageDetailRemix is sync chrome — catalogs suspend inside, the page does not await them",
);
assert.match(remixSrc, /await loadLanguageRemixCatalogs\(\)/);
assert.match(
  remixSrc,
  /<Suspense fallback=\{<RemixControlsPulse/,
  "live lang-only tree pulses the preview well, not two h-72",
);
assert.match(remixSrc, /RemixControlsDark/);
assert.match(remixSrc, /getFileText/);
assert.match(
  remixSrc,
  /if \(!canRemixLanguage\(lang, catalogs\.palettes, catalogs\.arts\)\)/,
  "do not await getFileText after [] / throw — that stalls the dark well",
);
assert.match(previewSrc, /themeOverrideStyle/, "--primary tokens stay in the tree even without landing HTML");
assert.match(
  fs.readFileSync(path.join(here, "../src/lib/remix-theme.ts"), "utf8"),
  /export function remixPrimaryDecl/,
  "themeOverrideStyle always binds --primary — empty HTML never runs injectTheme",
);
assert.match(
  previewSrc,
  /remixPrimaryDecl/,
  "RemixPreview token node owns --primary via remixPrimaryDecl, not accent-only",
);
assert.match(
  previewSrc,
  /bindWinningRemixPrimary/,
  "remix-preview must own the winning iframe --primary — leftover 1",
);
assert.doesNotMatch(
  fs.readFileSync(path.join(here, "../scripts/language-detail-remix-page.test.mjs"), "utf8"),
  /InlineRemix: \(\{ palettes/,
  "page-tree must not stub InlineRemix",
);
assert.match(
  previewSrc,
  /prev\?\.url === compositionUrl && prev\.html/,
  "a failed client refetch must not wipe a good SSR srcDoc",
);
assert.doesNotMatch(remixSrc, /LanguageSectionSkeleton/);
assert.doesNotMatch(
  remixSrc,
  /className="[^"]*h-72/,
  "remix pending must not paint the route-skeleton two h-72",
);
assert.doesNotMatch(remixSrc, /:has\(/);

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

const streamForTree = await import("../src/lib/language-detail-stream.ts");

function scrapbookStub() {
  return {
    SectionHeading: ({ eyebrow, children }) =>
      React.createElement("h2", { "data-eyebrow": eyebrow }, children),
    Perforation: () => null,
    WashiTape: () => null,
  };
}

const frameMod = loadTsx(path.join(here, "../src/components/scaled-frame.tsx"));
const previewMod = loadTsx(path.join(here, "../src/components/remix/remix-preview.tsx"), {
  "@/components/scaled-frame": frameMod,
  "@/lib/remix-theme": await import("../src/lib/remix-theme.ts"),
});
const inlineMod = loadTsx(path.join(here, "../src/components/remix/inline-remix.tsx"), {
  "next/link": {
    default: ({ href, children }) => React.createElement("a", { href }, children),
  },
  "next/navigation": { useRouter: () => ({ refresh() {}, push() {} }) },
  "@/components/remix/remix-preview": previewMod,
  "@/components/remix/entity-picker": {
    EntityPicker: ({ label, items, value }) =>
      React.createElement(
        "div",
        { "data-picker": label },
        items.find((it) => it.id === value)?.name,
      ),
  },
  "@/components/scrapbook": { WashiTape: () => null },
  "@/lib/remix-brief": { buildRemixBrief: () => "brief" },
  "@/lib/remix-compositions": {
    COMPOSITIONS: [
      { key: "compositions.landing", name: "Landing" },
      { key: "compositions.dashboard", name: "Dashboard" },
    ],
  },
  "@/app/remix-actions": { saveRemix: async () => {} },
  "@/lib/remix-theme": await import("../src/lib/remix-theme.ts"),
  "@/lib/katagami-ui": {
    KX_BTN_INK: "",
    KX_BTN_PAPER: "",
    KX_LABEL: "",
  },
  "@/lib/analytics": { trackCopy: () => {} },
  "@/lib/remix-palette-pick": await import("../src/lib/remix-palette-pick.ts"),
});

const treeMod = loadTsx(
  path.join(here, "../src/components/language-remix-section.tsx"),
  {
    "@/lib/odata": {
      listPaletteSystems: async () => {
        throw new Error("pending paint must not fetch");
      },
      listArtStyles: async () => {
        throw new Error("pending paint must not fetch");
      },
      getFileText: async () => landingHtml,
    },
    "@/lib/remix-options": {
      toLanguageOpts: (rows) =>
        rows.map((l) => ({
          id: l.entity_id,
          name: l.fields.name,
          tokens: "",
          landingUrl: l.fields.landing_file_id ? `/api/file/${l.fields.landing_file_id}` : "",
          dashboardUrl: l.fields.dashboard_file_id
            ? `/api/file/${l.fields.dashboard_file_id}`
            : "",
        })),
      toPaletteOpts: (rows) =>
        rows.map((p) => {
          const sig = JSON.parse(p.fields.signature || "[]");
          const hex = sig[0]?.hex ?? "";
          return {
            id: p.entity_id,
            name: p.fields.name,
            roles: { accent: hex },
            swatches: hex ? [hex] : [],
          };
        }),
      toArtOpts: (rows) =>
        rows
          .filter((a) => a.fields.prompt_template)
          .map((a) => ({
            id: a.entity_id,
            name: a.fields.name,
            medium: "",
            hero: "",
            promptTemplate: a.fields.prompt_template,
            slotRecipes: "{}",
            refs: [],
          })),
    },
    "@/lib/language-detail-stream": streamForTree,
    "@/components/remix/inline-remix": inlineMod,
    "@/components/remix/remix-lane-blurb": {
      RemixLaneBlurb: ({ name }) =>
        React.createElement("p", null, `Keep ${name} and swap a palette`),
    },
    "@/components/scrapbook": scrapbookStub(),
  },
);

function h72Count(html) {
  return (html.match(/h-72/g) || []).length;
}

/** Live slot only — the same props page.tsx mounts. No catalogs helper. */
function renderLiveSlot(mod, language) {
  return renderToStaticMarkup(
    React.createElement(mod.LanguageDetailRemix, { lang: language }),
  );
}

const pendingHtml = renderLiveSlot(treeMod, bluet);
assert.match(pendingHtml, /remix lane/, "live LanguageDetailRemix({ lang }) includes remix lane");
assert.match(pendingHtml, /animate-pulse/, "hold 2: live pending pulses");
assert.match(pendingHtml, /aspect-\[16\/10\]/, "pending pulse is the preview well");
assert.equal(h72Count(pendingHtml), 0, "pending must not be two h-72");
assert.doesNotMatch(pendingHtml, /Ember Signal/);

const heroMod = loadTsx(path.join(here, "../src/components/page-hero.tsx"));
const pagePending = renderToStaticMarkup(
  React.createElement(
    "main",
    null,
    React.createElement(heroMod.PageHero, {
      title: "Bluet",
      description: "A portable design language for agents.",
    }),
    React.createElement(
      "section",
      null,
      React.createElement("h2", { "data-eyebrow": "the spec" }, "specification"),
    ),
    React.createElement(treeMod.LanguageDetailRemix, { lang: bluet }),
    React.createElement("footer", null, "site footer"),
  ),
);
assert.match(pagePending, /<h1[^>]*>Bluet<\/h1>/, "catalogs in flight: hero is already in the document");
assert.match(pagePending, /specification/, "catalogs in flight: spec is already in the document");
assert.match(pagePending, /remix lane/);
assert.match(pagePending, /animate-pulse/, "hold 2: remix pending pulses on the live page tree");
assert.match(pagePending, /<footer>site footer<\/footer>/);
assert.equal(h72Count(pagePending), 0, "live page tree is not two h-72 then footer");

const noLandHtml = renderLiveSlot(treeMod, noLanding);
assert.equal(noLandHtml, "");
assert.equal(h72Count(noLandHtml), 0);

const landingOnlyHtml = renderLiveSlot(treeMod, landingOnly);
assert.equal(landingOnlyHtml, "");
assert.equal(h72Count(landingOnlyHtml), 0);

const pulse = renderToStaticMarkup(React.createElement(treeMod.RemixControlsPulse));
const dark = renderToStaticMarkup(React.createElement(treeMod.RemixControlsDark));
assert.equal(h72Count(pulse), 0);
assert.equal(h72Count(dark), 0);
assert.match(pulse, /animate-pulse/);
assert.doesNotMatch(dark, /animate-pulse/);
assert.match(pulse, /aspect-\[16\/10\]/);
assert.match(dark, /aspect-\[16\/10\]/);

function remixOdata(lists, getFileText) {
  return {
    listPaletteSystems: lists.listPaletteSystems,
    listArtStyles: lists.listArtStyles,
    getFileText,
  };
}

function iframeSrcDoc(html) {
  const m = html.match(/srcDoc="([^"]*)"/);
  if (!m) return "";
  return m[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function lastPrimary(html) {
  const all = [...html.matchAll(/--primary:(#[0-9A-Fa-f]+)/g)].map((m) => m[1]);
  return all.at(-1) ?? "";
}

function withoutSrOnly(html) {
  return html.replace(/<ul class="sr-only">[\s\S]*?<\/ul>/g, "");
}

function themeNode(html) {
  const m = html.match(/data-remix-theme=""[^>]*>([\s\S]*?)<\/div>/);
  return m?.[1] ?? "";
}

function loadLiveTree(odata) {
  return loadTsx(path.join(here, "../src/components/language-remix-section.tsx"), {
    "@/lib/odata": odata,
    "@/lib/remix-options": {
      toLanguageOpts: (rows) =>
        rows.map((l) => ({
          id: l.entity_id,
          name: l.fields.name,
          tokens: "",
          landingUrl: l.fields.landing_file_id ? `/api/file/${l.fields.landing_file_id}` : "",
          dashboardUrl: l.fields.dashboard_file_id
            ? `/api/file/${l.fields.dashboard_file_id}`
            : "",
        })),
      toPaletteOpts: (rows) =>
        rows.map((p) => {
          const sig = JSON.parse(p.fields.signature || "[]");
          const hex = sig[0]?.hex ?? "";
          return {
            id: p.entity_id,
            name: p.fields.name,
            roles: { accent: hex },
            swatches: hex ? [hex] : [],
          };
        }),
      toArtOpts: (rows) =>
        rows
          .filter((a) => a.fields.prompt_template)
          .map((a) => ({
            id: a.entity_id,
            name: a.fields.name,
            medium: "",
            hero: "",
            promptTemplate: a.fields.prompt_template,
            slotRecipes: "{}",
            refs: [],
          })),
    },
    "@/lib/language-detail-stream": streamForTree,
    "@/components/remix/inline-remix": inlineMod,
    "@/components/remix/remix-lane-blurb": {
      RemixLaneBlurb: ({ name }) =>
        React.createElement("p", null, `Keep ${name} and swap a palette`),
    },
    "@/components/scrapbook": scrapbookStub(),
  });
}

let fileReads = 0;
const emptyLive = loadLiveTree(
  remixOdata(
    {
      listPaletteSystems: async () => [],
      listArtStyles: async () => {
        throw new Error("listArtStyles failed");
      },
    },
    async () => {
      fileReads += 1;
      throw new Error("getFileText must not run after [] / throw");
    },
  ),
);
const emptyPending = renderToStaticMarkup(
  React.createElement(emptyLive.LanguageDetailRemix, { lang: bluet }),
);
assert.match(emptyPending, /remix lane/);
assert.match(emptyPending, /animate-pulse/);
const emptyResolved = renderToStaticMarkup(await emptyLive.LanguageRemixControls({ lang: bluet }));
assert.doesNotMatch(emptyResolved, /animate-pulse/, "live loader [] / throw is the dark well");
assert.doesNotMatch(emptyResolved, /data-remix="inline"/);
assert.equal(h72Count(emptyResolved), 0);
assert.equal(fileReads, 0, "live loader must not await getFileText after empty catalogs");

const emberLive = loadLiveTree(
  remixOdata(
    {
      listPaletteSystems: async () => catalogs.palettes,
      listArtStyles: async () => catalogs.arts,
    },
    async () => landingHtml,
  ),
);
const emberPending = renderLiveSlot(emberLive, bluet);
assert.match(emberPending, /remix lane/);
assert.match(emberPending, /animate-pulse/, "hold 2: live slot pulses while catalogs load");
assert.equal(h72Count(emberPending), 0);

assert.equal(bluet.fields.default_palette_id, undefined);
const liveControls = renderToStaticMarkup(
  await emberLive.LanguageRemixControls({ lang: bluet }),
);
const liveSrcDoc = iframeSrcDoc(liveControls);
assert.match(liveControls, /<iframe/, "LanguageDetailRemix live leaf mounts an iframe");
assert.equal(
  lastPrimary(liveSrcDoc),
  "#C8442A",
  "iframe srcDoc binds Ember-not-first — sr-only #C8442A is not enough",
);
assert.match(
  liveSrcDoc,
  /--primary:#C8442A/,
  "iframe srcDoc binds Ember-not-first — sr-only #C8442A is not enough",
);
assert.doesNotMatch(liveSrcDoc, /--primary:#007C78/);
assert.doesNotMatch(
  liveSrcDoc,
  /--primary:#FFD400/,
  "live Bluet must not bind #FFD400 as the remix primary",
);
assert.match(withoutSrOnly(liveControls), /--primary:#C8442A/);
assert.match(
  themeNode(liveControls),
  /--primary:#C8442A/,
  "settled token node keeps --primary, not accent-only",
);

const yellowLive = loadLiveTree(
  remixOdata(
    {
      listPaletteSystems: async () => liveShapedCatalogs.palettes,
      listArtStyles: async () => liveShapedCatalogs.arts,
    },
    async () => landingHtml,
  ),
);
const yellowControls = renderToStaticMarkup(
  await yellowLive.LanguageRemixControls({ lang: bluet }),
);
const yellowSrcDoc = iframeSrcDoc(yellowControls);
assert.equal(lastPrimary(yellowSrcDoc), "#C8442A");
assert.match(
  yellowSrcDoc,
  /--primary:#C8442A/,
  "live-shaped [teal, yellow, ember] iframe binds Ember, not #FFD400",
);
assert.doesNotMatch(
  yellowSrcDoc,
  /--primary:#FFD400/,
  "live Bluet must not bind #FFD400 as the remix primary",
);
assert.match(withoutSrOnly(yellowControls), /--primary:#C8442A/);

const emberSelected = lang({
  name: "Bluet",
  landing_file_id: "fl-land",
  dashboard_file_id: "fl-dash",
  default_palette_id: "ps-ember",
});
const emberDefault = renderToStaticMarkup(
  await emberLive.LanguageRemixControls({ lang: emberSelected }),
);
assert.match(iframeSrcDoc(emberDefault), /--primary:#C8442A/);

const themed = injectTheme(
  landingHtml,
  { bg: "#FFFFFF", surface: "#FFFFFF", text: "#14213D", accent: "#C8442A" },
  "",
);
assert.match(themed, /--primary:#C8442A/);
const frameHtml = renderToStaticMarkup(
  React.createElement(frameMod.ScaledFrame, {
    html: themed,
    title: "Remix preview",
  }),
);
assert.match(frameHtml, /<iframe/);
assert.match(frameHtml, /--primary:#C8442A/);

const emptyTheme = themeOverrideStyle({ accent: "#C8442A" });
assert.match(
  emptyTheme,
  /--primary:#C8442A/,
  "empty HTML / failed fetch still emit --primary, not accent-only",
);
assert.match(emptyTheme, /--accent:#C8442A/);

assert.equal(injectTheme("", { accent: "#007C78" }), "", "empty HTML never reaches injectTheme binds");

const emptyFileLive = loadLiveTree(
  remixOdata(
    {
      listPaletteSystems: async () => catalogs.palettes,
      listArtStyles: async () => catalogs.arts,
    },
    async () => "",
  ),
);
const emptyFileHtml = renderToStaticMarkup(
  await emptyFileLive.LanguageRemixControls({ lang: bluet }),
);
assert.match(emptyFileHtml, /data-remix-theme=""/);
assert.match(
  themeNode(emptyFileHtml),
  /--primary:#C8442A/,
  "failed getFileText: token node keeps Ember --primary, not catalog[0] teal",
);
assert.match(themeNode(emptyFileHtml), /--accent:#C8442A/);
assert.doesNotMatch(iframeSrcDoc(emptyFileHtml), /--primary:/);

const emptyPreview = renderToStaticMarkup(
  React.createElement(previewMod.RemixPreview, {
    compositionUrl: "/api/file/fl-land",
    roles: { accent: "#C8442A" },
    initialHtml: "",
  }),
);
assert.match(emptyPreview, /data-remix-theme=""/);
assert.match(themeNode(emptyPreview), /--primary:#C8442A/);
assert.match(themeNode(emptyPreview), /--accent:#C8442A/);
assert.doesNotMatch(emptyPreview, /<iframe/);

console.log(
  "language-detail remix page tree: live slot + real InlineRemix Ember-not-first iframe bind",
);
