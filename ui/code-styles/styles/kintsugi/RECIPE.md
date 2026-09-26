# Kintsugi

Golden joinery. A broken ceramic piece is gathered, joined with urushi lacquer, and every seam
is painted with red lacquer, dusted with powdered gold and polished. The repair is not hidden:
it becomes the most visible line in the piece, and it follows exactly where the piece broke.

Tradition: the Katagami encyclopedia cell `kintsugi` (golden joinery, Japan). Creator: Rita Agafonova
(arni.art).

## The making

1. **The whole piece.** The glazed piece lies on the table, whole. A light glides over the glaze
   and its reflection slides across the curved surface.
2. **It breaks.** A blow lands at the impact point. The piece shakes, and cracks race out from
   the impact: a few main cracks radiate and wander to the edge, some branch at an acute angle,
   and sometimes a short ring crack circles close to the impact. Each crack runs until it leaves
   the piece or meets another crack. Then the fragments jolt apart on the table, their broken
   edges showing pale clay, and a few small chips skitter away.
3. **Gather and join.** The largest fragment goes back first, then each piece that fits
   against what is already joined, lifted, carried and set down in its original place. A
   hairline of dark glue (mugi urushi) shows along every join.
4. **Lacquer the seams.** A fine brush paints red urushi (bengara) along every seam, one crack
   after another in the order they grew from the impact: a wet, glossy, raised bead.
5. **Dust with gold.** A powder tube is tapped along the tacky lacquer. Gold falls, sparkles and
   settles as a matte, grainy powder that fills in along each seam.
6. **Polish.** A light sweep passes across the piece. Behind it the powder is burnished into a
   bright metal line that catches the light.

Afterwards the gold catches the light where the pointer is: the seams near it brighten, a
highlight runs along their raised edge, and a reflection moves over the glaze. With no pointer a
slow light circles instead. A click breaks the piece again where it was struck and the making
starts over.

## How a subject becomes the piece

- **Figure or tile.** A subject with one main silhouette (a cat, a bowl, a bird) becomes a
  ceramic figure of that shape. A subject made of many separate parts (a word) is painted onto a
  glazed tile, so one break can run through all of it. `Form` overrides the choice.
- **Body.** The silhouette is opened a little so hair-thin strokes (whiskers) are not fired as
  ceramic too thin to exist. Its distance field gives a rounded rim and a gentle dome, so the
  piece has depth: soft diffuse shading, a sharp highlight, a window reflection on the shoulders
  facing the light, and the room reflected at grazing angles.
- **Glaze.** `Painted` keeps the subject's colours as glazes, slightly less saturated and
  without pure black or white. `Celadon`, `tenmoku` and `shino` are single glazes whose
  thickness follows the subject's tones, so the subject stays readable. The glaze thins and
  breaks colour at the rim, varies in thickness, carries iron specks, and has a crackle network
  of fine crazing.
- **Break.** The impact is chosen from the seed in a thick part of the body (or set by
  `Impact`). Cracks grow in 3 px steps with a slowly turning heading, a small jag at every step and
  an occasional kink. They stop at the edge or on another crack.
- **Fragments.** The cracks are rasterised and the body minus the cracks is split into
  four-connected regions. Crack pixels and slivers join the nearest fragment. Each fragment
  becomes its own sprite with its own shadow, so it can move and turn.
- **Seams.** Every pixel near a crack stores its distance from the seam's centre line, which
  side it lies on, the seam's width there (varying by about ±20%) and when the brush reaches it.
  Lacquer and gold are shaded per pixel as a raised bead: a highlight on the side facing the light,
  a dark edge on the far side, a thin shadow on the glaze, powder grain before the polish and
  a smooth metal finish after it.

## Rules, checked on every render

| Rule | Source |
| --- | --- |
| The gold follows the fracture: every crack carries a gilded seam along its whole length (sampled every 1.5 px), and no gold lies off the fracture. | kintsugi · composition [unsupported in the source check], mark |
| Every fragment is rejoined at its original place: at t = 1 no fragment is offset or turned, none is missing, and they really did move apart during the break. | kintsugi · structure |
| The repair is the most visible feature: seams at least 3 px wide and a median colour difference of at least ΔE 20 from the glaze beside them. | kintsugi · structure |
| The seams are gold, silver or platinum: the metal is one of the three, its colour matches that metal, and its shading runs from deep shadow to near white like a metal, not a paint. | kintsugi · colour, mark |
| One impact sets the composition: cracks radiate from it, each ends at the edge or on another crack, the network branches, no crack is straight, and the body splits into at least three fragments. | kintsugi · composition, rhythm [both unsupported in the source check] |

## Parameters

| Parameter | Default | How it feels |
| --- | --- | --- |
| Metal | gold | Silver is cool and quiet; platinum is softer and greyer. |
| Glaze | painted | Celadon is a jade-green piece, tenmoku a dark iron glaze breaking rust at the rim, shino milky white with orange flashing. |
| Form | auto | Figure keeps the subject's shape; tile paints it onto a glazed tile. |
| Main cracks | 4 | Two gives a clean break in half. Six or seven give a shattered star. |
| Branching | 0.5 | Higher adds branches and ring cracks near the impact: a finer, more veined network. |
| Seam width | 6 px | Wider seams read as a bolder, more deliberate repair. |
| Glaze crackle | 0.3 | The fine crazing in the glaze. 0 gives a clean, new glaze. |
| Surface | slate | Linen and washi are light, calmer tables. |
| Impact across, down | -1 (seed) | Where the blow lands, as a fraction of the canvas. A click sets both. |

## What it never does

- Draws gold where the piece did not break, or leaves a crack without gold.
- Leaves a fragment out of place, or a fragment missing, in the finished piece.
- Uses a paint colour for the seams, or disguises them in the glaze colour.
- Breaks the piece along lines chosen for the picture: the fracture comes from the impact alone.
