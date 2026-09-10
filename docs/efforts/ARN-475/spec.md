# Spec: Encyclopedia navigation and clarity
Status: accepted. Intent: docs/efforts/ARN-475/intent.md

## Requirements

1. The canvas owns its gestures. A wheel, trackpad or touch gesture over the map pans or zooms the map and never scrolls the document. The reader sheet scrolls itself and contains its overscroll.
2. Expansion is explicit and per branch. What is on the paper is a set of open nodes: each map's category node, the top-level cells opened under it, the narrower cells opened under those. A click on a card focuses it and opens its first group of narrower cells; a click on the card in focus folds them. A category node opens and folds on click. A "+N" node at the end of a ring opens the next group. Groups are ten.
3. Zoom changes detail only. How much of a card is drawn depends on the size it prints at, per card; zooming never opens or closes anything.
4. A cell's layer is its depth in the hierarchy, and each layer draws smaller than the one above, to a floor at depth three.
5. Each populated map has a category node at the middle of its cluster, showing the faces of its most prominent cells, its count, and how many of its top-level cells are open. A cell on more than one map carries the other map's mark; the map filter frames every open cell on that map wherever it sits, and dims only cells not on it.
6. Nothing is fogged. The scrim and the neighbour fade are gone; the map filter and an opened ring of records step the rest of the paper back to 0.35, never lower.
7. A cell's picture is a visual reference and carries no tag saying where it came from. The sheet says which record it is.
8. Lines carry no words. The arrowhead says which end is narrower, the ink says the relation family, the legend says what the inks mean, and hovering a line shows its word and explanation as a tooltip. Strokes are 0.9px at any zoom.
9. A record node always says what it is (its set's word and a hairline of its ink); its name joins at reading size. Clicking a record node opens it in place into a card with the picture, set and status, the record's own line, why the cell names it, which other cells name it, a fold control, and a button to the record's page in a new tab. The node never navigates on its own.
10. A record named by several open cells is one node, joined to each, with a "+N" mark; the sheet lists the other cells that name it.
11. Cards, category nodes and record nodes can be dragged. A card moves with everything open under it; a record node moves on its own and with its cell.
12. Type on the canvas, the sheet and the phone browser is small and light: sheet prose 12px, headings 12.5px, titles 20px semibold; card names 14px semibold, scope 10.5px; chrome chips 11px medium.
13. A cell reached by search, by URL or from the phone browser is put on the paper with the chain above it open and paged far enough to include it.
14. The phone keeps its browser view; the map is one tap away and the same expansion model applies.

## Design

The map is a pure function of two things: the graph and an expansion state (`expansion.ts`: open set plus a per-node count). `computeVisible` walks down from the category nodes and yields the open cells, what each open node shows, and how many it hides. `layoutVisible` (`graph-layout.ts`) lays out only that set: each map's cluster is rings of open cells around its category node, each open cell's narrower cells are rings around it on the side away from what it hangs from, and a ring is as wide as what sits on it, so nothing overlaps and the paper is the size of what is open. Reader drags are offsets keyed by node id on top of that layout, applied to a node and its open subtree. Cards (`map-cards.tsx`) draw by `k × scale` and are memoised so a pan costs no card work. The server-side force settle over the whole library and its cache (`encyclopedia-layout.ts`) are removed.

## Policy / invariants

- The page stays owner-gated; the lab preview flag opens it only in development builds.
- The library read stays behind the held, request-blind cache (ARN-118 D69); nothing here reads request state.
- The layout is deterministic: the same graph and expansion give the same positions.
- No overlap among open cards, records and category nodes, asserted in `encyclopedia-layout.test.mjs` for the opening view, one opened branch, and everything opened.

## Deferred / out of scope

- Persisting drags across sessions.
- Motion when siblings shift as a branch grows.
- A read-only focus that does not open the cell's first group.
- Depth, perspective and 3D treatment of the field.
- Data curation: cells with no studies, four records all credited "French Impressionism", cells with more than ten narrower cells and no intermediate cell.
