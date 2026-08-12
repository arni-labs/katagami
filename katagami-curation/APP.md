# katagami-curation

Agent work layer for the Katagami Design Language Commons. Provides a
CurationJob queue, template-owned session bootstrapping, and Temper-native
curation workflow triggers.

## Entity Types

### CurationJob

Trackable unit of work for curator agents. It owns session spawning fields and
typed completion actions; follow-up jobs and parent-query transitions are
declared as Temper reactions.

**States:** `Queued` -> `Ready` -> `Running` -> `Finalizing` -> `Completed` | `Failed`

**Job Types:**
- `source_search` — Research design movements and index compact authoritative source metadata
- `synthesize` — Create DesignLanguage specs with embodiments and first-class shadcn/ui component artifacts
- `synthesize_palette` — Create one PaletteSystem lane with signature colors, proof scenes, portable tokens, usage guidance, thumbnail evidence, and deterministic finalizer checks
- `synthesize_art_style` — Create one ArtStyle lane with a paste-ready model-agnostic aesthetic prompt, optional examples, source/rights review, and reference-free proof across multiple image models and source media
- `quality_review` — Validate DESIGN.md, derive shadcn/ui export, author/verify shadcn/ui component recipes and preview shots, fix embodiment fidelity against the spec, then publish
- `organize_taxonomy` — Taxonomy maintenance and cross-referencing
- `regenerate_embodiment` — Rebuild embodiment HTML for an existing language
- `evolve_language` — Create a child DesignLanguage from a parent
- `taste_distillation` — Propose taste rules from archived and featured language signals

### CurationDirection

One researched direction created by a `source_search` job. `QueueSynthesis`
uses `output_type` plus `synthesis_job_type` to create and submit the matching
lane job: `synthesize`, `synthesize_palette`, or `synthesize_art_style`.

### CurationJobTemplate

Active job configuration for session bootstrapping. Templates map job types to
skills, instruction paths, tool profiles, sandbox needs, and typed completion
actions.

### TasteRule

Human-approved taste guidance used by synthesis and quality-review jobs.
Rules can be created by `taste_distillation` from catalog signals or extracted
from already-approved Katagami foundation docs. Only `Accepted` rules are
loaded by synthesis and quality-review jobs.

### CuratorAgent

The synthesis protocol one curator run must conform to (ARN-294). Self-review
precedes submission, submission happens at most once, submitted work is already
`UnderReview` on the entity side, and Publish is not in the actor's alphabet —
all four by construction rather than by convention. `jobs_in_flight` is guarded
at 10 concurrent claims, the standing batch cap.

Produced entities are recorded as they land (`RecordDesignLanguage`,
`RecordArtStyle`, `RecordPaletteSystem`, `RecordWritingStyle`), and there is one
submit action per lane (`SubmitDesignLanguages`, `SubmitArtStyles`,
`SubmitPaletteSystems`, `SubmitWritingStyles`), mirroring CurationJob's lane
completions. Each submit guards its own id list with `cross_entity_state`, so
the artifact requirements are read off the entity graph — reaching `UnderReview`
means that entity's own `SubmitForReview` guard already proved DESIGN.md,
embodiment, landing, thumbnail, proof shots, or corpus, depending on the lane —
plus an `is_true has_<lane>_ids` guard, because the kernel treats a cross-entity
guard over an empty list as vacuous truth and "produced nothing" must not read
as "everything is fine".

**States:** `BriefReceived` -> `Drafting` -> `SelfReviewed` -> `Submitted`,
with `Abandoned` for a run that gives up or stalls.

### ReviewAgent

One machine review of one curator submission. `RecordVerdict` is what unlocks
the human publish path: `HumanCurator.Publish` is guarded on the ReviewAgent it
names having reached `VerdictRecorded`, and on that reference being present
(`required = true` — the kernel resolves a cross-entity guard over an ABSENT ref
as vacuously true, so without it an assignment that never linked a review
published as though one had happened).

