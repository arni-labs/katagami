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
  default_palette_id: "ps-ember",
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
const arts = [
  {
    entity_id: "as-1",
    status: "Published",
    fields: { name: "Ink Wash", prompt_template: "paint {subject}" },
  },
];
const catalogs = { palettes: [emberPalette], arts };
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
assert.equal(
  remixStreamOutcome(bluet),
  "pending",
  "omitted catalogs is pending — the page must not await them",
);
assert.equal(remixStreamOutcome(bluet, emptyCatalogs), "empty");
assert.equal(remixStreamOutcome(bluet, catalogs), "render");
assert.equal(canRemixLanguage(bluet, [], []), false);
assert.equal(canRemixLanguage(bluet, catalogs.palettes, catalogs.arts), true);

assert.equal(remixPageFirstPaint(noLanding), "dark");
assert.equal(remixPageFirstPaint(landingOnly), "dark");
assert.equal(remixPageFirstPaint(bluet), "pulse", "2: Bluet pending pulses");
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
assert.match(
  trackedLink,
  /LinkPending/,
  "click pending stays on the language card link, not route loading.tsx",
);

assert.doesNotMatch(
  pageSrc,
  /await loadLanguageRemixCatalogs/,
  "1: LanguageDetailPage must not await catalogs",
);
assert.doesNotMatch(
  pageSrc,
  /await resolveRemixCatalogs/,
  "1: catalog await belongs in the remix section, not the page",
);
assert.doesNotMatch(
  pageSrc,
  /listArtStyles|listPaletteSystems/,
  "1: page must not list remix catalogs",
);
assert.match(
  pageSrc,
  /<LanguageDetailRemix lang=\{lang\} \/>/,
  "live page tree mounts LanguageDetailRemix with lang only",
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<Language(Remix|DetailRemix)/,
  "2: do not hide pending remix with fallback={null}",
);
assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{<LanguageSectionSkeleton/,
  "live fetch must not ride the pending two h-72 — [] / throw would flash then collapse",
);
assert.doesNotMatch(pageSrc, /lineageStreamOutcome|relatedStreamOutcome/);
assert.match(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageLineage/,
  "lineage leftover stays fallback={null}",
);
assert.match(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<RelatedLanguages/,
  "related leftover stays fallback={null}",
);
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
assert.match(remixSrc, /await loadLanguageRemixCatalogs\(\)/);
assert.match(remixSrc, /LanguageRemixPageTree/);
assert.match(remixSrc, /getFileText/);
assert.doesNotMatch(remixSrc, /:has\(/);
assert.doesNotMatch(remixSrc, /data-remix-empty|data-remix-pulse/);

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
const skeletonMod = loadTsx(
  path.join(here, "../src/components/gallery-skeleton.tsx"),
);

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
        throw new Error("page-tree pending must not fetch to paint");
      },
      listArtStyles: async () => {
        throw new Error("page-tree pending must not fetch to paint");
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
        rows.map((p) => ({
          id: p.entity_id,
          name: p.fields.name,
          roles: { bg: "#FFFFFF", surface: "#FFFFFF", text: "#14213D", accent: "#C8442A" },
          swatches: ["#C8442A"],
        })),
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
    "@/components/gallery-skeleton": skeletonMod,
    "@/components/remix/inline-remix": {
      InlineRemix: ({ palettes, initialPreviewHtml }) =>
        React.createElement(
          "div",
          { "data-remix": "inline" },
          palettes.map((p) =>
            React.createElement("span", { key: p.id }, p.name, p.swatches?.[0]),
          ),
          initialPreviewHtml
            ? React.createElement("iframe", {
                title: "Remix preview",
                srcDoc: initialPreviewHtml.includes("--primary")
                  ? initialPreviewHtml.replace("--primary:#122A47", "--primary:#C8442A")
                  : `${initialPreviewHtml}<style id="remix-theme">:root{--primary:#C8442A}</style>`,
              })
            : null,
        ),
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

function renderTree(language, nextCatalogs, initialPreviewHtml) {
  const props =
    nextCatalogs === undefined
      ? { lang: language }
      : { lang: language, catalogs: nextCatalogs, initialPreviewHtml };
  return renderToStaticMarkup(
    React.createElement(treeMod.LanguageRemixPageTree, props),
  );
}

const pendingHtml = renderTree(bluet);
assert.equal(
  h72Count(pendingHtml),
  2,
  "replay 1: page tree pending (catalogs omitted) is two h-72",
);
assert.doesNotMatch(pendingHtml, /remix lane|try a remix|Ember Signal/);

const emptyHtml = renderTree(bluet, emptyCatalogs);
assert.equal(h72Count(emptyHtml), 0, "replay 2: [] page tree has no h-72");
assert.equal(emptyHtml, "");
assert.doesNotMatch(emptyHtml, /try a remix/);

const throwHtml = renderTree(bluet, thrown);
assert.equal(h72Count(throwHtml), 0, "replay 2: throw page tree has no h-72");
assert.equal(throwHtml, "");

const noLandHtml = renderTree(noLanding);
assert.equal(h72Count(noLandHtml), 0);
assert.equal(noLandHtml, "");

const landingOnlyHtml = renderTree(landingOnly);
assert.equal(h72Count(landingOnlyHtml), 0);
assert.equal(landingOnlyHtml, "");

const laneHtml = renderTree(bluet, catalogs, landingHtml);
assert.match(laneHtml, /remix lane/, "resolved page tree includes the remix lane");
assert.match(laneHtml, /try a remix/);
assert.match(laneHtml, /Ember Signal/, "Ember Signal is in the rendered tree, not payload-only");
assert.match(laneHtml, /#C8442A/, "#C8442A is in the rendered tree");
assert.match(laneHtml, /--primary/, "--primary is in the preview HTML");
assert.match(laneHtml, /<iframe/, "remix iframe is in the page-tree SSR");
assert.equal(h72Count(laneHtml), 0, "resolved lane is not the pending pulse");

const liveSlot = renderToStaticMarkup(
  React.createElement(treeMod.LanguageRemixIsland, {
    lang: bluet,
    catalogs,
    initialPreviewHtml: landingHtml,
  }),
);
assert.match(liveSlot, /remix lane/);
assert.match(liveSlot, /Ember Signal/);
assert.match(liveSlot, /#C8442A/);
assert.match(liveSlot, /--primary/);
assert.match(liveSlot, /<iframe/);
assert.equal(h72Count(liveSlot), 0);

const liveEmpty = renderToStaticMarkup(
  React.createElement(treeMod.LanguageRemixIsland, {
    lang: bluet,
    catalogs: emptyCatalogs,
  }),
);
assert.equal(liveEmpty, "", "live slot with [] is dark — no pulse then collapse");
assert.equal(h72Count(liveEmpty), 0);

const themed = injectTheme(
  landingHtml,
  { bg: "#FFFFFF", surface: "#FFFFFF", text: "#14213D", accent: "#C8442A" },
  "",
);
assert.match(
  themed,
  /--primary:#C8442A/,
  "Ember Signal accent binds --primary in the preview HTML",
);
const frameMod = loadTsx(path.join(here, "../src/components/scaled-frame.tsx"));
const frameHtml = renderToStaticMarkup(
  React.createElement(frameMod.ScaledFrame, {
    html: themed,
    title: "Remix preview",
  }),
);
assert.match(frameHtml, /<iframe/, "ScaledFrame SSR includes the remix iframe");
assert.match(frameHtml, /--primary:#C8442A/, "--primary is in iframe srcDoc, not payload-only");

console.log(
  "language-detail remix page tree: pending pulses; [] / throw never h-72; Ember Signal + --primary in the lane",
);
