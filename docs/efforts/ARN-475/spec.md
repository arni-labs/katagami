# Encyclopedia navigation iteration

## Starting point

The accepted baseline is master f9cb4e4, replacing the rejected PR #292 iteration. Work remains in the isolated `codex/encyclopedia-ux` branch. Keep `/encyclopedia`, its reader, search, index, Browse mode, minimap, and existing content contract.

## Behavior

- The canvas owns pan, pinch, and wheel zoom; the page does not scroll with it. Readers scroll independently.
- Categories are visual entry nodes. Opening a category reveals a bounded group of topic entries.
- Opening a topic reveals a bounded group of its children and other connected topics. Expansion is stored per node, independent of camera zoom. Collapse hides that branch while preserving other paths to shared nodes.
- Zoom changes the detail of explicitly opened topics; it cannot change graph membership.
- Each topic has one graph identity, including shared children and cycles. Each opened related record has one identity based on its entity set and ID.
- Topic images and passages come from topic studies. Related records remain available but do not silently define a topic’s image.
- Focused cards remain opaque and legible. No white focus mask obscures neighboring topics.
- Compact typography follows the user’s explicit encyclopedia exception. Mobile opens on the canvas with Browse still available.

## Verification

Regression tests exercise expansion/collapse, cycles and shared paths, topic/record separation, record identity, and a canvas mounted after Browse. Run the existing encyclopedia suite, TypeScript, targeted lint, then use the real local frontend on desktop and mobile.

## Open design direction

Depth, immersive exploration, and possible 3D/rotation remain part of the vision. This iteration addresses navigation and clarity first. No rendering-library choice or production deployment is implied by the local feedback preview.
