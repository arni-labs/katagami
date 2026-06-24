# Nobori

Nobori is a Katagami design language for Kodomo no Hi as a public day in motion: carp streamers lifting over a clean May sky, festival routes opening through fresh green, and a grown-up civic welcome made from light, type, and wind.

## Point of View

Nobori treats the festival as an airy graphic commons. The page is mostly white and black, then cut by three vivid highlighter accents: electric sky, fresh green, and hot koi. The signature mechanic is the wind-band: long, decisive ribbons that carry hierarchy, split dense information into breathable lanes, and echo koinobori without turning the interface into a toy.

The language is sleek, civic, hopeful, and editorial. It avoids childish motifs, pastel washes, muddy color, soft beige nostalgia, heavy borders, nested cards, and generic app chrome.

## Name

- Name: Nobori
- Type: single concrete noun
- Source: Japanese festival banners and the rising koinobori motif
- Slug: nobori
- Tone: bright, civic, exact, grown-up

## Palette

All color is mapped through Katagami role variables. Accents are limited to three and reused consistently.

```css
:root {
  --bg: #FFFFFF;
  --surface: #F5F8F2;
  --text: #000000;
  --muted: #39443B;
  --border: color-mix(in srgb, var(--text) 12%, transparent);
  --accent: #00A8FF;
  --on-accent: #000000;
  --success: #39FF88;
  --warning: #FF315A;
  --error: #FF315A;
  --info: #00A8FF;
}
```

Accent use:

- `--accent`: sky, links, primary actions, active navigation, wind-band anchors.
- `--success`: fresh leaves, open routes, family-ready status, secondary highlighter fields.
- `--warning` and `--error`: the single hot koi pop, urgent event notices, limited-capacity tags.
- `--info`: same electric sky as `--accent`; no fourth accent.

Surfaces are separated by tone, scale, whitespace, and type. Borders are not used as decoration.

## Typography

Nobori uses condensed civic display type against clean humanist body text. The system must stay self-contained, so stacks use common platform faces without remote dependencies.

```css
:root {
  --font-display: "Avenir Next Condensed", "DIN Condensed", "Arial Narrow", "Helvetica Neue", sans-serif;
  --font-body: "Hiragino Sans", "Yu Gothic", "Avenir Next", "Segoe UI", sans-serif;
  --type-xs: 0.91rem;
  --type-sm: 0.94rem;
  --type-body: 1.0625rem;
  --type-lead: clamp(1.2rem, 1vw + 1rem, 1.55rem);
  --type-h3: clamp(1.45rem, 1.1vw + 1.1rem, 2rem);
  --type-h2: clamp(2.3rem, 3.4vw + 1rem, 5.25rem);
  --type-hero: clamp(4.4rem, 13vw, 16rem);
  --tracking-display: -0.02em;
  --tracking-ui: 0;
  --leading-tight: 0.86;
  --leading-copy: 1.55;
}
```

Rules:

- Body text is 17px or larger.
- Table rows and dense labels are never below 14.5px.
- Display text uses `-0.02em` tracking.
- UI labels use zero letter spacing.
- Text is always black or high-contrast muted text on white or tonal surfaces.

## Spacing

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4.5rem;
  --space-9: 7rem;
  --container: min(1500px, calc(100vw - 40px));
}
```

Rules:

- Titles always have generous space above them.
- Mobile stacks to one column.
- Ultra-wide layouts cap and center contained content.
- Full-bleed hero is the only element that spans the full viewport width.

## Radius

Only these radius values are allowed:

```css
:root {
  --radius-0: 0;
  --radius-16: 16px;
  --radius-24: 24px;
  --radius-full: 9999px;
}
```

Use:

- `0`: bands, tables, schedule strips, map blocks.
- `16px`: small controls, tags, compact panels.
- `24px`: major tonal panels and image wells.
- `9999px`: round toggles, chips, check indicators, range thumbs.

## Controls

Every control uses one shared height token.

```css
:root {
  --control-h: 52px;
  --ring: 0 0 0 4px color-mix(in srgb, var(--accent) 28%, transparent);
}
```

Control foundation:

- Buttons, inputs, selects, search fields, and single-line controls use `min-height: var(--control-h)`.
- Textareas and complex controls use whole multiples of `--control-h`.
- Labels are centered optically with even inline padding.
- Buttons share one shape and height.
- One action is visibly primary; secondary actions are quieter.
- Browser defaults are fully suppressed and replaced.

State matrix:

| State | Button | Text input / select / textarea | Checkbox / radio / switch / range |
| --- | --- | --- | --- |
| Default | solid tonal surface, centered label, no border | tonal field, black text, custom caret | tonal tray with custom mark or thumb |
| Hover | raised tone or accent swap | surface brightens and label darkens | tray brightens, thumb or mark gains accent |
| Focus visible / focus within | visible `--ring`, no layout shift | visible `--ring`, no layout shift | visible `--ring`, no layout shift |
| Active | compress by 1px, color deepens | inset tone deepens | thumb or mark compresses |
| Disabled | opacity 0.44, no pointer, no color animation | opacity 0.5, muted text | opacity 0.5, muted mark |

## Component Recipes

### Wind Band

A wind band is a long tonal or accent strip aligned to a section grid. It may hold a short label, time, route marker, or status. It is not a border. It must point to content structure: route, phase, rising motion, or information grouping.

### Hero

The landing hero fills `100vw` by `100svh` and uses `background-image: var(--hero-image)`. Text sits directly over the image, supported by reserved negative space and text shadow rather than a gradient scrim.

### Section

Sections are full-width tonal fields or open white layouts. They are never trapped inside decorative cards. Section rhythm is made with whitespace, strong title scale, and wind bands.

### Panel

Panels are single-level repeated objects for schedules, customs, guide entries, and form blocks. They use tone, spacing, and radius, not border outlines.

### Table

Tables become grid rows on mobile. Dense columns may hide at small widths. Rows use alternating tonal fills instead of separator borders.

### Forms

Text fields, select menus, checkboxes, radios, switches, range sliders, textareas, and buttons are all custom-styled from Nobori tokens. Every control has default, hover, focus-visible or focus-within, active, and disabled styling.

## Motion

Default rendered state is fully visible without JavaScript. JavaScript may add `motion-ready` and then `motion-run` to create a reveal. If `prefers-reduced-motion` is set, motion is disabled and the settled state remains.

Motion vocabulary:

- Hero type lifts slightly like a streamer catching wind.
- Bands slide into their final lanes.
- Dense dashboard rows use short, calm transitions only on hover and focus.

## Art Style

Nobori imagery is a contemporary editorial poster treatment: crisp vector-like fields, clear daylight, subtle paper grain, strong white space, and vivid accents. It can dress festival scenes, food, maps, product moments, or portraits without changing technique.

Credits:

- Koinobori craft tradition, tradition: the public carp-streamer motif and May wind ritual.
- Japanese civic festival posters, design tradition: clean public information, bright seasonal identity, and disciplined event typography.
