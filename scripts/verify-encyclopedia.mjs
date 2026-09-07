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
  const response = await fetch(`${origin}${path}`, { method, headers: { ...headers, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  const data = response.headers.get("content-type")?.includes("application/x-ndjson")
    ? text.trim().split("\n").map((line) => JSON.parse(line)).at(-1)
    : text ? JSON.parse(text) : null;
  return { status: response.status, data };
}

if (process.argv.includes("--install")) {
  const specDirectory = new URL("specs/", app);
  const specs = Object.fromEntries(readdirSync(specDirectory).filter((name) => name.endsWith(".ioa.toml") || name === "model.csdl.xml")
    .map((name) => [name, readFileSync(new URL(name, specDirectory), "utf8")]));
  const policyDirectory = new URL("policies/", app);
  const cedar_policies = readdirSync(policyDirectory).filter((name) => name.endsWith(".cedar"))
    .map((name) => readFileSync(new URL(name, policyDirectory), "utf8")).join("\n");
  const loaded = await request("/api/specs/load-inline", "POST", { tenant: "default", specs, cedar_policies });
  assert.equal(loaded.status, 200, JSON.stringify(loaded.data));
  assert.equal(loaded.data.type, "summary");
  assert.equal(loaded.data.all_passed, true, JSON.stringify(loaded.data));
  console.log("Loaded actual commons specifications and policies");
}
if (process.argv.includes("--install") || process.argv.includes("--upload")) {
  const response = await fetch(`${origin}/api/wasm/modules/validate_encyclopedia_cell`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/wasm" },
    body: readFileSync(new URL("wasm/validate_encyclopedia_cell/module.wasm", app)),
  });
  const result = await response.text();
  assert.equal(response.status, 200, result);
  console.log("Uploaded validator:", result);
}

const id = `encyclopedia-test-${randomUUID()}`;
const path = `/tdata/EncyclopediaCells('${id}')`;
const created = await request("/tdata/EncyclopediaCells", "POST", { Id: id });
assert.equal(created.status, 201, JSON.stringify(created.data));

async function action(name, body = {}) {
  return request(`${path}/Temper.${name}`, "POST", body);
}
async function expectState(expected) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const row = await request(path);
    assert.equal(row.status, 200, JSON.stringify(row.data));
    if (row.data.status === expected) return row.data;
    if (!String(row.data.status).startsWith("Validating")) {
      throw new Error(`Expected ${expected}; got ${row.data.status}: ${JSON.stringify(row.data)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expected}`);
}

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
row = await expectState("UnderReview");
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
row = await expectState("Draft");
assert.equal(row.booleans.document_validated, false);
assert.equal(row.booleans.review_approved, false);
assert.equal(row.entity_id, id);
assert.equal((await action("Define", { document: "{}" })).status, 200);
assert.equal((await action("SubmitForValidation")).status, 200);
row = await expectState("Draft");
assert.ok(row.fields.error);
console.log("Revision retains identity and clears review; malformed document refused");
