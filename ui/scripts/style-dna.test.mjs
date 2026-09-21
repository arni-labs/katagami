import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPUTED_TRAIT_IDS,
  STYLE_DNA_QUESTIONS,
  STYLE_DNA_SET,
  applyRefinement,
  askedQuestions,
  refineQuestions,
  buildStyleDoc,
  centroid,
  computedDna,
  dnaFromAnswers,
  dnaVersion,
  matchScore,
  oddness,
  storedDna,
  styleQuestions,
  topTraits,
  traitsField,
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

test("stored DNA from another question set or model is not read", () => {
  const style_dna = JSON.stringify(flat(0.4));
  const M = "jev-1.13.0";
  assert.equal(dnaVersion(M), `${STYLE_DNA_SET}/${M}`);
  assert.ok(storedDna({ style_dna, style_dna_version: dnaVersion(M) }, M));
  assert.ok(storedDna({ style_dna, style_dna_version: `dna-v1/${M}` }, M), "v1 is still read until every row is v2");
  assert.equal(storedDna({ style_dna, style_dna_version: "dna-v0/jev-1.13.0" }, M), null);
  assert.equal(storedDna({ style_dna, style_dna_version: dnaVersion("jev-2.0.0") }, M), null, "another model's answers are not compared");
  assert.equal(storedDna({ style_dna: "{}", style_dna_version: dnaVersion(M) }, M), null);
  assert.equal(storedDna({ style_dna: "not json", style_dna_version: dnaVersion(M) }, M), null);
  assert.equal(storedDna(undefined, M), null);
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

test("a field is read whatever shape it arrives in, rather than one shape being read and the rest dropped", () => {
  // Both of these are real shapes in the library, and v1 kept only the first.
  const asList = buildStyleDoc("art_style", { name: "A", guidance: '{"do":["use paper","ration colour"],"dont":["hard outlines"]}' });
  const asSentence = buildStyleDoc("art_style", { name: "A", guidance: "Do: use paper, ration colour. Don't: hard outlines." });
  assert.match(asList, /guidance: do: use paper; ration colour; dont: hard outlines/);
  assert.match(asSentence, /guidance: Do: use paper, ration colour/);
  // An object with no summary key kept its content out of 59 of 301 v1 documents.
  assert.match(buildStyleDoc("language", { name: "A", imagery_direction: { technique: "chronophotography" } }), /imagery: technique: chronophotography/);
});

test("nothing is cut mid-word, and a document that fits is left alone", () => {
  const long = "sentence ".repeat(200).trim();
  const doc = buildStyleDoc("art_style", { name: "A", prompt_template: long });
  const recipe = doc.split("\n").find((l) => l.startsWith("recipe: "));
  assert.ok(recipe.endsWith("…"), "a document over the limit says so");
  assert.ok(!/\bsentenc…$/.test(recipe), "and breaks between words, not inside one");
  assert.equal(buildStyleDoc("art_style", { name: "A", prompt_template: "short" }), "art style: A\nrecipe: short");
});

test("the filterable traits field wraps every id in spaces, so contains(' quiet ') cannot match a longer id", () => {
  assert.equal(traitsField({ ...flat(0.1), quiet: 0.6, flat: 0.9 }), " quiet flat ");
  assert.equal(traitsField(flat(0.1)), "");
});

test("a row with misshapen fields still gets a document", () => {
  assert.equal(buildStyleDoc("language", { name: "Odd", tags: "{}", tokens: "[]", layout_principles: "" }), "design language: Odd");
  assert.equal(buildStyleDoc("art_style", { name: "Odd", tags: '"x"' }), "art style: Odd");
  assert.equal(buildStyleDoc("language", {}), "design language: ");
});

test("the three palette questions are measured from a language's tokens, not asked", () => {
  assert.deepEqual(COMPUTED_TRAIT_IDS, ["dark_ground", "cool_palette", "single_accent"]);
  // Warm paper, black text, one orange accent — v1 asked Jev and was told 0.91 dark.
  const paper = computedDna("language", { tokens: { colors: { bg: "#F4F3EE", text: "#0B0B0D", accent: "#FF5B04", error: "#D6402C" } } });
  assert.equal(paper.dark_ground, 0);
  assert.equal(paper.cool_palette, 0);
  assert.ok(paper.single_accent > 0.9, "one chromatic hue is the whole of one accent");
  const night = computedDna("language", { tokens: { colors: { bg: "#0B1020", text: "#E7ECF7", accent: "#4DA3FF", accent_2: "#7CE7D6" } } });
  assert.equal(night.dark_ground, 1);
  assert.equal(night.cool_palette, 1);
  assert.ok(night.single_accent < 0.6, "blue and teal are two hues, not a ration");
  // The red is semantic, so it must not make the palette look like a scheme.
  const rationed = computedDna("language", { tokens: { colors: { bg: "#0B1020", accent: "#4DA3FF", error: "#D6402C", success: "#2E9E5B" } } });
  assert.equal(rationed.single_accent, paper.single_accent);
});

test("a row with no palette to measure is asked everything, and so is every art style", () => {
  assert.deepEqual(computedDna("language", { tokens: { colors: { accent: "#FF5B04" } } }), {}, "no ground colour, no measurement");
  assert.deepEqual(computedDna("language", {}), {});
  // An art style's pictures measure their own tone, but the tone of a picture is
  // not the ground its work sits on, so it is stated and never decided on.
  assert.deepEqual(computedDna("art_style", { visual_description: '{"tone":0.02,"cool_share":0.9}' }), {});
  assert.match(buildStyleDoc("art_style", { name: "A", visual_description: '{"looks_like":"Ink on paper.","tone":0.82,"cool_share":0.05}' }), /looks like: Ink on paper\.\nmeasured off the pictures: they read light overall/);
});

test("a measured answer is never asked of Jev, and lands in the reading all the same", () => {
  const computed = computedDna("language", { tokens: { colors: { bg: "#0B1020", accent: "#4DA3FF" } } });
  const asked = askedQuestions(computed);
  for (const id of COMPUTED_TRAIT_IDS) assert.equal(asked[id], undefined, id);
  assert.equal(Object.keys(asked).length, ids.length - COMPUTED_TRAIT_IDS.length);
  assert.deepEqual(Object.keys(styleQuestions()), ids, "a style with nothing measurable is still asked all of them");

  const answers = Object.fromEntries(Object.keys(asked).map((id) => [id, { type: "noul", noul: 0.4 }]));
  const dna = dnaFromAnswers(answers, computed);
  assert.equal(Object.keys(dna).length, ids.length);
  assert.equal(dna.dark_ground, computed.dark_ground);
  assert.equal(dna.playful, 0.4);
  assert.equal(dnaFromAnswers(answers), null, "the measured answers are not optional");
});

test("a product sentence has no palette, so every question is still asked of it", () => {
  assert.deepEqual(Object.keys(wantQuestions()), ids);
});

test("a card prints the strongest traits of a reading from any set still read, and nothing for another", async () => {
  const { cardTraits } = await import("../src/lib/style-dna.mjs");
  const style_dna = JSON.stringify({ ...flat(0.1), quiet: 0.95, japanese: 0.7, flat: 0.61, playful: 0.59 });
  for (const set of ["dna-v1", "dna-v2"]) {
    assert.deepEqual(cardTraits({ style_dna, style_dna_version: `${set}/jev-9` }), ["quiet", "Japanese", "flat"], set);
  }
  assert.deepEqual(cardTraits({ style_dna, style_dna_version: "dna-v0/jev-1" }), []);
  assert.deepEqual(cardTraits({ style_dna: "[]", style_dna_version: "dna-v2/x" }), []);
  assert.deepEqual(cardTraits(undefined), []);
});

test("a change moves only the traits it speaks to, and never out of range", () => {
  const unchanged = Object.fromEntries(ids.map((id) => [id, { type: "score", score: 1.1 }]));
  const answers = { ...unchanged, [ids[0]]: { type: "score", score: 2 }, [ids[1]]: { type: "score", score: 0 } };
  const out = applyRefinement({ ...flat(0.5), [ids[0]]: 0.9 }, answers);
  assert.equal(out.reading[ids[0]], 1);
  assert.equal(out.reading[ids[1]], 0);
  assert.equal(out.reading[ids[2]], 0.5);
  assert.deepEqual(out.moved.map((m) => m.id), [ids[1], ids[0]]);
});

test("a change with an unanswered trait refines nothing", () => {
  const answers = Object.fromEntries(ids.slice(1).map((id) => [id, { type: "score", score: 1 }]));
  assert.equal(applyRefinement(flat(0.5), answers), null);
  assert.deepEqual(Object.keys(refineQuestions()), ids);
});