What the guard does **not** check is that the linked review reviewed THIS
submission. The kernel can compare a related entity's status, not its fields, so
any ReviewAgent that has recorded a verdict satisfies it. `AssignSubmission`
records `reviewed_submission_ids` from that record so a mismatch is at least
visible to a reader and to a conformance judge; turning it into a gate needs a
field-equality guard in the kernel. Until then it is the caller's obligation,
caught in review rather than by construction.

**States:** `SubmissionReceived` -> `Reviewing` -> `VerdictRecorded`, with
`Abandoned` for a review that gives up or stalls.

### HumanCurator

The publishing ROLE — never a person. Identity lives on `Member`; this record
points at the current holder through an opaque `assignee_ref` carrying that
holder's principal id. Publish and ReturnWithCritique are closed to every agent
principal in `policies/human_curator.cedar` — by the principal's TYPE, so an
agent cannot shed the rule by omitting the optional `x-temper-agent-type`
header — and bound to the assignment's own holder
(`principal.id == resource.assignee_ref`), so one named human answers for the
decision rather than any authenticated human at all.

The artifact-side boundary is a different thing and worth stating plainly:
`katagami-commons/policies/design_language.cedar` and `art_style.cedar` forbid
contributor agents from publishing the artifacts, and — since ARN-319 — from
advancing a DesignLanguage to review either. `SubmitForReview` used to be
refused only by the state machine, which is a 409 rather than a 403 and leaves
no authorization record; it is now a denial for contributor principals and for
callers that declare nothing at all. The pipeline's own synthesize step is a
declared worker rather than a contributor, so it still drives its own draft to
review. Nothing machine-checks that
the DesignLanguage a human publishes is the one this assignment reviewed — the
two records are linked by convention through `submission_ids`, not by a guard.
Treat the artifact-side publish as governed by policy and process, not by
construction.
Both working states carry a 48h timeout onto `ReviewOverdue` -> `Escalated`, so
an assignment nobody picks up surfaces instead of stalling the queue.

**States:** `SubmissionAssigned` -> `Reviewing` -> `Published` |
`ReturnedWithCritique`; `Escalated` -> `SubmissionAssigned` on reassignment.

### TrajectoryVerdict

One judged trajectory at one layer. `layer = "deterministic"` records the
layer 1 result and is authoritative for everything rule-shaped; `layer = "llm"`
records the katagami-judge skill's taste, quality, and reasoning judgement,
which never overrides layer 1. Two layers means two rows, so a contradiction
stays visible instead of merged away.

Layer 1 is the kernel's conformance engine, `POST /api/conformance/check`. It
replays the governed dispatch rows the kernel recorded — what the platform
actually did, rather than what a transcript says the agent asked for.
`scripts/trajectory/conformance_check.py` is the offline fallback for when that
endpoint cannot be reached, and it tracks the kernel engine rather than drifting
into a second opinion.

Both endpoints the judge reads through — `POST /api/conformance/check` and
`GET /api/ots/trajectories/<id>/atif` — return one named run's recorded
content, so both require a Cedar permit for `read_trajectories` on `Trajectory`
in the addressed tenant, and neither carries the principal-kind bypass the
aggregate observe views keep: an Admin-kind caller no policy names is refused
like anyone else. `policies/trajectory.cedar` is that permit. It admits
`Agent::"katagami-judge"` and `Agent::"system"` and nobody else — not
contributors, not the reviewer role, not an agent that declares no type, not an
unauthenticated caller. Without it both endpoints answer 403 to every principal,
which is what they did until ARN-295.

A third endpoint asks Cedar for the same pair: `GET /observe/trajectories`, the
tenant-wide aggregate view (counts, per-action stats, recent failed entries).
That one still has the Admin/System principal-kind bypass, which is claimable
from a request header, so the permit is not what holds it open today — it
becomes the only thing holding it open for those two principals once ARN-255
removes the bypass. The view stays tenant-local for them either way: an
Agent-kind caller that sends no `X-Tenant-Id` is refused rather than handed the
cross-tenant view.

