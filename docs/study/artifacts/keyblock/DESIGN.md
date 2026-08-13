---
version: 1
name: Keyblock
description: Ukiyo-e keyblock ink on a Swiss modular grid — flat plates of indigo, paper, and vermillion slipping just out of register, for products built around long reading.
colors:
  bg: "#FFFFFF"
  surface: "#EEF1F8"
  text: "#131A38"
  muted: "#5B647F"
  border: "transparent"
  accent: "#E23A21"
  on-accent: "#FFFFFF"
  success: "#1E7A4F"
  warning: "#C27A00"
  error: "#C22F18"
  info: "#24359E"
typography:
  display: "Archivo"
  body: "Inter"
  google_fonts_url: "https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap"
  body_size: "17px"
  display_tracking: "-0.02em"
rounded: 0
spacing:
  unit: 8
  scale: [8, 16, 24, 40, 64, 96, 144]
components: [button, card, input, textarea, select, checkbox, switch, slider, badge, tabs, table, tooltip, dialog, sheet, separator, dropdown-menu]
---

# Keyblock

## Overview

Keyblock crosses the master line block of ukiyo-e printmaking with the Swiss
modular grid. Indigo ink (`#131A38`) does the work the keyblock does in a
print: it carries every line, every display headline, and every solid block of
navigation. Color arrives the way it does off a second block — as flat plates
of vermillion (`#E23A21`) and registration blue (`#24359E`) that sit just out
of register beneath the paper.

The signature mechanic is **kento registration**: a flat color plate offset
8–10px behind a paper card, as if the color block slipped against the keyblock.
It recurs on cards, stat tiles, charts (ink bars over vermillion plates),
the primary button's hover, and the form plate. The quiet grid motif is the
**kento corner mark** — a small vermillion right-angle notch that opens every
section title, exactly where a printer cuts the registration notch.

Everything sits on a strict 12-column grid with radius 0 throughout: one
geometry, cut edges, no borders anywhere. Surfaces separate by tone — paper
(`#FFFFFF`) against washed paper (`#EEF1F8`) — never by outline.

## Colors

| Role | Hex | Use |
| --- | --- | --- |
| Ink (text) | `#131A38` | All reading text, display type, solid press blocks, table headers, chart bars |
| Paper (bg) | `#FFFFFF` | Page ground |
| Washed paper (surface) | `#EEF1F8` | Cards, form controls, alternating table rows |
| Slate (muted) | `#5B647F` | Secondary text, captions, labels — cool, derived from the ink's hue |
| Vermillion (accent) | `#E23A21` | The lamp: primary actions, offset plates, kento marks, one highlighter |
| Registration (info) | `#24359E` | Links, focus rings, selected states, "tonight" markers |
| Success | `#1E7A4F` | Complete states, positive deltas |
| Warning | `#C27A00` | Paused states |
| Error | `#C22F18` | Destructive actions, field errors (re-inks the field, never outlines it) |
| On-accent | `#FFFFFF` | Text on any ink, vermillion, or registration plate |

Border is `transparent` — Keyblock is a no-border language. At most three
accents appear on any screen: ink, vermillion, and registration blue.

## Typography

- **Display: Archivo 900**, always tracked `-0.02em`, line-height ≤ 1.1.
  Display type is the keyblock — cut it heavy, set it flush left, and when it
  sits on imagery put it in a solid ink press block, never on a scrim.
- **Body: Inter 400/500** at 17px minimum, line-height 1.6. Captions and
  metadata drop to 14.5px in slate.
- Weights: Archivo 500/700/900 for display and panel titles; Inter 600/700 for
  labels, buttons, and table headers.
- Load via the production Google Fonts URL in the frontmatter.

## Layout

- 12-column modular grid, max content width 1240–1280px, centered; only the
  hero image spans 100vw.
- Spacing scale 8 / 16 / 24 / 40 / 64 / 96 / 144; sections breathe at 96–112px
  vertical; titles always carry padding above.
