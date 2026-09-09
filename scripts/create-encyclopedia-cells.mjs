// Apply approved encyclopedia cell documents and read every one of them back.
//
// The approved payload lives outside this repository: it is the record of what
// the user selected, and it is the only source of content. This script adds
// nothing to it. A cell is written as a private Draft holding exactly the
// approved document — name, scope, maps, provenance, and whichever links,
// sources, and studies the batch authorized. Anything the payload omits stays
// empty. Provenance is never invented here: the payload states it, because
// saying a cell is cited or recollected is content the human approved.
//
//   node scripts/create-encyclopedia-cells.mjs <approved.json> --expect <n> [--apply]
//
// `--expect` is how many cells the operator believes were approved. It is
// checked against the payload, so a swapped or truncated file stops here rather
// than being written. Without --apply the script reports what it would do.
//
// Before anything is written, every link target is resolved against the
// deployment and every source URL is fetched, so a dangling relationship, a
// manifestation of a record that does not exist, or a dead citation stops the
// batch instead of landing.
//
// Rerunning is safe. Identifiers derive from the approved names, a cell is left
// alone only when it already holds exactly this document with a matching
// attestation, and a cell stranded mid-validation is recovered before rewriting.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cellDocumentSchema } from "../ui/src/lib/encyclopedia-schema.ts";
import { identifierFor } from "./encyclopedia-id.mjs";
import { fetchVerdict } from "./encyclopedia-source-fetch.mjs";
import { baseConflict } from "./encyclopedia-base.mjs";

const flags = process.argv.slice(2);
const expectAt = flags.indexOf("--expect");
const expected = Number(flags[expectAt + 1]);
const payloadPath = flags.find((argument, index) => !argument.startsWith("--") && index !== expectAt + 1);
const apply = flags.includes("--apply");
const origin = process.env.TEMPER_API_URL ?? "https://openpaw-production.up.railway.app";
const key = process.env.TEMPER_API_KEY;
assert.ok(payloadPath, "pass the approved payload path");
assert.ok(key, "TEMPER_API_KEY is required");
assert.ok(Number.isInteger(expected) && expected > 0, "pass --expect <n>, the number of approved cells");

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
assert.ok(Array.isArray(payload.cells), "the payload has no cells");
assert.equal(payload.cells.length, expected, `the payload holds ${payload.cells.length} cells, not the ${expected} expected`);
// The payload states what it authorizes. This script writes private Draft
// documents and nothing else, so it refuses a payload that authorizes more.
assert.match(payload.allowedOperation ?? "", /^(Create|Define) private Draft EncyclopediaCell/,
  `this script only writes private Draft cells; the payload authorizes: ${payload.allowedOperation}`);
assert.doesNotMatch(payload.allowedOperation, /\bpublish/i);
// The verb selects the operation. A Create batch may not rewrite a cell that
// already holds something; a Define batch says which of its cells are new, and
// may neither create an undeclared one nor "create" one that exists.
const creating = payload.allowedOperation.startsWith("Create");
const numbers = payload.cells.map((cell) => cell.number);
assert.equal(new Set(numbers).size, numbers.length, "two approved cells share a number");
console.log(`Batch ${payload.batch}: ${payload.cells.length} approved cells`);
console.log(`Allowed operation: ${payload.allowedOperation}`);

