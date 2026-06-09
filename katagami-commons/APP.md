# katagami-commons

Core data layer for the Katagami Design Language Commons. Stores design
languages, palette systems, art styles, design elements, design sources,
taxonomy, and the element manifest.

## Entity Types

### DesignLanguage

A complete design language with structured spec (Philosophy, Tokens, Rules, LayoutPrinciples, Guidance), a self-contained HTML embodiment rendering all canonical elements, a generated DESIGN.md artifact for portable agent handoff, a shadcn/ui registry theme projection for component-first apps, and first-class shadcn/ui component recipes plus preview-shot manifests.

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

### PaletteSystem

A portable color system for remix lanes. Stores signature colors, neutral and
semantic roles, proof scenes, token projections, usage guidance, source links,
thumbnail evidence, and publication verification flags.

**States:** `Draft` -> `UnderReview` -> `Published` -> `Archived`

### ArtStyle

A portable image-style recipe for remix lanes. Stores medium, prompt template
with `{subject}` and `{palette}` holes, negative prompt, engine hints, slot
recipes, usage guidance, preview evidence, and publication verification flags.

**States:** `Draft` -> `UnderReview` -> `Published` -> `Archived`

### ElementManifest

Defines the canonical set of ~75 UI elements that every design language must render. Versioned and evolvable.

**States:** `Draft` -> `Active` -> `Superseded`

### Taxonomy

Agent-maintained hierarchical classification of design movements and schools.

**States:** `Draft` -> `Published` -> `Archived`

## Storage Model

Entity metadata lives in Temper entities. Hot operational state should remain
small and queryable. Large governed artifacts (embodiment HTML, generated
DESIGN.md files, shadcn/ui registry themes, shadcn/ui component recipes,
shadcn/ui preview-shot manifests, published snapshots, and operator-requested source archives)
live in paw-fs File entities referenced by `FileId` fields. Source-search jobs
must not synchronously write every fetched page to paw-fs; they store compact
source summaries/excerpts in `DesignSource.Metadata` and leave `FileId` empty
until a later archival step creates a governed artifact.

## Integration with katagami-curation

DesignSources are created by bootstrap agent `source_search` jobs.
DesignLanguages are synthesized by `synthesize` jobs and quality-reviewed before
taxonomy organization. Multi-lane remix jobs use `synthesize_palette` to publish
PaletteSystem records and `synthesize_art_style` to publish ArtStyle records as
terminal lanes after deterministic finalizer verification.
