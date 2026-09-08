// Create the approved encyclopedia cells and read every one of them back.
//
// The approved payload lives outside this repository: it is the record of what
// the user selected, and it is the only source of names, scopes, and maps. This
// script adds nothing to it. Every cell is created as a private Draft with an
// empty enrichment set; relationships, manifestations, studies, and sources
// need their own numbered approval.
//
// Rerunning is safe. Identifiers are derived from the approved names, creation
// is idempotent, and a cell whose stored document already matches is left alone.
//
//   node scripts/create-encyclopedia-cells.mjs <approved.json> [--apply]
//
// Without --apply it reports what it would do and reads back what exists.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cellDocumentSchema } from "../ui/src/lib/encyclopedia-schema.ts";

const [payloadPath] = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const apply = process.argv.includes("--apply");
const origin = process.env.TEMPER_API_URL ?? "https://openpaw-production.up.railway.app";
const key = process.env.TEMPER_API_KEY;
assert.ok(payloadPath, "pass the approved payload path");
assert.ok(key, "TEMPER_API_KEY is required");

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
assert.ok(Array.isArray(payload.cells) && payload.cells.length > 0, "the payload has no cells");
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

function identifierFor(name) {
  const id = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  assert.match(id, /^[a-z0-9][a-z0-9-]{0,159}$/, `cannot derive an identifier from ${name}`);
  return id;
}

// Build and validate every document before touching the deployment, so a
// rejected document is found here rather than half way through the batch.
const planned = payload.cells.map((cell) => {
  const document = {
    version: 1,
    name: cell.name,
    description: cell.description ?? "",
    maps: cell.maps,
    broader: [], relations: [], questions: [], sources: [], manifestations: [], studies: [],
  };
  const parsed = cellDocumentSchema.safeParse(document);
  assert.ok(parsed.success, `cell ${cell.number} (${cell.name}) is not a valid document: ${JSON.stringify(parsed.error?.issues)}`);
  const serialized = JSON.stringify(document);
  return { id: identifierFor(cell.name), number: cell.number, name: cell.name, document: serialized, hash: createHash("sha256").update(serialized).digest("hex") };
});
assert.equal(new Set(planned.map((cell) => cell.id)).size, planned.length, "two approved names produce one identifier");
console.log(`Prepared ${planned.length} documents, all valid against the shared contract`);

if (!apply) console.log("Reporting only. Pass --apply to create the records.");

async function readCell(cell) {
  const row = await request(`/tdata/EncyclopediaCells('${cell.id}')`);
  return row.status === 200 ? row.data : null;
}

for (const cell of planned) {
  const existing = await readCell(cell);
  if (existing?.fields.document === cell.document && existing.booleans.document_validated) {
    console.log(`${String(cell.number).padStart(2)} ${cell.id}: already stored and validated`);
    continue;
  }
  if (!apply) {
    console.log(`${String(cell.number).padStart(2)} ${cell.id}: would ${existing ? "update" : "create"}`);
    continue;
  }
  const created = await request("/tdata/EncyclopediaCells", "POST", { id: cell.id });
  assert.ok([200, 201].includes(created.status), `create ${cell.id}: ${JSON.stringify(created.data)}`);
  const defined = await request(`/tdata/EncyclopediaCells('${cell.id}')/Temper.Define`, "POST", { document: cell.document });
  assert.equal(defined.status, 200, `Define ${cell.id}: ${JSON.stringify(defined.data)}`);
  const submitted = await request(`/tdata/EncyclopediaCells('${cell.id}')/Temper.SubmitForValidation`, "POST", {});
  assert.equal(submitted.status, 200, `SubmitForValidation ${cell.id}: ${JSON.stringify(submitted.data)}`);
  console.log(`${String(cell.number).padStart(2)} ${cell.id}: created and submitted`);
}

if (!apply) process.exit(0);

// Read back every record from the deployment. A successful dispatch is not
// evidence: the stored document, its state, its validation, and its hash are.
const failures = [];
for (const cell of planned) {
  let row = null;
  for (let attempt = 0; attempt < 60 && !(row?.booleans.document_validated); attempt++) {
    row = await readCell(cell);
    if (row?.booleans.document_validated) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const problems = [];
  if (!row) problems.push("not found");
  else {
    const stored = row.fields.document;
    if (row.status !== "Draft") problems.push(`state ${row.status}`);
    if (stored !== cell.document) problems.push("stored document differs from the approved document");
    if (row.fields.document_hash !== cell.hash) problems.push("recorded hash is not the approved document's hash");
    if (typeof stored === "string" && createHash("sha256").update(stored).digest("hex") !== row.fields.document_hash) {
      problems.push("stored document does not match its own recorded hash");
    }
    if (!row.booleans.document_validated) problems.push("not validated");
    // `error` records the last validation run and no action can clear it, so a
    // non-empty error on a validated cell means the readback is looking at
    // something other than a clean run.
    if (row.fields.error !== "") problems.push(`error is set: ${row.fields.error}`);
    if (typeof stored === "string") {
      const parsed = JSON.parse(stored);
      for (const field of ["broader", "relations", "questions", "sources", "manifestations", "studies"]) {
        if (parsed[field].length !== 0) problems.push(`${field} is not empty`);
      }
    }
  }
  if (problems.length > 0) failures.push(`${cell.id}: ${problems.join("; ")}`);
  console.log(`${String(cell.number).padStart(2)} ${cell.id}: ${problems.length === 0 ? `Draft, validated, ${cell.hash.slice(0, 12)}` : problems.join("; ")}`);
}

assert.equal(failures.length, 0, `readback failed:\n${failures.join("\n")}`);
console.log(`\nAll ${planned.length} approved cells are stored as private validated Drafts with no enrichment.`);
