# katagami-commons

Core data layer for the Katagami Design Language Commons. Stores design languages, design elements, design sources, taxonomy, and the element manifest.

## Entity Types

### DesignLanguage

A complete design language with structured spec (Philosophy, Tokens, Rules, LayoutPrinciples, Guidance) and a self-contained HTML embodiment rendering all canonical elements.

**States:** `Draft` -> `UnderReview` -> `Published` -> `Archived`

Lineage tracking: originals, single-parent evolutions, multi-parent remixes. Every design language knows its ancestry via `ParentIds` and `LineageType`.

### DesignElement

One canonical element within one DesignLanguage. Created from the ElementManifest when a DesignLanguage is drafted. Ensures every language renders the same standardized set.

**States:** `Pending` -> `Rendered` -> `Verified` | `Failed`

### DesignSource

Raw research material (articles, style guides, design system docs) about design movements. Follows the koto-wiki WikiSource pattern.

**States:** `Submitted` -> `Indexed` | `Failed`

### ElementManifest

Defines the canonical set of ~75 UI elements that every design language must render. Versioned and evolvable.

**States:** `Draft` -> `Active` -> `Superseded`

### Taxonomy

Agent-maintained hierarchical classification of design movements and schools.

**States:** `Draft` -> `Published` -> `Archived`

## Storage Model

Entity metadata lives in Temper entities. Large content (embodiment HTML, source text) lives in paw-fs File entities, referenced by `FileId` fields. This keeps entity payloads small.

## Integration with katagami-curation

DesignSources are created by bootstrap agent `source_search` jobs. DesignLanguages are synthesized by `synthesize` jobs. Quality reviews are handled by curator agent `review` jobs.