const headers = { "Content-Type": "application/json", "X-Tenant-Id": "default", Authorization: `Bearer ${key}` };
async function request(path, method = "GET", body) {
  const response = await fetch(`${origin}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(120_000),
  });
  const text = await response.text();
  const type = response.headers.get("content-type") ?? "";
  const data = type.includes("application/x-ndjson")
    ? text.trim().split("\n").map((line) => JSON.parse(line)).at(-1)
    : type.includes("application/json") ? JSON.parse(text) : text;
  return { status: response.status, data };
}


// Build and validate every document before touching the deployment, so a
// rejected document is found here rather than half way through the batch.
const planned = payload.cells.map((cell) => {
  const sources = cell.sources ?? [];
  const document = {
    version: 3,
    name: cell.name,
    description: cell.description ?? "",
    provenance: cell.provenance,
    maps: cell.maps,
    broader: cell.broader ?? [],
    relations: cell.relations ?? [],
    questions: cell.questions ?? [],
    sources,
    manifestations: cell.manifestations ?? [],
    studies: cell.studies ?? [],
  };
  assert.ok(cell.provenance, `cell ${cell.number} (${cell.name}) states no provenance; the payload must say cited or recollected`);
  const parsed = cellDocumentSchema.safeParse(document);
  assert.ok(parsed.success, `cell ${cell.number} (${cell.name}) is not a valid document: ${JSON.stringify(parsed.error?.issues)}`);
  const serialized = JSON.stringify(document);
  // Above the runtime's inline threshold a document is returned as a blob
  // reference and cannot be read back byte-for-byte, so it is refused here
  // rather than failing after it was written.
  assert.ok(Buffer.byteLength(serialized, "utf8") < 128 * 1024, `cell ${cell.number} (${cell.name}) is over 128 KiB; split its studies out or link them`);
  const id = identifierFor(cell.name);
  if (cell.id !== undefined) assert.equal(cell.id, id, `cell ${cell.number} states id '${cell.id}' but its name derives '${id}'`);
  if (cell.baseHash !== undefined) {
    assert.match(String(cell.baseHash), /^[0-9a-f]{64}$/, `cell ${cell.number} (${cell.name}) states a baseHash that is not a sha256`);
    assert.ok(!cell.new, `cell ${cell.number} (${cell.name}) is marked new and also states a baseHash; a new cell has nothing to be based on`);
  }
  return { id, number: cell.number, name: cell.name, new: Boolean(cell.new), baseHash: cell.baseHash, document: serialized, parsed: document, hash: createHash("sha256").update(serialized).digest("hex") };
});
assert.equal(new Set(planned.map((cell) => cell.id)).size, planned.length, "two approved names produce one identifier");
console.log(`Prepared ${planned.length} documents, all valid against the shared contract`);

// `document_validated` alone is not the attestation. An abandoned validation
// run keeps executing and its callback can set the gate while naming the bytes
// it read rather than the bytes now stored, so a cell counts as validated only
// when the gate is true and the stored document hashes to `document_hash`.
function attested(row) {
  return Boolean(row?.booleans.document_validated)
    && typeof row.fields.document === "string"
    && createHash("sha256").update(row.fields.document).digest("hex") === row.fields.document_hash;
}
// Every link must land on something that exists, and every citation must be
// reachable. Whether a record truly expresses a cell, or a page is a good
// reference, is what the human's numbered approval decides; this preflight
// does not pretend to judge it. A cell in this batch may reference another
// cell in this batch; those are enforced by write order below.
const batchIds = new Set(planned.map((cell) => cell.id));
const checked = new Map();
async function exists(path) {
  if (!checked.has(path)) {
    try { checked.set(path, (await request(path)).status === 200); } catch { checked.set(path, false); }
  }
  return checked.get(path);
}
// A source is reachable when it answers on its own host. A source a named
// human has opened carries verifiedBy and verifiedOn on the record and is not
// fetched; the run says so. The fetch itself lives in encyclopedia-source-fetch.mjs
// so that anything asking whether a page can be cited asks the same question
// this script will ask.
async function reachable(source) {
  if (source.verifiedBy) return `verified by ${source.verifiedBy} on ${source.verifiedOn}, not fetched`;
  if (checked.has(source.url)) return checked.get(source.url);
  const verdict = await fetchVerdict(source.url);
  checked.set(source.url, verdict);
  return verdict;
}
const unresolved = [];
const vouched = [];
// A linked cell outside this batch must be an attested Draft, not merely a
// row: a link to an empty or unvalidated cell is a link to nothing yet.
async function attestedCell(id) {
  const key = `attested:${id}`;
  if (!checked.has(key)) {
    try { const row = await request(`/tdata/EncyclopediaCells('${id}')`); checked.set(key, row.status === 200 && attested(row.data)); }
    catch { checked.set(key, false); }
  }
  return checked.get(key);
}
for (const cell of planned) {
  for (const link of [...cell.parsed.broader, ...cell.parsed.relations]) {
    if (!batchIds.has(link.cellId) && !(await attestedCell(link.cellId))) {
      unresolved.push(`${cell.id}: linked cell '${link.cellId}' does not exist or is not attested`);
    }
  }
  for (const entry of cell.parsed.manifestations) {
    if (!(await exists(`/tdata/${entry.entitySet}('${entry.entityId}')`))) unresolved.push(`${cell.id}: ${entry.entitySet} '${entry.entityId}' does not exist`);
  }
  for (const source of cell.parsed.sources) {
    const verdict = await reachable(source);
    if (verdict.startsWith("verified by")) vouched.push(`${cell.id}: '${source.id}' ${verdict}`);
    else if (verdict !== "fetched") unresolved.push(`${cell.id}: source '${source.id}' — ${verdict} (${source.url})`);
  }
}
assert.equal(unresolved.length, 0, `${unresolved.length} reference(s) do not resolve:\n${unresolved.join("\n")}`);
for (const line of vouched) console.log(`  ${line}`);
console.log(`Resolved every linked cell and manifestation record; every source is reachable or human-verified (${checked.size} checks, ${vouched.length} human-verified)`);
if (!apply) console.log("Reporting only. Pass --apply to write the records.");

const read = async (cell) => {
  const row = await request(`/tdata/EncyclopediaCells('${cell.id}')`);
  return row.status === 200 ? row.data : null;
};

const settled = (row, cell) => attested(row) && row.status === "Draft" && row.fields.document === cell.document;

// One cell's failure must not strand the rest of the batch: every cell is
// attempted, and the run fails at the end with everything that went wrong.
// `broader` links form a tree, so parents are written first and a child whose
// parent failed is skipped rather than attested pointing at nothing. Relations
// are symmetric and cannot be ordered; a relation whose partner failed is
// reported at readback and repaired by the rerun.
const parentsOf = (cell) => cell.parsed.broader.map((link) => link.cellId).filter((id) => batchIds.has(id));
const ordered = [];
const placed = new Set();
while (ordered.length < planned.length) {
  const next = planned.find((cell) => !placed.has(cell.id) && parentsOf(cell).every((id) => placed.has(id)));
  assert.ok(next, "the batch's broader links form a cycle");
  ordered.push(next); placed.add(next.id);
}
const failures = [];
const failedIds = new Set();
for (const cell of ordered) {
  const label = `${String(cell.number).padStart(2)} ${cell.id}`;
  const blockedBy = parentsOf(cell).filter((id) => failedIds.has(id));
  if (blockedBy.length > 0) {
    failures.push(`${cell.id}: not written, its broader cell(s) ${blockedBy.join(", ")} failed`);
    failedIds.add(cell.id);
    console.log(`${label}: skipped, broader ${blockedBy.join(", ")} failed`);
    continue;
  }
  try {
    let existing = await read(cell);
    // Two approved names can slug to one identifier. The approval's identity is
    // the name, so refuse rather than overwrite another cell. A document too
    // large to be stored inline comes back as a blob reference and cannot be
    // compared here, so it is refused rather than assumed to be this cell's.
    if (existing && existing.fields.document !== "") {
      assert.equal(typeof existing.fields.document, "string",
        `'${cell.id}' already holds a document too large to inspect, so it is not this cell's`);
      if (existing.fields.document !== cell.document) {
        const stored = JSON.parse(existing.fields.document);
        assert.equal(stored.name, cell.name, `'${cell.id}' already holds a different cell, "${stored.name}"`);
      }
    }
    // Define replaces the whole document, so two runs revising different parts
    // of one cell have no safe ordering: the second write wins and the first is
    // lost with no error on either side. It happened on the night of
    // 2026-09-09, when one run added manifestations to five cells and another
    // rewrote their prose from a copy taken before those writes. A payload built
    // from a document it read states the hash it read, and the write is refused
    // if the stored document has moved since. This sits outside the guard above
    // because a cell that held a document when the payload was built and holds
    // none now has moved too, and the plan must say so rather than reporting a
    // write it would refuse.
    if (settled(existing, cell)) { console.log(`${label}: already stored and attested`); continue; }
    // A cell already holding exactly this document is an interrupted earlier
    // run being resumed; only a different document is a conflict for the verb.
    // The verb is checked before the base, because a Create batch pointed at an
    // occupied cell is wrong about what it is doing, and telling it to declare a
    // base hash would send it to a refusal that says a new cell has nothing to
    // be based on.
    const holdsOther = Boolean(existing && existing.fields.document !== "" && existing.fields.document !== cell.document);
    if (creating) assert.ok(!holdsOther, `a Create batch may not rewrite '${cell.id}', which already holds a different document`);
    else if (cell.new) assert.ok(!holdsOther, `'${cell.id}' is marked new but already holds a different document`);
    else assert.ok(existing, `'${cell.id}' does not exist and the payload does not mark it new`);
    const conflict = baseConflict({ id: cell.id, baseHash: cell.baseHash, stored: existing?.fields.document, writing: cell.document });
    assert.ok(!conflict, conflict);
    if (!apply) { console.log(`${label}: would ${existing ? "update" : "create"}`); continue; }

    assert.ok([200, 201].includes((await request("/tdata/EncyclopediaCells", "POST", { id: cell.id })).status), "create refused");
    // Define is valid only from Draft, so recover a cell left mid-validation by
    // an interrupted run before rewriting it. Check the base FIRST: a cell that
    // is validating may be another run's write in flight, and abandoning that
    // validation would disrupt a run this one is about to refuse anyway.
    existing = await read(cell);
    const beforeRecovery = baseConflict({ id: cell.id, baseHash: cell.baseHash, stored: existing?.fields.document, writing: cell.document });
    assert.ok(!beforeRecovery, beforeRecovery && `${beforeRecovery} Nothing was written to it and no validation was abandoned.`);
    if (existing?.status === "ValidatingDocument") {
      const abandoned = await request(`/tdata/EncyclopediaCells('${cell.id}')/Temper.AbandonValidation`, "POST", {});
      assert.ok([200, 409].includes(abandoned.status), `AbandonValidation: ${JSON.stringify(abandoned.data)}`);
      console.log(`${label}: recovered from an interrupted validation`);
    }
    // Define counts a document revision, so a rerun over bytes already stored
    // only needs its validation, not another revision. The base is checked
    // again here, against the read taken immediately before the write, so a
    // cell that moved between the preflight and now is refused rather than
    // overwritten.
    existing = await read(cell);
    const raced = baseConflict({ id: cell.id, baseHash: cell.baseHash, stored: existing?.fields.document, writing: cell.document });
    assert.ok(!raced, raced && `${raced} It changed while this run was working; nothing was written to it.`);
    if (existing?.fields.document !== cell.document) {
      const defined = await request(`/tdata/EncyclopediaCells('${cell.id}')/Temper.Define`, "POST", { document: cell.document });
      assert.equal(defined.status, 200, `Define: ${JSON.stringify(defined.data)}`);
    }
    const submitted = await request(`/tdata/EncyclopediaCells('${cell.id}')/Temper.SubmitForValidation`, "POST", {});
    assert.equal(submitted.status, 200, `SubmitForValidation: ${JSON.stringify(submitted.data)}`);
    // Wait for this cell's attestation before moving on, so a child is only
    // ever written after its broader cell is a validated Draft, not merely
    // after the parent's request returned. A stale callback can set the gate
    // without the hash, so the wait is for the pair.
    let row = null;
    for (let attempt = 0; attempt < 60 && !settled(row, cell); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      row = await read(cell);
    }
    assert.ok(settled(row, cell), `written but not attested after 60s (state ${row?.status}, error ${JSON.stringify(row?.fields.error ?? "")})`);
    console.log(`${label}: written and attested`);
  } catch (error) {
    failures.push(`${cell.id}: ${error.message}`);
    failedIds.add(cell.id);
    console.log(`${label}: ${error.message}`);
  }
}

