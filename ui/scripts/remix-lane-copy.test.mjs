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
assert.match(pageSrc, /RemixLaneBlurb/, "language detail must render RemixLaneBlurb");
assert.doesNotMatch(pageSrc, /Studio does the same/);

console.log("remix-lane copy: space, period, no studio sentence");
