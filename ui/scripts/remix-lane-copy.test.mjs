import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

console.log("remix-lane copy: space, period, no studio sentence");
console.log("remix-lane shell: RemixLaneSkeleton, not fallback=null");
