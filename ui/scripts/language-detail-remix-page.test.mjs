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
import { injectTheme } from "../src/lib/remix-theme.ts";

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
const catalogs = { palettes: [otherPalette, emberPalette], arts };
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
assert.match(remixSrc, /export function LanguageDetailRemix\(/);
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
    "@/components/remix/inline-remix": {
      // Same selection as InlineRemix: default_palette_id, else catalog[0].
      // Ember Signal is listed even when it is not selected — do not bind
      // --primary to Ember just because the catalog contains it.
      InlineRemix: ({ palettes, initial, initialPreviewHtml }) => {
        const selected =
          palettes.find((p) => p.id === initial?.palId) ?? palettes[0];
        const accent = selected?.roles?.accent || "";
        const themed = injectTheme("<style>:root{}</style>", { accent });
        return React.createElement(
          "div",
          { "data-remix": "inline" },
          React.createElement(
            "ul",
            { className: "sr-only" },
            palettes.map((p) =>
              React.createElement("li", { key: p.id }, p.name, " ", p.swatches?.[0]),
            ),
          ),
          React.createElement("div", {
            hidden: true,
            dangerouslySetInnerHTML: { __html: themed },
          }),
          initialPreviewHtml
            ? React.createElement("iframe", {
                title: "Remix preview",
                srcDoc: injectTheme(initialPreviewHtml, { accent }),
              })
            : null,
        );
      },
    },
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

/** The live page tree: LanguageDetailRemix, not a settled island. */
function renderPageTree(language, nextCatalogs, initialPreviewHtml) {
  const props =
    nextCatalogs === undefined
      ? { lang: language }
      : { lang: language, catalogs: nextCatalogs, initialPreviewHtml };
  return renderToStaticMarkup(
    React.createElement(treeMod.LanguageDetailRemix, props),
  );
}

const pendingHtml = renderPageTree(bluet);
assert.match(pendingHtml, /remix lane/, "replay 1: live lang-only tree includes remix lane");
assert.match(pendingHtml, /animate-pulse/, "2: Bluet pending pulses");
assert.match(pendingHtml, /aspect-\[16\/10\]/, "pending pulse is the preview well");
assert.equal(h72Count(pendingHtml), 0, "pending must not be two h-72");
assert.doesNotMatch(pendingHtml, /Ember Signal/);

const replayMain = renderToStaticMarkup(
  React.createElement(
    "main",
    null,
    React.createElement("h1", null, "Bluet"),
    React.createElement(treeMod.LanguageDetailRemix, { lang: bluet }),
    React.createElement("footer", null, "site footer"),
  ),
);
assert.match(replayMain, /<h1>Bluet<\/h1>/);
assert.match(replayMain, /remix lane/, "SSR main is remix lane, not two h-72 then footer");
assert.match(replayMain, /<footer>site footer<\/footer>/);
assert.equal(h72Count(replayMain), 0);

const emptyHtml = renderPageTree(bluet, emptyCatalogs);
assert.match(emptyHtml, /remix lane/, "[] keeps chrome — no collapse");
assert.doesNotMatch(emptyHtml, /animate-pulse/, "[] is dark, not a pulse flash");
assert.equal(h72Count(emptyHtml), 0);
assert.doesNotMatch(emptyHtml, /Ember Signal/);
assert.doesNotMatch(emptyHtml, /data-remix="inline"/);

const throwHtml = renderPageTree(bluet, thrown);
assert.match(throwHtml, /remix lane/);
assert.doesNotMatch(throwHtml, /animate-pulse/);
assert.equal(h72Count(throwHtml), 0);

const noLandHtml = renderPageTree(noLanding);
assert.equal(noLandHtml, "");
assert.equal(h72Count(noLandHtml), 0);

const landingOnlyHtml = renderPageTree(landingOnly);
assert.equal(landingOnlyHtml, "");
assert.equal(h72Count(landingOnlyHtml), 0);

const laneHtml = renderPageTree(bluet, catalogs, landingHtml);
assert.match(laneHtml, /remix lane/);
assert.match(
  laneHtml,
  /Ember Signal/,
  "Ember Signal is in the page tree even when it is not the first palette",
);
assert.match(laneHtml, /#C8442A/);
assert.match(
  laneHtml,
  /--primary:#007C78/,
  "selected catalog[0] binds --primary; live Bluet has no default_palette_id",
);
assert.doesNotMatch(
  laneHtml,
  /--primary:#C8442A/,
  "Ember Signal is listed, not selected — do not fake its accent onto --primary",
);
assert.match(
  laneHtml,
  /id="remix-theme">[^<]*--primary:#007C78/,
  "remix-theme binds --primary to the selected accent",
);
assert.match(laneHtml, /<iframe/);
assert.equal(h72Count(laneHtml), 0);

const emberSelected = lang({
  name: "Bluet",
  landing_file_id: "fl-land",
  dashboard_file_id: "fl-dash",
  default_palette_id: "ps-ember",
});
const emberLane = renderPageTree(emberSelected, catalogs, landingHtml);
assert.match(emberLane, /Ember Signal/);
assert.match(
  emberLane,
  /--primary:#C8442A/,
  "when Ember Signal is the language default, --primary is its accent",
);

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
    "@/components/remix/inline-remix": {
      InlineRemix: ({ palettes, initial, initialPreviewHtml }) => {
        const selected =
          palettes.find((p) => p.id === initial?.palId) ?? palettes[0];
        const accent = selected?.roles?.accent || "";
        return React.createElement(
          "div",
          { "data-remix": "inline" },
          React.createElement(
            "ul",
            { className: "sr-only" },
            palettes.map((p) =>
              React.createElement("li", { key: p.id }, p.name, " ", p.swatches?.[0]),
            ),
          ),
          React.createElement("div", {
            hidden: true,
            dangerouslySetInnerHTML: {
              __html: injectTheme("<style>:root{}</style>", { accent }),
            },
          }),
          initialPreviewHtml
            ? React.createElement("iframe", {
                title: "Remix preview",
                srcDoc: injectTheme(initialPreviewHtml, { accent }),
              })
            : null,
        );
      },
    },
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
const liveControls = renderToStaticMarkup(
  await emberLive.LanguageRemixControls({ lang: bluet }),
);
assert.match(liveControls, /Ember Signal/, "live loader surfaces Ember Signal in the catalog");
assert.match(liveControls, /#C8442A/);
assert.match(liveControls, /--primary:#007C78/);
assert.match(liveControls, /<iframe/);
assert.doesNotMatch(liveControls, /--primary:#C8442A/);

const themed = injectTheme(
  landingHtml,
  { bg: "#FFFFFF", surface: "#FFFFFF", text: "#14213D", accent: "#C8442A" },
  "",
);
assert.match(themed, /--primary:#C8442A/);
const frameMod = loadTsx(path.join(here, "../src/components/scaled-frame.tsx"));
const frameHtml = renderToStaticMarkup(
  React.createElement(frameMod.ScaledFrame, {
    html: themed,
    title: "Remix preview",
  }),
);
assert.match(frameHtml, /<iframe/);
assert.match(frameHtml, /--primary:#C8442A/);

console.log(
  "language-detail remix page tree: chrome+preview pulse pending; [] / throw dark well; Ember Signal in the lane",
);
