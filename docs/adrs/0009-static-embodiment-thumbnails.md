# ADR 0009: Static Embodiment Thumbnails

Date: 2026-05-05

## Status

Accepted for gallery performance.

## Context

Katagami gallery cards rendered live embodiment iframes so humans could see a
language's actual desktop application scene directly in the main catalog. That
kept previews faithful, but it made the gallery pay the full cost of many
independent browsing contexts: HTML fetches, font loads, layout, paint, and
iframe lifecycle churn while scrolling.

The UI already has separate artifact pointers for embodiments and thumbnails.
Embodiment HTML remains the durable source artifact for inspection and review,
while `thumbnail_file_id` can carry a derived preview image through the same
PawFS file plane used by the rest of Katagami's governed artifacts.

## Decision

Katagami gallery previews use static desktop screenshots.

- The main gallery reads `thumbnail_file_id` and renders it as a lazy image in
  the card preview slot.
- Gallery cards do not mount live embodiment iframes. Live embodiments remain
  available on intentional detail and comparison views.
- Thumbnails are generated from verified desktop embodiments at a fixed desktop
  viewport, initially `1440x960`, then exported to a card-friendly image size.
- `thumbnail_file_id` is the compatibility path. No new DesignLanguage schema
  field is required for v1.
- Missing thumbnails fall back to the existing lightweight palette/type
  placeholders so old rows remain browseable.
- Thumbnails are not a publish guard in v1. A missing or failed thumbnail must
  not block language publication while the backfill path is still being rolled
  out.
- Quality finalization verifies newly reviewed thumbnails before marking a
  language quality-passed. The finalizer requires a `thumbnail_file_id`, a
  readable `Files` entity, `image/jpeg` metadata, and non-text file content.
- Retroactive thumbnail generation must be idempotent and dry-run-first. Bulk
  backfill should list candidate languages before writing, skip existing
  thumbnails by default, and require an explicit force mode to replace them.

## Consequences

The main gallery becomes much cheaper to load and scroll because it displays
normal image resources instead of many independent embodiment documents.
Preview fidelity depends on the thumbnail generation path staying close to the
verified desktop embodiment, but the live embodiment remains the source of
truth for detailed inspection.

The tradeoff is another derived artifact to maintain. Regeneration and quality
review jobs should attach a fresh thumbnail after the embodiment is finalized,
and a later backfill can populate thumbnails for older languages without
rewriting the embodiment artifacts themselves.
