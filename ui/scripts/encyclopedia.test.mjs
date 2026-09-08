import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cellDocumentSchema } from "../src/lib/encyclopedia-schema.ts";

const fixture = JSON.parse(readFileSync(new URL("../../katagami-commons/fixtures/encyclopedia-cell.json", import.meta.url), "utf8"));
const invalidCases = JSON.parse(readFileSync(new URL("../../katagami-commons/fixtures/encyclopedia-invalid.json", import.meta.url), "utf8"));

test("the validator is packaged at the installer's declared-module path", () => {
  const app = new URL("../../katagami-commons/", import.meta.url);
  const manifest = readFileSync(new URL("app.toml", app), "utf8");
  const declaration = manifest.split("[[wasm_modules]]").find((section) => section.includes('name = "validate_encyclopedia_cell"'));
  assert.ok(declaration);
  assert.match(declaration, /startup_loading = "lazy"/);
  assert.match(declaration, /target = "wasm32-wasip1"/);
  assert.doesNotMatch(declaration, /^(path|instantiate)\s*=/m);
  const binary = readFileSync(new URL("wasm/validate_encyclopedia_cell/validate_encyclopedia_cell.wasm", app));
  assert.deepEqual([...binary.subarray(0, 4)], [0, 97, 115, 109]);
  assert.ok(binary.includes(Buffer.from("wasi_snapshot_preview1")));
  assert.equal(binary.includes(Buffer.from("__wbindgen")), false);
});

test("local and installed cell policies are identical", () => {
  const app = new URL("../../katagami-commons/", import.meta.url);
  assert.equal(
    readFileSync(new URL("policies/encyclopedia_cell.cedar", app), "utf8"),
    readFileSync(new URL("specs/policies/encyclopedia_cell.cedar", app), "utf8"),
  );
});

const cellSpec = readFileSync(new URL("../../katagami-commons/specs/encyclopedia_cell.ioa.toml", import.meta.url), "utf8");
const cellPolicy = readFileSync(new URL("../../katagami-commons/policies/encyclopedia_cell.cedar", import.meta.url), "utf8");

test("validator timeouts are inside the runtime trigger config", () => {
  const spec = cellSpec;
  const triggers = spec.split("[[action.triggers]]").slice(1).map((part) => part.split("[[action]]")[0]);
  assert.equal(triggers.length, 1);
  for (const trigger of triggers) {
    const [declaration, config] = trigger.split("[action.triggers.config]");
    assert.doesNotMatch(declaration, /timeout_secs/);
    assert.match(config, /^timeout_secs = "30"$/m);
  }
});

// Publication was never approved for this deployment, and a published state
// would assert a curator review that nothing here performs. Reintroducing it
// needs its own approval and its own review round, so it fails here first.
test("the deployed cell carries no review or publication surface", () => {
  // Identifiers only: the file's prose explains why the surface is absent.
  const declarations = cellSpec.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
  for (const term of ["Publish", "Published", "RecordReview", "ReviewValidated", "RequestChanges", "Revise",
    "UnderReview", "ValidatingReview", "review_approved", "review_document_hash", "review_findings"]) {
    assert.doesNotMatch(declarations, new RegExp(term), `${term} is outside the approved Draft-only scope`);
  }
  const csdl = readFileSync(new URL("../../katagami-commons/specs/model.csdl.xml", import.meta.url), "utf8");
  const entity = csdl.split('<EntityType Name="EncyclopediaCell">')[1].split("</EntityType>")[0];
  assert.doesNotMatch(entity, /Review/);
});

