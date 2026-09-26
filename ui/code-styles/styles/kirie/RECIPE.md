# Kirie

Paper cutting from one sheet. The picture is what the knife leaves: dark paper that stays, light
that is cut away, set on a contrasting backing sheet. There is no drawn line.

Tradition: the Katagami encyclopedia cell `kirie` (Japanese paper cutting), with the wider
practice of paper cutting. Creator: Rita Agafonova (arni.art).

## The making

1. **Draw the design on the sheet.** The cut lines appear on the black sheet in white pencil,
   over a green cutting mat.
2. **Cut, smallest pieces first.** The knife goes round each piece; the piece is pushed out and
   lifted away, and the mat shows through. Small details first, large openings last, so the
   sheet keeps its strength while it is cut. Inside a size band the knife moves to the nearest
   piece.
3. **Lift the sheet off the mat.** It rises, its shadow grows and softens, and the mat gives way
   to the backing.
4. **Mount it on the backing.** The sheet settles and casts a small, close shadow.

Afterwards the light moves and the shadow under the paper moves with it (the pointer is the
light). A click mounts the same cut on the next backing colour.

## How a subject becomes a cut

- Darks stay paper. Lights are cut away. Middle tones become cut stripes (or dots) whose
  width follows the tone, and each hue gets its own stripe direction so areas stay readable.
- Where the subject's edge or its colour changes, a line of paper is kept, so the drawing holds.
- A frame of solid paper runs round the sheet. Behind the subject stands a moon ring or a
  horizon and ground, which give the bridges somewhere to land.
- Every island of paper is joined to the sheet with a straight bridge, nearest island first.
- Holes too small for a knife stay paper; specks of paper too small to keep are cut away; any
  strip thinner than two knife widths is widened.
- Cut lines are contours of the smoothed paper map, so they curve cleanly instead of stepping
  along the grid.

## Rules, checked on every render

| Rule | Source |
| --- | --- |
| Every remaining shape stays joined to the rest of the sheet by paper bridges (the paper is one 4-connected piece). | kirie · structure |
| Every strip of paper is at least two knife widths wide. | kirie · mark |
| One flat paper colour against a contrasting backing (contrast at least 3 : 1), and no drawn line. | kirie · colour, mark |
| Pieces are cut from small to large. | paper-cutting practice |

## Parameters

| Parameter | Default | How it feels |
| --- | --- | --- |
| Sheet | near-black | The paper that stays. Indigo or vermilion also work. |
| Backing | warm white | What shows through. Click in the finished piece to cycle vermilion, marigold, cobalt, white. |
| Knife | fine | Bold uses a coarser grid: fewer, heavier pieces, like a first cut. |
| Middle tones | lines | Dots gives a punched look instead of stripes. |
| Behind the subject | moon | Horizon adds a ground band; none leaves only the bridges. |
| Light | 0.5 | Higher keeps more of the subject as paper. |

## What it never does

- Draws a line with a pen. Everything visible is paper or the backing.
- Leaves a floating piece. If the check fails, the cut would fall apart in the hand.
- Uses a gradient or a third colour on the sheet.
