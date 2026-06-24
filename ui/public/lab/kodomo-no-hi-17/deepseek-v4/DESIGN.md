# Nobori

> A Katagami design language for Kodomo no Hi — the Japanese festival of children,
> koinobori, and early-summer light. One ownable idea: the rising streamer.

## Concept

Nobori captures the moment a carp-streamer catches the wind and climbs — fabric snapping
taut, colour cutting through clear sky. The signature mechanic is **vertical ascent**:
layouts sweep upward, type lifts off the baseline, and a single vivid accent slices
through generous white space like a koinobori against May light.

The language is bright, airy, and hopeful — early-summer clarity with confident graphic
design. Open white dominates, then electric sky-blue, fresh green, and a hot vermillion
pop arrive like highlighters. Sleek, clean, grown-up: a festival an adult would proudly
design, never childish or cluttered.

## Palette

```css
:root {
  --bg:       #FAFAFA;
  --surface:  #FFFFFF;
  --text:     #1A1A1A;
  --muted:    #6B7280;
  --border:   #E5E7EB;

  /* Accents — ≤3, used like highlighters */
  --accent:     #0099FF;   /* electric sky-blue — primary */
  --accent-2:   #00CC44;   /* fresh early-summer green */
  --accent-3:   #FF2D55;   /* hot vermillion pop — used sparingly */
  --on-accent:  #FFFFFF;

  /* Semantic */
  --success:  #00CC44;
  --warning:  #FF9500;
  --error:    #FF2D55;
  --info:     #0099FF;
}
```

Neutrals are tuned cool — the near-white `--bg` carries a whisper of blue, keeping the
palette crisp under early-summer light. Semantic colours echo the accent set so the
palette stays cohesive; they are never visually primary.

## Typography

| Role      | Font       | Weight | Size / Leading        | Notes               |
|-----------|------------|--------|-----------------------|----------------------|
| Display   | DM Sans    | 700    | 4.5rem / 1.05         | `letter-spacing: -0.02em` |
| H1        | DM Sans    | 600    | 3rem / 1.15           |                      |
| H2        | DM Sans    | 600    | 2rem / 1.2            |                      |
| H3        | DM Sans    | 600    | 1.5rem / 1.3          |                      |
| Body      | Inter      | 400    | 1.0625rem (17px) / 1.6 |                      |
| Body Bold | Inter      | 600    | 1.0625rem / 1.6       |                      |
| Small     | Inter      | 400    | 0.875rem / 1.5        |                      |
| Caption   | Inter      | 500    | 0.75rem / 1.4         | Uppercase tracking   |

Body text at 17px minimum. High contrast: `--text` (#1A1A1A) on `--bg` (#FAFAFA) yields
a contrast ratio above 15:1.

## Spacing

Scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

Section padding: 96px top/bottom on desktop, 64px on tablet, 48px on mobile.
Titles always carry generous padding above — never stuck to container tops.

## Radius

Only from the allowed set: **0, 16, 24, 9999**.

- Cards and surfaces: 16px
- Large containers / hero overlays: 24px
- Pills, tags, badges: 9999px
- Sharp edges (code, data tables): 0

No arbitrary in-between radii. One coherent geometry.

## Control Height

**One shared control-height token: 44px.**

Every interactive control — buttons, inputs, selects, textareas (min-height) — uses this
single height. Buttons, inputs, and selects share exactly 44px; textareas use 44px as
their minimum height and grow with content.

## Component States

All controls share one state matrix, driven by the same height token:

| State                    | Behaviour                                              |
|--------------------------|--------------------------------------------------------|
| **Default**              | Resting appearance, full colour on primary             |
| **Hover**                | Slight lift — accent shifts 8% lighter                 |
| **Focus (visible ring)** | 2px offset ring in `--accent`, 2px gap from control    |
| **Active**               | Pressed — accent shifts 8% darker, subtle scale 0.985  |
| **Disabled**             | 40% opacity, `cursor: not-allowed`, no pointer events  |

### Button

Primary: solid `--accent` background, `--on-accent` text, 44px height, 16px radius,
24px horizontal padding. Label centred.

Secondary: transparent background, `--accent` text, 1.5px solid `--accent` border
(inside the 44px box — border subtracts from padding, not from height).

Ghost: transparent, `--text` colour, no border. Hover shows a subtle `--bg` background.

### Input / Select / Textarea

44px height (textarea: min-height 44px). 16px horizontal padding. 16px radius.
Background `--surface`, 1.5px solid `--border`. On focus: border becomes `--accent`,
ring appears. Placeholder text in `--muted` at 40% opacity.

### Form controls — explicit styling

Every `<input>`, `<select>`, `<textarea>`, `<button>` is explicitly styled. No visible
browser defaults. Checkboxes and radios are custom: 20px square/circle, `--border` stroke,
`--accent` fill when checked, with a 4px scale-in transition on check.

## Surfaces

Surfaces are separated by tone, not borders. Cards sit on `--bg` with `--surface`
background — the contrast between `#FFFFFF` and `#FAFAFA` creates the separation without
a stroke. Navigation breathes as part of the page, never trapped in a floating card or
pill bar.

## Motion

The settled state is the default — visible with no JavaScript. Motion is added on top:
an inline script gates the hidden start-state behind a class set on `<html>` and drives
the reveal. Respects `prefers-reduced-motion`.

The signature motion is **lift**: elements rise into view from 24px below, with a
staggered cascade (60ms per child). Duration 500ms, ease-out. The hero headline lifts
first, then the subtitle, then the CTA — each climbing like a koinobori catching wind.

## Responsive

- 390px mobile to 2560px+ ultra-wide.
- Mobile: single column, non-essential nav links hidden, no horizontal overflow.
- Ultra-wide: content capped and centred; only the hero spans 100vw.
- Grids use `minmax(0, 1fr)` + `min-width: 0` — children shrink, never overflow.

## Landing

- Full-viewport hero: 100vw × 100svh, edge to edge.
- Hero image via `background-image: var(--hero-image)` — swappable.
- Overlay legible without a lazy gradient scrim.
- No scroll cues or down-arrow indicators.
- Below the hero: rich, full sections.
- Hero headline unmistakably Nobori — confident graphic type, not the generic oversized
  italic serif.

## Dashboard

Information-rich companion page in the same language. Dense data presented with the same
tokens: tone-separated surfaces, the shared control height, the three accents used
sparingly as highlighters. Functional, scannable, built from the same component set.

## Art Style

The Nobori art style is **editorial festival photography** — clean, bright, composed like
a design-magazine spread about Japanese seasonal celebrations. Natural light, generous
negative space, vivid accent colours drawn from the palette. The style treats any subject
(people, food, objects, landscapes) with the same crisp, airy confidence — it is a
transferable technique, not tied to one subject domain.

## Credits

- **Japanese festival photography tradition** — the clean, bright documentary style of
  seasonal matsuri coverage in Japanese design and lifestyle magazines.
- **Kenya Hara** (kind: designer) — the Muji art director's philosophy of emptiness,
  white space as active presence, and design that breathes.
- **Shunji Yamanaka** (kind: photographer) — editorial clarity and natural-light
  composition in cultural documentation.