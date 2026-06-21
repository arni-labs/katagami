---
name: "Lumen Atlas"
description: "The night sky as the old masters drew it — ink on cream paper, not a black screen. Lumen revives the engraved celestial atlas (Bayer, Flamsteed) as a working astronomy app. Every screen is ruled by a faint right-ascension / declination grid; content sits as plates registered to that grid with engraver's corner ticks, never borders. Hierarchy is magnitude: the brightest element (highest contrast, the single amber star) is the most important, the way a first-magnitude star dominates a chart."
colors:
  paper: "#FBFAF6"
  paper_warm: "#F4F1EA"
  paper_deep: "#ECE8DE"
  ink: "#181A1F"
  ink_soft: "#474B54"
  ink_faint: "#8A8E97"
  indigo: "#27306B"
  indigo_mid: "#3B4A8C"
  indigo_mist: "#AEB6DC"
  amber: "#E0A23B"
  amber_deep: "#B97F22"
  ember: "#C2421F"
typography:
  display: "Bodoni Moda"
  heading: "Spectral"
  body: "Hanken Grotesk"
  mono: "Space Mono"
  scale:
    xs: "13px"
    sm: "14.5px"
    base: "17px"
    lg: "21px"
    xl: "28px"
    2xl: "40px"
    3xl: "64px"
rounded:
  none: "0"
  md: "16px"
  lg: "24px"
  full: "9999px"
spacing:
  base: "8px"
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
components:
  - "coordinate-rule"
  - "plate"
  - "registration-ticks"
  - "night-pane"
  - "magnitude-row"
  - "star-mark"
  - "ephemeris-line"
  - "altitude-arc"
  - "transit-timeline"
  - "bortle-meter"
  - "phase-disc"
  - "object-plate"
  - "log-entry"
  - "condition-chip"
  - "ascension-nav"
  - "declination-rail"
  - "sky-ribbon"
  - "readout"
  - "seeing-gauge"
  - "magnitude-key"
---

# Overview

Lumen is a stargazing companion, and stargazing apps reach for one cliché: a
black screen with glowing dots. Lumen does the opposite, and that opposition is
the whole design. For four centuries the most beautiful records of the sky were
**engravings on cream paper** — Bayer's *Uranometria* (1603), Flamsteed's *Atlas
Coelestis* (1729). The night was drawn in *ink*, in *daylight*, on a table. Lumen
is that atlas, made to work.

The result is a bright, paper-white astronomy app where the sky is *rendered*,
not photographed — and where darkness gets exactly one pane, used once, on
purpose.

# The structural motif — the coordinate ruling

Every plate in a celestial atlas is **ruled**: a faint grid of right ascension
(vertical) and declination (horizontal) lines against which every object is
placed. That ruling is Lumen's organizing apparatus, at every layer:

- **Layout** — every screen sits on a faint RA/Dec grid (a low-opacity repeating
  ruling in the backdrop). Content snaps to it.
- **Framing** — content lives on **plates**: paper-deep panels *registered* to the
  grid with small engraver's corner ticks (crop marks), never borders. The tick is
  the frame.
- **Hierarchy is magnitude.** Importance = brightness = contrast. The primary
  element is the brightest "star" on the plate (full ink + the single amber mark);
  supporting content dims toward ink-soft, then ink-faint, the way 2nd- and
  4th-magnitude stars recede.
- **The night gets one pane.** A single deep-indigo `night-pane` per view — the
  live sky strip — is the only dark surface. It earns its darkness by being rare.

Survives a palette swap: strip every color and the ruled grid, the registered
plates, and the magnitude contrast-ramp still read as a star atlas.

# Product world

A working observer's atlas. The home view is **tonight**: what's visible from your
location, the best observing window, sky conditions, and your recent log. The
content is real astronomy — right ascension and declination, apparent magnitude,
rise/transit/set times, Moon phase and interference, Bortle class, seeing and
transparency. Not generic dashboard tiles.

# Colors

**Light mode, always.** Warm cream paper, warm near-black ink — the register of
an engraving, not a UI.

- `#FBFAF6` paper ground; `#F4F1EA` warm; `#ECE8DE` plate fill (the "deeper paper"
  a plate is printed on).
- `#181A1F` ink — warm-tinted near-black, the engraving line. `#474B54` soft,
  `#8A8E97` faint — the two dimmer magnitudes.
- **Indigo** — the signature. `#27306B` deep (the one `night-pane`, primary
  structure), `#3B4A8C` mid, `#AEB6DC` mist (the grid ruling). The color of the
  sky drawn in ink.
