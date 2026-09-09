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

## Keep focus inside the camera viewport

**Decision:** Use a clipped canvas viewport so native focus cannot scroll transformed world coordinates.

**Came up because:** Live phone and desktop verification showed that focusing cards could scroll an overflow-hidden container and move its toolbar despite the page staying still.

**Options:** Reset scroll positions after focus; prevent the canvas from being an HTML scroll container.

**Chose clipping because:** Camera state remains the sole navigation mechanism without corrective scroll handlers. Search results and readers retain independent scrolling.

**Where:** ui/src/components/encyclopedia/map.css; PR #292.

## Keep record inspection readable

**Decision:** While related records are explicitly opened, suppress topic connectors and use a larger minimum record target; restore connectors when records close.

**Came up because:** Live phone verification showed topic relation labels crossing the opened record ring.

**Options:** Fade the graph; preserve every overlapping connector; temporarily show the connectors relevant to the open records.

**Chose relevant connectors because:** It removes competing labels without fogging cards or changing saved branch expansion. Larger records require panning instead of fitting the entire ring onto a phone.

**Where:** ui/src/components/encyclopedia/encyclopedia-map.tsx; PR #292.

## Stop computing unused full-graph geometry

**Decision:** Remove the server layout calculation and serialized seed from this route after switching its renderer to explicit disclosure.

**Came up because:** The old seed was no longer consumed, yet the route still calculated it on cold graph loads.

**Options:** Keep calculating unused geometry; remove the unused call and prop.

**Chose removal because:** It avoids unnecessary computation and payload without changing the cached production content read.

**Where:** ui/src/app/(site)/encyclopedia/page.tsx; PR #292.
