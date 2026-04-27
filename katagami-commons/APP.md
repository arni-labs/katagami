# katagami-commons

Core data layer for the Katagami Design Language Commons. Stores design languages, design elements, design sources, taxonomy, and the element manifest.

## Entity Types

### DesignLanguage

A complete design language with structured spec (Philosophy, Tokens, Rules, LayoutPrinciples, Guidance), a self-contained HTML embodiment rendering all canonical elements, and a generated DESIGN.md artifact for portable agent handoff.

**States:** `Draft` -> `UnderReview` -> `Published` -> `Archived`

Lineage tracking: originals, single-parent evolutions, multi-parent remixes. Every design language knows its ancestry via `ParentIds` and `LineageType`.

### DesignElement

One canonical element within one DesignLanguage. Created from the ElementManifest when a DesignLanguage is drafted. Ensures every language renders the same standardized set.

**States:** `Pending` -> `Rendered` -> `Verified` | `Failed`

### DesignSource

Research references (articles, style guides, design system docs) about design
movements. Source-search jobs index compact metadata, topics, summaries, and
short excerpts synchronously. Full source-page archival is deferred so research
does not block on governed file writes.

**States:** `Submitted` -> `Indexed` | `Failed`

### ElementManifest

Defines the canonical set of ~75 UI elements that every design language must render. Versioned and evolvable.

**States:** `Draft` -> `Active` -> `Superseded`

### Taxonomy

Agent-maintained hierarchical classification of design movements and schools.

**States:** `Draft` -> `Published` -> `Archived`

## Storage Model

Entity metadata lives in Temper entities. Hot operational state should remain
small and queryable. Large governed artifacts (embodiment HTML, generated
DESIGN.md files, published snapshots, and operator-requested source archives)
live in paw-fs File entities referenced by `FileId` fields. Source-search jobs
must not synchronously write every fetched page to paw-fs; they store compact
source summaries/excerpts in `DesignSource.Metadata` and leave `FileId` empty
until a later archival step creates a governed artifact.

## Integration with katagami-curation

DesignSources are created by bootstrap agent `source_search` jobs. DesignLanguages are synthesized by `synthesize` jobs. Quality reviews are handled by curator agent `review` jobs.
