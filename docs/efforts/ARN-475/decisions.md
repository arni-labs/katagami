# Decisions

## Explicit disclosure determines geometry

**Decision:** Lay out only explicitly revealed topics using the existing card renderer and reader.

**Came up because:** The accepted baseline reveals graph layers globally as the camera zooms, which conflicts with the user’s request to control individual branches.

**Options:** Keep global zoom-based layers; filter the precomputed full graph without regrouping; project a bounded graph from explicit expansion state.

**Chose the explicit projection over the alternatives because:** It keeps branch membership independent of zoom and avoids large empty gaps left by hidden nodes. The tradeoff is that expanding a branch can reposition its neighborhood; the camera refocuses the selected topic. The existing route, cards, reader, spatial culling, and Browse mode remain.

**Where:** ui/src/components/encyclopedia/disclosure.ts; ui/src/components/encyclopedia/encyclopedia-map.tsx; PR #292.

## Topic studies define topic faces

**Decision:** Show a topic’s own study material on its card; expose connected records explicitly as related records.

**Came up because:** The user reported that Impressionism appeared to use a connected art style’s photograph as its defining image.

**Options:** Keep falling back to related thumbnails; label that fallback; use only study representations for topic faces.

**Chose study representations over thumbnail fallback because:** The card should not imply that an associated work defines the topic. Topics without studies show their names and an honest absence label; existing related material remains in the reader and can be opened on the map.

**Where:** ui/src/components/encyclopedia/material.ts; PR #292.

## Reveal connections in groups of eight

**Decision:** Initially reveal eight entries or connections, with a control to reveal more.

**Came up because:** Category and topic fan-out can overwhelm the viewport even after global automatic expansion is removed.

**Options:** Reveal every child; reveal one child; reveal a bounded group with an explicit continuation.

**Chose bounded groups because:** They make expansion useful without dumping an entire collection into the canvas. Eight is an implementation choice to evaluate in the feedback preview, not a user-prescribed number.

**Where:** ui/src/components/encyclopedia/disclosure.ts; PR #292.

## Keep this deliverable as a local feedback iteration

**Decision:** Preserve 3D and rotation as open design options while implementing the latest navigation corrections first.

**Came up because:** The user’s latest feedback explicitly requests these fixes before another round, and rejects restarting the existing encyclopedia.

**Options:** Add a new 3D renderer now; refine the accepted existing map first.

**Chose the existing map because:** It addresses the accepted immediate problems and gives the user a concrete version to assess before committing to a larger spatial change.

**Where:** docs/efforts/ARN-475/feedback.md; PR #292.
