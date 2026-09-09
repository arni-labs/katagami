# ARN-475 — decisions

Recorded as they were made, in the order they were made.

## D1 The map draws what is open, and the layout is of what is open

Decision: The map shows the cells the reader has opened — each map's category node, the top-level cells opened under it, the narrower cells opened under those — and lays out only that set, in the browser, on every change. The server-side force settle over the whole library is removed.

Came up because: The first change kept the settled field and only hid cells that were not open. With twenty cells open on a field packed for 746, the opening view fitted at 5% and every card was dust. The paper was the size of the library, not of what was on it. D70 in ARN-118 had already named nesting each layer inside its parent's territory as the fix for exactly this.

Options: Keep the settled positions and counter-scale the category nodes so at least they read from far out; pack the settled regions tighter; lay out the open set only.

Chose the open-set layout because: it is the only one of the three where the far view is readable by construction — twenty open cells take twenty cells' paper — and it removes 600 lines of settling code and six seconds of server work per library state. Given up: a cell no longer has one fixed place on the paper forever; siblings shift when a neighbouring branch grows, and the two category clusters move apart as they open. The camera frames the branch just opened so the reader keeps the thing they acted on.

Where: `ui/src/components/encyclopedia/graph-layout.ts` (`layoutVisible`), `ui/src/components/encyclopedia/expansion.ts`, `ui/src/app/(site)/encyclopedia/page.tsx`; `ui/src/lib/encyclopedia-layout.ts` deleted.

## D2 Expansion is state; zoom is per card

Decision: What is on the paper is an expansion state — a set of open nodes and how many children each shows, ten at a time — and how much of a card is drawn depends on the size that card prints at (`k × scale`), not on the camera's zoom alone.

Came up because: The map revealed layers by zoom, so coming in on one cell opened everything nearby, and a deep cell drawn at a quarter scale showed the reading layout at three pixels of type. Rita asked for expansion and zoom to be two different controls.

Options: Keep zoom-reveal and add expansion on top; make expansion the only reveal and let zoom carry detail.

Chose the second because: it is the Google Maps model Rita described, and it makes the two controls independent in code as well as in the reader's hands — `expansion.ts` never reads the camera and `lodFor` never reads the expansion. Given up: the "layers arrive as you come in" behaviour, which never gave a readable far view.

Where: `ui/src/components/encyclopedia/expansion.ts`, `lodFor` in `ui/src/components/encyclopedia/map-cards.tsx`, `ui/scripts/encyclopedia-expansion.test.mjs`.

## D3 A cell's layer is its depth

Decision: A cell draws at 0.6 to the power of its depth in the hierarchy, to a floor at depth three. The prominence budget that put twenty-six cells on layer 0 is gone.

Came up because: Under explicit expansion, two narrower cells of the same cell drew at different sizes for no reason the reader could see, because the budget had put them on different layers.

Options: Keep prominence layers; layer by depth.

Chose depth because: the size then says one thing — how far down this cell sits — and a reader always opens a bigger card to find a smaller one. Given up: nothing the reader could use; prominence now decides the order cells open in, which is where it belongs.

Where: `levelOf`, `LEVEL_SHRINK`, `MAX_LEVEL` in `graph-layout.ts`; `prominence`, `orderedChildren`, `rootsOn` in `ui/src/lib/encyclopedia-graph.ts`.

## D4 The document does not scroll while the map is on screen

Decision: While the map is mounted the document's overflow is hidden and its overscroll is none; the sheet contains its own overscroll; the wheel guard is attached to whatever element is the viewport, not once at mount.

Came up because: Rita reported the page and the canvas scrolling together. The site shell puts a footer with a large top margin under every page, so the document was 1067px tall in a 720px window and every gesture that missed the map, or chained out of the sheet, scrolled it. On a phone the wheel guard was never attached at all, because the map mounts after the reader asks for it.

Options: Remove the footer from this route; make the page exactly the viewport height and hope; lock the document scroll from the map.

Chose the lock because: it is the one place that knows the map is on screen, and it is undone when the map leaves. Given up: the footer is unreachable on this page. The map is the page.

Where: `encyclopedia-map.tsx` (the effect near the viewport ref), `guardWheel` in `use-pan-zoom.ts`.

## D5 A record's picture is labelled as the record's, on the card

Decision: A face that comes from a record the cell names carries the record's set and name on the picture itself at named and reading zoom, and a thin bar in the set's ink at picture zoom. The card's caption line keeps saying where the picture came from.

Came up because: Rita saw a photograph-like picture on Impressionism. Checked against production: no cell in the library has a study, so every picture on every cell is a record's — Impressionism's is the art style Aureole — and the card presented it as the cell's own until the reader zoomed all the way in.

Options: Stop showing record pictures on cells; show them and say so; ask for studies to be made.

Chose to show and say so because: the pictures are real material connected to the cell and the far view needs them, and the defect was the missing label, not the picture. The data finding — no studies anywhere — is reported for a decision, not fixed here.

Where: `FaceOrigin` in `map-cards.tsx`; `source` and `title` on `CellFace` in `material.ts`.

## D6 A record named by several open cells is one node

Decision: On the paper a record is drawn once and joined by a dotted line to every open cell that names it, with a `+N` mark; in the sheet each manifestation says which other cells name it.

Came up because: Rita saw what looked like one topic linked to the same art style several times. Checked against production: 287 of 499 records are named by more than one cell (one by six), so the same thumbnail appeared on neighbouring cards as separate nodes.

Options: Leave it and explain in the sheet only; draw once with lines to each; hide the duplicates.

Chose to draw once because: it makes the record's identity visible where the confusion arose. Given up: a shared record sits by the first cell that names it, so its line to a second cell can be long.

Where: `records` in `encyclopedia-map.tsx`; `ownersOf` in `encyclopedia-graph.ts`; `Manifestations` in `focus-sheet.tsx`.

## D7 Emphasis is added, never subtracted

Decision: The white scrim behind an opened ring and the fade of non-neighbours at reading zoom are removed. The cell in focus gets its tape and outline and the lines touching it carry their words. Only the map filter and an opened ring still step the rest of the paper back, to 0.35, never lower.

Came up because: Rita reported a foggy Cubism card and cells hard to see behind other content. Both were the fade and the scrim.

Where: `encyclopedia-map.tsx` (`dimmedPlate`, `ringDim`, `dimTo`).

## D8 Records walk the card's box, not an ellipse

Decision: The eight records around a card are placed along the card's own box at a fixed clearance, the way an opened ring already was.

Came up because: The new layout test found a record cutting into its own card at a corner. An ellipse through the same clearance clears the card on its axes and cuts inside at the corners; the old force settle had been hiding this by pushing the node out afterwards.

Where: the records loop in `layoutVisible`; the test "no two open cards overlap" in `ui/scripts/encyclopedia-layout.test.mjs`.

## Not decided here

- Whether the whole open set should be re-fitted when a branch opens (the camera now frames only the branch, and only pans or pulls back).
- Motion when siblings shift: positions snap today.
- The layout tests assert no overlap over the open set; the real library's shape (245 roots, Poetry with 91 narrower cells) has not been asserted in a test, only looked at.
- Full 3D, free rotation, and the rendering technology for either.
