# Synthesize Writing Style

Create a complete `WritingStyle` entity: a named, verifiable, consent-clean
VOICE CONTRACT (RFC-0002 §5–6) — the prose sibling of a design language. You
author a **voice layer** (tone scales, use/ban lists, moves, register,
refusals), an **original in-register corpus**, **mechanical bands DERIVED from
that corpus** (`katagami:voice-bands/v1`), **annotated exemplars**, the
portable **VOICE.md** projection, and a **thumbnail**.

## When to Use

Job type: `synthesize_writing_style`

Terminal sourcing lane. You ATTACH artifacts; the CurationJob finalizer
attests consent, re-runs the deterministic bands checker over your corpus and
exemplars (bands self-consistency — a contract its own corpus cannot pass
does NOT publish), verifies VOICE.md, publishes public assets, and walks the
WritingStyle to `Published`. Do NOT call `AttestConsent`,
`MarkBandsSelfConsistent`, `SubmitForReview`, `MarkQualityPassed`,
`AttachPublishedAssets`, or `Publish` — those are finalizer-owned.

## Sourcing rules (this lane is consent-first)

- **Public registers, genres, movements, and traditions ONLY**: hardboiled
  wire copy, plain-style technical prose, penny-press crime reportage,
  Victorian naturalist field notes, radio continuity, etc. **Never a living
  author's voice, never a scraped personal corpus, never a non-public-domain
  author's signature** (a genre whose signature is one identifiable
  non-PD author is that author's voice — skip it). Personal/brand voices
  enter through the consent-gated find-your-style intake, not this lane.
- **Two legitimate corpus sources, each with an honest consent basis:**
  1. `basis: "original"` — you author the corpus in-register yourself. The
     corpus is the style's reference fingerprint, not quotation.
  2. `basis: "public_domain"` — real human-written PD text as the reference
     corpus. This grounds the fingerprint in human prose (better
     function-word and burstiness references than model-written pastiche)
     and is the PREFERRED source when solid PD material exists.
     **Verify actual PD status** (US: published before 1930; when in doubt,
     exclude — a dead author is not automatically PD). `provenance` must
     name the works/editions (e.g. "Pride and Prejudice (1813), Project
     Gutenberg ebook 1342"). **Prefer multi-author period blends** (several
     PD writers of one register) over a single author's idiolect; a single
     PD author is allowed with open crediting.
- **Credit openly, name independently.** Credits name the register/movement
  and, for PD corpora, the authors/works (`{name, kind (register|movement|
  tradition|writer|corpus), note}`); credit ALL influences. The STYLE is
  named for its register quality (e.g. "Drawing-Room Irony"), never marketed
  as "write like <author>" — a reference document, not a clone.
- The personal-voice intake is the only place `basis: "opt_in"` originates;
  this lane never fabricates it.

## Before Starting

- Read `/system/knowledge/design-principles.md` and `/system/knowledge/quality-standards.md`.
- `existing = temper.list('WritingStyles', '')` — your register must be distinct.
- Naming: a real, ownable name; match the name's culture to the register; vary widely.

## SPEC PHASE

```python
created_ids = []
ws = temper.create('WritingStyles', {})
eid = ws['entity_id']
created_ids.append(eid)
```

**Voice layer** — refusals carry most of the weight; tone scales are numbered
with anchors, never bare adjectives.

**Corpus** — author 3–6 original passages (each 200–500 words) that *are* the
register. Write them in the sandbox, then `temper.write` each to
`/katagami/writing-styles/{slug}/corpus-N.md` and collect file ids.

**Mechanical bands — DERIVED, not invented.** Compute the statistics from your
own corpus in the sandbox (python: sentence lengths via [.!?] splits,
mean/stdev, punctuation per 1000 words, windowed type-token ratio), then set
bands that your corpus actually satisfies with honest margins. The finalizer
re-runs these deterministically; a miscalibrated band fails the job:

```python
mechanical_bands = {
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {"mean": [measured_lo, measured_hi], "stdev_min": measured_floor},
  "banned_phrases": ["delve", "leverage", "seamless", "game-changer", ...anti-AI-tells + register-specific bans],
  "banned_patterns": ["regex the register never allows"],
  "punctuation": {"exclamations_per_1000_words": [0, N]},
  "type_token_ratio": {"min": measured_min, "window_words": 500},
  "function_words": {"max_distance": 0.2},
  "min_words_to_evaluate": 150
}
```

**Exemplars** — 3–15 short annotated passages (`{text, annotation, kind}`)
showing the moves. Banned phrases are enforced on exemplars too, however short.

**Assemble via the single hot-path action:**

```python
temper.action('WritingStyles', eid, 'SubmitWritingStyle', {
    'name': name, 'slug': slug,
    'persona': persona,
    'tone_scales': json.dumps(tone_scales),        # numbered, with anchors
    'vocabulary': json.dumps({'use': [...], 'ban': [...]}),
    'moves': json.dumps(moves),
    'register': json.dumps(register_by_channel),
    'refusals': json.dumps(refusals),
    'mechanical_bands': json.dumps(mechanical_bands),
    'corpus_file_ids': corpus_ids,                  # real list, not a string
    'corpus_manifest': json.dumps({'items': [{'file_id': i, 'kind': 'original-in-register', 'words': n} for i, n in corpus_meta]}),
    'consent': json.dumps(consent_block),
    'exemplars': json.dumps(exemplars),
    'voice_md_file_id': voice_md_id,
    'voice_md_lint_result': json.dumps({'summary': {'errors': 0, 'warnings': 0}}),
    'voice_md_format_version': 'alpha',
    'thumbnail_file_id': thumb_id,
    'parent_ids': [], 'lineage_type': 'original', 'generation_number': '0',
    'model_provenance': json.dumps({'style': {'model': '<you>'}, 'extraction': {'model': '<you>', 'tool': 'sandbox-python-stylometry'}}),
    'credits': json.dumps(credits),
    'tags': json.dumps(tags), 'direction_id': direction_id, 'curator_notes': notes,
})
```

