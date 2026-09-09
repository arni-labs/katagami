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

Options: Keep the scrim and fade but lift the card in focus above them; fade less; remove both and rely on tape, outline and line weight for emphasis.

Chose removal because: a card the reader has zoomed in on must read whatever else is in focus, and any fade strong enough to isolate a ring is strong enough to hide a neighbour. Given up: an opened ring of sixty records reads a little busier against its neighbours; the 0.35 step-back under the ring keeps it legible.

Where: `encyclopedia-map.tsx` (`dimmedPlate`, `ringDim`, `dimTo`).

## D8 Records walk the card's box, not an ellipse

Decision: The eight records around a card are placed along the card's own box at a fixed clearance, the way an opened ring already was.

Came up because: The new layout test found a record cutting into its own card at a corner. An ellipse through the same clearance clears the card on its axes and cuts inside at the corners; the old force settle had been hiding this by pushing the node out afterwards.

Options: Keep the ellipse and add a separation pass for records; walk the card's box, which the opened ring already does.

Chose the box walk because: it is the same geometry the opened ring uses and needs no second pass; the test then asserts the property instead of a sweep approximating it. Given up: nothing.

Where: the records loop in `layoutVisible`; the test "no two open cards overlap" in `ui/scripts/encyclopedia-layout.test.mjs`.

## Not decided here

- Whether the whole open set should be re-fitted when a branch opens (the camera now frames only the branch, and only pans or pulls back).
- Motion when siblings shift: positions snap today.
- The layout tests assert no overlap over the open set; the real library's shape (245 roots, Poetry with 91 narrower cells) has not been asserted in a test, only looked at.
- Full 3D, free rotation, and the rendering technology for either.

## D9 Nodes can be dragged, and a branch moves as one thing

Decision: A card or a category node can be picked up with the pointer. The move is an offset keyed by the node's id, on top of the computed layout, and everything open under the node moves with it. Offsets live in component state for the session.

Came up because: Rita asked to drag nodes; they were static.

Options: Move only the node; move the node with its open branch; persist moves.

Chose the branch because: a card and the cells it has opened are one thing to a reader; moving the card away from its own narrower cells would make the lines the only thing holding the branch together. Given up: a single card cannot be pulled out of its branch. Persistence is not decided.

Where: `startNodeDrag` and the displaced `layout` in `encyclopedia-map.tsx`; `onDragStart` on `Plate` and `Hub` in `map-cards.tsx`.

## D10 No words on the lines

Decision: Lines carry no text. The arrowhead says which end is narrower, the ink says the relation family, the legend says what the inks mean, the sheet carries the relation's word and explanation, and hovering a line shows both as a tooltip.

Came up because: Rita: "there should never be any text that just makes it busy."

Options: Words on hover and focus only; words at reading zoom only; no words, with the tooltip and the sheet carrying them.

Chose no words because: that is the instruction, and the arrow, the ink and the legend already say what a line is. Given up: a relation's own word is one hover away rather than on the paper.

Where: the line SVG in `encyclopedia-map.tsx`.

## D11 A cell on two maps says so, and the filter frames it

Decision: A cell drawn in one map's cluster that also belongs to another map carries a small mark in that map's ink with the map's name, raised when that map is the filter; the map filter frames every open cell on the map wherever it sits, and dims only cells not on it.

Came up because: Rita asked whether art and writing were connected at all. Checked against production: 52 cells sit on both maps, 6 hierarchy links and 10 typed relations cross them, and the map showed none of this — a dual-map cell was placed in its first map's cluster with no mark, and the filter framed only that cluster.

Options: Draw a dual-map cell in both clusters; mark it in the cluster it sits in and let the filter frame it; do nothing and leave the cross-links to the sheet.

Chose the mark and the framing because: one cell drawn twice is the duplication D6 removes for records; a mark keeps one node per cell and still makes the second map visible on it. Given up: a filtered map's cells can be far apart on the paper, so the framed view can be wide.

Where: `alsoOn` in `encyclopedia-map.tsx` and the mark in `PlateCard`; `fitRegion`.

## D12 The sheet is set small

Decision: Sheet prose is 12px, headings 12.5px, titles 20px semibold; card names 14px semibold; the phone browser and the chrome come down with it, and bold display weights become semibold. The 17px body floor in the design contract is for pages; this is a working panel beside a dense canvas, and Rita asked for it twice (2026-09-09).

Came up because: Rita: the sidebar and everything on the canvas read as chunky; the reference is delicate and neat.

Options: Keep the 17px floor and shrink only the mono metadata; one step down; two steps down with lighter weights.

Chose two steps and lighter weights because: the first step was still called chunky, and the reference's lightness is weight as much as size. Given up: the contract's body floor on this one route, recorded here so a reviewer does not re-raise it.

Where: `focus-sheet.tsx`, `browse.tsx`, `map-cards.tsx`, `chrome.tsx`, `encyclopedia-map.tsx`.

## D13 A record node opens into a card in place, and folds back

Decision: Clicking a record node opens that node into a card on the canvas, in the node's own spot and growing away from its cell — picture, set and status, the record's own line, why the cell names it, which other cells name it — with a fold control that returns it to a node and a button that opens the record's page in a new tab. The node itself never navigates. Records stand 52px off their cell, are spread over more of its perimeter, and can be dragged one at a time.