- Radius 0 on every element — buttons, cards, controls, images. One geometry.
- Mobile (≤640px) stacks to one column, hides non-essential nav links and
  table columns, and never overflows horizontally. Grids use
  `minmax(0,1fr)` columns and `min-width:0` children.
- Ultra-wide caps and centers content (max 1440px) while the hero stays
  full-bleed.

## Components

- **Button** — one shared control height (52px page / 48px console), radius 0.
  Primary is vermillion on white text; on hover it lifts −3px and reveals a
  hard ink shadow (the plate beneath). Secondary is washed paper; destructive
  is quiet red text until hovered. Focus is a 3px registration-blue ring.
- **Card** — the kento plate: washed-paper face over a flat offset color plate
  (ink, vermillion, or registration blue). Never nested, never outlined.
- **Input / Textarea / Select** — washed-paper fill, no border, 17px text.
  Select draws its own ink chevron. Errors re-ink the field with an inset
  vermillion-red plate and a bold hint line.
- **Checkbox / Switch / Slider** — square 26px checkbox that fills with ink;
  switch track fills vermillion when on; slider thumb is a square vermillion
  block on a washed-paper rail.
- **Badge** — small solid plates: registration blue (running), vermillion
  (new), green (complete), amber (paused), washed paper (draft).
- **Tabs** — a washed-paper tray; the active tab takes the full ink plate.
- **Table** — ink header band with paper text; rows alternate paper and washed
  paper; a hovered row takes the full ink plate.
- **Tooltip** — solid ink block with a cut triangle pointer.
- **Chart** — ink bars with a vermillion plate offset beneath; the current
  period prints in registration blue. Data is printed, not plotted.
- **Timeline** — square vermillion/blue/green notches on a washed-paper rail.

## Do's and Don'ts

**Do**

- Cut display type heavy (Archivo 900, −0.02em) and set it in solid ink press
  blocks over imagery.
- Slip one flat color plate 8–10px out of register beneath cards, stats, and
  charts — rotate ink, vermillion, and registration blue.
- Open section titles with the vermillion kento corner mark.
- Separate surfaces by tone (paper vs washed paper) and space only.
- Keep vermillion scarce — it is the lamp in the print, not the wallpaper.

**Don't**

- Don't draw borders, outlines, or divider rules anywhere — no hairlines, no
  card edges, no special top edges.
- Don't round a corner — every radius is 0.
- Don't use gradients or scrims; overlays on imagery are solid blocks.
- Don't warm the neutrals — greys stay cool and indigo-derived.
- Don't let more than three accents onto a screen, and never use vermillion
  for large background washes.

## shadcn/ui Usage

Keyblock ships a full shadcn/ui projection. Use the registry theme with
`@/components/ui/*` primitives, then apply the component recipes so the
primitives carry the language rather than the shadcn house style:

- Registry theme: `/shadcn.json` (registry:theme with cssVars mapped from the
  tokens above — `--radius: 0rem`, transparent borders, vermillion primary).
- Component recipes: `/shadcn-components.md` — how each of the 16 primitives
  takes the kento plate, the ink press block, and the shared control height.
- Preview scenes: `/shadcn-shots.json` — three renderable product scenes
  (application shell, detail editor, data operations) in the Kento reading
  world.
- Combined projection: `/language/en-019ffd07-2349-7e22-94f5-174852213c0b/DESIGN.with-shadcn.md`.

Map tokens to shadcn cssVars: `background=#FFFFFF`, `foreground=#131A38`,
`primary=#E23A21`, `primary-foreground=#FFFFFF`, `secondary=#EEF1F8`,
`muted-foreground=#5B647F`, `ring=#24359E`, `border=transparent`,
`radius=0rem`. Buttons and inputs share one height; every focus state is the
registration-blue ring; charts use ink bars with vermillion offset plates.
