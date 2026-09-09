// The pagination and failure rules have their own tests, and that was not
// enough: the defects that reached review were in where those rules are
// CALLED. These run the reader itself against a stub of the deployment, over
// real HTTP, so the call sites are what is under test rather than a helper.
//
// Run with --conditions=react-server so `server-only` resolves the way it does
// inside a server component, and with the alias hooks so "@/…" resolves the way
// the bundler resolves it. Outside that condition `server-only` still throws,
// which is the guard doing its job.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";

const documentFor = (name, manifestations) =>
  JSON.stringify({
    version: 3,
    name,
    description: `The scope of ${name}.`,
    provenance: { basis: "cited" },
    sources: [{ id: "src", title: "A fixture source", url: "https://example.com/fixture" }],
    maps: [{ map: "art", explanation: "fixture", sourceIds: ["src"] }],
    broader: [],
    relations: [],
    questions: [],
    manifestations,
    studies: [],
  });

/** An attested row: the validated flag, and a hash that matches the bytes. */
function row(id, name, manifestations = []) {
  const document = documentFor(name, manifestations);
  return {
    entity_id: id,
    state: "Draft",
    document,
    document_validated: true,
    document_hash: createHash("sha256").update(document, "utf8").digest("hex"),
  };
}

const pointsAt = (set, id, explanation) => ({ entitySet: set, entityId: id, explanation, sourceIds: ["src"] });

// One stub deployment for the whole file, answering however the test in hand
// has set it.
let answering = { pages: [[]] };
const asked = [];

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  asked.push(request.url);
  const send = (status, body) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (url.pathname === "/tdata/EncyclopediaCells") {
    const at = Number(url.searchParams.get("$skiptoken") ?? 0);
    const more = at + 1 < answering.pages.length;
    return send(200, {
      value: answering.pages[at] ?? [],
      // Relative to the request URI, which is the shape the deployment sends.
      ...(more ? { "@odata.nextLink": `EncyclopediaCells?$skiptoken=${at + 1}` } : {}),
      ...(answering.badLink && !more ? { "@odata.nextLink": answering.badLink } : {}),
    });
  }
  if (answering.sets === "down") return send(503, { error: "upstream unavailable" });
  if (answering.sets === "empty") return send(200, { value: [] });
  return send(200, {
    value: (url.searchParams.get("$filter") ?? "")
      .split(" or ")
      .map((clause) => clause.match(/'([^']+)'/)?.[1])
      .filter(Boolean)
      .map((id) => ({ Id: id, name: `Record ${id}`, slug: id, status: "Draft" })),
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
server.unref();

// The reader reads its base URL once, when it is first imported, so the stub is
// listening and the URL is set before that import happens.
process.env.NEXT_PUBLIC_TEMPER_API_URL = `http://127.0.0.1:${server.address().port}`;
process.env.NEXT_PUBLIC_TEMPER_TENANT = "default";
const { loadEncyclopedia, loadWritingStyleCellIndex } = await import("../src/lib/encyclopedia.ts");

/** Point the deployment at this answer, and forget what was asked before. */
function serving(options) {
  answering = options;
  asked.length = 0;
}

const cellReads = () => asked.filter((u) => u.includes("EncyclopediaCells"));
const recordReads = () => asked.filter((u) => !u.includes("EncyclopediaCells"));

test("the reader follows a relative nextLink and returns every page's cells", async () => {
  // Three pages. Stopping after the first is the silent truncation this covers:
  // nothing fails, the library is simply smaller than it is.
  serving({
    pages: [
      [row("a", "Alpha"), row("b", "Beta")],
      [row("c", "Gamma")],
      [row("d", "Delta"), row("e", "Epsilon")],
    ],
  });
  const graph = await loadEncyclopedia();
  assert.equal(graph.cells.length, 5, "every page is read");
  assert.deepEqual(graph.cells.map((c) => c.name), ["Alpha", "Beta", "Delta", "Epsilon", "Gamma"]);
  assert.equal(graph.total, 5);
  assert.equal(graph.withheld, 0);
  assert.equal(cellReads().length, 3, "it asked for all three pages");
  assert.ok(asked.some((u) => u.includes("$skiptoken=2")), "and reached the last one");
});

test("a row that is not attested is withheld, not shown", async () => {
  const tampered = { ...row("b", "Beta"), document_hash: "0".repeat(64) };
  const unvalidated = { ...row("c", "Gamma"), document_validated: false };
  serving({ pages: [[row("a", "Alpha"), tampered, unvalidated]] });
  const graph = await loadEncyclopedia();
  assert.deepEqual(graph.cells.map((c) => c.name), ["Alpha"], "the validated flag alone is not enough");
  assert.equal(graph.withheld, 2, "and the page can say how much it is not showing");
  assert.equal(graph.total, 3);
});

test("a manifestation read that fails is marked unread, never reported as absent", async () => {
  serving({ pages: [[row("a", "Alpha", [pointsAt("ArtStyles", "art-1", "why")])]], sets: "down" });
  const graph = await loadEncyclopedia();
  const [manifestation] = graph.cells[0].manifestations;
  assert.equal(manifestation.record, null);
  assert.equal(manifestation.unread, true, "a 503 must never be rendered as 'record not found'");
});

test("a manifestation whose record really is gone is absent, not unread", async () => {
  serving({ pages: [[row("a", "Alpha", [pointsAt("ArtStyles", "art-1", "why")])]], sets: "empty" });
  const graph = await loadEncyclopedia();
  const [manifestation] = graph.cells[0].manifestations;
  assert.equal(manifestation.record, null);
  assert.equal(manifestation.unread, false, "the two states have to stay distinguishable");
});

test("a manifestation that resolves carries its record", async () => {
  serving({ pages: [[row("a", "Alpha", [pointsAt("ArtStyles", "art-1", "why")])]] });
  const graph = await loadEncyclopedia();
  const [manifestation] = graph.cells[0].manifestations;
  assert.equal(manifestation.unread, false);
  assert.equal(manifestation.record.name, "Record art-1");
  assert.equal(manifestation.record.href, "/art-styles/art-1");
});

test("a nextLink pointing at another origin stops the read rather than following it", async () => {
  // Following it would send the tenant's bearer token to another host.
  serving({ pages: [[row("a", "Alpha")]], badLink: "https://elsewhere.example/tdata/EncyclopediaCells" });
  await assert.rejects(loadEncyclopedia, /cross-origin/);
});

test("the writing page reads the cells and resolves no records at all", async () => {
  // The links it builds are already in the cell document, so resolving every
  // art style and palette the encyclopedia names — to produce a list of writing
  // styles — is work with nothing to show for it.
  serving({
    pages: [[row("a", "Alpha", [
      pointsAt("WritingStyles", "voice-1", "it writes like this"),
      pointsAt("ArtStyles", "art-1", "unrelated"),
    ])]],
  });
  const index = await loadWritingStyleCellIndex();
  assert.deepEqual(index.get("voice-1"), [{ cellId: "a", cellName: "Alpha", explanation: "it writes like this" }]);
  assert.equal(index.has("art-1"), false, "only writing styles are indexed");
  assert.equal(recordReads().length, 0, "and no record of any kind is read");
});
