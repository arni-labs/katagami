# Risograph

A stencil duplicator print. The picture is separated into two to four spot inks. Each ink gets
its own master, burned by a thermal head into a thin film and wrapped on that ink's drum. The
sheet is fed through once per drum. The inks are transparent, so where they overlap they
overprint into new colours, and each pass lands a little out of register with the others.

Tradition: the Katagami encyclopedia cell `risograph`. Creator: Rita Agafonova (arni.art).

## The making

1. **Burn the masters.** One master per ink slides onto the machine bed. The thermal head
   passes down it at a steady speed and perforates the separation line by line; the burned
   image shows dark through the pale film. Each master carries a tag with its drum and ink,
   then wraps away onto its drum and the next comes in.
2. **One pass per drum, lightest ink first.** The sheet is fed and settles into the guides.
   The drum for this ink rolls over it at a constant speed. Its top face shows the master
   carrying the image in wet ink, upside down and foreshortened, and the ink is left behind
   it, a shade wetter for a moment. The first pass also brings the blank sheet in from the
   feed side.
3. **Pull the copy.** The sheet lifts off the machine and lands on the stack of copies
   already pulled, and the edition number is written in pencil in the bottom margin.

Afterwards a loupe follows the pointer and shows the grain, the overprint and the
misregistration up close. A click pulls the next copy of the edition: the masters stay the same
and the making replays with a new registration and a new laydown.

## How a subject becomes a print

- **Separation.** The subject is sampled on a 2 px grid. For each colour, the solver finds the
  coverage of every ink whose overprint comes closest. It models the screen as independent
  grains in linear light and measures distance in OKLab. Tone weighs more in the darks, so
  lines and shadows hold. Lost chroma costs extra, and small prices on ink, on three inks
  stacked and on two half-covered screens mixing keep the colour bright rather than muddy.
  Near-white stays paper.
- **Behind the subject.** A sun disc (or a block over the whole printable area) goes on the
  ink the subject uses least, knocked out where the subject is. Misregistration then shows at
  the knockout as a sliver of paper on one side and a sliver of overprint on the other.
- **Screen.** Each layer is one flat ink through a screen: by default a stochastic grain with
  slightly clumped dots, like a Riso grain setting; halftone dots at a separate angle per drum
  as the option. The screen is part of the master, so it is identical on every copy.
- **Laydown.** How the ink goes on is per copy: slow mottling, streaks along the feed
  direction, a drum a little heavier on one side, starvation where a long solid has drawn ink
  off the drum faster than it returns, and the paper's tooth showing through where the ink
  does not reach the valleys. The tooth belongs to the sheet, so every pass misses the same
  valleys.
- **Registration.** Each pass gets its own small shift and turn from the copy's seed.
- **The sheet.** Riso never prints to the edge, so the image sits inside a white margin on an
  uncoated sheet. The copy number is written below the image.

## Rules, checked on every render

The source lines come from the encyclopedia's `risograph` cell; the source check marks the
composition and colour lines unsupported and the mark, structure and rhythm lines supported.

| Rule | How it is checked | Source |
| --- | --- | --- |
| Each pass lays exactly one Riso ink, flat. | Every inked pixel of each layer is read back and must be that pass's ink; every ink must be a Riso drum colour. | risograph · composition, colour (unsupported) |
| Inks overprint and never cover. | Up to 600 points of the finished sheet, including overlaps, must equal paper × each ink at its laid-down amount. | risograph · composition (unsupported) |
| Passes land slightly out of register, above 0 and at most 2 mm. | Largest displacement between any two passes at the image corners, with the sheet read as 210 mm wide. | risograph · colour (unsupported) |
| One burned master per drum, one drum per pass, at most four drums. | Counts of masters, layers and passes. | risograph · mark (supported) |
| The copy is one of a numbered run from the same masters. | The copy number is within the edition size; the seed picks the copy, wrapping round the run. | risograph · structure, rhythm (supported) |

The drum and edition rules cannot be broken from the controls (four drum slots; seeds wrap
round the run); their checks guard the code. The others fail from parameters: misregistration
0 or 14, or a non-Riso hex as an ink.

## Parameters

| Parameter | Default | How it feels |
| --- | --- | --- |
| Drum 1 to 4 | Fluorescent Pink, Blue, Yellow, none | The inks. Passes always run lightest first. Pink, Blue and Yellow make every overprint bright; Teal with Bright Red on cream paper reads vintage; adding Black gives lines a true key. |
| Paper | warm white | Bright white is crisper, cream warms every ink, grey-green cools it. |
| Screen | grain | Halftone gives regular dots at a different angle per drum, like a poster from a studio that screens its files. |
| Behind the subject | sun | Block lays a screened field over the whole printable area; none leaves the paper bare. |
| Misregistration | 3 px (0.66 mm) | Higher shows more slivers of colour at every edge; 0 or anything above 2 mm fails the check. |
| Ink density | 0.9 | Lower lets more paper tooth through and the solids go patchy; 1 is a freshly inked drum. |
| Edition size | 50 | The number pencilled on the sheet. Seeds wrap round it: with 50, seed 51 is copy 1 again. |

## What it never does

- Mixes a colour on the press. Every colour you see is paper and up to four inks multiplied.
- Covers one ink with another. There is no opaque layer and no white.
- Prints to the edge of the sheet, or registers perfectly.
- Changes the masters between copies. Only registration, laydown and the paper differ.
