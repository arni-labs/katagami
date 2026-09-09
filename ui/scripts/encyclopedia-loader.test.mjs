// The base check has a pure predicate with its own tests, and that was not
// enough: a real defect hid in where the predicate was CALLED, inside a guard
// that skipped it whenever the stored document was empty. These tests run the
// loader itself against a stub of the deployment, so the call sites are what is
// under test rather than the predicate.
//
// Everything is local. The loader refuses a source on a private address, so the
// payload's sources are marked human-verified, which is the documented way a
// source that cannot be fetched is cited; the loader then skips the fetch.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { documentHash } from "../../scripts/encyclopedia-base.mjs";

const loader = fileURLToPath(new URL("../../scripts/create-encyclopedia-cells.mjs", import.meta.url));

const cellDocument = (scope) => ({
  version: 3,
  name: "Blank verse",
  description: scope,
  provenance: { basis: "cited" },
  sources: [{
    id: "wp", title: "Blank verse", url: "https://en.wikipedia.org/wiki/Blank_verse",
    verifiedBy: "the owner", verifiedOn: "2026-09-09",
  }],
  maps: [{ map: "writing", explanation: "Verse in a regular metre without rhyme.", sourceIds: ["wp"] }],
  broader: [], relations: [], manifestations: [], studies: [],
});

const payload = (cell, operation = "Define") => ({
  batch: "TEST",
  approval: "A fixture. It is never applied and never reaches a deployment.",
  allowedOperation: `${operation} private Draft EncyclopediaCell documents for the 1 cell listed.`,
  cells: [{ number: 1, ...cell }],
});

/** Serve one cell row, and record what the loader asked for. */
function stubDeployment(row) {
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url.includes("EncyclopediaCells(")) {
      if (row === null) {
        response.writeHead(404, { "content-type": "application/json" });
        return response.end(JSON.stringify({ error: "not found" }));
      }
      response.writeHead(200, { "content-type": "application/json" });
      return response.end(JSON.stringify(row));
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ value: [] }));
  });
  return server;
}

const rowHolding = (document) => ({
  status: "Draft",
  fields: { Id: "blank-verse", document, document_hash: document ? documentHash(document) : "", error: "" },
  booleans: { document_validated: Boolean(document) },
});

async function runLoader({ row, cell, operation }) {
  const server = stubDeployment(row);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const directory = await mkdtemp(path.join(tmpdir(), "loader-test-"));
  const file = path.join(directory, "payload.json");
  await writeFile(file, JSON.stringify(payload(cell, operation)));
  try {
    return await new Promise((resolve) => {
      execFile(process.execPath, [loader, file, "--expect", "1"], {
        env: { ...process.env, TEMPER_API_URL: origin, TEMPER_API_KEY: "test-key", TEMPER_TENANT: "default" },
      }, (error, stdout, stderr) => resolve({ failed: Boolean(error), out: `${stdout}${stderr}` }));
    });
  } finally {
    server.close();
  }
}

const stored = JSON.stringify(cellDocument("The stored scope."));
const mine = { ...cellDocument("My rewritten scope.") };

test("a revision whose base matches what is stored is planned", async () => {
  const result = await runLoader({ row: rowHolding(stored), cell: { ...mine, baseHash: documentHash(stored) } });
  assert.equal(result.failed, false, result.out);
  assert.match(result.out, /would update/);
});

test("a revision built from bytes the cell no longer holds is refused in the plan", async () => {
  const result = await runLoader({ row: rowHolding(stored), cell: { ...mine, baseHash: documentHash("older bytes") } });
  assert.equal(result.failed, true);
  assert.match(result.out, /has changed since this payload was built/);
});

test("a revision that names no base is refused in the plan", async () => {
  const result = await runLoader({ row: rowHolding(stored), cell: mine });
  assert.equal(result.failed, true);
  assert.match(result.out, /does not say which bytes it was built from/);
});

test("a cell that held a document and now holds none is refused in the plan, not reported as writable", async () => {
  // The defect this file exists for: the check sat inside a guard that skipped
  // it whenever the stored document was empty, so the plan said "would update"
  // and only the apply refused.
  const result = await runLoader({ row: rowHolding(""), cell: { ...mine, baseHash: documentHash(stored) } });
  assert.equal(result.failed, true);
  assert.match(result.out, /holds none now/);
});

test("a Create batch pointed at an occupied cell is told that, not told to declare a base", async () => {
  const result = await runLoader({ row: rowHolding(stored), cell: { ...mine, new: true } });
  assert.equal(result.failed, true);
  assert.match(result.out, /already holds a different document/);
  assert.doesNotMatch(result.out, /does not say which bytes/);
});

test("creating a cell that does not exist needs no base", async () => {
  const result = await runLoader({ row: null, cell: { ...mine, new: true } });
  assert.equal(result.failed, false, result.out);
  assert.match(result.out, /would create/);
});
