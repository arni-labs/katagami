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
  // Every owner-only route belongs here. A listing behind a door and a detail
  // page in front of one is the way this kind of gate is usually lost, so a new
  // route earns these assertions by being added to this map and nothing else.
  "/writing/[id]": read("../src/app/(site)/writing/[id]/page.tsx"),
};

for (const [route, source] of Object.entries(PAGES)) {
  test(`${route} refuses anyone who is not the owner, before it reads anything`, () => {
    // Read the component body, not the file: an import names every reader at
    // the top, and matching those would only ever prove that imports come first.
    //
    // WHAT THIS DOES AND DOES NOT CATCH, because a green check here is easy to
    // over-trust. It compares the TEXTUAL order of two strings, which is not
    // execution order. Slicing to the body removes the false positives — a
    // reader named above the component, an import or a helper, no longer trips
    // a page that reads only after the gate. It does not remove the false
    // NEGATIVES: a read inside a helper still passes, because what stands in
    // the body is the helper's name and not the reader's. `readFiles` in
    // `/writing/[id]` is exactly that shape — it wraps `getFileText`, it is
    // called after the gate, and moving that call above the gate would not
    // fail this test. Closing it needs the page driven against a stubbed
    // backend with `recordReads()` (see `encyclopedia-reader.test.mjs`),
    // asserting zero reads for a caller who is not the owner. Until then this
    // catches the direct case, which is how the mistake is actually made, and
    // nothing further.
    const body = source.slice(source.indexOf("export default"));
    const gate = body.indexOf("notFound()");
    assert.ok(gate > 0, "the page 404s rather than rendering for a stranger");
    assert.match(body, /if \(!\(await isOwner\(\)\) && !labPreviewAllowed\(\)\) notFound\(\);/);

    // THE GATE IS THE FIRST await IN THE COMPONENT.
    //
    // This is the assertion that carries the property. Everything a page does
    // to reach the backend is awaited, so a read placed before the gate — in a
    // helper, renamed, or through a reader nobody thought to list — becomes the
    // first await and fails here.
    //
    // Naming readers instead cannot do that, because what stands in the body is
    // the helper's name and not the reader's. A read wrapped in a helper is
    // exactly that shape, and this was reproduced rather than reasoned about: a
    // wrapped read placed above the gate passes a name-matching check and fails
    // this one. A name list also rots — it protects only the
    // readers somebody remembered to add, and protects nothing at all on a page
    // whose readers are new. This has nothing to keep current.
    //
    // IF THIS FAILS ON A PAGE YOU ARE WRITING, it is probably not a false
    // alarm, so read this before relaxing it. The shape that hits it is a route
    // that is public for published records and owner-only otherwise: it has to
    // read the record to learn which it is, so the gate cannot come first. That
    // read goes out on the tenant's credential before anyone knows who is
    // asking — a stranger's request has already reached the backend by the time
    // the gate runs, which is the thing this whole test exists to prevent. The
    // fix is to split the route, or to gate on something cheap that is safe to
    // evaluate for a stranger. Relaxing the assertion converts a caught leak
    // into a silent one.
    const firstAwait = body.indexOf("await ");
    assert.ok(firstAwait > 0, "the component awaits something");
    assert.equal(
      body.slice(firstAwait, firstAwait + "await isOwner()".length),
      "await isOwner()",
      "the owner check must be the first thing this page awaits — whatever is awaited before it runs for a stranger",
    );
    assert.ok(firstAwait < gate, "and it must be the gate's own await");

    // AND NOTHING IS CALLED BEFORE THE GATE AT ALL.
    //
    // The check above rests on every read being awaited. A read that is fired
    // and forgotten is not the first await, so the invariant cannot see it —
    // and it still goes out on the tenant's credential before anyone knows who
    // is asking. `void loadEncyclopediaCached()` above the gate passes the
    // invariant and fails here.
    //
    // This does not name reads, for the same reason the invariant does not.
    // An earlier draft of this guard matched read-SHAPED names — load, read,
    // fetch, get — and `void warmUp()` walked straight through it, as did
    // `void prepare()` and `void hydrate(ids)`. A narrower list is the same
    // mistake in a smaller font. So: the gate is the first statement a page
    // runs, and nothing may be called before it but the gate itself.
    // KNOWN LIMIT, reproduced rather than reasoned about: wrapping the gate
    // defeats this. `try { if (!(await isOwner())…) notFound(); } catch {}`
    // leaves nothing before the gate and passes, while `notFound()` throws and
    // the catch eats it — the gate is present but disarmed. That is a different
    // failure from a read running early, and no textual check found so far
    // catches it without becoming a grammar of its own. Driving the page
    // against a stubbed backend, asserting zero reads for a non-owner, is what
    // closes it.
    //
    // Said precisely because the comment this file used to carry claimed a gap
    // was inherent when it was three lines of work. This one is not.
    //
    // The check itself names nothing and allows nothing: strip the comments
    // from everything between the body's opening brace and the gate, and what
    // is left must be empty. An earlier draft of this same guard kept a
    // keyword allow-list so it could tell `if (` from a call — and a list of
    // keywords is a grammar, which is the shape we spent the day removing from
    // this file. Nothing before the gate needs no list at all.
    const gateStatement = body.indexOf("if (!(await isOwner())");
    assert.ok(gateStatement > 0, "the gate is written in the shape this test recognises");
    // The body opens at the signature's own `) {`, which is the first one after
    // `export default` — a destructured parameter list has braces of its own,
    // and slicing from the first `{` starts inside them.
    const bodyBrace = body.indexOf(") {");
    assert.ok(bodyBrace > 0 && bodyBrace < gateStatement, "the component's body is where this test expects it");
    const before = body
      .slice(bodyBrace + ") {".length, gateStatement)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .trim();
    assert.equal(
      before,
      "",
      `the gate is not the first statement; this runs for a stranger first: ${before.slice(0, 80)}`,
    );
  });

  test(`${route} decides the gate per request, and what it holds is not per reader`, () => {
    // The library is held in the server process and shared between requests,
    // which is safe for exactly one reason: it is the same bytes for everyone
    // the gate lets through, and the gate runs first. If the held read ever
    // took anything from the request — a session, a cookie, a header, a query —
    // it would stop being one shared answer, and a hit could serve one reader's
    // view to another, or answer a stranger whom the gate never said yes to.
    //
    // Neither ordering check above can see this: they watch when a read runs,
    // not what it depends on. Two people each held half of this guard while
    // each believed they held all of it.
    const cache = read("../src/lib/encyclopedia-cache.ts");
    assert.match(cache, /import "server-only";/, "the held read must never reach the browser bundle");
    // Match the import as well as the call: checking only for `cookies(` misses
    // `import { cookies } from "next/headers"`, which is exactly how request
    // state gets into a module that must not have it.
    assert.ok(!/from\s+["']next\/headers["']/.test(cache), "the held read must not import next/headers — that is request state");
    for (const forbidden of ["headers", "cookies", "searchParams", "session", "auth", "isOwner", "userId", "bearer", "token"]) {
      assert.ok(
        !new RegExp(`\\b${forbidden}\\b`, "i").test(cache),
        `the held read must not mention ${forbidden} — one shared answer cannot depend on who is asking`,
      );
    }
    // And holding the library moves nothing about who is let in: the page still
    // evaluates the gate itself, in the request.
    assert.ok(source.indexOf("isOwner()") < source.indexOf("notFound()"), "the gate is evaluated in the request, not read from a hit");
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

test("no section here is offered in the public navigation", () => {
  const nav = read("../src/lib/nav.ts");
  const publicLinks = nav.slice(nav.indexOf("NAV_LINKS"), nav.indexOf("OWNER_NAV_LINKS"));
  const ownerLinks = nav.slice(nav.indexOf("OWNER_NAV_LINKS"));
  // A detail route has no menu entry of its own; its section does.
  for (const route of Object.keys(PAGES).filter((r) => !r.includes("["))) {
    assert.ok(ownerLinks.includes(`"${route}"`), `${route} is an owner link`);
    assert.ok(!publicLinks.includes(`"${route}"`), `${route} must not be in the public navigation`);
  }
});

test("/voice/<id> sends its reader to the one detail page rather than keeping a second", () => {
  // Two views of one record drifted apart the moment either gained something:
  // the corpus and the handoff went to /writing/<id>, and a /voice link would
  // have led to the poorer one. The old address keeps working.
  const source = read("../src/app/(site)/voice/[id]/page.tsx");
  assert.match(source, /permanentRedirect\(`\/writing\/\$\{encodeURIComponent\(id\)\}`\)/);
  assert.doesNotMatch(source, /getFileText|getWritingStyle/, "the redirect must not read the record on its way");

  // The portable artifact keeps its own address and its own gate.
  const voiceMd = read("../src/app/(site)/voice/[id]/VOICE.md/route.ts");
  assert.match(voiceMd, /if \(!\(await isOwner\(\)\)\) return plain\("writing style not found", 404\);/);
});
