import test from "node:test";
import assert from "node:assert/strict";
import { GRACE_MINUTES, resolveRefresh, settleRotation, sha256Hex } from "../src/lib/refresh-rotation.mjs";

const SECRET = "test-secret";
const MIN = 60_000;

// One grant in an in-memory store, the way AgentGrants holds it: a single hash.
function store(initialToken) {
  const grant = { grantId: "g1", hash: null };
  return {
    grant,
    async init() { grant.hash = await sha256Hex(initialToken); },
    findGrantByHash: async (h) => (h === grant.hash ? grant : null),
    async rotateTo(token) { grant.hash = await sha256Hex(token); },
  };
}

// The token route, reduced to what rotation does: resolve, then store on rotate.
async function refresh(s, presented, nowMs, secret = SECRET) {
  const r = await resolveRefresh({ presented, nowMs, secret, findGrantByHash: s.findGrantByHash });
  if (r.kind === "rotate") {
    await s.rotateTo(r.next);
    r.next = await settleRotation({ presented, next: r.next, nowMs, secret, findGrantByHash: s.findGrantByHash });
  }
  return r;
}

test("a lone refresh rotates, and the next refresh uses the new token", async () => {
  const s = store("krt_first"); await s.init();
  const a = await refresh(s, "krt_first", 10 * MIN);
  assert.equal(a.kind, "rotate");
  const b = await refresh(s, a.next, 40 * MIN);
  assert.equal(b.kind, "rotate");
  assert.notEqual(b.next, a.next);
});

test("two sessions refreshing the same token at once end up with the same sign-in", async () => {
  const s = store("krt_first"); await s.init();
  // Both read the grant before either writes: the race that used to log a client out.
  const [a, b] = await Promise.all([
    resolveRefresh({ presented: "krt_first", nowMs: 10 * MIN + 100, secret: SECRET, findGrantByHash: s.findGrantByHash }),
    resolveRefresh({ presented: "krt_first", nowMs: 10 * MIN + 900, secret: SECRET, findGrantByHash: s.findGrantByHash }),
  ]);
  await s.rotateTo(a.next); await s.rotateTo(b.next);
  assert.equal(a.next, b.next, "same token and minute derive the same successor");
  assert.equal((await refresh(s, a.next, 40 * MIN)).kind, "rotate", "the shared new token works");
});

test("a session that arrives after the rotation gets the same new token, even across a minute boundary", async () => {
  const s = store("krt_first"); await s.init();
  const winner = await refresh(s, "krt_first", 11 * MIN - 50);
  const late = await refresh(s, "krt_first", 11 * MIN + 50);
  assert.equal(late.kind, "replay");
  assert.equal(late.next, winner.next);
});

test("a replaced token dies after the grace period", async () => {
  const s = store("krt_first"); await s.init();
  await refresh(s, "krt_first", 10 * MIN);
  assert.equal((await refresh(s, "krt_first", 10 * MIN + (GRACE_MINUTES - 1) * MIN)).kind, "replay");
  assert.equal((await refresh(s, "krt_first", 10 * MIN + (GRACE_MINUTES + 1) * MIN)).kind, "invalid");
});

test("only the token just replaced gets grace; older ones and unknown ones are refused", async () => {
  const s = store("krt_first"); await s.init();
  const a = await refresh(s, "krt_first", 10 * MIN);
  await refresh(s, a.next, 10 * MIN + 30_000);
  assert.equal((await refresh(s, "krt_first", 10 * MIN + 40_000)).kind, "invalid", "two rotations back is dead");
  assert.equal((await refresh(s, "krt_never_issued", 10 * MIN)).kind, "invalid");
});

test("the successor depends on the server secret", async () => {
  const s1 = store("krt_first"); await s1.init();
  const s2 = store("krt_first"); await s2.init();
  const a = await refresh(s1, "krt_first", 10 * MIN, "secret-a");
  const b = await refresh(s2, "krt_first", 10 * MIN, "secret-b");
  assert.notEqual(a.next, b.next);
  assert.match(a.next, /^krt_[A-Za-z0-9_-]{43}$/);
});

test("two sessions that rotate the same token in different minutes both end up with the token that was kept", async () => {
  const s = store("krt_first"); await s.init();
  // Both read the token as current just either side of a minute boundary.
  const a = await resolveRefresh({ presented: "krt_first", nowMs: 12 * MIN - 100, secret: SECRET, findGrantByHash: s.findGrantByHash });
  const b = await resolveRefresh({ presented: "krt_first", nowMs: 12 * MIN + 100, secret: SECRET, findGrantByHash: s.findGrantByHash });
  assert.notEqual(a.next, b.next);
  await s.rotateTo(a.next);
  await s.rotateTo(b.next); // b writes last and wins
  const aGets = await settleRotation({ presented: "krt_first", next: a.next, nowMs: 12 * MIN + 200, secret: SECRET, findGrantByHash: s.findGrantByHash });
  const bGets = await settleRotation({ presented: "krt_first", next: b.next, nowMs: 12 * MIN + 200, secret: SECRET, findGrantByHash: s.findGrantByHash });
  assert.equal(aGets, b.next, "the session whose write was overwritten is handed the kept token");
  assert.equal(bGets, b.next);
  assert.equal((await refresh(s, aGets, 30 * MIN)).kind, "rotate", "and it still works at the next refresh");
});

test("the grace window ends exactly at the start of the third minute after rotation", async () => {
  const s = store("krt_first"); await s.init();
  await refresh(s, "krt_first", 12 * MIN - 1); // rotated at 11:59:59.999
  assert.equal((await refresh(s, "krt_first", 14 * MIN - 1)).kind, "replay");
  assert.equal((await refresh(s, "krt_first", 14 * MIN)).kind, "invalid");
});

test("a server whose clock runs a minute ahead of another still finds the successor", async () => {
  const s = store("krt_first"); await s.init();
  const fast = await refresh(s, "krt_first", 12 * MIN + 500); // stored in minute 12
  const slow = await refresh(s, "krt_first", 12 * MIN - 500); // a server still in minute 11
  assert.equal(slow.kind, "replay");
  assert.equal(slow.next, fast.next);
});
