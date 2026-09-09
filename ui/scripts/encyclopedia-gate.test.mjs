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

/** Every way a page is allowed to obtain the library. A read that is not on
 *  this list is not exempt from the ordering rule — it means the list is out
 *  of date, and the test below says so rather than passing silently.
 *
 *  This is not decoration. The list used to be matched with `indexOf`, so when
 *  the encyclopedia's read was renamed to `loadEncyclopediaCached` the ordering
 *  assertion stopped matching anything and the page went uncovered while the
 *  suite stayed green. The rule now is that each page must match at least one
 *  known read, and any unknown read fails. */
const READS = [
  "loadEncyclopedia(",
  "loadEncyclopediaCached(",
  "loadWritingStyleCellIndex(",
  "loadAllWritingStyles(",
];

/** Anything that looks like it fetches the library, known or not. */
const READ_SHAPED = /\b(load|read|fetch|get)[A-Z]\w*\(/g;

for (const [route, source] of Object.entries(PAGES)) {
  test(`${route} refuses anyone who is not the owner, before it reads anything`, () => {
    const gate = source.indexOf("notFound()");
    assert.ok(gate > 0, "the page 404s rather than rendering for a stranger");
    assert.match(source, /if \(!\(await isOwner\(\)\) && !labPreviewAllowed\(\)\) notFound\(\);/);
    // The gate has to come before the reads, or a stranger's request still
    // hits the backend with the tenant's key on its way to a 404.
    let covered = 0;
    for (const call of READS) {
      const at = source.indexOf(call);
      if (at < 0) continue;
      covered++;
      assert.ok(at > gate, `${call.slice(0, -1)} must not run before the gate`);
    }
    assert.ok(covered > 0, `${route} matched none of the known reads — rename in READS, do not leave this blind`);

    // And nothing else that reads. A page that acquires the library by some
    // route this list has never heard of is the case the list cannot catch.
    const known = new Set(READS.map((call) => call.slice(0, -1)));
    const allowed = new Set(["isOwner", "labPreviewAllowed", "settledLayout", "notFound", "getTitle"]);
    for (const match of source.matchAll(READ_SHAPED)) {
      const name = match[0].slice(0, -1);
      if (known.has(name) || allowed.has(name)) continue;
      assert.ok(match.index > gate, `${name} runs before the gate; add it to READS or move it below the gate`);
    }
  });

  test(`${route} decides the gate per request, and what it caches is not per reader`, () => {
    // The library is held in the server process and shared, which is safe for
    // exactly one reason: it is the same bytes for everyone the gate lets
    // through, and the gate runs first. If the held read ever took anything
    // from the request — a session, a cookie, a header, a query — it would
    // stop being one shared answer, and a hit could serve one reader's view to
    // another, or a stranger's request could be answered from a hit without
    // the gate having said yes.
    const cache = read("../src/lib/encyclopedia-cache.ts");
    assert.match(cache, /import "server-only";/, "the cache must never reach the browser bundle");
    // Match the import as well as the call. Checking only for `cookies(`
    // missed `import { cookies } from "next/headers"`, which is exactly how
    // request state gets into a module that should not have it.
    assert.ok(!/from\s+["']next\/headers["']/.test(cache), "the held read must not import next/headers — that is request state");
    for (const forbidden of ["headers", "cookies", "searchParams", "session", "auth", "isOwner", "userId", "bearer", "token"]) {
      assert.ok(
        !new RegExp(`\\b${forbidden}\\b`, "i").test(cache),
        `the held read must not mention ${forbidden} — one shared answer cannot depend on who is asking`,
      );
    }
    // The page still calls the gate itself on every request; nothing about
    // holding the library moves that decision.
    assert.ok(source.indexOf("isOwner()") < source.indexOf("notFound()"), "the gate is evaluated in the request, not read from a cache");
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
