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
  for (const term of ["Publish", "Published", "RecordReview", "ReviewValidated", "RequestChanges", "review_approved"]) {
    assert.doesNotMatch(cellSpec, new RegExp(term), `${term} is outside the approved Draft-only scope`);
  }
  const csdl = readFileSync(new URL("../../katagami-commons/specs/model.csdl.xml", import.meta.url), "utf8");
  const entity = csdl.split('<EntityType Name="EncyclopediaCell">')[1].split("</EntityType>")[0];
  assert.doesNotMatch(entity, /Review/);
});

// Cedar denies by default. Enumerating the permitted actions keeps an action
// that reaches the runtime without a matching policy decision failing closed.
test("cell authorization is a closed allow-list, not a blanket grant", () => {
  assert.doesNotMatch(cellPolicy, /^permit\(principal, action, resource is EncyclopediaCell\);/m);
  const permitted = cellPolicy.split("forbid(")[0].match(/Action::"([^"]+)"/g) ?? [];
  const actions = new Set(permitted.map((entry) => entry.slice(9, -1)));
  const declared = new Set(cellSpec.split("[[action]]").slice(1).map((block) => block.match(/^name = "(\w+)"$/m)[1]));
  assert.ok(declared.size >= 5);
  for (const action of declared) {
    assert.ok(actions.has(action), `${action} is declared in the specification but not permitted`);
  }
  for (const action of actions) {
    assert.ok(["create", "read"].includes(action) || declared.has(action), `${action} is permitted but not declared`);
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
  });
  assert.equal(cell.sources.length, 0);
  assert.equal(cell.studies.length, 0);
  assert.equal(cell.manifestations.length, 0);
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