Neither engine claims more than it checked. Guards resolved against the entity
graph at dispatch time (`cross_entity_state`), evidence never captured, a read
that stopped at its row cap — all of it lands in `unverifiable` rather than
counting as satisfied, and `evidence_complete` is false whenever any of it
happened. `passed && evidence_complete` is the only pair that means a fully
checked conforming run.

**States:** `Pending` -> `Recorded` (terminal).

## Natural Language Operations

Operator and DM-facing agents should translate plain requests like "run taste
distillation", "distill Katagami taste", "learn from archived languages",
"derive anti-patterns", or "create suggested taste rules" into a
`taste_distillation` `CurationJob`. The default input is `{"limit":100}` and the
job must submit with `completion_contract = "typed-v1"` and
`inline_job_docs = true`.

This is an owner-reviewed learning loop: distillation creates `Proposed`
TasteRules and an evidence report only. It must not accept rules automatically.
The human owner reviews and accepts or rejects proposals from `/owner`.

## Agents

### Curator (`agents/curator/AGENT.md`)

Handles all active curation job types. Researches sources, creates
DesignSource and CurationDirection entities, synthesizes DesignLanguage specs,
repairs embodiments, and maintains taxonomy. The quality gate keeps generated
languages out of `Published` until embodiment review, DESIGN.md validation,
shadcn/ui registry theme verification, and agent-authored shadcn/ui component
recipe + preview-shot verification all pass.

`source_search` is a hot operational workflow. It should create DesignSource
and CurationDirection entities synchronously, but it must not write every
fetched source page into paw-fs while the job is waiting. Full source archival
belongs in a later artifact step.

## Pipeline

`CurationQuery.output_type` is explicit. When it is `auto`, the `source_search`
agent infers the concrete lane from the query text and records it on the query at
`CompleteResearch` (`ResearchComplete` carries `output_type`). `CurationQuery.Submit`
creates the `source_search` job via an inline entity trigger — there is no
`launch_research` WASM. `source_search` persists the inferred lane on every
`CurationDirection`, so palette and art-style requests never enter the
DesignLanguage worker by accident.

In the design_language lane each direction now runs its own per-direction
`quality_review` (a second opinion scoped to that one language), reached via
`Synthesizing -> Reviewing -> Completed`; the fan-out barrier opens only after every
direction has cleared review, and the single `organize_taxonomy` job is created once
at barrier-open. The synthesize agent drives its own `SubmitForReview` in-session
(the finalizer no longer owns that walk); an unfixable direction is `Quarantine`d,
which archives the half-built language and drains the barrier.

`source_search` -> `CurationDirection(output_type=design_language, synthesis_job_type=synthesize)` fan-out -> `synthesize` (agent self-heals to UnderReview) -> per-direction `quality_review` -> barrier-open -> `organize_taxonomy` -> Completed

Multi-lane remix work can also fan out into terminal palette and art-style
lanes:

`source_search` -> `CurationDirection(output_type=palette, synthesis_job_type=synthesize_palette)` fan-out -> `synthesize_palette` -> `CompletePaletteSynthesis` -> Completed

`source_search` -> `CurationDirection(output_type=art_style, synthesis_job_type=synthesize_art_style)` fan-out -> `synthesize_art_style` -> `CompleteArtStyleSynthesis` -> Completed

Palette and art-style lanes publish their commons entities directly after the
finalizer verifies required files, contrast/prompt contracts, and referenced
entity closure. They intentionally do not enter the language quality-review or
taxonomy cascade.

Each job spawns an agent session through a small WASM runtime bridge.
`build_session_message` reads `CurationJobTemplate` records, loads the
referenced skill and knowledge files from TemperFS, and creates temperpaw
sessions. Follow-up jobs and parent-query transitions are declared as Temper
reactions. `finalize_spawned_session` records session results for typed jobs,
keeps a legacy completion path for already-running old sessions, and contains
an idempotent fallback while the temperpaw OS app installer catches up to app
reaction loading.
