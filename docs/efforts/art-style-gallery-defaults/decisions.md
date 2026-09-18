# Decisions

## Keep the example gallery separate from portability proof

**Decision:** A multi-image example set owns the visible gallery; portability proofs remain validation evidence and provide the legacy fallback.

**Came up because:** Morrow Ink has four attached examples, but the selector prefers proof images whenever any are present.

**Options:** Keep replacing examples with proof, merge both sets into an unpredictable image count, or display the curated examples with a proof fallback for records without a multi-image example set.

**Chose the curated examples with fallback because:** It preserves the requested gallery size and varied subjects without discarding proof evidence or breaking legacy records.

**Where:** `ui/src/lib/art-style-prompt-state.ts` and its regression test.

## Require six display images independently of portability proof

**Decision:** New and revised styles must supply four GPT Image 2.5 images, one Grok Image and one Nano Banana image as a six-item gallery.

**Came up because:** Rita explicitly confirmed “6 total” and requested the rule in skills and finalizers for every future style.

**Options:** Leave the count as an informal prompt, replace the compact portability proof, or add validation to the existing reference manifest and keep proof independent.

**Chose validation of the existing reference manifest because:** The public-asset publisher already owns those files, and portability proof answers a different cross-model transfer question. No new entity or orchestration service is needed.

**Where:** MCP gallery input, finalizer gallery validation, canonical contribution and synthesis skills, and Stack contributor skill.
