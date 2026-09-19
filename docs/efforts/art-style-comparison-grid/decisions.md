# Decisions

## Show existing comparison outputs alongside examples

**Decision:** Display eligible proof images in the detail gallery even when multiple curated references exist.
**Came up because:** GH-323 selected references instead of comparisons, hiding Morrow's Nano Banana and Seedream outputs.
**Options:** Keep references-only selection; show a combined labeled grid.
**Chose a combined labeled grid because:** Users can inspect the complete style and compare models without generating replacement assets. Unverified private proof remains hidden.
**Where:** ui/src/lib/art-style-prompt-state.ts and the art-style detail page.
