# ADR-002: ArtStyle visuals must be OpenAI Codex image-generation outputs only

**Status:** Accepted
**Scope:** Katagami ArtStyle curation
**Author:** Paw
**Date:** 2026-06-15

## Context

Katagami ArtStyle curation routed correctly but published visuals could still look like procedural geometric previews. Product direction is stricter: ArtStyle curation should not use online visual sources or fallbacks. It should generate visuals through the platform's OpenAI Codex-authorized image generation capability.

## Decision

ArtStyle visual assets must have provenance `openai_codex_image_generation`.

Disallowed:

- online/source-backed images
- web-search images
- curated public visual references
- procedural previews
- SVG placeholders
- rasterized fallback compositions
- geometric placeholder art
- manual inline assets

If OpenAI Codex-authorized image generation is unavailable, the synthesis job must fail rather than publish an invalid artifact.

## Consequences

### Positive

- Published ArtStyles have clear image-generation provenance.
- No ambiguity between real generated art and procedural placeholders.
- The geometric fallback failure mode is blocked at the contract level.

### Negative

- ArtStyle synthesis depends on a working Codex-backed image-generation bridge.
- Jobs will fail until that capability is exposed to curation workers.
