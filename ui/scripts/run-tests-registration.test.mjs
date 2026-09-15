// The runner is the mechanism every other test depends on, so it gets the same
// treatment it exists to enforce: a check that fails when its subject is gone.
//
// The defect it replaces was a hand-written list in package.json naming each test
// file, which meant a new file was silently never run. `writing-detail.test.mjs`
// sat unregistered with 13 passing assertions CI had never executed. These
// assertions are written from what the rule says - every test file on disk runs,
// an empty match fails, a filter matching nothing fails - rather than from the
// files that happen to be present today.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const ui = path.join(here, "..");

function run(args) {
  return spawnSync("node", ["scripts/run-tests.mjs", ...args], { cwd: ui, encoding: "utf8" });
}

test("package.json names no test file, because naming them is the defect", () => {
  const scripts = JSON.parse(readFileSync(path.join(ui, "package.json"), "utf8")).scripts;
  for (const [name, command] of Object.entries(scripts)) {
    assert.doesNotMatch(command, /scripts\/[\w.-]+\.test\.mjs/,
      `${name} names a test file. Tests are found by globbing scripts/, never listed, or a new file is never run.`);
    assert.doesNotMatch(command, /node scripts\/check-[\w-]+\.mjs/,
      `${name} names a contract check. Same rule: found, not listed.`);
  }
});

test("every test file and contract check on disk is executed", () => {
  const names = readdirSync(here);
  const expected = names.filter((n) => n.endsWith(".test.mjs")
    || (n.startsWith("check-") && n.endsWith(".mjs"))).sort();
  assert.ok(expected.length > 1, "no tests found on disk, which is itself the failure this guards");

  // --dry-run would be a second code path; instead the runner's own closing line
  // states the counts it executed, and they are compared with the directory.
  const result = run(["--list-only"]);
  const reported = /run-tests: (\d+) test files and (\d+) contract checks/.exec(result.stdout ?? "");
  assert.ok(reported, `the runner did not report what it executed:\n${result.stdout}\n${result.stderr}`);
  const counted = Number(reported[1]) + Number(reported[2]);
  assert.equal(counted, expected.length,
    `the runner executed ${counted} files but scripts/ holds ${expected.length}`);
});

test("a filter matching nothing fails rather than passing empty", () => {
  const result = run(["zzz-no-such-test"]);
  assert.notEqual(result.status, 0, "a filter that matches no test exited 0, reporting a pass for nothing");
  assert.match(result.stderr, /matches nothing|no test matches/i);
});
