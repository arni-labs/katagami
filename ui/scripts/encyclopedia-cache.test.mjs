// The encyclopedia read is held for a moment and shared. What that must not
// break: a reader must never be served another reader's error, a burst of
// readers must not become a burst of reads against the backend, and a library
// that has changed must arrive.
//
// The behaviour lives in `heldRead`, so it is exercised directly rather than
// through a mocked module: what is under test is the holding, not the reading.
import assert from "node:assert/strict";
import test from "node:test";
import { heldRead } from "../src/lib/held-read.ts";

const TTL = 60_000;
const graph = (tag) => ({ cells: [{ id: tag }], withheld: 0, total: 1 });

test("a second read inside the window is served what the first one got", async () => {
  let reads = 0;
  const held = heldRead(async () => graph(`read-${++reads}`), TTL);
  const first = await held.get();
  const second = await held.get();
  assert.equal(reads, 1, "the backend is read once, not once per reader");
  assert.equal(second, first, "and both readers get the same library");
});

test("readers arriving during a read wait on it rather than starting their own", async () => {
  // Without this a cold cache turns a burst of readers into a burst of full
  // reads of the collection — the stampede the single flight exists to stop.
  let reads = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const held = heldRead(async () => { reads++; await gate; return graph("shared"); }, TTL);
  const all = Promise.all([held.get(), held.get(), held.get()]);
  release();
  const [a, b, c] = await all;
  assert.equal(reads, 1, "one read for three readers");
  assert.equal(a, b);
  assert.equal(b, c);
});

test("a read that fails with nothing in hand is an error, not an empty library", async () => {
  // Serving zero cells for a failed read would say the encyclopedia is empty,
  // which is a claim, and a false one.
  const held = heldRead(async () => { throw new Error("backend down"); }, TTL);
  await assert.rejects(() => held.get(), /backend down/);
});

test("a failure is not cached: the next reader tries again", async () => {
  let reads = 0;
  const held = heldRead(async () => {
    if (++reads === 1) throw new Error("transient");
    return graph("recovered");
  }, TTL);
  await assert.rejects(() => held.get());
  const got = await held.get();
  assert.equal(got.cells[0].id, "recovered", "the second reader is not served the first one's error");
});

test("a refresh that fails serves the library we already had, and says so", async () => {
  let reads = 0;
  const held = heldRead(async () => {
    if (++reads === 1) return graph("good");
    throw new Error("backend went away");
    // A one-millisecond window, so the copy goes stale on its own. `forget`
    // would not do: dropping the copy deliberately means there is nothing to
    // fall back on, which is what forgetting is for.
  }, 1, "encyclopedia");
  assert.equal((await held.get()).cells[0].id, "good");
  await new Promise((r) => setTimeout(r, 5));
  const said = [];
  const realError = console.error;
  console.error = (...args) => said.push(args);
  try {
    const second = await held.get();
    assert.equal(second.cells[0].id, "good", "a stale library beats a five hundred");
  } finally {
    console.error = realError;
  }
  assert.equal(said.length, 1, "and the failure is reported, not swallowed");
});

test("the held copy expires", async () => {
  let reads = 0;
  const held = heldRead(async () => graph(`read-${++reads}`), 0);
  await held.get();
  await held.get();
  assert.equal(reads, 2, "a zero window holds nothing");
});

test("forgetting sends the next reader back to the backend", async () => {
  let reads = 0;
  const held = heldRead(async () => graph(`read-${++reads}`), TTL);
  await held.get();
  held.forget();
  const again = await held.get();
  assert.equal(reads, 2);
  assert.equal(again.cells[0].id, "read-2");
});
