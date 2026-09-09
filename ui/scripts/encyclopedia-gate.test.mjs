// The encyclopedia and writing pages show unpublished, unreviewed cells, so
// they are owner-only. The gate lives in the page source, and these read it
// there — the shape of the gate is the thing that must not drift.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { labPreviewRule } from "../src/lib/lab-preview-rule.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const PAGES = {
  "/encyclopedia": read("../src/app/(site)/encyclopedia/page.tsx"),
  "/writing": read("../src/app/(site)/writing/page.tsx"),
};

for (const [route, source] of Object.entries(PAGES)) {
  test(`${route} refuses anyone who is not the owner, before it reads anything`, () => {
    const gate = source.indexOf("notFound()");
    assert.ok(gate > 0, "the page 404s rather than rendering for a stranger");
    assert.match(source, /if \(!\(await isOwner\(\)\) && !labPreviewAllowed\(\)\) notFound\(\);/);
    // The gate has to come before the reads, or a stranger's request still
    // hits the backend with the tenant's key on its way to a 404.
    for (const call of ["loadEncyclopedia(", "loadWritingStyleCellIndex(", "loadAllWritingStyles("]) {
      const at = source.indexOf(call);
      if (at >= 0) assert.ok(at > gate, `${call.slice(0, -1)} must not run before the gate`);
    }
  });

  test(`${route} is never cached and never indexed`, () => {
    // A cached render would serve one visitor's page to the next, and the gate
    // would be decided once instead of per request.
    assert.match(source, /export const dynamic = "force-dynamic";/);
    assert.match(source, /robots: \{ index: false, follow: false \}/);
  });

  test(`${route} keeps its owner check on the server`, () => {
    assert.doesNotMatch(source, /"use client"/, "the gate must not be a client component");
    assert.match(source, /from "@\/lib\/owner"/);
  });
}

test("the local preview flag cannot open these pages in production", () => {
  // The flag exists so the pages can be reviewed on a laptop, where the real
  // sign-in path does not exist. In a production build NODE_ENV is "production"
  // and this is a compiled constant false, whatever the environment says.
  const source = read("../src/lib/lab-preview.ts");
  assert.match(source, /process\.env\.NODE_ENV === "development"/);
  assert.match(source, /import "server-only";/, "the flag must never reach the browser bundle");

  // The same rule, driven directly.
  assert.equal(labPreviewRule({ NODE_ENV: "production", KATAGAMI_LAB_PREVIEW: "1" }), false, "set in production, the flag still refuses");
  assert.equal(labPreviewRule({ KATAGAMI_LAB_PREVIEW: "1" }), false, "with no NODE_ENV at all, it refuses");
  assert.equal(labPreviewRule({ NODE_ENV: "test", KATAGAMI_LAB_PREVIEW: "1" }), false, "and in any other build");
  assert.equal(labPreviewRule({ NODE_ENV: "development" }), false, "on a laptop, only when it is asked for");
  assert.equal(labPreviewRule({ NODE_ENV: "development", KATAGAMI_LAB_PREVIEW: "0" }), false);
  assert.equal(labPreviewRule({ NODE_ENV: "development", KATAGAMI_LAB_PREVIEW: "true" }), false, "and only for exactly \"1\"");
  assert.equal(labPreviewRule({ NODE_ENV: "development", KATAGAMI_LAB_PREVIEW: "1" }), true);

  // The page's own copy must stay the same rule, written out so a production
  // build folds it to a constant.
  assert.match(source, /KATAGAMI_LAB_PREVIEW === "1"/);
});

test("neither page is offered in the public navigation", () => {
  const nav = read("../src/lib/nav.ts");
  const publicLinks = nav.slice(nav.indexOf("NAV_LINKS"), nav.indexOf("OWNER_NAV_LINKS"));
  const ownerLinks = nav.slice(nav.indexOf("OWNER_NAV_LINKS"));
  for (const route of Object.keys(PAGES)) {
    assert.ok(ownerLinks.includes(`"${route}"`), `${route} is an owner link`);
    assert.ok(!publicLinks.includes(`"${route}"`), `${route} must not be in the public navigation`);
  }
});
