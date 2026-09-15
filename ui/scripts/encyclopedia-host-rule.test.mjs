// The claim-support sweep decides whether a cell citing a filing actually cites
// that vocabulary, and it decides it on the host of the URL. That check is what
// found 123 cells asserting an Artsy filing none of them cited, and its first
// version asked whether the host string appeared anywhere in the URL - a
// substring standing in for a claim, which is the same mistake the check exists
// to catch. `https://example.com/?ref=artsy.net` would have counted as citing
// Artsy.
//
// The rule's own cases live next to the rule, in `--self-test`, enumerated from
// what the rule says rather than from the URLs that happened to be in the
// collection. The self-test also requires that the substring version it replaced
// still fails on that list, so a later edit cannot quietly reduce the cases to
// ones both rules pass.
//
// This does not skip when python3 is missing. A check that passes because it
// could not find its subject reports a pass for something it is no longer looking
// at, which this repository has already been bitten by once.
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sweep = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..",
  "scripts", "encyclopedia_support.py");

function selfTest() {
  try {
    // The report goes to stderr, so it is captured rather than inherited.
    execFileSync("python3", [sweep, "--self-test"], { encoding: "utf8", stdio: "pipe" });
    return { ok: true, report: "" };
  } catch (error) {
    if (error.code === "ENOENT") assert.fail("python3 is not on PATH, so the host rule was never checked");
    return { ok: false, report: String(error.stderr ?? error.message) };
  }
}

test("the vocabulary check reads the parsed hostname, not a substring of the URL", () => {
  const { ok, report } = selfTest();
  assert.ok(ok, `scripts/encyclopedia_support.py --self-test failed:\n${report}`);
});

test("the host rule's cases still separate it from the substring match it replaced", () => {
  // Read from the source rather than from a number copied here, so the two
  // cannot drift. The self-test itself fails when no case separates them; this
  // asserts the guard is present, because a guard that is deleted fails nothing.
  const source = execFileSync("cat", [sweep], { encoding: "utf8" });
  assert.match(source, /no case separates the parsed-host rule from a substring match/,
    "the self-test no longer requires its cases to catch the substring bug");
  // The property, not the line. The first version of this assertion pinned the
  // exact return statement and went red the moment a third guard was added to it,
  // which is a test encoding what its author last saw rather than what the rule
  // says. What has to hold is that both guards still gate the exit code.
  const exit = /return 1 if ([^\n]*) else 0/.exec(source);
  assert.ok(exit, "the self-test no longer has a single exit condition to read");
  assert.match(exit[1], /\bnot caught\b/,
    "the self-test no longer fails when its cases stop separating the two rules");
  assert.match(exit[1], /len\(cases\) < \d+/,
    "the self-test no longer fails when its case list is cut down");
});