## VOICE.md (the portable projection)

Write to `/katagami/writing-styles/{slug}/VOICE.md`. Required shape — YAML
front matter starting `---` with `version`, `kind: voice`, `consent: opt_in`
inside the corpus block; sections `## Overview`, `## Tone`, `## Vocabulary`,
`## Moves`, `## Register`, `## Never`; the bands as a fenced JSON block whose
schema is `katagami:voice-bands/v1`; the annotated examples. No TBD/TODO/
placeholder text — the finalizer rejects them.

## Thumbnail

A 600x400 JPEG typography card: the style name set large on a plain ground
with one short in-voice line beneath. Render with PIL in the sandbox; no
borders, high contrast, light ground.

## Final Tool Call

```python
temper.action('CurationJobs', job_id, 'CompleteWritingStyleSynthesis', {
    'writing_style_ids': json.dumps(created_ids),
    'output': json.dumps({'writing_style_ids': created_ids}, ensure_ascii=False)
})
temper.done("synthesize_writing_style complete")
```

## Tooling Rules

- The `json` helper is preloaded. Use `json.dumps(...)` and `json.loads(...)`
  without importing it. All object/array params via `json.dumps` (file-id LISTS
  are real lists — the cross-entity guards resolve arrays).
- The bands checker is deterministic and unforgiving: derive, don't guess.
- Do not fire finalizer-owned actions (see When to Use).

## VOICE.md format beta (2026-07-06)

The file teaches by showing, and everything measurable is measured:
- "How it reads": ONE full corpus excerpt (~300 words) — the strongest
  conditioning signal an LLM gets. Quote it verbatim, source-labeled.
- "Rhythm — write to these numbers": the bands translated into writer-facing
  instructions (sentence means, spread, distinct-word floors, opener limits).
- "Linguistic profile": derived stylometrics in prose — sentence stats,
  punctuation per 1000 words, top openers, connective rate, lexis weight.
  Measured from the corpus, never asserted.
- "Known-good replica": the verified replica, model named, labeled a replica.
- The six original sections (Overview/Tone/Vocabulary/Moves/Register/Never)
  and the bands JSON remain required.
Generate with the voicemd_v2 builder pattern; frontmatter version: beta.

The verifier also computes a soft style-similarity score (per-voice Burrows's
Delta over 500 most-frequent words; bake-off champion over StyleDistance and
Wegmann embeddings on the PD catalog). It is REPORT-ONLY: it appears in the
verification record and never gates a publish.

## Replication — the round-trip proof (required, 2026-07-06)

Every writing style MUST attach replication before it can pass verification:
1. After the VOICE.md is final, produce 1-3 samples (150+ words each) from the
   VOICE.md text ALONE — start a fresh reasoning pass with no corpus, no
   research notes, only the contract file. The replica proves the contract
   works as a prompt.
2. Attach via AttachReplication with a manifest naming the producing model per
   sample: {items: [{file_id, model, prompt_words}]}.
3. The finalizer re-runs the voice's own mechanical bands over every replica
   (corpus as the fingerprint reference). A contract that cannot round-trip
   fails verification with missing_replication or voice_bands_violation.
Replicas are displayed in the UI labeled as replicas — never as author text.

## The two-level shape (curator decision, 2026-07-06)

- A single-PD-author style is an AUTHOR VOICE: named for what it is
  ("Samuel Pepys — diary (1660s)"), parent_ids [], generation 0. Never an
  invented brand name. Author voices are the adherence calibration set.
- A blend is a LINEAGE CHILD: parent_ids name the author voices it mixes,
  lineage_type "blend", generation >= 1, its own merged corpus and derived
  bands. Plain register names ("Ship's log"), never cute compounds.
- tone_scales stays "{}" — numeric dials are never authored. Tone lives in
  the persona prose, the exemplars, and the measured bands.

## Exemplars — style, never subject (curator review, 2026-07-04)

- Every exemplar demonstrates CONSTRUCTION — how the sentence moves — not what
  it mentions. If the annotation describes content, pick a different passage.
- The FIRST exemplar is the signature passage: it renders in quotes on the
  catalog card, so the register must be assessable from it alone.
- Public-domain registers quote the corpus VERBATIM (kind "corpus"), verified
  against the source text; original registers quote their own corpus (kind
  "authored"). "sent" is reserved for opt-in personal voices.
- Annotations are one plain clause about the move, never workshop narration.
- The contrast frame "X, not Y" ("numbered, not adjectives") is a banned
  construction in ALL product prose — UI copy, VOICE.md, personas, annotations.
  It reads as a generated tell. Say the positive thing and stop.
- The corpus is displayed on the contract page ("how it reads") — it is the
  style artifact. Excerpts must be long-form passages, not snippets.