if (!apply) process.exit(failures.length === 0 ? 0 : 1);

// Read back every record from the deployment. A successful dispatch is not
// evidence: the stored bytes, the state, and the attestation are.
for (const cell of ordered) {
  if (failedIds.has(cell.id)) continue;
  let row = null;
  // Wait for the attestation, not for the gate: a stale callback can set the
  // gate before the live run reports on the bytes actually stored.
  for (let attempt = 0; attempt < 60; attempt++) {
    row = await read(cell);
    if (settled(row, cell)) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const problems = [];
  if (!row) problems.push("not found");
  else {
    const stored = row.fields.document;
    if (row.entity_id !== cell.id) problems.push(`read back ${row.entity_id}, not ${cell.id}`);
    if (row.status !== "Draft") problems.push(`state ${row.status}`);
    if (typeof stored !== "string") problems.push("document is not stored inline, so it cannot be checked against its hash");
    else {
      if (stored !== cell.document) problems.push("stored document differs from the approved document");
      if (createHash("sha256").update(stored).digest("hex") !== row.fields.document_hash) {
        problems.push("stored document does not match its own recorded hash");
      }
      const parsed = JSON.parse(stored);
      for (const field of ["broader", "relations", "questions", "sources", "manifestations", "studies"]) {
        if (parsed[field].length !== cell.parsed[field].length) problems.push(`${field} holds ${parsed[field].length} entries, not ${cell.parsed[field].length}`);
      }
    }
    if (row.fields.document_hash !== cell.hash) problems.push("recorded hash is not the approved document's hash");
    for (const link of cell.parsed.relations) {
      if (failedIds.has(link.cellId)) problems.push(`relation to '${link.cellId}', which failed in this run`);
    }
    if (!row.booleans.document_validated) problems.push("not validated");
    if (row.fields.error !== "") problems.push(`error is set: ${row.fields.error}`);
  }
  if (problems.length > 0) failures.push(`${cell.id}: ${problems.join("; ")}`);
  const summary = `${cell.parsed.provenance.basis}, ${cell.parsed.sources.length} sources, ${cell.parsed.relations.length + cell.parsed.broader.length} links, ${cell.parsed.manifestations.length} manifestations`;
  console.log(`${String(cell.number).padStart(2)} ${cell.id}: ${problems.length === 0 ? `Draft, attested, ${summary}` : problems.join("; ")}`);
}

assert.equal(failures.length, 0, `${failures.length} cell(s) failed:\n${failures.join("\n")}`);
console.log(`\nAll ${planned.length} approved cells are stored as private attested Drafts holding exactly the approved documents.`);
