// The style detail page reads a record and hands it to an agent. Two things
// have to hold and neither is visible from the rendered page: the corpus and
// the exemplars must arrive at the reader unedited, and the handoff must carry
// enough that an agent given nothing else writes inside the contract.
import assert from "node:assert/strict";
import test from "node:test";
import {
  agentHandoff,
  bandSentences,
  corpusManifestOf,
  parentIdsOf,
  replicationManifestOf,
  toWritingStyleDetail,
  toWritingStyleSpecimen,
} from "../src/lib/writing-styles.ts";

const BANDS = {
  schema: "katagami:voice-bands/v1",
  sentence_length: { mean: [16.5, 32.7], stdev_min: 11.3 },
  sentence_openers: { max_top_share: 0.22 },
  paragraph_length: { stdev_min: 40.3 },
  type_token_ratio: { min: 0.31, window_words: 500 },
  hapax_ratio: { min: 0.17, window_words: 500 },
  connectives_per_1000_words: [0, 6],
  function_words: { max_distance: 0.136 },
  char_trigrams: { max_distance: 0.291 },
  banned_phrases: ["delve", "leverage"],
  min_words_to_evaluate: 150,
};

const ROW = {
  entity_id: "en-test",
  status: "UnderReview",
  fields: {
    name: "Michael Faraday — lectures (1861)",
    slug: "faraday-lectures",
    persona: "a demonstration in words",
    exemplars: JSON.stringify([
      { text: "And now, as we can convert the water into steam by heat, we convert it back.", annotation: "the object first", kind: "corpus" },
    ]),
    credits: JSON.stringify([{ name: "Michael Faraday", kind: "writer" }]),
    consent: JSON.stringify({ basis: "public_domain", author: "Michael Faraday", license: "public domain", samples: 3, provenance: "The Chemical History of a Candle (1861)" }),
    mechanical_bands: JSON.stringify(BANDS),
    tone_scales: JSON.stringify({ formality: 6, directness: 8 }),
    corpus_manifest: JSON.stringify({
      items: [
        { file_id: "fl-a", kind: "public-domain-excerpt", source: "The Chemical History of a Candle (1861)", words: 812 },
        { file_id: "fl-b", kind: "public-domain-excerpt", source: "The Chemical History of a Candle (1861)", words: 640 },
      ],
    }),
    corpus_file_ids: JSON.stringify(["fl-a", "fl-b"]),
    replication_sample_file_ids: JSON.stringify(["fl-r1", "fl-r2"]),
    replication_manifest: JSON.stringify({ items: [{ file_id: "fl-r1", model: "claude-opus-4-8", generated_at: "2026-07-02", loop: "2" }] }),
    verification_report: JSON.stringify({ engine: "katagami-finalizer voice-bands", texts: { corpus_words: 1452 }, compliance: { checks_passed: ["mechanical_bands_over_corpus"] } }),
    voice_md_file_id: "fl-voice",
    parent_ids: [],
  },
};

const CORPUS_A = "  And now, as we can convert the water—into steam by heat.\n\nSee how soon it gets damp.  ";
const read = {
  corpus: new Map([["fl-a", CORPUS_A.trim()], ["fl-b", "It requires all that quantity of nitrogen."]]),
  replications: new Map([["fl-r1", "A replica."]]),
  voiceMd: "---\nkind: voice\n---\n## Never\n- never talks down\n",
  parents: [],
};

const detail = () => toWritingStyleDetail(ROW, [], read);

test("the corpus manifest keeps its order, its sources and its word counts", () => {
  const manifest = corpusManifestOf(ROW);
  assert.deepEqual(
    manifest.map((item) => [item.fileId, item.source, item.words]),
    [
      ["fl-a", "The Chemical History of a Candle (1861)", 812],
      ["fl-b", "The Chemical History of a Candle (1861)", 640],
    ],
  );
});

test("a record with file ids and no manifest still has a corpus", () => {
  // Not hypothetical: the manifest is written by the finalizer and the ids by
  // whatever produced the files. A record with one and not the other would
  // otherwise show as having no corpus at all, which is the exact wrong answer.
  const row = { ...ROW, fields: { ...ROW.fields, corpus_manifest: undefined } };
  assert.deepEqual(corpusManifestOf(row).map((item) => item.fileId), ["fl-a", "fl-b"]);
  assert.equal(corpusManifestOf(row)[0].words, 0);
  assert.equal(corpusManifestOf(row)[0].described, false);
});

test("a manifest describing only some of the files hides none of them", () => {
  // The defect this page exists to fix, arriving inside the fix. The manifest
  // DESCRIBES the corpus and can cover fewer files than the record holds;
  // preferring it whenever it had any entries at all showed one of three and
  // dropped the rest, on the page built to answer whether the corpus is there.
  const row = {
    ...ROW,
    fields: {
      ...ROW.fields,
      corpus_file_ids: JSON.stringify(["fl-a", "fl-b", "fl-c"]),
      corpus_manifest: JSON.stringify({ items: [{ file_id: "fl-a", source: "Candle (1861)", words: 812 }] }),
    },
  };
  const corpus = corpusManifestOf(row);
  assert.deepEqual(corpus.map((item) => item.fileId), ["fl-a", "fl-b", "fl-c"], "every id on the record is corpus");
  assert.deepEqual(corpus.map((item) => item.described), [true, false, false]);
  assert.equal(corpus[1].source, "", "a file the manifest omits gets no invented source");
  assert.equal(corpus[1].words, 0);
});

