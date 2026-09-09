# Plan

1. Inspect the current encyclopedia and production data shape; preserve the current UI before restyling.
2. Sketch flat semantic map and dimensional graph interactions; select the simplest usable design.
3. Build pure progressive scene/layout helpers with tests for hierarchy, cycles, large branches, visibility and zoom.
4. Implement the canvas navigation and responsive chrome with readable HTML detail cards, mobile search, breadcrumb and child expansion.
5. Verify against real production reads locally, exercise desktop/mobile and measure the large fixture. Open the actual preview for Rita and record remaining limitations honestly.

## Feedback revision — preserve the established UI

Rita requires improvements to the existing /encyclopedia implementation, not a separate page or replacement card grid. Restore the existing map, cards, relation labels, minimap, record expansions, and reader. Add viewport culling and the frame-limited camera without dropping those features. Improve the focused card with actual mixed material, and compare optional depth against the straight-on view. Reverify production-backed local desktop and mobile behavior before the next feedback handoff. The uniform prototype remains in git history only.
