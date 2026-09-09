import assert from "node:assert/strict";
import test from "node:test";
import { baseConflict, documentHash } from "../../scripts/encyclopedia-base.mjs";

const read = '{"name":"Diaries","manifestations":[]}';
const base = documentHash(read);

test("a payload built from the document as it was read is written", () => {
  assert.equal(baseConflict({ id: "diaries", baseHash: base, stored: read, writing: '{"name":"Diaries","scope":"reworded"}' }), null);
});

test("a payload built from older bytes is refused, and the message says what to do", () => {
  const movedOn = '{"name":"Diaries","manifestations":[{"entitySet":"WritingStyles"}]}';
  const conflict = baseConflict({ id: "diaries", baseHash: base, stored: movedOn, writing: '{"name":"Diaries","scope":"reworded"}' });
  assert.match(conflict, /has changed since this payload was built/);
  assert.match(conflict, /re-read it and rebuild/);
  assert.match(conflict, /diaries/);
});

test("replaying the exact bytes already stored is not a conflict", () => {
  assert.equal(baseConflict({ id: "diaries", baseHash: documentHash("something else"), stored: read, writing: read }), null);
});

test("a payload that would replace an existing document and states no base is refused", () => {
  const conflict = baseConflict({ id: "diaries", baseHash: undefined, stored: read, writing: '{"name":"Diaries","x":1}' });
  assert.match(conflict, /does not say which bytes it was built from/);
  assert.match(conflict, /Read the cell/);
});

test("a payload with no base that replays the stored bytes is still not a conflict", () => {
  assert.equal(baseConflict({ id: "diaries", baseHash: undefined, stored: read, writing: read }), null);
});

test("a cell that does not exist yet, or holds nothing, is not a conflict", () => {
  assert.equal(baseConflict({ id: "diaries", baseHash: base, stored: undefined, writing: read }), null);
  assert.equal(baseConflict({ id: "diaries", baseHash: base, stored: "", writing: read }), null);
});

test("the hash is over the document bytes, so any change to them is seen", () => {
  assert.notEqual(documentHash(read), documentHash(read + " "));
  assert.match(documentHash(read), /^[0-9a-f]{64}$/);
});
