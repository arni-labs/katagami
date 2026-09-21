import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
// The shelf is the card gallery's signed-out view. That page moved off "/" when
// the sheet took the front door; it is unlisted now, and still has to hold.
const home = fs.readFileSync(`${here}/../src/app/(site)/gallery/page.tsx`, "utf8");
const actions = fs.readFileSync(`${here}/../src/app/actions.ts`, "utf8");
const owner = fs.readFileSync(
  `${here}/../src/app/(site)/owner/page.tsx`,
  "utf8",
);

assert.doesNotMatch(home, /TEASER_REST/);
assert.doesNotMatch(home, /TEASER_FEATURED/);
assert.match(home, /listFeaturedDesignLanguages\(\)/);
assert.match(home, /Visitor home/);
assert.match(actions, /\/owner\/visitor-shelf/);
assert.match(owner, /\/owner\/visitor-shelf/);
