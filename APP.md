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
- `synthesize_art_style` — Create one ArtStyle lane with subject/palette prompt holes, negative prompts, engine hints, slot recipes, guidance, and preview evidence
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

`CurationQuery.output_type` is explicit. `launch_research` infers it from the
query text when it is `auto`, records the normalized value, and passes it to
`source_search`. `source_search` persists that lane on every
`CurationDirection`, so palette and art-style requests never enter the
DesignLanguage worker by accident.

`source_search` -> `CurationDirection(output_type=design_language, synthesis_job_type=synthesize)` fan-out -> `synthesize` -> `quality_review` -> `organize_taxonomy` -> Completed

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
