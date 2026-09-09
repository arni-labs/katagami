// The first version of this check excused a row on the strength of a sentence in
// its own note, and a verifier broke it in one move: point a row at a page that
// answers, paste the sentence in, and the check waves it through. The second
// version fetched the page instead, which is honest but flaps, because artsy.net
// refuses about two requests in three. The excuse is now a reviewed host list,
// and both failures are tests here: the verifier's attack, and the stability the
// fetch-only version did not have.
//
// Everything is stubbed. The audit takes its cell reader and its fetch as
// arguments precisely so the decision can be driven without a deployment or a
// network, and so a test can make a page answer or refuse on demand.
import assert from "node:assert/strict";
import test from "node:test";
import { auditMergeRows } from "../../scripts/verify-merge-citations.mjs";
import { fetchVerdict, publicHost, FETCHED } from "../../scripts/encyclopedia-source-fetch.mjs";
import { unfetchableHost, UNFETCHABLE_HOSTS } from "../../scripts/encyclopedia-unfetchable-hosts.mjs";

const EXCUSE = "artsy.net answers 403 to scripts, so the loader cannot fetch it.";
const row = (over = {}) => ({
  file: "test.json", term: "Cubism", decision: "merge", cellId: "cubism",
  ref: "https://www.artsy.net/gene/cubism", note: "Already a live cell.", ...over,
});
const cellHolding = (...urls) => async () => urls;
const answers = async () => FETCHED;
const refuses = async () => "HTTP 403";

test("a row whose cell carries the reference is carried", async () => {
  const { carried, excused, gaps } = await auditMergeRows([row()], cellHolding("https://www.artsy.net/gene/cubism"), refuses);
  assert.equal(carried.length, 1);
  assert.deepEqual([excused.length, gaps.length], [0, 0]);
});

test("a reference on an unfetchable host excuses the row", async () => {
  const { excused, gaps } = await auditMergeRows([row()], cellHolding(), refuses);
  assert.equal(gaps.length, 0);
  assert.match(excused[0], /unfetchable host/);
});

test("prose claiming the page refuses does not excuse a reference on any other host", async () => {
  // The verifier's attack, exactly: the note says 403, the page is Wikipedia's,
  // and it answers. No entry in the host list reaches en.wikipedia.org.
  const attack = row({ note: EXCUSE, ref: "https://en.wikipedia.org/wiki/Satire" });
  const { excused, gaps } = await auditMergeRows([attack], cellHolding(), answers);
  assert.equal(excused.length, 0);
  assert.equal(gaps.length, 1);
  assert.match(gaps[0], /does not carry https:\/\/en\.wikipedia\.org/);
});

test("the verdict does not move when the unfetchable host happens to answer", async () => {
  // The fetch-only version excused or failed this row depending on the coin flip.
  const refused = await auditMergeRows([row()], cellHolding(), refuses);
  const answered = await auditMergeRows([row()], cellHolding(), answers);
  assert.deepEqual([refused.gaps.length, answered.gaps.length], [0, 0]);
  assert.equal(refused.excused.length, answered.excused.length);
  assert.match(answered.excused[0], /this attempt: fetched/);
});

test("an uncarried reference to an ordinary host is unmet whatever the note says", async () => {
  const off = row({ note: EXCUSE, ref: "https://example.com/thing" });
  const { gaps } = await auditMergeRows([off], cellHolding("https://example.com/other"), answers);
  assert.equal(gaps.length, 1);
});

test("the host list is keyed by host and carries a measurement for each entry", async () => {
  assert.equal(unfetchableHost("https://en.wikipedia.org/wiki/Satire"), null);
  assert.equal(unfetchableHost("not a url"), null);
  assert.ok(unfetchableHost("https://www.artsy.net/gene/cubism"));
  for (const [host, why] of UNFETCHABLE_HOSTS) {
    assert.ok(host.length && !host.includes("/"), `${host} should be a bare host`);
    assert.match(why, /Measured \d{4}-\d{2}-\d{2}/, `${host} needs a dated measurement`);
  }
});

test("http and https forms of the same reference match", async () => {
  const lc = "http://id.loc.gov/authorities/genreForms/gf2023026105";
  const { carried } = await auditMergeRows([row({ ref: lc })], cellHolding("https://id.loc.gov/authorities/genreForms/gf2023026105"), answers);
  assert.equal(carried.length, 1);
});

test("a merge with no target, and a cell that cannot be read, are both unmet", async () => {
  const noTarget = await auditMergeRows([row({ cellId: undefined })], cellHolding(), refuses);
  assert.match(noTarget.gaps[0], /names no target/);
  const unreadable = await auditMergeRows([row()], async () => null, refuses);
  assert.match(unreadable.gaps[0], /holds no readable document/);
});

test("the fetch refuses a private address without asking the network", async () => {
  const resolve = async () => [{ address: "10.0.0.1" }];
  assert.match(await publicHost("https://internal.example.com/x", resolve), /private address 10\.0\.0\.1/);
  const verdict = await fetchVerdict("https://internal.example.com/x", { resolve, fetch: async () => { throw new Error("must not be fetched"); } });
  assert.match(verdict, /private address/);
});

test("the fetch refuses a redirect that leaves the host, and follows one that does not", async () => {
  const resolve = async () => [{ address: "93.184.216.34" }];
  const redirectTo = (location) => async () => ({ status: 301, ok: false, headers: { get: () => location } });
  assert.match(
    await fetchVerdict("https://vocab.example.org/a", { resolve, fetch: redirectTo("https://www.example.net/b") }),
    /redirected off-site to www\.example\.net/,
  );
  let hops = 0;
  const sameHost = async () => (hops++ === 0
    ? { status: 301, ok: false, headers: { get: () => "https://vocab.example.org/b" } }
    : { status: 200, ok: true, headers: { get: () => null } });
  assert.equal(await fetchVerdict("https://vocab.example.org/a", { resolve, fetch: sameHost }), FETCHED);
});

test("a non-https reference is refused before any request", async () => {
  const verdict = await fetchVerdict("http://example.com/x", { fetch: async () => { throw new Error("must not be fetched"); } });
  assert.match(verdict, /not https/);
});
