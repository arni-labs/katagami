# katagami-curation

Agent work layer for the Katagami Design Language Commons, following the koto-wiki pattern. Provides a CurationJob queue that orchestrates bootstrap and curator agent sessions.

## Entity Types

### CurationJob

Trackable unit of work for agents. Structurally identical to koto-wiki's WikiJob — same states, same session-spawning fields, same WASM triggers. Will be refactored into a shared core later.

**States:** `Queued` -> `Ready` -> `Running` -> `Completed` | `Failed`

**Job Types:**
- `source_search` — Research design movements, store authoritative sources
- `synthesize` — Create DesignLanguage specs from indexed sources
- `generate_embodiment` — Render all canonical elements for a design language
- `review` — Quality check: spec completeness, embodiment fidelity
- `organize` — Taxonomy maintenance, cross-referencing
- `evolve` — Create child DesignLanguage from parent
- `remix` — Create child from multiple parents

## Agents

### Bootstrap (`agents/bootstrap/AGENT.md`)
Handles `source_search` and `synthesize` jobs. Researches via web search, evaluates sources, creates DesignSource entities. Synthesizes DesignLanguage specs from sources, generates HTML embodiments.

### Curator (`agents/curator/AGENT.md`)
Handles `review`, `organize`, and `lint` jobs. Evaluates quality, maintains taxonomy, cross-references. The quality gate — nothing gets Published without curator approval.

## Pipeline

`source_search` -> `synthesize` -> `review` -> Published

Each job spawns an agent session via WASM integration. `build_session_message` constructs the prompt, `finalize_spawned_session` processes results back into entity actions.
