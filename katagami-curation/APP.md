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
- `quality_review` — Validate DESIGN.md, derive shadcn/ui export, author/verify shadcn/ui component recipes and preview shots, fix embodiment fidelity against the spec, then publish
- `organize_taxonomy` — Taxonomy maintenance and cross-referencing
- `regenerate_embodiment` — Rebuild embodiment HTML for an existing language
- `evolve_language` — Create a child DesignLanguage from a parent
- `taste_distillation` — Propose taste rules from archived and featured language signals

### CurationDirection

One researched direction created by a `source_search` job. `QueueSynthesis`
uses a reaction to create and submit the matching `synthesize`
CurationJob.

### CurationJobTemplate

Active job configuration for session bootstrapping. Templates map job types to
skills, instruction paths, tool profiles, sandbox needs, and typed completion
actions.

### TasteRule

Human-approved taste guidance distilled from the catalog. `Proposed` rules are
created by `taste_distillation`; only `Accepted` rules are loaded by synthesis
and quality-review jobs.

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

`source_search` -> `CurationDirection` fan-out -> `synthesize` -> `quality_review` -> `organize_taxonomy` -> Completed

Each job spawns an agent session through a small WASM runtime bridge.
`build_session_message` reads `CurationJobTemplate` records, loads the
referenced skill and knowledge files from TemperFS, and creates temperpaw
sessions. Follow-up jobs and parent-query transitions are declared as Temper
reactions. `finalize_spawned_session` records session results for typed jobs,
keeps a legacy completion path for already-running old sessions, and contains
an idempotent fallback while the temperpaw OS app installer catches up to app
reaction loading.
