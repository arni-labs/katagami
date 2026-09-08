import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";

const origin = process.env.ENCYCLOPEDIA_TEST_URL ?? "http://localhost:3869";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) {
  throw new Error("This verification harness creates test records and runs only against a local server");
}
const headers = { "Content-Type": "application/json", "X-Tenant-Id": "default", Authorization: "Bearer test-local-key" };
const app = new URL("../katagami-commons/", import.meta.url);
const fixture = readFileSync(new URL("fixtures/encyclopedia-cell.json", app), "utf8");

async function request(path, method = "GET", body, extra = {}) {
  const response = await fetch(`${origin}${path}`, { method, headers: { ...headers, ...extra }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(180_000) });
  const text = await response.text();
  const data = response.headers.get("content-type")?.includes("application/x-ndjson")
    ? text.trim().split("\n").map((line) => JSON.parse(line)).at(-1)
    : response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : text;
  return { status: response.status, data };
}

if (process.argv.includes("--install")) {
  const specDirectory = new URL("specs/", app);
  const specs = Object.fromEntries(["encyclopedia_cell.ioa.toml", "model.csdl.xml"]
    .map((name) => [name, readFileSync(new URL(name, specDirectory), "utf8")]));
  const loaded = await request("/api/specs/load-inline", "POST", { tenant: "default", specs });
  assert.equal(loaded.status, 200, JSON.stringify(loaded.data));
  assert.equal(loaded.data.type, "summary");
  assert.equal(loaded.data.all_passed, true, JSON.stringify(loaded.data));
  console.log("Loaded the actual cell specification and commons metadata");
}
if (process.argv.includes("--install") || process.argv.includes("--upload")) {
  const response = await fetch(`${origin}/api/wasm/modules/validate_encyclopedia_cell`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/wasm" },
    body: readFileSync(new URL("wasm/validate_encyclopedia_cell/validate_encyclopedia_cell.wasm", app)),
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.text();
  assert.equal(response.status, 200, result);
  console.log("Uploaded validator:", result);
}

// Apply app policy after installation: it deliberately does not grant tenant
// management access. Re-installation requires a fresh disposable test instance.
if (process.argv.includes("--policies")) {
  const policyDirectory = new URL("policies/", app);
  const policy_text = readdirSync(policyDirectory).filter((name) => name.endsWith(".cedar"))
    .sort().map((name) => readFileSync(new URL(name, policyDirectory), "utf8")).join("\n");
  const loaded = await request("/api/tenants/default/policies", "PUT", { policy_text });
  assert.equal(loaded.status, 200, JSON.stringify(loaded.data));
  console.log("Loaded actual commons policies through the separate authorized policy endpoint");
}

const id = `encyclopedia-test-${randomUUID()}`;
const path = `/tdata/EncyclopediaCells('${id}')`;
const created = await request("/tdata/EncyclopediaCells", "POST", { id });
assert.equal(created.status, 201, JSON.stringify(created.data));
assert.equal(created.data.entity_id, id);

async function action(name, body = {}, entityPath = path) {
  const result = await request(`${entityPath}/Temper.${name}`, "POST", body);
  if (result.status !== 200) console.log(`${name}:`, JSON.stringify(result));
  return result;
}
async function expectState(expected, matches = () => true, entityPath = path) {
  let last;
  for (let attempt = 0; attempt < 100; attempt++) {
    const row = await request(entityPath);
    assert.equal(row.status, 200, JSON.stringify(row.data));
    last = row.data;
    if (row.data.status === expected && matches(row.data)) return row.data;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expected}; last state=${last?.status}, error=${last?.fields?.error}`);
}

const draft = JSON.stringify({ version: 1, name: "Synthetic draft", description: "Approved scope only", maps: ["art"], broader: [], relations: [], questions: [], sources: [], manifestations: [], studies: [] });
assert.equal((await action("Define", { document: draft })).status, 200);
let draftRow = await expectState("Draft", (row) => row.fields.document === draft);
assert.equal(draftRow.fields.document, draft);
const repeated = await request("/tdata/EncyclopediaCells", "POST", { id });
assert.equal(repeated.status, 201, JSON.stringify(repeated.data));
assert.equal(repeated.data.entity_id, id);
draftRow = await expectState("Draft");
assert.equal(draftRow.fields.document, draft);
console.log("Name-and-scope cell persists as a private draft; repeated creation preserves its identity and document");

const anonymous = await fetch(`${origin}${path}`, { headers: { "X-Tenant-Id": "default" } });
assert.equal(anonymous.status, 401);
for (const callback of ["DocumentValidated", "ReviewValidated", "ValidationFailed"]) {
  assert.equal((await action(callback)).status, 403);
}
console.log("Unauthenticated reads and caller-supplied validation callbacks are refused");

assert.equal((await action("Publish")).status, 409);
assert.equal((await action("Define", { document: fixture })).status, 200);
assert.equal((await action("SubmitForValidation")).status, 200);
let row = await expectState("UnderReview");
assert.equal(row.booleans.document_validated, true);
assert.equal((await action("Publish")).status, 409);
console.log("Valid document accepted; publication without a review refused");

const hash = createHash("sha256").update(fixture).digest("hex");
const review = {
  documentHash: hash, reviewer: "Local verification harness", evidenceSourceIds: ["fixture"],
  findings: "Synthetic test review. Never publish this fixture to production.", limitations: ["Synthetic data"],
  rightsReviewed: true, relationshipsReviewed: true, examplesReviewed: true, livingCreatorImitationExcluded: true,
};
assert.equal((await action("RecordReview", { review: JSON.stringify(review) })).status, 200);
row = await expectState("UnderReview", (value) => value.booleans.review_approved === true);
assert.equal(row.booleans.review_approved, true);
assert.equal((await action("Publish")).status, 200);
row = await expectState("Published");
assert.equal(row.fields.document_hash, hash);
assert.equal(row.fields.review_document_hash, hash);
console.log("Reviewed fixture published through the declared actions:", id);

for (const method of ["PATCH", "PUT", "DELETE"]) {
  const result = await request(path, method, method === "DELETE" ? undefined : { document: "overwritten", review_approved: true });
  assert.ok([403, 405].includes(result.status), `${method} bypass returned ${result.status}: ${JSON.stringify(result.data)}`);
}
assert.equal((await request(path)).data.fields.document, fixture);
console.log("Generic PATCH, PUT, and DELETE cannot replace the reviewed artifact");

assert.equal((await action("Revise")).status, 200);
row = await expectState("Draft", (value) => value.booleans.document_validated === false && value.booleans.review_approved === false);
assert.equal(row.booleans.document_validated, false);
assert.equal(row.booleans.review_approved, false);
assert.equal(row.entity_id, id);
assert.equal((await action("SubmitForValidation")).status, 200);
await expectState("UnderReview", (value) => value.booleans.document_validated === true);
assert.equal((await action("RecordReview")).status, 200);
row = await expectState("Draft", (value) => Boolean(value.fields.error));
assert.equal(row.booleans.review_approved, false);
assert.match(row.fields.error, /requires a new review/);
console.log("An empty review request cannot reuse the prior version's review");

assert.equal((await action("Define", { document: "{}" })).status, 200);
assert.equal((await action("SubmitForValidation")).status, 200);
row = await expectState("Draft", (value) => Boolean(value.fields.error));
assert.ok(row.fields.error);
console.log("Revision retains identity and clears review; malformed document refused");

assert.equal((await action("Define", { document: fixture })).status, 200);
assert.equal((await action("SubmitForValidation")).status, 200);
row = await expectState("UnderReview", (value) => value.booleans.document_validated === true);
assert.equal(row.fields.error, "");
assert.equal((await action("RecordReview", { review: JSON.stringify(review) })).status, 200);
row = await expectState("UnderReview", (value) => value.booleans.review_approved === true);
assert.equal(row.fields.error, "");
assert.equal((await action("Revise")).status, 200);
await expectState("Draft");
console.log("Correcting a failed document clears its error and requires an explicit review");

assert.equal((await action("Archive")).status, 200);
await expectState("Archived");
assert.equal((await action("Define", { document: draft })).status, 409);
console.log("An unwanted Draft can be archived without deleting its history");

// Inline integration dispatch uses a separate runtime path from the background
// callback. Exercise both without changing the installed authorization policy.
const inlineId = `encyclopedia-test-inline-${randomUUID()}`;
const inlinePath = `/tdata/EncyclopediaCells('${inlineId}')`;
const largeDocument = JSON.stringify({ ...JSON.parse(fixture), questions: ["A".repeat(70_000), "B".repeat(70_000)] });
const largeHash = createHash("sha256").update(largeDocument).digest("hex");
const largeReview = JSON.stringify({ ...review, documentHash: largeHash, limitations: ["C".repeat(70_000), "D".repeat(70_000)] });
assert.ok(Buffer.byteLength(largeDocument, "utf8") > 128 * 1024);
assert.ok(Buffer.byteLength(largeReview, "utf8") > 128 * 1024);
assert.equal((await request("/tdata/EncyclopediaCells", "POST", { id: inlineId })).status, 201);
assert.equal((await action("Define", { document: largeDocument }, inlinePath)).status, 200);
for (const callback of ["DocumentValidated", "ReviewValidated", "ValidationFailed"]) {
  assert.equal((await action(`${callback}?await_integration=true`, {}, inlinePath)).status, 403);
}
assert.equal((await action("SubmitForValidation?await_integration=true", {}, inlinePath)).status, 200);
row = await expectState("UnderReview", (value) => value.booleans.document_validated === true, inlinePath);
assert.equal(row.fields.document_hash, largeHash);
assert.equal((await action("RecordReview?await_integration=true", { review: largeReview }, inlinePath)).status, 200);
row = await expectState("UnderReview", (value) => value.booleans.review_approved === true, inlinePath);
assert.equal(row.fields.review_document_hash, largeHash);
assert.equal((await action("Archive", {}, inlinePath)).status, 200);
await expectState("Archived", () => true, inlinePath);
console.log("Inline validation resolves document and review blobs over 128 KiB; UnderReview can be archived:", inlineId);