test("a manifest naming a file the id list omits keeps that file too", () => {
  // The same mismatch from the other side, and dropping it would be the same
  // mistake — so it is appended after the authoritative list.
  const row = {
    ...ROW,
    fields: {
      ...ROW.fields,
      corpus_file_ids: JSON.stringify(["fl-a"]),
      corpus_manifest: JSON.stringify({ items: [{ file_id: "fl-z", source: "Elsewhere", words: 10 }] }),
    },
  };
  assert.deepEqual(corpusManifestOf(row).map((item) => item.fileId), ["fl-a", "fl-z"]);
});

test("a malformed lineage string does not take the page down", () => {
  // `parent_ids` arrives as a JSON string on some records and a native array on
  // others. A raw JSON.parse on the string form turns one bad record into a 500
  // on the whole detail page — for the most decorative thing on it.
  for (const parent_ids of ['["en-a"', "not json at all", "", "{}", "null"]) {
    const row = { ...ROW, fields: { ...ROW.fields, parent_ids } };
    assert.doesNotThrow(() => parentIdsOf(row), `parent_ids = ${parent_ids}`);
    assert.deepEqual(parentIdsOf(row), [], `parent_ids = ${parent_ids}`);
  }
  // Both shapes the backend actually sends, and junk inside a good array.
  assert.deepEqual(parentIdsOf({ ...ROW, fields: { ...ROW.fields, parent_ids: '["en-a","en-b"]' } }), ["en-a", "en-b"]);
  assert.deepEqual(parentIdsOf({ ...ROW, fields: { ...ROW.fields, parent_ids: ["en-a", "en-b"] } }), ["en-a", "en-b"]);
  assert.deepEqual(parentIdsOf({ ...ROW, fields: { ...ROW.fields, parent_ids: ["en-a", null, "", { x: 1 }] } }), ["en-a"]);
});

test("the listing card can say how much prose stands behind the contract", () => {
  const specimen = toWritingStyleSpecimen(ROW, []);
  assert.equal(specimen.corpusFiles, 2);
  assert.equal(specimen.corpusWords, 1452);
});

test("corpus text reaches the page exactly as it was read", () => {
  // The corpus is evidence. Nothing may normalise its dashes, collapse its
  // paragraph breaks or shorten it — the fold on the page is CSS for that
  // reason, and this asserts the text arriving at the fold is untouched.
  const [first] = detail().corpus;
  assert.equal(first.text, CORPUS_A.trim());
  assert.ok(first.text.includes("—"), "an em dash survives");
  assert.ok(first.text.includes("\n\n"), "the paragraph break survives");
});

test("exemplars reach the page exactly as they were recorded", () => {
  const [exemplar] = detail().exemplars;
  assert.equal(exemplar.text, "And now, as we can convert the water into steam by heat, we convert it back.");
});

test("a replica with no readable file is dropped rather than shown empty", () => {
  const replications = detail().replications;
  assert.equal(replications.length, 1);
  assert.equal(replications[0].fileId, "fl-r1");
  assert.equal(replications[0].provenance, "claude-opus-4-8 · 2026-07-02 · loop 2");
  assert.equal(replicationManifestOf(ROW).length, 2, "both ids are on the record");
});

test("the bands keep their nesting for the page, and flatten only for the facets", () => {
  const style = detail();
  assert.deepEqual(style.bandsJson.sentence_length, { mean: [16.5, 32.7], stdev_min: 11.3 });
  assert.equal(JSON.stringify(style.bandsJson, null, 2).includes('\\"'), false, "the printed contract has no escaped quotes");
});

test("the two bands nothing in their name explains carry the instruction that follows from them", () => {
  // Measured, not guessed: replicas written from the JSON alone failed exactly
  // these two — 42% of sentences on one opener against a 22% ceiling, and
  // paragraph spread 9.1 against a floor of 40.3 — and passed every band whose
  // key name says what to do. Losing these two clauses loses that.
  const lines = bandSentences(BANDS);
  const openers = lines.find((line) => line.includes("opens more than"));
  const paragraphs = lines.find((line) => line.includes("Paragraph lengths"));
  assert.match(openers, /22% of sentences — vary how sentences begin/);
  assert.match(paragraphs, /40\.3 words — some paragraphs run much longer than others/);
});

test("the handoff carries the whole VOICE.md, the bands in words, and the self-check", () => {
  const handoff = agentHandoff(detail(), "https://katagami.ai/voice/en-test/VOICE.md");
  assert.ok(handoff.includes(read.voiceMd.trim()), "the contract file travels verbatim");
  assert.ok(handoff.includes("Michael Faraday — lectures (1861)"), "the agent is told whose voice");
  assert.ok(handoff.includes("https://katagami.ai/voice/en-test/VOICE.md"), "the address rides along");
  for (const line of bandSentences(BANDS)) assert.ok(handoff.includes(line), `the handoff states: ${line}`);
  assert.match(handoff, /Measure your draft against that list before you answer/);
});

test("a record with no VOICE.md hands over nothing rather than an empty instruction", () => {
  const handoff = agentHandoff({ ...detail(), voiceMd: "   " }, "https://katagami.ai/voice/en-test/VOICE.md");
  assert.equal(handoff, "");
});
