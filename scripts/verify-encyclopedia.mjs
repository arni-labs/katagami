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

// One authenticated identity that is not a curator. The runtime strips inbound
// identity headers, so a non-curator principal only exists as a credential the
// resolver can resolve. This mints one in the fixture's setup window; the exact
// commons policy is installed immediately afterwards and grants nothing here.
const contributorToken = "contributor-local-test-key";
const contributorKey = { Authorization: `Bearer ${contributorToken}` };
if (process.argv.includes("--policies")) {
  const keyHash = createHash("sha256").update(contributorToken).digest("hex");
  const registrations = [
    ["AgentTypes", "contributor-type", "Define", {
      name: "contributor", system_prompt: "Local verification contributor", tool_set: "local",
      model: "none", max_turns: "0", adapter_config: "{}", default_budget_cents: "0",
    }],
    ["AgentCredentials", keyHash, "Issue", {
      agent_type_id: "contributor-type", agent_instance_id: "local-test-contributor",
      key_hash: keyHash, key_prefix: contributorToken.slice(0, 8),
      description: "Local verification contributor", created_by: "verify-encyclopedia", expires_at: "",
    }],
  ];
  for (const [set, entityId, name, body] of registrations) {
    assert.equal((await request(`/tdata/${set}`, "POST", { id: entityId })).status, 201);
    const issued = await request(`/tdata/${set}('${entityId}')/Temper.${name}`, "POST", body);
    assert.equal(issued.status, 200, JSON.stringify(issued.data));
  }
  console.log("Registered one non-curator contributor credential for the authorization tests");
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
for (const callback of ["DocumentValidated", "ValidationFailed"]) {
  assert.equal((await action(callback)).status, 403);
}
console.log("Unauthenticated reads and caller-supplied validation callbacks are refused");

// A verified identity that is authenticated but is not a curator. Its
// credential resolves to agent_type "contributor"; nothing about the request
// asserts its own identity, so the policy decides on the resolved principal.
const contributorRead = await request(path, "GET", undefined, contributorKey);
assert.equal(contributorRead.status, 403, JSON.stringify(contributorRead.data));
const contributorWrite = await request(`${path}/Temper.Define`, "POST", { document: draft }, contributorKey);
assert.equal(contributorWrite.status, 403, JSON.stringify(contributorWrite.data));
const contributorList = await request("/tdata/EncyclopediaCells", "GET", undefined, contributorKey);
assert.ok([403, 200].includes(contributorList.status), JSON.stringify(contributorList.data));
if (contributorList.status === 200) {
  assert.deepEqual(contributorList.data.value ?? [], [], "a non-curator listed private cells");
}
console.log("An authenticated non-curator contributor identity can neither read nor author a private cell");

// Removed surface. Publication asserts a curator review that this deployment
// performs nowhere, so those actions must not exist on the installed machine.
for (const removed of ["Publish", "RecordReview", "RequestChanges", "Revise", "ReviewValidated"]) {
  const result = await action(removed, { document: "{}" });
  assert.ok(result.status >= 400, `${removed} unexpectedly succeeded: ${JSON.stringify(result.data)}`);
}
draftRow = await expectState("Draft");
assert.equal(draftRow.fields.document, draft);
assert.equal(draftRow.booleans.document_validated, false);
console.log("Publication and review actions are absent, and calling them leaves the stored document untouched");

assert.equal((await action("Define", { document: fixture })).status, 200);
assert.equal((await action("SubmitForValidation")).status, 200);
const hash = createHash("sha256").update(fixture).digest("hex");
let row = await expectState("Draft", (value) => value.booleans.document_validated === true);
assert.equal(row.fields.document_hash, hash);
assert.equal(row.fields.error, "");
console.log("A valid document validates and returns to Draft with its hash recorded");

// The reported publication bypass is one case of a runtime defect: an action
// persists a submitted string parameter that matches a field name even when the
// action declares no parameters at all. It is not repairable from this
// application, so what this deployment relies on is recorded and checked here.
//
// 1. Declared state cannot be forged. `document_validated` and `version` are
//    written only by the effects in the specification, so no parameter can
//    assert that unvalidated content was validated.
const tamper = `encyclopedia-test-tamper-${randomUUID()}`;
const tamperPath = `/tdata/EncyclopediaCells('${tamper}')`;
assert.equal((await request("/tdata/EncyclopediaCells", "POST", { id: tamper })).status, 201);
assert.equal((await action("Define", { document: fixture }, tamperPath)).status, 200);
assert.equal((await action("SubmitForValidation", {}, tamperPath)).status, 200);
row = await expectState("Draft", (value) => value.booleans.document_validated === true, tamperPath);
const versionBefore = row.counters.version;
assert.equal((await action("Archive", { document: "TAMPERED", document_validated: false, version: 99 }, tamperPath)).status, 200);
row = await expectState("Archived", () => true, tamperPath);
assert.equal(row.booleans.document_validated, true, "a parameter changed a declared boolean");
assert.equal(row.counters.version, versionBefore, "a parameter changed a counter");
// 2. This asserts the runtime's present behaviour, not a desired one: the
//    parameter did replace the stored document. When the runtime stops merging
//    undeclared parameters, this assertion fails, and the correct replacement
//    is `assert.equal(row.fields.document, fixture)`.
assert.equal(row.fields.document, "TAMPERED", "the runtime no longer merges undeclared parameters; tighten this test");
// 3. A replaced document no longer matches its recorded hash, so a partial
//    overwrite is detectable. This is not a defence: `document_hash` is a
//    string field and is injectable the same way, so a caller that sets both
//    leaves a self-consistent record whose content never reached the validator.
//    What actually bounds the damage is that only a principal already permitted
//    to call Define can invoke any action here, and that principal can rewrite
//    the document through Define anyway.
assert.notEqual(createHash("sha256").update(row.fields.document).digest("hex"), row.fields.document_hash);
assert.equal(createHash("sha256").update(fixture).digest("hex"), row.fields.document_hash);
const forged = "FORGED";
const forgery = `encyclopedia-test-forgery-${randomUUID()}`;
const forgeryPath = `/tdata/EncyclopediaCells('${forgery}')`;
assert.equal((await request("/tdata/EncyclopediaCells", "POST", { id: forgery })).status, 201);
assert.equal((await action("Define", { document: fixture }, forgeryPath)).status, 200);
assert.equal((await action("SubmitForValidation", {}, forgeryPath)).status, 200);
await expectState("Draft", (value) => value.booleans.document_validated === true, forgeryPath);
assert.equal((await action("Archive", { document: forged, document_hash: createHash("sha256").update(forged).digest("hex") }, forgeryPath)).status, 200);
row = await expectState("Archived", (value) => value.fields.document === forged, forgeryPath);
assert.equal(row.booleans.document_validated, true);
assert.equal(createHash("sha256").update(row.fields.document).digest("hex"), row.fields.document_hash,
  "the runtime no longer merges undeclared parameters; tighten this test");
console.log("Undeclared parameters cannot forge validation or version; they can forge a document and its hash together, so the hash detects only a partial overwrite");

const recovery = `encyclopedia-test-recovery-${randomUUID()}`;
const recoveryPath = `/tdata/EncyclopediaCells('${recovery}')`;
assert.equal((await request("/tdata/EncyclopediaCells", "POST", { id: recovery })).status, 201);
assert.equal((await action("Define", { document: fixture }, recoveryPath)).status, 200);
assert.equal((await action("SubmitForValidation", {}, recoveryPath)).status, 200);
row = await expectState("Draft", (value) => value.booleans.document_validated === true, recoveryPath);
assert.equal((await action("Define", { document: draft }, recoveryPath)).status, 200);
row = await expectState("Draft", (value) => value.fields.document === draft, recoveryPath);
assert.equal(row.booleans.document_validated, false);
console.log("Rewriting a document through its declared action clears the validation gate");

// Interrupted validation. A cell must never be able to strand in the
// validating state with no operation permitted on it.
// Validation is quick, so the window is caught by racing the recovery action
// against it and resubmitting until one lands while the cell is still
// validating. Each attempt asserts the outcome it actually got.
const slowDocument = JSON.stringify({ ...JSON.parse(fixture), questions: Array(20).fill("A".repeat(99_000)) });
async function recoverDuringValidation(name, entityPath) {
  for (let attempt = 0; attempt < 40; attempt++) {
    assert.equal((await action("Define", { document: slowDocument }, entityPath)).status, 200);
    assert.equal((await action("SubmitForValidation", {}, entityPath)).status, 200);
    const attempted = await request(`${entityPath}/Temper.${name}`, "POST", {});
    if (attempted.status === 200) return true;
    assert.equal(attempted.status, 409, JSON.stringify(attempted.data));
    await expectState("Draft", () => true, entityPath);
  }
  return false;
}
assert.ok(await recoverDuringValidation("AbandonValidation", path), "no attempt landed during validation");
row = await expectState("Draft");
assert.equal(row.booleans.document_validated, false);
// A document this large is returned as a deferred blob reference holding the
// JSON encoding of the field, not as an inline string.
assert.equal(row.fields.document.__temper_blob_encoding, "json");
assert.equal(row.fields.document.__temper_blob_size, Buffer.byteLength(JSON.stringify(slowDocument), "utf8"));
assert.ok(await recoverDuringValidation("Archive", path), "no attempt landed during validation");
await expectState("Archived");
assert.equal((await action("Define", { document: draft })).status, 409);
console.log("An interrupted validation can be abandoned or archived; an archived cell accepts nothing further");

const second = `encyclopedia-test-${randomUUID()}`;
const secondPath = `/tdata/EncyclopediaCells('${second}')`;
assert.equal((await request("/tdata/EncyclopediaCells", "POST", { id: second })).status, 201);
assert.equal((await action("Define", { document: "{}" }, secondPath)).status, 200);
assert.equal((await action("SubmitForValidation", {}, secondPath)).status, 200);
row = await expectState("Draft", (value) => Boolean(value.fields.error), secondPath);
assert.equal(row.booleans.document_validated, false);
assert.equal((await action("Define", { document: fixture }, secondPath)).status, 200);
assert.equal((await action("SubmitForValidation", {}, secondPath)).status, 200);
row = await expectState("Draft", (value) => value.booleans.document_validated === true, secondPath);
assert.equal(row.fields.error, "");
console.log("A malformed document is refused, and correcting it clears the recorded error");

for (const method of ["PATCH", "PUT", "DELETE"]) {
  const result = await request(secondPath, method, method === "DELETE" ? undefined : { document: "overwritten", document_validated: true });
  assert.ok([403, 405].includes(result.status), `${method} bypass returned ${result.status}: ${JSON.stringify(result.data)}`);
}
row = await request(secondPath);
assert.equal(row.data.fields.document, fixture);
assert.equal(row.data.booleans.document_validated, true);
console.log("Generic PATCH, PUT, and DELETE cannot replace the stored document or its validation gate");

// Inline integration dispatch uses a separate runtime path from the background
// callback. Exercise both without changing the installed authorization policy.
const inlineId = `encyclopedia-test-inline-${randomUUID()}`;
const inlinePath = `/tdata/EncyclopediaCells('${inlineId}')`;
const largeDocument = JSON.stringify({ ...JSON.parse(fixture), questions: ["A".repeat(70_000), "B".repeat(70_000)] });
const largeHash = createHash("sha256").update(largeDocument).digest("hex");
assert.ok(Buffer.byteLength(largeDocument, "utf8") > 128 * 1024);
assert.equal((await request("/tdata/EncyclopediaCells", "POST", { id: inlineId })).status, 201);
assert.equal((await action("Define", { document: largeDocument }, inlinePath)).status, 200);
for (const callback of ["DocumentValidated", "ValidationFailed"]) {
  assert.equal((await action(`${callback}?await_integration=true`, {}, inlinePath)).status, 403);
}
assert.equal((await action("SubmitForValidation?await_integration=true", {}, inlinePath)).status, 200);
row = await expectState("Draft", (value) => value.booleans.document_validated === true, inlinePath);
assert.equal(row.fields.document_hash, largeHash);
assert.equal((await action("Archive", {}, inlinePath)).status, 200);
await expectState("Archived", () => true, inlinePath);
console.log("Inline validation resolves a document blob over 128 KiB and hashes the stored bytes:", inlineId);
