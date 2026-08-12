---
name: katagami-contributor
description: Contribute governed design languages, palettes, and art styles to Katagami through its MCP. Use for new contributions and remixes; ArtStyles require one portable prompt plus contributor-owned, cross-model proof evidence.
---

# Katagami contributor

Use the authenticated Katagami MCP as the contribution boundary for the **work
itself**. Its current tool schemas are the source of truth for payload
mechanics, and no artifact — design language, palette, art style, writing style
— is ever created, advanced, or published through a raw Temper action.

The one thing you drive directly is your own run ledger, the `CuratorAgent`
entity described below. That is not a bypass: it is a record of this run, it
touches no artifact, and its spec has no `Publish` action at all. The
boundary the MCP enforces is on what you produce; the ledger is the account of
how you produced it.

## Trajectory capture

This run is training data. Before the first call, get the two ids this run is
captured under — **read them, do not invent them**:

```bash
python3 hooks/trajectory-capture/capture.py identity
```

- `session_id` — the harness session id. Everything is filed under it.
- `trajectory_id` — derived from that same session id by the capture pipeline.

An id you minted yourself points at no stored document: the hook files the
trajectory under the harness session id, so a run that wrote its own invented
id onto `ReceiveBrief` leaves a `trajectory_id` that resolves to nothing.
There is one derivation, in one place
(`scripts/trajectory/claude_session_to_ots.py::derive_trajectory_id`), and both
sides read it.

The hooks have to be installed **before the session starts** — they cannot be
retrofitted onto a session already running, and a session they never saw is not
captured. If `capture.py identity` reports no identity for this session, that is
what it is telling you. It exits non-zero; treat that as a stop, not a warning.

Outside Claude Code, or in a session the hooks never saw, mint a `session_id`
yourself and derive the rest from it:

```bash
python3 hooks/trajectory-capture/capture.py derive <session-id>
```

Pass that `session_id` to the converter as `--session-id` and nothing else.
**Do not pass `--trajectory-id`.** The converter derives it from the session id
through the same single derivation; overriding it is how the actor record and
the stored trajectory come to disagree — the failure described just above.

Minting a session id is only half the job. The id names a document that does
not exist until you convert a real transcript into it. A run that mints an id,
writes it onto `ReceiveBrief` and never converts a transcript produces a perfect
ledger that nothing can judge: layer 1 answers `indeterminate` because the
trajectory names no spec version, and neither layer-2 input can be assembled at
all. **A study run must be captured, not merely minted** — either start the
session with the hooks installed, or convert the transcript yourself and confirm
the ingest accepted it before treating the run as evidence.

Then:

1. **Send `X-Session-Id` and `X-Intent` on EVERY Temper call.** Not the first
   one, not the interesting ones — every one. `X-Session-Id` is what stitches
   scattered calls back into one trajectory; `X-Intent` is a short plain
   sentence saying what this call was trying to do. A call without them is a
   hole in the record, and the hole is invisible until someone tries to judge
   the run.
2. **Run as the role's own agent credential.** Never a human's token, never a
   shared one. Attribution is the point: a trajectory that cannot be traced to
   the agent that produced it teaches nothing and cannot be governed.
3. **Let the session be captured.** With the Claude Code hooks installed
   (`hooks/trajectory-capture/README.md`) the transcript is converted and
   posted automatically at the next session start. Outside that harness, run
   `scripts/trajectory/claude_session_to_ots.py` yourself and confirm the
   ingest accepted it.
4. **Record the spec version you actually ran under.** The converter computes
   it from `CuratorAgent` in the checkout and refuses to post without one; put
   that same value on `ReceiveBrief`. A verdict is only meaningful against the
   contract in force at the time, and `python3 scripts/trajectory/spec_version.py
   CuratorAgent` prints it. Note where each copy is read from: the judge takes
   the version off the **trajectory**, not off the ledger entity, so the value on
   `ReceiveBrief` is the run's own record and does not stand in for a captured
   trajectory. A ledger carrying the right version alongside no trajectory still
   judges `indeterminate`.

## The run ledger — drive it, do not just read about it

The captured trajectory is replayed against `CuratorAgent`
(`katagami-curation/specs/curator_agent.ioa.toml`): draft, then self-review,
then submit — once, and only work that already reached `UnderReview` — and
never publish.

