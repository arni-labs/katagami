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
- `synthesize` — Create DesignLanguage specs with embodiments
- `quality_review` — Validate DESIGN.md, fix embodiment fidelity against the spec, then publish
- `organize_taxonomy` — Taxonomy maintenance and cross-referencing
- `regenerate_embodiment` — Rebuild embodiment HTML for an existing language
- `evolve_language` — Create a child DesignLanguage from a parent

### CurationDirection

One researched direction created by a `source_search` job. `QueueSynthesis`
uses a reaction to create and submit the matching `synthesize`
CurationJob.

### CurationJobTemplate

Active job configuration for session bootstrapping. Templates map job types to
skills, instruction paths, tool profiles, sandbox needs, and typed completion
actions.

## Agents

### Curator (`agents/curator/AGENT.md`)

Handles all active curation job types. Researches sources, creates
DesignSource and CurationDirection entities, synthesizes DesignLanguage specs,
repairs embodiments, and maintains taxonomy. The quality gate keeps generated
languages out of `Published` until embodiment review and DESIGN.md validation
both pass.

`source_search` is a hot operational workflow. It should create DesignSource
and CurationDirection entities synchronously, but it must not write every
fetched source page into paw-fs while the job is waiting. Full source archival
belongs in a later artifact step.

## Pipeline

`source_search` -> `CurationDirection` fan-out -> `synthesize` -> `quality_review` -> `organize_taxonomy` -> Completed

Each job spawns an agent session through a small WASM runtime bridge.
`build_session_message` reads `CurationJobTemplate` records, loads the
referenced skill and knowledge files from TemperFS, and creates OpenPaw
sessions. Follow-up jobs and parent-query transitions are declared as Temper
reactions. `finalize_spawned_session` records session results for typed jobs,
keeps a legacy completion path for already-running old sessions, and contains
an idempotent fallback while the OpenPaw OS app installer catches up to app
reaction loading.
