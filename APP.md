# katagami-curation

Agent work layer for the Katagami Design Language Commons. Provides a
CurationJob queue, template-owned session bootstrapping, and Temper-native
curation workflow triggers.

## Entity Types

### CurationJob

Trackable unit of work for curator agents. It owns session spawning fields and
typed completion actions. Follow-up jobs that require dedupe are created by
the validator-gated finalizer; parent-query transitions are declared as
validated Temper reactions.

**States:** `Queued` -> `Ready` -> `Running` -> `Finalizing` -> `Completed` | `Failed`

**Job Types:**
- `source_search` — Research design movements and index compact authoritative source metadata
- `synthesize` — Create DesignLanguage specs with embodiments and first-class shadcn/ui component artifacts
- `quality_review` — Validate DESIGN.md, derive shadcn/ui export, author/verify shadcn/ui component recipes and preview shots, fix embodiment fidelity against the spec, then publish
- `organize_taxonomy` — Taxonomy maintenance and cross-referencing
- `regenerate_embodiment` — Rebuild embodiment HTML for an existing language
- `evolve_language` — Create a child DesignLanguage from a parent
- `taste_distillation` — Propose taste rules from archived and featured language signals

### CurationDirection

One researched direction created by a `source_search` job. The
validator-gated source-search finalizer creates and records the matching
`synthesize` CurationJob, then `QueueSynthesis` marks the direction state.

### CurationJobTemplate

Active job configuration for session bootstrapping. Templates map job types to
skills, instruction paths, tool profiles, sandbox needs, and typed completion
actions.

### TasteRule

Human-approved taste guidance used by synthesis and quality-review jobs.
Rules can be created by `taste_distillation` from catalog signals or extracted
from already-approved Katagami foundation docs. Only `Accepted` rules are
loaded by synthesis and quality-review jobs.

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

`source_search` -> validated finalizer fan-out -> `CurationDirection` state tracking -> `synthesize` -> `quality_review` -> `organize_taxonomy` -> Completed

Each job spawns an agent session through a small WASM runtime bridge.
`build_session_message` reads `CurationJobTemplate` records, loads the
referenced skill and knowledge files from TemperFS, and creates temperpaw
sessions.

Typed completion actions are completion attempts. They move a job into
`Finalizing`, where `finalize_spawned_session` validates the explicit contract
for that job type before any parent-query advancement is allowed. If validation
finds repairable defects such as missing `thumbnail_file_id`, invalid image
bytes, missing `design_language_ids`, or missing shadcn artifacts, the finalizer
emits `RepairRequired` and re-enters the same CurationJob with the existing
artifact IDs and defect list. The agent then repairs the partial work in place.

Validated internal completion actions advance the parent query only after the
contract passes. Follow-up creation that needs dedupe remains in the finalizer;
single-target state transitions are declared as validator-gated Temper
reactions.