Came up because: Rita: the records sit too close, should be draggable, and a click should show information in the encyclopedia rather than leave it. A first version opened a panel pinned beside the node in screen space; Rita did not want a panel stuck to the side, she wanted the node itself to expand and fold.

Options: Show the record in the sheet; a panel beside the node; the node expands in place; re-lay out around the opened card or let it sit above its neighbours.

Chose in-place expansion because: it is the same move as opening a cell's narrower cells — the reader opens a thing where it is and folds it there. Chose not to re-lay out because: making room for the card moved the whole cluster and threw the reader's view away from the thing they had just opened. The card sits above its neighbours and can be dragged clear.

Where: the opened branch of `SatelliteNodeCard` in `map-cards.tsx`; `openRecords` and `recordDetail` in `encyclopedia-map.tsx`; `RING_PAD` and `RECORD_CARD_W` in `graph-layout.ts`.

## D14 The card is the control: no chips, no tags

Decision: The open/fold and "+N more" chips are gone from cards and category nodes. Clicking a card focuses the cell and opens its narrower cells; clicking the cell in focus folds them. A category node opens and folds on click. The next group of a node's cells is one small "+N" node at the end of its ring, standing where those cells will go. The tags that said where a cell's picture came from — the chip on the picture, the caption under it, the ink bar — are gone too: the picture is a visual reference, and the sheet still says which record it is. This reverses D5 on Rita's instruction (2026-09-09).

Came up because: Rita: the chips duplicate information and make the canvas busy; the provenance tags likewise; show the children by clicking the card instead.

Options: Keep one small chip; move the controls to hover; make the click the control and put the count in the sheet.

Chose the click because: it is the instruction, and a card that opens on click is the same move as a category node and a record node opening on click. Given up: a reader cannot focus a cell without also opening its first group. That is what a click means now.

## D15 A record node says what it is

Decision: A record node always carries its set's word under it in the set's ink — art style, writing style, design language, palette — and a hairline of that ink along its bottom edge. Its name joins once the node prints at reading size, or when its cell is in focus.

Came up because: Rita: an unopened record node was a square with nothing to say what it was.

Options: A coloured frame only; the set's word always; the word only on hover.

Chose the word always, with the hairline, because: a colour alone needs the legend and a hover is not a glance. Given up: eight words around a card at reading zoom; they are 7px mono and in the set's ink, so they read as labels, not text.

Where: `SatelliteNodeCard` in `map-cards.tsx`.

## D16 Review round one: what was fixed and what was dismissed

Decision: Of the twenty panel findings and four Greptile findings on the merged head cfb13880, twelve were confirmed and fixed in one batch; the rest were dismissed with reasons. The panel is rerun on the resulting head.

Came up because: Grok, Codex and Fable each reviewed the diff with the intent and this log; Greptile reviewed the PR.

Options: Fix the confirmed defects and rerun the panel; merge on the round-one record with open act-ons; drop the panel on Rita's merge instruction.

Chose fix-and-rerun because: the instruction to merge does not lift the standing rule that act-on findings introduced by the diff are fixed and confirmed, and every confirmed finding here was introduced by this diff.

Confirmed and fixed:
- Dragging a category node fired its click on release and folded the map (Grok, Codex). Hub and record-ring toggles now consult the same drag guard the cards use.
- A click that opened a branch then zoomed to the card and left the new cells off screen (Grok, Fable). A click that opens frames the branch; only search, URL and sheet navigation frame the card.
- The category ring gave every root the same slot whatever it carried, and a pictured cell's records reach a diagonal further than the radius allowed, so an opened branch overlapped its neighbours (Grok, Codex). Ring slots are now each thing's own width with the slack shared, the record reach is the box clearance times √2, and a mixed-size fixture is asserted overlap-free in the layout test.
- The dual-map mark read the cell's first map, not the cluster it is drawn in (Grok). Plates carry their cluster; the mark is the other maps.
- Shared records were deduplicated after viewport culling, so panning moved a record between cells and an opened card could collapse (Codex, Greptile, Grok). Deduplication runs over every open cell in layout order first, an opened ring's nodes take precedence, then the viewport is applied.
- A touch that began on a card never counted toward a pinch, so two-finger zoom failed whenever a finger landed on a node (Fable). A node drag claims its pointer with the camera, which still counts it toward a pinch and hands over when a pinch begins.
- A search for a cell whose first listed parent sits in a cycle revealed nothing (Greptile, Fable). Ancestry follows the shallowest parent, which always reaches a root or an orphan; tested.
- Fit could set the zoom below the floor, so the next zoom-out zoomed in (Grok). The floor follows the paper.
- The dual-map mark array was rebuilt per render and defeated the card memo (Fable). Memoised per plate with a shared empty list.
- The category node understated its count against the filter chip (Greptile). Both count any membership.
- The file header described the old map (Grok, Greptile). Rewritten.
- Dead code: `isOpen`, the face provenance fields, the connector label, and the hub key template (Grok, Codex, Fable). Removed; the hub uses `hubKey`.

Dismissed:
- Fable's note that D12's sizes are deliberate: not a finding, an acknowledgement of a recorded decision.
- Risk flags `core_path` and `fundamental_change` from all three: correct as descriptions — this replaces the map's layout engine — and they route the merge to a human, which is Rita's standing instruction for this PR.

Where: this head; the round-one record and this entry are on PR #295.
