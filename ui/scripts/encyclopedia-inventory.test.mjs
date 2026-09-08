import assert from "node:assert/strict";
import test from "node:test";
import { catalogueSummary, decodeTags, decodeGuidance, collectPages, descriptorIssues } from "./encyclopedia-inventory.mjs";

test("tag arrays and JSON tag strings produce the same values", () => {
  assert.deepEqual(decodeTags('["ink","wash"]'), decodeTags(["ink", "wash"]));
  assert.deepEqual(decodeTags(undefined), []);
  assert.throws(() => decodeTags('{"ink":true}'));
  assert.throws(() => decodeTags([1]));
});

test("guidance accepts both observed object representations", () => {
  const value = { do: ["Use ink"], dont: ["Avoid glossy finishes"] };
  assert.deepEqual(decodeGuidance(value), decodeGuidance(JSON.stringify(value)));
  assert.equal(decodeGuidance("Describe the line"), "Describe the line");
  assert.throws(() => decodeGuidance(4));
});

test("inventory follows exact continuation paths and excludes histories", async () => {
  const paths = [];
  const pages = {
    ArtStyles: { value: [{ entity_id: "a", status: "Published", fields: { name: "Ink", history: "private" } }], "@odata.nextLink": "ArtStyles?$skiptoken=opaque" },
    "ArtStyles?$skiptoken=opaque": { value: [{ entity_id: "b", status: "Draft", fields: { name: "Wash" } }] },
  };
  const result = await collectPages(async path => { paths.push(path); return pages[path]; }, "ArtStyles");
  assert.deepEqual(paths, ["ArtStyles", "ArtStyles?$skiptoken=opaque"]);
  assert.deepEqual(result.pageSizes, [1, 1]);
  assert.equal(result.complete, true);
  assert.equal(JSON.stringify(result).includes("private"), false);
});

test("incomplete array-only reads cannot become complete inventory", async () => {
  await assert.rejects(() => collectPages(async () => [], "ArtStyles"), /page envelope/);
});

test("a repeated continuation fails instead of looping", async () => {
  await assert.rejects(() => collectPages(async () => ({ value: [], "@odata.nextLink": "ArtStyles" }), "ArtStyles"), /repeated continuation/);
});

test("duplicate record ids fail instead of inflating counts", async () => {
  await assert.rejects(() => collectPages(async () => ({ value: [
    { entity_id: "a", status: "Draft", fields: { name: "First" } },
    { entity_id: "a", status: "Draft", fields: { name: "Second" } },
  ] }), "ArtStyles"), /duplicate/);
});

test("a malformed page fails instead of becoming an empty collection", async () => {
  await assert.rejects(() => collectPages(async () => ({ error: "denied" }), "ArtStyles"), /page envelope/);
});

test("continuation cannot change the collection or invoke a mutation", async () => {
  for (const link of ["OtherStyles", "ArtStyles('a')/Publish", "https://another.invalid", 4, ""]) {
    await assert.rejects(() => collectPages(async () => ({ value: [], "@odata.nextLink": link }), "ArtStyles"), /continuation path/);
  }
});

test("counts retain publication status and repeated names do not merge", () => {
  const rows = [
    { id: "a", status: "Published", fields: { name: "Ink", medium: "print" } },
    { id: "b", status: "Draft", fields: { name: "Ink", medium: "painting" } },
    { id: "c", status: "Archived", fields: { name: "Ink", medium: "painting" } },
  ];
  const summary = catalogueSummary(rows);
  assert.equal(summary.total, 3);
  assert.deepEqual(summary.statuses, { Published: 1, Draft: 1, Archived: 1 });
  assert.deepEqual(summary.publishedMedia, { print: 1 });
  assert.deepEqual(summary.repeatedActiveNames[0].ids, ["a", "b"]);
});

test("numeric guidance is reported without dropping the record or its count", () => {
  const rows = [{ id: "a", status: "UnderReview", fields: { name: "Example", guidance: 7.5 } }];
  assert.deepEqual(descriptorIssues(rows), [{ id: "a", field: "guidance", message: "guidance must be text or an object" }]);
  assert.equal(catalogueSummary(rows).total, 1);
});

test("unnamed archived records remain in the inventory without a fabricated name", () => {
  const result = catalogueSummary([{ id: "a", status: "Archived", fields: {} }]);
  assert.equal(result.total, 1);
  assert.deepEqual(result.unnamedIds, ["a"]);
  assert.deepEqual(result.repeatedActiveNames, []);
});

test("medium labels cannot collide with object prototype names", () => {
  const labels = ["__proto__", "constructor", "toString"];
  const rows = labels.map((medium, index) => ({ id: String(index), status: "Published", fields: { name: medium, medium } }));
  assert.deepEqual(catalogueSummary(rows).publishedMedia, Object.fromEntries(labels.map(label => [label, 1])));
});
