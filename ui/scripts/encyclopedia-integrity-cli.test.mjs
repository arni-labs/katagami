// The escape hatch, end to end against a stub. The verifier reconstructed the
// exact failure the count check was written to remove: the allowance was one
// boolean tested against the combined list, so it waved through a short read of
// any set including the cells under test, the exit code stayed 0, and the
// warning went to stderr where a pipeline keeping stdout drops it.
//
// These run the real script as a subprocess so the exit code and the stream are
// the thing under test, not a predicate that stands in for them.
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(here, "..", "..", "scripts", "encyclopedia-integrity.mjs");
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function cellRow(id, extra = {}) {
  const document = JSON.stringify({
    version: 3, name: id, description: "", provenance: { basis: "cited" },
    maps: [{ map: "art", explanation: "x", sourceIds: ["s1"] }],
    broader: [], relations: [], questions: [],
    sources: [{ id: "s1", title: "t", url: "https://example.org/" }],
    manifestations: [], studies: [], ...extra,
  });
  return { entity_id: id, status: "Draft", booleans: { document_validated: true }, fields: { document, document_hash: sha256(document) } };
}

// `short` names the sets that stop paging early while still reporting the true count.
function stub({ short = [], cells = 2 } = {}) {
  const rows = {
    EncyclopediaCells: Array.from({ length: cells }, (unused, index) => cellRow(`cell-${index}`)),
    // Two rows, so slicing to one is a real mismatch the reconciliation can see.
    DesignLanguages: [{ entity_id: "dl-1", status: "Published" }, { entity_id: "dl-2", status: "Published" }],
    ArtStyles: [], PaletteSystems: [], WritingStyles: [],
  };
  const server = createServer((request, response) => {
    const set = decodeURIComponent(request.url.split("?")[0].split("/").pop());
    const all = rows[set] ?? [];
    // A short read returns one row and no nextLink, while counting them all.
    const value = short.includes(set) ? all.slice(0, 1) : all;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ value, "@odata.count": all.length }));
  });
  return server;
}

function run(origin, args = []) {
  return new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, TEMPER_API_URL: origin, TEMPER_API_KEY: "stub" },
    }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }));
  });
}

async function withStub(options, body) {
  const server = stub(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try { return await body(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("a complete read exits 0", async () => {
  const { code, stdout } = await withStub({}, (origin) => run(origin));
  assert.equal(code, 0, stdout);
  assert.match(stdout, /every page reconciled/);
});

test("paging stopped early on the cells themselves does not exit 0", async () => {
  const { code, stdout } = await withStub({ short: ["EncyclopediaCells"], cells: 4 }, (origin) => run(origin));
  assert.notEqual(code, 0);
  assert.equal(code, 2);
  assert.match(stdout, /reports nothing about the collection/);
  assert.match(stdout, /EncyclopediaCells/);
});

test("the allowance for one set does NOT wave through a short read of the cells", async () => {
  const { code, stdout } = await withStub({ short: ["EncyclopediaCells"], cells: 4 },
    (origin) => run(origin, ["--allow-count-mismatch=DesignLanguages"]));
  assert.notEqual(code, 0, "this is the hole: a set-scoped allowance must not cover the collection under test");
  assert.equal(code, 2);
  assert.match(stdout, /does not cover the above/);
});

test("an allowed mismatch exits 3, its own code, never 0", async () => {
  const { code, stdout } = await withStub({ short: ["DesignLanguages"] },
    (origin) => run(origin, ["--allow-count-mismatch=DesignLanguages"]));
  assert.equal(code, 3, "a degraded run must not be readable as success");
  assert.match(stdout, /DEGRADED RUN/);
});

test("the warning is on stdout, so a pipeline keeping only stdout still carries it", async () => {
  const { stdout, stderr } = await withStub({ short: ["DesignLanguages"] },
    (origin) => run(origin, ["--allow-count-mismatch=DesignLanguages"]));
  assert.match(stdout, /DEGRADED RUN/);
  assert.match(stdout, /over what was read/);
  assert.doesNotMatch(stderr, /DEGRADED RUN/);
});

test("the bare flag is refused, because it could cover the set under test by accident", async () => {
  const { code, stderr } = await withStub({}, (origin) => run(origin, ["--allow-count-mismatch"]));
  assert.notEqual(code, 0);
  assert.match(stderr, /needs the sets it covers/);
});