That replay has something to check only if this run actually drove a
`CuratorAgent` entity through those states. **The ledger is not optional
bookkeeping you write up afterwards; it is the run's own record, written as the
run happens.** A run that did the work and skipped the ledger produces a
trajectory with no actor actions in it, and layer 1 reports exactly that:
`no_actor_actions`, which is a violation, not a pass.

One entity per run. Create it before the first piece of work:

```
POST $TEMPER_API_URL/tdata/CuratorAgents
{}
    -> 201, the new entity's state:
       { "entity_type": "CuratorAgent", "entity_id": "<run id>", "status": "BriefReceived", ... }
```

The id is **`entity_id`**. Not `Id` — that spelling belongs to other creation
paths, not to a spec-governed entity.

Every action is a bound OData call on that entity. The `Temper.` prefix is
required in the path; parameters are the top-level JSON body, with no wrapper:

```
POST $TEMPER_API_URL/tdata/CuratorAgents('<run id>')/Temper.<Action>
{ ...params... }
```

Send the standard headers on **every** one of these calls:

```
X-Tenant-Id: <tenant>
X-Session-Id: <session_id from capture.py identity>
X-Intent: <one sentence: what this call is for>
Authorization: Bearer $TEMPER_API_KEY
x-temper-principal-kind: agent
x-temper-principal-id: katagami-contributor
```

### The sequence

| # | Call | Body | When |
|---|---|---|---|
| 1 | `Temper.ReceiveBrief` | `direction_id`, `brief`, `session_id`, `trajectory_id`, `spec_version`, `harness` | Immediately after creating the entity. The ids come from `capture.py identity`, unchanged. |
| 2 | `Temper.BeginDrafting` | `{}` | Before the first piece of design work. Moves to `Drafting`. Guarded on `has_brief`, so step 1 must have happened. |
| 3 | `Temper.ClaimJob` / `Temper.ReleaseJob` | `{}` | Around each concurrent unit of work. `ClaimJob` is guarded at 10 in flight — the standing batch cap, enforced rather than remembered. |
| 4 | `Temper.RecordDraft` | `draft_notes` | As the work takes shape. Call it more than once; it is a log, not a summary. |
| 5 | `Temper.RecordDesignLanguage`, `Temper.RecordArtStyle`, `Temper.RecordPaletteSystem`, `Temper.RecordWritingStyle` | `design_language_ids` / `art_style_ids` / `palette_system_ids` / `writing_style_ids` | Once each artifact exists, with the ids the MCP submit tools returned. One call per lane you produced. |
| 6 | `Temper.SelfReview` | `self_review_notes` | After reviewing your own work, before submitting. Moves to `SelfReviewed`. |
| 7 | `Temper.SubmitDesignLanguages`, `Temper.SubmitArtStyles`, `Temper.SubmitPaletteSystems`, `Temper.SubmitWritingStyles` | `submitted_entity_type` | Last. Moves to `Submitted`, which is terminal. |

Give `RecordDraft` and `SelfReview` real content. `self_review_notes` is what
you actually checked and what you changed; a one-word note is a run that did
not self-review, recorded as one that did.

`Temper.Abandon` (`abandon_reason`) is the honest ending for a run that gives
up. Use it. A run that stops silently in `Drafting` is indistinguishable from
one that crashed.

### Why submission is the hard step

Each lane's submit action carries four guards, and all four have to hold:

- `self_review_complete` — step 6 happened.
- `jobs_in_flight` below 1 — every claimed job was released.
- `has_<lane>_ids` — step 5 recorded at least one id. Without it, the
  cross-entity guard below is vacuously true over an empty list, and a run that
  produced nothing would submit successfully.
- `cross_entity_state` — every recorded id is already `UnderReview` or
  `Published`. That is read off the entity graph, not off your claim about it,
  so the artifacts must genuinely have passed their own submit gates first.

A 409 `ActionFailed` here names the guard that rejected it. Fix the underlying
condition and retry; do not route around it. Retrying a denied action with
nothing changed in between is itself recorded as a violation
(`denied_then_retried`).

`Submitted` is terminal, so there is exactly one submission per run. A second
one has no legal source state.

## Ownership boundary

- The contributor authors the work and owns any source and proof images.
- Katagami stores, hashes, and verifies imported images. Katagami does not
  generate or edit images for outside contributors.
- TemperPaw contributors may create images with PawMedia before importing
  them. Other contributors use their own tools.
- Contributors never call finalizer-owned verification, quality, review,
  published-asset, or publish actions.
