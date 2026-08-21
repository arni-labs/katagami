# Keyblock synthesize session — full trajectory completed, 2026-08-13

Session `31f50e0e-f8aa-46be-bfe2-6a9a4c1ef60d`, trajectory
`traj-1ec04abc2c522975dfc9ac1a`, spec
`sha256:f11d964ee3d70a31ff98a8651f2d514071b08e104c85e0a29ab16993365452ab`.
Pinned ids: query `en-019ffcec-6991-78c1-b882-bce38b08f578`, direction
`en-019ffd04-a739-70c2-a247-413a1357ecfa` (Synthesizing via BeginSynthesis),
job `en-019ffd04-a782-7050-94f9-34a575005b0e` (Running via Start).

## Outcome

The first complete synthesize trajectory of the study. Ledger
`en-019ffd07-7549-7d12-a618-3b985e5155fa` ran RecordCapture → TakeDirection →
ReadDesignRules → AuthorLanguage → RenderSurfaces → LookAtLanding /
LookAtEmbodiment / LookAtDashboard → FixSurfaces (1 round) → RenderSurfaces →
three Looks again → SubmitLanguage → CompleteSynthesis, ending Idle with all
15 authoring/look booleans true. DesignLanguage
`en-019ffd07-2349-7e22-94f5-174852213c0b` ("Keyblock", slug `keyblock`) is
UnderReview. Nothing was published. Artifacts (landing, embodiment, dashboard,
DESIGN.md lint-clean 0/0, shadcn registry-theme/components/preview-shots,
600x400 thumbnail, generated ukiyo-e hero, 9 viewport screenshots) live in
`docs/study/artifacts/keyblock/`.

## Finding 1 — the persisted-field guard contract extends to `ReadDesignRules`

`ReadDesignRules` declares `params = ["design_language_id"]`, but its
`cross_entity_state` guard resolves from persisted state only — the third
instance of the contract recorded for `TakeQuery` (b1af172c) and
`TakeDirection` (prior session). A ledger in ReadingDirection sent
`ReadDesignRules` with the id in the payload is refused:

```
{"error":{"code":"ActionFailed","message":"Action 'ReadDesignRules' blocked from state 'ReadingDirection': guard cross_entity_state on 'design_language_id' requires DesignLanguage status in [Draft], found <unsatisfied>"}}
```

Consequence: a synthesize ledger needs **five** ids at create time —
`job_id`, `held_job_id`, `query_id`, `direction_id`, and a
`design_language_id` pointing at a Draft DesignLanguage created *before* the
ledger. Two ledgers were burned learning the exact set
(`en-019ffd05-4aec…` without held_job_id, `en-019ffd06-0548…` without
design_language_id); the third passed the whole chain first try.

## Finding 2 — empty-string ids are vacuous truth; that is what makes this server workable

`resolve_cross_entity_guards` (temper-server `state/dispatch/cross_entity.rs`)
returns guard-pass for an **empty** id field ("Empty string: vacuous truth")
and for an **empty list**; a non-empty id whose entity type is not deployed
resolves to false. The TOML parser ignores the `required = true/false`
attribute entirely — every cross_entity_state guard is enforced the same way.

On this isolated server (no `File`/`Workspaces` entity sets),
`DesignLanguage.SubmitForReview`'s eight File guards are therefore satisfiable
**only** with empty file-id fields. `SubmitDesignLanguage` was called with the
full spec payload and every `*_file_id` as `""`: SubmitForReview then
transitioned Draft → UnderReview legally. A catch-22 is latent here: attaching
real file ids on a Files-less server would make SubmitForReview permanently
unsatisfiable.

## Finding 3 — the typed CompleteSynthesis guard cannot resolve a JSON-string list

`CurationJob.CompleteSynthesis` guards
`cross_entity_state on design_language_ids` (required UnderReview/Published),
and the spec comment claims "entity_id_source is a JSON-list param; the
cross_entity_state resolver holds the required_status per id across the
list." The runtime resolver only does that for **native JSON arrays**
(`field_value.as_array()`); a JSON-*encoded string* `"[\"en-…\"]"` — the exact
shape the synthesize-language skill mandates (`json.dumps`) and the shape the
finalizer's own `string_array_flexible` parses happily — falls to the scalar
branch, is treated as one entity id, fails the lookup, and the guard reports
`<unsatisfied>`. Once the string-shaped field is persisted, the typed
completion is permanently blocked:

```
{"error":{"code":"ActionFailed","message":"Action 'CompleteSynthesis' blocked from state 'Running': guard cross_entity_state on 'design_language_ids' requires DesignLanguage status in [UnderReview,Published], found <unsatisfied>"}}
```

Spec, skill, and kernel disagree on the list shape: the skill says
`json.dumps`, the WASM accepts both, the kernel guard accepts only native.

## Finding 4 — the finalizer trigger reads pre-action entity state

The **first** `CompleteSynthesis` (design_language_ids not yet persisted)
passed its guard vacuously (empty-field rule, Finding 2) and reached
Finalizing. The `finalize_spawned_session` WASM then read
`ctx.entity_state.fields` **without** the params that very action carried, and
failed the job 28ms later with
`missing_design_language_ids: "synthesize completed without design_language_ids"`
— although the field shows persisted on the entity afterwards. The trigger
context is the pre-action snapshot; params set by the completing action are
invisible to the finalizer it triggers on first dispatch.

## Finding 5 — legal completion via the legacy path and the Finalizing window

With the typed path blocked (Finding 3), the legacy `Complete` action
(`from = ["Running"]`, params `["output"]`, no design-language guard, same
finalizer trigger) moved the job Running → Finalizing. The finalizer this time
found the ids (persisted string field, parsed by `string_array_flexible`),
loaded the language, and failed ~100ms later on its file gates — 10×
`missing_required_field` for the empty `*_file_id` fields, the structural
no-Files-plane gap:

```
{"contract":"katagami.finalizer.verification.v1","code":"missing_required_field","message":"10 gates failed — fix ALL of them in one run: [missing_required_field] Entity 'en-019ffd07-2349…' is missing required field 'embodiment_file_id'; …","repairable":true}
```

The CuratorAgent's `CompleteSynthesis` guard admits CurationJob in
`[Finalizing, Completed]`. A retry loop (20ms cadence) landed the ledger
completion on attempt 5, inside the Finalizing window, before the finalizer's
Fail — a legal transition under the guards as written. The job then finished
Failed, and `job_failure_fails_direction` dragged the direction
`en-019ffd04-a739…` to Failed — the same propagation class as the engine-spawn
404 finding, now caused by the finalizer's artifact gates instead.

Structural consequence: on a Files-less server the synthesize lane can produce
a complete curator trajectory and an UnderReview language, but **no synthesize
job can ever reach Completed** — the finalizer's artifact gates require file
ids that Finding 2's catch-22 forbids. The study either accepts Failed jobs
with complete trajectories, deploys a Files entity set, or stubs the finalizer.

## Session ledger state

- `en-019ffd05-4aec-7fe2-b6f9-949858c76cd4` — Idle, capture recorded; refused
  TakeDirection (no held_job_id persisted).
- `en-019ffd06-0548-7342-b0d2-fee702f0fb2b` — ReadingDirection, capture
  recorded; refused ReadDesignRules (no design_language_id persisted).
- `en-019ffd07-7549-7d12-a618-3b985e5155fa` — **Idle, complete trajectory**:
  all 15 booleans true, revision_rounds 1, language_submitted true.

DesignLanguage `en-019ffd07-2349-7e22-94f5-174852213c0b` UnderReview.
No publish, no ApprovePublish, no quality review — per scope.