- **Amber** — `#E0A23B`, deepening to `#B97F22`. The single highlight: the
  first-magnitude star, the one primary action, the active object. One amber mark
  per view.
- **Ember** — `#C2421F`. Semantic only: Moon interference, cloud warnings,
  destructive actions. Kept rare and never primary.

Three accent families (indigo, amber, ember). Everything else is paper and ink.

# Typography

Four voices, all on-brief and none of them defaults:

- **Bodoni Moda** (display) — a didone, the literal voice of 18th-century
  astronomical plates. Hero and section titles, 40px+, italic for emphasis.
- **Spectral** (heading/lead) — a literary serif for subheads and leads, the
  caption voice of an atlas plate.
- **Hanken Grotesk** (body) — a clean modern grotesque; the workhorse. 17px /
  1.6, the readable UI register.
- **Space Mono** (instrument) — every measured value: RA/Dec, magnitude, times,
  Bortle class. 13–14.5px, the engraver's coordinate numerals.

Hierarchy is voice + magnitude (contrast), not size alone. Large display carries
`-0.02em` tracking.

# Layout

Three regions, ruled top to bottom:

1. **Ascension nav** — the top bar (brand, search, the single primary action),
   sitting on warm paper.
2. **The ruled field** — the working area, on the faint RA/Dec grid. Plates are
   placed on it; a `declination-rail` (left, on the dashboard) indexes sections.
3. **The night-pane** — one full-bleed indigo strip per view: on the landing it's
   the live "tonight" sky ribbon; in the app it's the sky-map. The only dark
   surface.

Mobile collapses to a single ruled column; the night-pane becomes a full-width
band; the declination-rail becomes a top scroll.

# Elevation & depth

**No drop-shadow cards.** A plate sits on the page by *tone*: it is the deeper
cream (`paper_deep`) against `paper`, with corner registration ticks. Lift comes
from raising contrast and the amber mark, not from shadow. The night-pane is the
only surface allowed a soft glow (stars), because it is the only night.

# Shapes

Radius strictly from **{0, 16, 24, 9999}**. Plates and inputs are 16px; the large
hero plate and the night-pane are 24px; the amber action, chips, and the phase
disc are pills/circles (9999). Registration ticks and the coordinate ruling are
0 — sharp, like an engraving.

# Components

Twenty primitives, all derived from the ruling:

- **Field** — coordinate-rule, plate, registration-ticks, night-pane,
  declination-rail, ascension-nav
- **Sky** — sky-ribbon, altitude-arc, transit-timeline, phase-disc, star-mark
- **Data** — magnitude-row, ephemeris-line, object-plate, readout, magnitude-key
- **Conditions** — bortle-meter, seeing-gauge, condition-chip
- **Log** — log-entry

Each declares its magnitude (how bright = how important) and registers to the grid.

# Signature patterns

1. **Ruled, never bordered.** Every screen shows the faint RA/Dec ruling; nothing
   is separated by a line. Plates are framed by corner ticks alone.
2. **Magnitude hierarchy.** The single brightest element per plate carries full
   ink + the amber mark. If two things look equally bright, it's wrong.
3. **One amber star.** Amber appears once per view — the primary action or the
   active object.
4. **One night-pane.** Exactly one dark indigo surface per view. The page stays
   light around it.
5. **Coordinates are mono.** Every measured value is set in Space Mono — it reads
   as instrumentation, distinct from prose.

# Imagery direction

Engraved line-work, not photographs. Constellation figures and object glyphs are
drawn as thin indigo strokes with amber stars at the magnitude points — inline SVG
or CSS, in the paper register. The only photographic-dark moment is inside the
night-pane. No glowing-screen space photography as chrome.

# Motion

Quiet and instrument-like. The sky ribbon drifts slowly (sidereal, 90s+ loops) in
the night-pane only. Hover raises a plate's magnitude (contrast up, the tick marks
sharpen) over 240ms — no shadow, no bounce, no elastic. `prefers-reduced-motion`
halts the sidereal drift; the magnitude hover still resolves instantly.

# Do's and don'ts

## Do
- keep the page light; give the night exactly one pane
- frame plates with corner registration ticks, not borders
- show the faint coordinate ruling on every screen
- set every measured value in mono
- reserve amber for one element per view

## Don't
- do not use a dark page background, drop-shadow cards, or borders
- do not let radius leave {0, 16, 24, 9999}
- do not use Inter / Poppins / Fraunces / Geist
- do not add a second amber mark or a second night-pane
- do not photograph the sky as chrome — draw it
