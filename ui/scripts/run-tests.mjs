// Run every test in scripts/, found by looking rather than by being listed.
//
// `test:encyclopedia` and its siblings named their files one by one, so a new
// test file was silently never run: it existed, it passed locally, and the suite
// it was written for never opened it. `scripts/writing-detail.test.mjs` sat that
// way with 13 passing assertions that CI had never executed. Nothing was red,
// because nothing was looking.
//
// That is the same shape as a gate contract test skipping a read it could not
// find (D69) and a vocabulary check accepting a substring in place of a claim
// (D74), and it is worse than either, because it is the mechanism every future
// test depends on. A check that does not run is a deleted check with extra
// steps.
//
// So: glob, never enumerate. Two rules make the glob safe to rely on.
//
//   1. An empty match is a failure, not a pass. A runner that finds no files and
//      exits 0 reports success for a suite it never ran, which is the original
//      defect with the list removed.
//   2. A file's runtime needs are declared in the file, not here. A test needing
//      a node condition writes `// @node-conditions react-server` at the top, so
//      a new file carries its own requirement and this runner never becomes a
//      list again.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const ui = path.join(here, "..");
const args = process.argv.slice(2);
// --list-only reports what would run and executes nothing, so the guard that
// asserts every file on disk is executed can ask this runner without running the
// whole suite inside itself.
const listOnly = args.includes("--list-only");
const filter = args.find((a) => !a.startsWith("--")) ?? "";

const names = readdirSync(here).filter((name) => name.endsWith(".mjs")).sort();
// Two kinds of file, both self-describing. `*.test.mjs` are node:test files run
// by the test runner; `check-*.mjs` are standalone contract checks that assert on
// their own and exit non-zero. Anything else in scripts/ is a helper.
const unitTests = names.filter((n) => n.endsWith(".test.mjs")).filter((n) => n.includes(filter));
const checks = names.filter((n) => n.startsWith("check-") && !n.endsWith(".test.mjs"))
  .filter((n) => n.includes(filter));

if (unitTests.length + checks.length === 0) {
  console.error(filter
    ? `run-tests: no test matches "${filter}". A filter that matches nothing is a failure, not an empty pass.`
    : "run-tests: found no tests in scripts/. Either the glob is wrong or the suite is gone; both are failures.");
  process.exit(1);
}

// `// @node-conditions x y` on any line of the file. Files sharing a set run
// together, so the common case is still one process for the whole suite.
function conditionsFor(name) {
  const source = readFileSync(path.join(here, name), "utf8");
  const declared = /^\s*\/\/\s*@node-conditions\s+(.+)$/m.exec(source);
  return declared ? declared[1].trim().split(/\s+/).sort().join(" ") : "";
}

const groups = new Map();
for (const name of unitTests) {
  const key = conditionsFor(name);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(name);
}

let failed = 0;
const ran = new Set();

if (listOnly) {
  for (const [conditions, files] of [...groups].sort()) {
    console.log(`${files.length} test file(s)${conditions ? ` with --conditions=${conditions}` : ""}`);
  }
  console.log(`run-tests: ${unitTests.length} test files and ${checks.length} contract checks would run`);
  process.exit(0);
}

for (const [conditions, files] of [...groups].sort()) {
  const args = [
    // Every test resolves `@/...` the way the app does. Registering the aliases
    // for all of them costs nothing and removes the second thing a new file had
    // to know before it would run.
    "--import", "./scripts/register-aliases.mjs",
    ...(conditions ? conditions.split(" ").map((c) => `--conditions=${c}`) : []),
    "--test", ...files.map((f) => `scripts/${f}`),
  ];
  console.log(`\n# ${files.length} test file(s)${conditions ? ` with --conditions=${conditions}` : ""}`);
  const result = spawnSync("node", args, { cwd: ui, stdio: "inherit" });
  if (result.status !== 0) failed += 1;
  for (const f of files) ran.add(f);
}

for (const name of checks) {
  console.log(`\n# ${name}`);
  const result = spawnSync("node", [`scripts/${name}`], { cwd: ui, stdio: "inherit" });
  if (result.status !== 0) failed += 1;
  ran.add(name);
}

// A file that was found and then not executed is the same failure as a file that
// was never found. Asserted rather than assumed, because the partitioning above
// is the part that could silently drop one.
const missed = [...unitTests, ...checks].filter((n) => !ran.has(n));
if (missed.length) {
  console.error(`run-tests: found but never ran: ${missed.join(", ")}`);
  process.exit(1);
}

console.log(`\nrun-tests: ${unitTests.length} test files and ${checks.length} contract checks, all executed`);
process.exit(failed ? 1 : 0);
