# Plan: Encyclopedia navigation and clarity
Spec: docs/efforts/ARN-475/spec.md

## What we are addressing

The encyclopedia map at `/encyclopedia` revealed cells by zoom over a field settled for the whole library, so the far view was unreadable, zooming in opened everything nearby, the page scrolled under the canvas, cards were fogged behind a scrim, a record's picture was presented as the cell's own, the same record appeared as several nodes, and lines were labelled into noise. Rita asked for navigation and clarity first: the canvas owns its gestures, expansion is explicit per branch and independent of zoom, categories are visual entry nodes, nothing is fogged, imagery and connections are honest, and the whole thing is compact and delicate enough to hold a dense field.

## Approach

Make what is on the paper an explicit expansion state and lay out only that set, in the browser, on every change. Everything else follows: the far view is readable because it is the size of what is open; zoom can be detail-only because it no longer decides what exists; drags are offsets on a deterministic layout; and the chrome, lines and type are cut down to what the canvas needs.

## Steps

1. `expansion.ts`: open set, ten-per-group paging, `computeVisible`, `revealPath`; tests.
2. `graph-layout.ts`: replace the force settle with `layoutVisible` (nested rings over the open set, "+N" nodes, record rings on the box walk); delete `encyclopedia-layout.ts`; rewrite the layout tests around no-overlap on three expansion states.
3. `encyclopedia-map.tsx`: expansion state, per-card LOD, hub nodes, click-to-open and fold, document scroll lock, wheel guard on the live viewport, drag offsets with subtree propagation, shared-record dedupe, filter framing every open cell on the map, no scrim or fade, wordless thin lines with tooltips.
4. `map-cards.tsx`: hub card, plate without chips or picture tags, dual-map mark, record node with set word and in-place card expansion, "+N" node.
5. `focus-sheet.tsx`, `browse.tsx`, `chrome.tsx`: compact type, "also named by", open/fold on the map from the sheet.
6. Run locally against the production backend, drive every changed flow in a browser at desktop and phone sizes, screenshot, and show Rita for feedback rounds.
7. Merge master, full suite and production build, review panel, proof with an independent verifier, merge, verify the Vercel deploy.

## Files / surfaces touched

`ui/src/components/encyclopedia/{expansion.ts, graph-layout.ts, encyclopedia-map.tsx, map-cards.tsx, focus-sheet.tsx, browse.tsx, chrome.tsx, material.ts, use-pan-zoom.ts}`, `ui/src/lib/encyclopedia-graph.ts`, `ui/src/app/(site)/encyclopedia/page.tsx`, `ui/scripts/encyclopedia-{layout,expansion}.test.mjs`; `ui/src/lib/encyclopedia-layout.ts` deleted. Surface: gallery-pages (`/encyclopedia`, `/writing` shares the sheet components).

## Expected end state

The map opens on two category nodes and their first ten cells at a readable zoom; clicking opens and folds branches; zoom only changes detail; the document never scrolls under the map; no chips, tags or line words; record nodes are named and open in place; nodes drag. `npm test` in `ui/` green including the new layout and expansion tests; `next build` clean; the review panel record and the proof record posted on PR #295; the Vercel production deploy serving the merged head with `/encyclopedia` gated to the owner.
