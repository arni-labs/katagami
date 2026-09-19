import test from "node:test";
import assert from "node:assert/strict";
import {
  STYLE_DNA_QUESTIONS,
  STYLE_DNA_SET,
  buildStyleDoc,
  centroid,
  dnaFromAnswers,
  dnaVersion,
  matchScore,
  oddness,
  storedDna,
  styleQuestions,
  topTraits,
  wantQuestions,
} from "../src/lib/style-dna.mjs";

const ids = STYLE_DNA_QUESTIONS.map((q) => q.id);
const flat = (v) => Object.fromEntries(ids.map((id) => [id, v]));

test("question ids and labels are unique, and both phrasings exist for each", () => {
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(STYLE_DNA_QUESTIONS.map((q) => q.label)).size, ids.length);
  assert.deepEqual(Object.keys(styleQuestions()), ids);
  assert.deepEqual(Object.keys(wantQuestions()), ids);
  for (const q of STYLE_DNA_QUESTIONS) assert.ok(q.style && q.want && q.style !== q.want, q.id);
});

test("a product indifferent to a question is not matched on it", () => {
  const want = { ...flat(0.5), dark_ground: 0.95 };
  const dark = { ...flat(0.1), dark_ground: 0.9 };
  const light = { ...flat(0.5), dark_ground: 0.1 };
  assert.ok(matchScore(want, dark) > 0.9, "only the dark-ground answer counts");
  assert.ok(matchScore(want, dark) > matchScore(want, light));
  assert.equal(matchScore(flat(0.5), dark), 0, "no opinion, no match");
});

test("answers become DNA only when every question was answered", () => {
  const answers = Object.fromEntries(ids.map((id) => [id, { type: "noul", noul: 0.12345 }]));
  assert.equal(dnaFromAnswers(answers).dark_ground, 0.123);
  delete answers[ids[3]];
  assert.equal(dnaFromAnswers(answers), null);
});

test("stored DNA from another question set is not read", () => {
  const style_dna = JSON.stringify(flat(0.4));
  assert.ok(storedDna({ style_dna, style_dna_version: dnaVersion("jev-1.13.0") }));
  assert.equal(storedDna({ style_dna, style_dna_version: "dna-v0/jev-1.13.0" }), null);
  assert.equal(storedDna({ style_dna: "{}", style_dna_version: `${STYLE_DNA_SET}/x` }), null);
  assert.equal(storedDna({ style_dna: "not json", style_dna_version: `${STYLE_DNA_SET}/x` }), null);
  assert.equal(storedDna(undefined), null);
});

test("oddness is distance from the crowd", () => {
  const crowd = centroid([flat(0.2), flat(0.4)]);
  assert.ok(Math.abs(crowd.quiet - 0.3) < 1e-9);
  assert.ok(oddness(flat(0.9), crowd) > oddness(flat(0.35), crowd));
});

test("a card shows only traits the style answers strongly, strongest first", () => {
  const traits = topTraits({ ...flat(0.1), japanese: 0.7, quiet: 0.95, flat: 0.59 });
  assert.deepEqual(traits.map((t) => t.id), ["quiet", "japanese"]);
});

test("the document tolerates JSON strings, objects, lists and missing fields", () => {
  const doc = buildStyleDoc("language", {
    name: "Civic Press",
    tags: '["civic","specimen"]',
    philosophy: '{"summary":"A programme pinned by the door."}',
    imagery_direction: "[1,2]",
    tokens: { colors: { primary: "#C8442A" } },
  });
  assert.match(doc, /design language: Civic Press/);
  assert.match(doc, /qualities: civic$/m);
  assert.match(doc, /pinned by the door/);
  assert.match(doc, /palette: primary #C8442A/);
  assert.equal(buildStyleDoc("art_style", { name: "Overprint", medium: "print" }), "art style: Overprint\nmedium: print");
});