// Cedar denies by default. Enumerating the permitted actions keeps an action
// that reaches the runtime without a matching policy decision failing closed.
test("cell authorization is a closed allow-list, not a blanket grant", () => {
  // Every permit in the file, not only the first: a later blanket permit would
  // reopen the surface behind the enumerated one.
  const permits = cellPolicy.split(/^permit\(/m).slice(1).map((rule) => rule.split(/^\)?;/m)[0]);
  assert.equal(permits.length, 1, "the cell should carry exactly one permit");
  const actions = new Set(permits.flatMap((rule) => rule.match(/Action::"([^"]+)"/g) ?? []).map((entry) => entry.slice(9, -1)));
  assert.ok(actions.size > 0, "the permit names no actions, so it is a blanket grant");
  const declared = new Set(cellSpec.split("[[action]]").slice(1).map((block) => block.match(/^name = "(\w+)"$/m)[1]));
  assert.ok(declared.size >= 5);
  for (const action of declared) {
    assert.ok(actions.has(action), `${action} is declared in the specification but not permitted`);
  }
  for (const action of actions) {
    assert.ok(["create", "read", "list"].includes(action) || declared.has(action), `${action} is permitted but not declared`);
  }
});

test("a cell separates typed manifestations from direct studies", () => {
  const cell = cellDocumentSchema.parse(fixture);
  assert.deepEqual(cell.manifestations.map((entry) => entry.entitySet), ["ArtStyles", "DesignLanguages"]);
  assert.equal(cell.studies.length, 1);
  assert.equal(cell.studies[0].representations.length, 2);
  assert.equal(cell.studies[0].representations[0].colors.length, 6);
  assert.deepEqual(cell.maps, ["art", "palettes"]);
});

test("broad cells need not have examples or be leaves", () => {
  const cell = cellDocumentSchema.parse({ ...fixture, manifestations: [], studies: [] });
  assert.equal(cell.broader.length, 1);
});

test("an approved name and scope can exist before research and examples", () => {
  const cell = cellDocumentSchema.parse({
    ...fixture, broader: [], relations: [], sources: [], manifestations: [], studies: [], questions: [],
    provenance: { basis: "recollected", note: "Written from model training data; no external reference located yet." },
  });
  assert.equal(cell.sources.length, 0);
  assert.equal(cell.studies.length, 0);
  assert.equal(cell.manifestations.length, 0);
});

// A reader must always be able to tell where a cell's account came from: a
// source to follow, or an explicit statement that the model recollected it.
test("a cell either cites a source or says it was recollected", () => {
  const bare = { ...fixture, broader: [], relations: [], sources: [], manifestations: [], studies: [], questions: [] };
  assert.equal(cellDocumentSchema.safeParse({ ...bare, provenance: { basis: "cited" } }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...bare, provenance: { basis: "recollected" } }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...bare, provenance: { basis: "recollected", note: "Written from model training data; no reference found." } }).success, true);
  assert.equal(cellDocumentSchema.safeParse({ ...bare, provenance: { basis: "recollected", note: "banana" } }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...bare, provenance: { basis: "recollected", note: "This was not written from model training data." } }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...bare, provenance: { basis: "recollected", note: "Written from model training datasets" } }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, provenance: { basis: "recollected", note: "Written from model training data." } }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, provenance: { basis: "cited" } }).success, true);
});

test("a source is unverified until a named human opened it on a date", () => {
  const source = fixture.sources[0];
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, sources: [{ ...source, verifiedBy: "Rita", verifiedOn: "2026-09-08" }] }).success, true);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, sources: [{ ...source, verifiedBy: "Rita" }] }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, sources: [{ ...source, verifiedOn: "yesterday", verifiedBy: "Rita" }] }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, sources: [{ ...source, verifiedOn: "0000-00-00", verifiedBy: "Rita" }] }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, sources: [{ ...source, verifiedOn: "2026-02-30", verifiedBy: "Rita" }] }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, sources: [{ ...source, verifiedOn: "0099-12-31", verifiedBy: "Rita" }] }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, sources: [{ ...source, verifiedOn: "1000-01-01", verifiedBy: "Rita" }] }).success, true);
});

test("blank means the same thing to both validators", () => {
  for (const blank of ["", " ", "\u0085", "\ufeff", "\u3000\n"]) {
    assert.equal(cellDocumentSchema.safeParse({ ...fixture, name: blank }).success, false, JSON.stringify(blank));
  }
});

test("a generated study names its generator and a historical one does not", () => {
  const study = fixture.studies[0];
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, studies: [{ ...study, kind: "generated" }] }).success, false);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, studies: [{ ...study, kind: "generated", generatedBy: "gpt-image-1 via Codex" }] }).success, true);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, studies: [{ ...study, kind: "historical", generatedBy: "x" }] }).success, false);
});

test("a name-only cell can have an empty description", () => {
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, description: "" }).success, true);
});

test("text limits count Unicode code points", () => {
  const description = "\u{10348}".repeat(100_000);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, description }).success, true);
  assert.equal(cellDocumentSchema.safeParse({ ...fixture, description: `${description}x` }).success, false);
});

test("the complete document limit counts canonical JSON UTF-8 bytes", () => {
  const document = { ...fixture, questions: Array(7).fill("\u6f22".repeat(100_000)) };
  assert.ok(JSON.stringify(document).length < 2_000_000);
  assert.ok(Buffer.byteLength(JSON.stringify(document), "utf8") > 2_000_000);
  assert.equal(cellDocumentSchema.safeParse(document).success, false);
});

for (const change of invalidCases) {
  test(`rejects ${change.name}`, () => {
    const input = structuredClone(fixture);
    const parent = change.path.slice(0, -1).reduce((value, key) => value[key], input);
    const key = change.path.at(-1);
    if (change.remove) delete parent[key];
    else parent[key] = change.value;
    assert.equal(cellDocumentSchema.safeParse(input).success, false);
  });
}
