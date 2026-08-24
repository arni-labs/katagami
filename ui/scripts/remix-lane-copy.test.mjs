import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";
import { languageRemixLaneVisibleText } from "../src/lib/remix-lane-copy.ts";

const visible = languageRemixLaneVisibleText("Galley");
assert.equal(
  visible,
  "Keep Galley and swap a palette and an art style onto it. The landing & dashboard recolor live.",
);
assert.doesNotMatch(visible, /Galleyand/);
assert.doesNotMatch(visible, /\u2014|—/);
assert.doesNotMatch(visible, /Studio does the same/);

const here = path.dirname(fileURLToPath(import.meta.url));
const blurbSrc = fs.readFileSync(
  path.join(here, "../src/components/remix/remix-lane-blurb.tsx"),
  "utf8",
);
assert.match(
  blurbSrc,
  /\{name\}<\/span>\s*\{\s*" "\s*\}/,
  "name span must be followed by an explicit space text node so JSX cannot collapse to Galleyand",
);
assert.doesNotMatch(blurbSrc, /\u2014|—/);

const pageSrc = fs.readFileSync(
  path.join(here, "../src/app/(site)/language/[id]/page.tsx"),
  "utf8",
);
const remixSrc = fs.readFileSync(
  path.join(here, "../src/components/language-remix-section.tsx"),
  "utf8",
);
assert.match(
  pageSrc,
  /LanguageRemixSection/,
  "language detail streams remix after first paint",
);
assert.match(remixSrc, /RemixLaneBlurb/, "remix section must render RemixLaneBlurb");
assert.doesNotMatch(pageSrc, /Studio does the same/);
assert.doesNotMatch(remixSrc, /Studio does the same/);

assert.doesNotMatch(
  pageSrc,
  /<Suspense fallback=\{null\}>\s*<LanguageRemixSection/,
  "remix lane must not vanish (fallback=null) while listArtStyles is pending",
);
assert.match(
  pageSrc,
  /fallback=\{<RemixLaneSkeleton/,
  "remix Suspense must use the loading.tsx pulse shell, not a new look",
);
const skeletonSrc = fs.readFileSync(
  path.join(here, "../src/components/gallery-skeleton.tsx"),
  "utf8",
);
assert.match(
  skeletonSrc,
  /export function RemixLaneSkeleton/,
  "remix fallback lives next to the #245 loading shells",
);
assert.match(
  skeletonSrc,
  /function DetailPulseShell/,
  "remix and language loading.tsx must share one pulse shell",
);
for (const token of [
  "h-3 w-28 animate-pulse bg-muted/50",
  "h-14 w-2/3 max-w-md animate-pulse bg-muted/60",
  "h-4 w-full max-w-lg animate-pulse bg-muted/40",
  "h-72 animate-pulse bg-muted/40",
]) {
  assert.match(
    skeletonSrc,
    new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `remix shell must keep the loading.tsx pulse token: ${token}`,
  );
}

const nodeRequire = createRequire(import.meta.url);
const React = nodeRequire("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server");
const jsxRuntime = nodeRequire("react/jsx-runtime");
const { code: skeletonCode } = transform(skeletonSrc, {
  transforms: ["typescript", "jsx", "imports"],
  jsxRuntime: "automatic",
  production: true,
  filePath: path.join(here, "../src/components/gallery-skeleton.tsx"),
});
const skeletonMod = { exports: {} };
new Function("require", "module", "exports", skeletonCode)(
  (spec) => {
    if (spec === "react/jsx-runtime") return jsxRuntime;
    if (spec === "react") return React;
    return nodeRequire(spec);
  },
  skeletonMod,
  skeletonMod.exports,
);
const detailMarkup = renderToStaticMarkup(
  React.createElement(skeletonMod.exports.LanguageDetailSkeleton),
);
const remixMarkup = renderToStaticMarkup(
  React.createElement(skeletonMod.exports.RemixLaneSkeleton),
);
assert.match(detailMarkup, /animate-pulse/);
assert.match(remixMarkup, /animate-pulse/);
assert.doesNotMatch(
  remixMarkup,
  /max-w-7xl/,
  "in-page remix shell must not nest the route loading chrome",
);
const remixInner = remixMarkup
  .replace(/^<section[^>]*>/, "")
  .replace(/<\/section>$/, "");
assert.ok(
  remixInner.includes("animate-pulse") && detailMarkup.includes(remixInner),
  "RemixLaneSkeleton must render the same pulse blocks as language loading.tsx",
);

console.log("remix-lane copy: space, period, no studio sentence");
console.log("remix-lane shell: RemixLaneSkeleton, not fallback=null");
