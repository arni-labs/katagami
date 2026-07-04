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
  wire copy, plain-style technical prose, gonzo reportage, Victorian
  naturalist field notes, radio continuity, etc. **Never a living author's
  voice, never a scraped personal corpus.** Personal/brand voices enter
  through the consent-gated find-your-style intake, not this lane.
- The corpus is **original writing you author in-register** — it is the
  style's reference fingerprint, not quotation. Credit the register/movement
  it descends from via `SetCredits` ({name, kind (register|movement|tradition|
  writer-school), note}); credit ALL influences.
- The consent block records this origination honestly:
  `{"basis": "opt_in", "author": "katagami-curation (original in-register corpus)",
    "license": "<license>", "samples": N, "provenance": "<how it was authored>"}`.

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
