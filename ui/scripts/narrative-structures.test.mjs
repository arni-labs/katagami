import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStructureHandoff,
  narrativeStructureFixture,
  orderedMovements,
} from "../src/lib/narrative-structures.ts";

test("the approved fixture exposes all 32 structures and both movement forms", () => {
  assert.equal(narrativeStructureFixture.length, 32);
  assert.equal(
    narrativeStructureFixture.filter((structure) => structure.movements.kind === "fixed").length,
    14,
  );
  assert.equal(
    narrativeStructureFixture.filter((structure) => structure.movements.kind === "rule").length,
    18,
  );
  for (const structure of narrativeStructureFixture) {
    const movements = orderedMovements(structure.movements);
    assert.ok(movements.length > 0, `${structure.id} has visible movements`);
    assert.deepEqual(
      movements.map((movement) => movement.position),
      movements.map((_, index) => index + 1),
      `${structure.id} movements stay ordered and consecutive`,
    );
  }
});

test("the fixture preserves non-Latin aliases and the seven approved cell links", () => {
  const aliases = narrativeStructureFixture.flatMap((structure) => structure.aliases);
  assert.ok(aliases.includes("起承転結"));
  assert.ok(aliases.includes("序破急"));
  assert.ok(aliases.includes("पञ्चसन्धि"));
  assert.equal(
    narrativeStructureFixture.filter((structure) => structure.encyclopediaCellIds.length > 0).length,
    7,
  );
});

test("every source states whether it is public domain or cited", () => {
  const handling = new Set(
    narrativeStructureFixture.flatMap((structure) =>
      structure.sources.map((source) => source.handling),
    ),
  );
  assert.deepEqual([...handling].sort(), ["cited_and_paraphrased", "public_domain"]);
});

test("the copied fixed structure is an ordered instruction an agent can use", () => {
  const structure = narrativeStructureFixture.find(
    (candidate) => candidate.id === "freytag-five-part-dramatic-structure",
  );
  assert.ok(structure);
  const handoff = buildStructureHandoff(structure);
  assert.match(handoff, /^Structure this work with Freytag's five-part dramatic structure\./);
  assert.match(handoff, /Required movements:/);
  assert.match(handoff, /1\. Introduction/);
  assert.match(handoff, /5\. Catastrophe/);
  assert.match(handoff, /Draft the work only after the outline is complete\./);
});

test("the copied rule structure includes its rule and adaptable example", () => {
  const structure = narrativeStructureFixture.find(
    (candidate) => candidate.id === "ring-composition",
  );
  assert.ok(structure);
  const handoff = buildStructureHandoff(structure);
  assert.match(handoff, /Rule: Place paired units in reverse order/);
  assert.match(handoff, /Adaptable example:/);
  assert.match(handoff, /4\. Central turn/);
  assert.match(handoff, /7\. A′/);
  assert.doesNotMatch(handoff, /\[object Object\]/);
});
