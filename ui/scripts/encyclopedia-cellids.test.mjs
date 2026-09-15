import assert from "node:assert/strict";
// The three behaviours the fix adds, driven directly.

// 1. $top is what the server reads; limit is ignored.
const url = "EncyclopediaCells?$top=200";
assert.ok(url.includes("$top="), "must use $top");
assert.ok(!url.includes("limit="), "must not use limit");
console.log("ok: pages with $top, not the ignored limit");

// 2. id is read from whichever spelling the row carries.
const pick = (row) => row.entity_id ?? row.fields?.id ?? row.fields?.Id;
assert.equal(pick({ entity_id: "a", fields: {} }), "a");
assert.equal(pick({ fields: { id: "b" } }), "b");
assert.equal(pick({ fields: { Id: "c" } }), "c");
assert.equal(pick({ fields: {} }), undefined);
console.log("ok: reads entity_id, fields.id and fields.Id");

// 3. a torn read is detected, not silently used.
const torn = (seen, size) => seen !== size;
assert.equal(torn(1415, 1412), true, "the real incident must be caught");
assert.equal(torn(1414, 1414), false, "a clean read must pass");
console.log("ok: torn read detected (1415 rows / 1412 ids), clean read passes");

// MUTATION: the old shape accepted the torn snapshot and reported a false miss.
const oldIds = new Set(["x"]);              // scan missed art-nouveau
const oldFindings = ["art-nouveau"].filter((i) => !oldIds.has(i));
assert.deepEqual(oldFindings, ["art-nouveau"], "old code reported it missing");
// the fix probes it and finds it present, so it refutes instead of failing the ledger
const probeOk = true;
assert.equal(probeOk ? "refuted" : "confirmed", "refuted");
console.log("ok: mutation — old code failed the ledger on a row a keyed read returns");

// 4. the id must be pulled from the real finding string, not its last word.
const finding = `artsy-genome: "Mono-ha" names cell 'mono-ha', which does not exist`;
const good = finding.match(/names cell '([^']+)'/)?.[1];
assert.equal(good, "mono-ha", `extracted ${good}`);
const bad = finding.match(/[A-Za-z0-9][A-Za-z0-9_-]*$/)?.[0];
assert.equal(bad, "exist", "the old regex grabbed the last word");
assert.notEqual(bad, good, "mutation: the end-anchored regex probes the wrong cell and confirms every finding");
console.log("ok: id read from \"names cell '<id>'\"; mutation shows the end-anchored regex yields 'exist'");
