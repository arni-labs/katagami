import assert from "node:assert/strict";
import test from "node:test";
import { depthFindings } from "../../scripts/encyclopedia-depth.mjs";

const cell = (id, { broader = [], manifestations = [] } = {}) => ({
  id,
  document: {
    broader: broader.map((cellId) => ({ cellId })),
    manifestations: manifestations.map((entityId) => ({ entitySet: "WritingStyles", entityId })),
  },
});

test("a record on a childless cell is not reported", () => {
  const { onAParent, atTwoDepths } = depthFindings([
    cell("handbooks-and-manuals"),
    cell("courtesy-books", { broader: ["handbooks-and-manuals"], manifestations: ["chesterfield"] }),
  ]);
  assert.deepEqual(onAParent, []);
  assert.deepEqual(atTwoDepths, []);
});

test("a record on a cell with children is reported for a look", () => {
  const { onAParent } = depthFindings([
    cell("epistolary-literature", { manifestations: ["chesterfield"] }),
    cell("epistolary-fiction", { broader: ["epistolary-literature"] }),
    cell("epistolary-poetry", { broader: ["epistolary-literature"] }),
  ]);
  assert.equal(onAParent.length, 1);
  assert.match(onAParent[0], /epistolary-literature/);
  assert.match(onAParent[0], /2 children/);
  assert.match(onAParent[0], /check whether the record wants a narrower cell/);
});

test("the wording is a prompt to check, never a verdict", () => {
  const { onAParent } = depthFindings([
    cell("travel-writing", { manifestations: ["twain"] }),
    cell("outdoor-literature", { broader: ["travel-writing"] }),
  ]);
  // Twain sits here on purpose because no leaf for comic travel writing exists.
  assert.doesNotMatch(onAParent[0], /wrong|violation|must|error/i);
});

test("two claims at the same depth are not reported, which is the naturalist case", () => {
  const { atTwoDepths } = depthFindings([
    cell("field-notes", { manifestations: ["darwin"] }),
    cell("nature-writing", { manifestations: ["darwin"] }),
  ]);
  assert.deepEqual(atTwoDepths, []);
});

test("one record on a leaf and on a parent is named as the pair it is", () => {
  const { atTwoDepths } = depthFindings([
    cell("epistolary-literature", { manifestations: ["chesterfield"] }),
    cell("epistolary-fiction", { broader: ["epistolary-literature"] }),
    cell("courtesy-books", { manifestations: ["chesterfield"] }),
  ]);
  assert.equal(atTwoDepths.length, 1);
  assert.match(atTwoDepths[0], /epistolary-literature:1/);
  assert.match(atTwoDepths[0], /courtesy-books:0/);
});

test("a parent with no records attached is fine, however deep the tree", () => {
  const { onAParent, atTwoDepths } = depthFindings([
    cell("creative-nonfiction"),
    cell("essays", { broader: ["creative-nonfiction"] }),
    cell("lyric-essay", { broader: ["essays"], manifestations: ["lyric-essay-voice"] }),
  ]);
  assert.deepEqual(onAParent, []);
  assert.deepEqual(atTwoDepths, []);
});

test("the same finding is not reported twice", () => {
  const { onAParent } = depthFindings([
    cell("parent", { manifestations: ["a", "a"] }),
    cell("child", { broader: ["parent"] }),
  ]);
  assert.equal(onAParent.length, 1);
});

test("singular and plural are both written correctly", () => {
  const one = depthFindings([cell("p", { manifestations: ["r"] }), cell("c", { broader: ["p"] })]);
  assert.match(one.onAParent[0], /has 1 child;/);
  const two = depthFindings([cell("p", { manifestations: ["r"] }), cell("c", { broader: ["p"] }), cell("d", { broader: ["p"] })]);
  assert.match(two.onAParent[0], /has 2 children;/);
});

test("a cell with nothing on it produces nothing", () => {
  const { onAParent, atTwoDepths } = depthFindings([cell("aphorism")]);
  assert.deepEqual(onAParent, []);
  assert.deepEqual(atTwoDepths, []);
});
