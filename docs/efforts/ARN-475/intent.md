# ARN-475 — Encyclopedia navigation and clarity

Improve the encyclopedia that already exists at `/encyclopedia`: evolve its
current UI, features, content and route. Do not build a replacement page.

Rita's consolidated feedback (2026-09-09), the requested iteration:

1. The canvas owns its navigation gestures. Scrolling must not move the page
   and the canvas together.
2. The interface is compact. Smaller type on the canvas and its controls is
   allowed; the room is for exploring.
3. Categories (Art, Writing, and the others with cells) are visual entry nodes
   that can be opened and zoomed into, placed where their cells are. A name and
   a count floating away from the cells is not enough.
4. Expansion is explicit and per branch, and independent of zoom. The reader
   opens a topic to see its narrower cells and folds it again. Zooming in
   reveals more detail within what is open; it never opens everything nearby.
5. No fogging. A card the reader has zoomed in on is never covered by a white
   overlay or dimmed into illegibility, and content is not obstructed by
   overlapping nodes.
6. A picture that belongs to a record the cell names (an art style, a design
   language) is shown as that record's, with the reason for the connection.
   It is never presented as the topic's own image.
7. Connections are legible: origin, destination and meaning are clear, and a
   record named by several cells is not drawn as several different things.
8. Verify in the existing route, run locally against the production backend,
   and show the result for another round of feedback. This iteration is a
   local build for feedback, not a deploy.

The wider vision — a fast, effectively infinite canvas with depth and a
sense of place, richer nodes, and possibly 3D — stays in view. This round is
navigation and clarity first.

Linear: ARN-475. Predecessor effort: ARN-118 (the encyclopedia itself).

Later the same day, after five rounds of feedback on the local build, Rita
instructed: "merge and deploy what we currently have." From that point the
effort's end state is the merged head deployed on Vercel and verified live
(plan.md step 7, D16).
