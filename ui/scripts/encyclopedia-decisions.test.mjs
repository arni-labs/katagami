// Decision numbers collided twice on the night of 2026-09-09, once costing a
// renumber, because several branches each append their own next number to one
// file and nothing validates the result. Two branches appending their own D44
// merge into a file with two D44s and no error anywhere.
//
// This asserts unique and ascending, not contiguous. A gap is legitimate before
// a merge: a branch that takes the next free block above what another branch has
// already claimed will show one until both land. Duplicates and out-of-order are
// the failures worth stopping, and a gap is reported for a reader rather than
// failed, because failing it would make the correct pre-merge state red.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const LOG = path.join(here, "..", "..", "docs", "efforts", "ARN-118", "decisions.md");

export function decisionNumbers(markdown) {
  return [...markdown.matchAll(/^## D(\d+)\b/gm)].map((match) => Number(match[1]));
}

export function checkNumbering(numbers) {
  const problems = [];
  const seen = new Set();
  for (const number of numbers) {
    if (seen.has(number)) problems.push(`D${number} appears more than once. Blocks are assigned in the overnight brief; ask rather than reading other branches, because a branch can claim more numbers while you are choosing.`);
    seen.add(number);
  }
  for (let index = 1; index < numbers.length; index++) {
    if (numbers[index] <= numbers[index - 1]) {
      problems.push(`D${numbers[index]} comes after D${numbers[index - 1]}, so the log is not in order`);
    }
  }
  const gaps = [];
  for (let index = 1; index < numbers.length; index++) {
    const missing = numbers[index] - numbers[index - 1];
    if (missing > 1) gaps.push(`D${numbers[index - 1] + 1} to D${numbers[index] - 1}`);
  }
  return { problems, gaps };
}

test("the committed decision log has no duplicate or out-of-order numbers", () => {
  const numbers = decisionNumbers(readFileSync(LOG, "utf8"));
  assert.ok(numbers.length > 0, "no decisions found; has the file moved?");
  const { problems, gaps } = checkNumbering(numbers);
  assert.deepEqual(problems, []);
  if (gaps.length > 0) {
    // Reported, not failed: another branch is holding those numbers.
    console.log(`  decision numbers not yet filled, presumably held by another branch: ${gaps.join(", ")}`);
  }
});

test("a duplicate number is caught, which is the collision that happened twice", () => {
  const { problems } = checkNumbering([41, 42, 43, 43, 44]);
  // A repeat is both a duplicate and a break in the ascending order, so it is
  // reported twice. Both statements are true and either one stops the merge.
  assert.ok(problems.some((problem) => /D43 appears more than once/.test(problem)));
  assert.ok(problems.some((problem) => /not in order/.test(problem)));
});

test("an out-of-order number is caught", () => {
  const { problems } = checkNumbering([41, 44, 42]);
  assert.ok(problems.some((problem) => /not in order/.test(problem)));
});

test("a gap is reported and not treated as a problem", () => {
  const { problems, gaps } = checkNumbering([41, 47, 48]);
  assert.deepEqual(problems, []);
  assert.deepEqual(gaps, ["D42 to D46"]);
});

test("numbers are read from headings only, not from prose that mentions one", () => {
  const markdown = "## D41 A title\n\nThis refers to D38 and to D99 in a sentence.\n\n## D47 Another\n";
  assert.deepEqual(decisionNumbers(markdown), [41, 47]);
});

// A conflict marker committed into the log is invisible to every check above,
// because they all match on `## D<n>` headings and a marker is not one. Three
// were committed to master in a merge resolution and found by a reader rather
// than by a test: the resolution wrote its output without ever grepping it, and
// nothing between there and master looked. A merge tool's own scratch filenames
// end up in the marker, so match the shape rather than a literal.
test("the committed decision log carries no conflict markers", () => {
  const lines = readFileSync(LOG, "utf8").split("\n");
  const markers = lines
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => /^(<{7}|>{7}|={7})(\s|$)/.test(line))
    .map(([n, line]) => `line ${n}: ${line}`);
  assert.deepEqual(markers, []);
});