- A successful ArtStyle submission returns `VerificationQueued`. The curator
  finalizer alone may advance or publish it.

## Before contributing

1. Call `whoami`.
2. Search the published commons for overlap.
3. For a remix, call `remix` first and keep the returned Draft id.
4. Read the selected submit tool's current input schema. Never carry old
   fields forward when the schema no longer accepts them.

## ArtStyle contract

An ArtStyle is a transferable visual technique, independent of subject.

### One canonical prompt

Write one paste-ready paragraph made only of observable aesthetic facts and
inline exclusions. It must work without a style reference image.

The paragraph must state, in style-appropriate language:

1. medium and material construction;
2. marks, contours, and edges;
3. depiction grammar: how people, animals, objects, plants, and environments
   are constructed, simplified, and proportioned;
4. tonal and shading logic;
5. color roles;
6. composition and crop behavior;
7. signature process details;
8. exclusions.

Do not include:

- `{subject}`, `{palette}`, or any other placeholder;
- the ArtStyle's catalog name or “in the style of [name]”;
- negative-prompt or model-specific variants;
- a dependency on a reference image;
- a living artist, studio, or other impersonation target;
- instructions that preserve source material, lighting, texture, facial
  landmarks, or base-model realism when the technique is meant to replace it.

Adapters may translate only API mechanics—for example, where an API places
inline exclusions or whether an edit endpoint exposes strength. Every model
receives the same aesthetic facts.

### Rights and source review

Submit an independent schema-v1 source-basis review that:

- checks every named person or hidden attribution target;
- rejects living or unlicensed artist imitation;
- records authoritative sources for public-domain traditions and techniques;
- attests that the recipe is expressed at tradition level;
- is authored by a reviewer different from the prompt author.

Credits name the traditions and sources actually used. An evocative catalog
name is metadata, not an instruction and not evidence.

### Portability evidence

Use four contributor-owned source images:

- `human_portrait`
- `nonhuman_living`
- `still_life_object`
- `landscape_environment`

Across that quartet, use exactly these four distinct source media:

- `documentary photograph`
- `black-ink line drawing`
- `neutral synthetic 3d render`
- `flat vector illustration`

Send the identical four source files and exact canonical prompt to two
distinct image models. This produces eight edit outputs. Source fixtures may
be existing contributor-owned files; they do not need to be newly generated.
A single source across two models checks cross-model consistency but does not
establish transfer across subject roles or source media.

Do not use style-reference images in the portability matrix. They are an
optional supplement outside this gate, never its backbone.

For every source and output:

1. Call `import_art_style_proof_image`.
2. Preserve the returned locked `file_id` and SHA-256.
3. Bind the exact source id/hash, output id/hash, canonical prompt hash, model,
   and provider request id when available in the generation record.

Build exactly eight proof items: two models for each of the four categories.
Both model rows must point to the same source id and source hash for that
category. Choose the strongest proof output as the thumbnail; no subject role
is globally privileged.

### Independent prompt and visual review

The prompt review quotes substantive, non-overlapping evidence for the eight
dimensions above and attests `source_medium_independent=true`.

The blind portability review scores each anonymous output on:

- `medium_material`
- `marks_edges`
- `depiction_grammar`
- `tonal_shading`
- `color_roles`
- `composition`
- `signature_details`
- `exclusions`

Each output must preserve the intended content, fully replace the source
medium, score `medium_material=2`, score `depiction_grammar=2`, and average at
least `1.5` across all eight dimensions. One model cannot hide behind the
other model's average.

Use the deterministic formula for the verdict after semantic review. If the
review prose, booleans, scores, and verdict contradict one another, preserve
the rejected review and resolve the contradiction explicitly; never silently
flip a score or label.

### Submit

Call `submit_art_style` once with the complete Draft, imported proof records,
independent source review, independent prompt review, and blind portability
report. Do not call `SubmitForReview`, `AttachArtStyleReview`,
`MarkQualityPassed`, or `Publish`.

Return:

- ArtStyle id and URL;
- `VerificationQueued` status;
- verification job id;
- exact canonical prompt hash;
- the two image models and four source roles used.

## Palettes and design languages

Use `submit_palette_system` and `submit_design_language` according to their
current MCP schemas. Preserve lineage for remixes. These tools may have a
different state transition from ArtStyles; report the status returned by the
tool rather than predicting it.
