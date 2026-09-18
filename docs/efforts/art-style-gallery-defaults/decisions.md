# Decisions

## Keep the example gallery separate from portability proof

**Decision:** A multi-image example set owns the visible gallery; portability proofs remain validation evidence and provide the legacy fallback.

**Came up because:** Morrow Ink has four attached examples, but the selector prefers proof images whenever any are present.

**Options:** Keep replacing examples with proof, merge both sets into an unpredictable image count, or display the curated examples with a proof fallback for records without a multi-image example set.

**Chose the curated examples with fallback because:** It preserves the requested gallery size and varied subjects without discarding proof evidence or breaking legacy records.

**Where:** `ui/src/lib/art-style-prompt-state.ts` and its regression test.
