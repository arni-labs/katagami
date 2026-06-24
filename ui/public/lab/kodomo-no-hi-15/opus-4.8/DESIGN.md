# Yaguruma

> **矢車** — the arrow-wheel that sits at the very top of every koinobori pole.
> It is the first thing the wind touches and the part that turns. When the morning
> breeze comes up the valley, the yaguruma spins before a single carp lifts — it
> reads the wind and tells the whole pole which way the day is going.

Yaguruma is a bright, grown-up graphic-design language for Kodomo no Hi (Children's
Day). It takes the open luminous sky of early summer, the rising koinobori, and the
turning arrow-wheel, and pushes them into confident editorial poster work: enormous
white space, decisive type, and three electric highlighter accents that read like
freshly-inked screen-print. Clean and airy, never childish, never muddy.

---

## 1. Point of view

- **One ownable idea — the turning arrow-wheel.** Every surface carries a radial
  arrow-spoke mark drawn from one system. It is a logo at rest, a section opener
  in motion, and a live *wind gauge* component in the product. It always means the
  same thing: *the wind is up; the season has turned.*
- **Poster, not page.** Composition is editorial — a few enormous elements, decisive
  asymmetry, generous air. Type does the heavy lifting; colour is rationed like a
  highlighter, never poured.
- **Bright by construction.** The ground is pure white. Tone — not borders — separates
  surfaces. Accent colour appears in small, high-energy quantities so it never goes
  muddy.
- **Grown-up.** This is a product an adult launches. No confetti, no mascots, no toy
  rounding. The festival's joy comes through composition and colour, not decoration.

## 2. Naming

`Yaguruma` — one distinctive cultural noun, drawn from the language's single
strongest motif (the arrow-wheel atop the pole). Kodomo no Hi is genuinely a Japanese
subject, so a Japanese object-name is on-theme rather than a default. It is not a mood
word, not an adjective, not a portmanteau, carries no ID or era, and uses no banned
token. One word carries the idea, so no grounding maker-noun is added.

## 3. Colour

Neutrals are tuned cool to sit under a sky-blue palette. The ground is pure white; the
surface tone is a near-white cool tint used for separation, never a pastel wash.

| Role | Token | Value | Use |
|------|-------|-------|-----|
| Ground | `--bg` | `#FFFFFF` | Page background |
| Surface | `--surface` | `#F4F7FC` | Cards, panels (raised by tone + shadow) |
| Sunken | `--surface-sunken` | `#ECF1FA` | Wells, track grooves, table zebra |
| Ink | `--text` | `#0B1020` | Body & display text |
| Muted | `--muted` | `#5A627A` | Secondary text, captions |
| Hairline | `--border` | `#E5EAF3` | Reserved; used only where tone can't separate |

**The three highlighter accents** (rule: ≤3, used like highlighters):

| Token | Value | Name | Role |
|-------|-------|------|------|
| `--accent`   | `#1B4DFF` | Electric azure | Primary action, links, the clear-sky blue |
| `--accent-2` | `#00BE68` | Fresh green | Growth, positive state, the early-summer leaf |
| `--accent-3` | `#FF3A24` | Vermilion | The carp red — the single hot pop, used sparingly |
| `--on-accent`| `#FFFFFF` | — | Text/icons on any filled accent |

**Semantic roles** map onto the accents so a palette swap recolours them; amber is the
only extra hue and stays a small status-only role.

```
--success:#07A35A;   --warning:#F2A200;   --error:#FF3A24;   --info:#1B4DFF;
```

Usage discipline: azure leads; green and vermilion are spot accents. Never tint a whole
background with an accent; never run more than ~10% of any view in accent colour.

## 4. Type

| Token | Family | Notes |
|-------|--------|-------|
| `--font-display` | **Archivo** (800–900) | Poster headlines; `letter-spacing:-0.02em` |
| `--font-body` | **Inter** (400–600) | Body & UI; base 17px |
| `--font-kanji` | **Zen Kaku Gothic New** (700–900) | Heavy Japanese face for こどもの日 / 鯉のぼり |

Scale (body never below 17px; table rows never below 14.5px):

```
--fs-caption: 14.5px;   --fs-body: 17px;     --fs-lead: 20px;
--fs-h3: 25px;          --fs-h2: 34px;       --fs-h1: 52px;
--fs-display: clamp(2.75rem, 8.5vw, 7rem);   /* hero only */
line-height: 1.6 body, 1.05 display.
```

High contrast only: ink on white/surface, white on filled accent. Never light-on-light
or dark-on-dark.

## 5. Geometry, spacing, elevation

- **Radius** — one coherent set only: `--r-card:24px`, `--r-control:16px`,
  `--r-pill:9999px`, `--r-flush:0` (full-bleed graphic blocks & the arrow-wheel art).
  No in-between radii.
- **Spacing** — 8px base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`. Titles always
  carry padding above them; sections breathe.
- **Elevation by tone + shadow, never borders:**
  `--shadow-sm: 0 1px 2px rgba(11,16,32,.06), 0 4px 14px rgba(11,16,32,.05)`
  `--shadow-md: 0 10px 34px rgba(11,16,32,.09)`
  `--shadow-lg: 0 24px 64px rgba(11,16,32,.13)`

## 6. The one control height

Every interactive control — button, input, select, search, date field — stands on a
single shared height token:

```
--control-h: 48px;
```

Compact contexts reduce *padding*, never the height. One height keeps every form,
toolbar, and filter row optically aligned.

## 7. State matrix

Visible focus is mandatory on every control:

```
--ring: 0 0 0 3px color-mix(in srgb, var(--accent) 38%, transparent);
```

| Control | Default | Hover | Focus (visible ring) | Active | Disabled |
|---------|---------|-------|----------------------|--------|----------|
| **Button / primary** | `--accent` fill, `--on-accent` text | brightness +6%, `--shadow-md` | `--ring` + 2px offset | brightness −6%, translateY(1px) | `--surface-sunken` fill, `--muted` text, 0.6 opacity, no pointer |
| **Button / secondary** | `--surface` fill, ink text, `--shadow-sm` | surface→white, `--shadow-md` | `--ring` | translateY(1px) | 0.5 opacity |
| **Button / ghost** | transparent, accent text | `--surface` fill | `--ring` | surface-sunken fill | 0.45 opacity |
| **Input / select / textarea** | `--surface` fill, no border | fill→white | `--ring` + ink text | — | sunken fill, muted text |
| **Checkbox / radio** | sunken box | accent hairline glow | `--ring` | — | 0.5 opacity |
| **Switch** | sunken track | track lightens | `--ring` on knob | knob nudges | 0.5 opacity |
| **Link** | accent, no underline | underline (1px, accent) | `--ring`, radius pill | accent darker | muted |
| **Tab** | muted text | ink text | `--ring` | ink + accent under-rule | 0.5 opacity |

All controls share `--r-control` (pills use `--r-pill`), the one height, and centred,
evenly-padded labels.

## 8. Surfaces by tone

Three planes, separated by tone and shadow — **no card ever carries a border or a single
accent edge** (rule 10/37):

1. **Ground** `--bg` (#FFF) — the page.
2. **Surface** `--surface` — cards and panels lift off the ground by tone + `--shadow-sm`.
3. **Sunken** `--surface-sunken` — input wells, table grooves, gauge tracks recede.

The top nav sits openly across the header — never trapped in a pill or floating card.
Cards never nest inside cards.

## 9. The signature mechanic — the arrow-wheel (yaguruma)

A single SVG system, reused everywhere, recoloured from semantic roles so it survives a
palette swap:

- **Construction.** `N` arrow-spokes (default 12) radiate from a hub on a circle. Each
  spoke is a thin shaft + chevron head. Hub = `--accent-3` (vermilion), spokes alternate
  `--accent` / `--accent-2`, rim = ink. Drawn with `currentColor`-driven role vars.
- **At rest** it is the brand mark (header, footer, favicon-scale).
- **In motion** it spins slowly on the landing hero and as section openers — the visual
  promise that the wind is up. Motion respects `prefers-reduced-motion`.
- **As a product component** it is the dashboard's **Wind gauge**: spoke count and ring
  fill encode live wind strength; the hub colour shifts to `--warning` then `--error` as
  conditions cross raising thresholds. This is its meaning made functional, not ornament.

Because it is one system tied to roles, it never becomes wallpaper: it appears once per
context, always carrying information.

## 10. Components (built once from tokens)

Buttons (primary/secondary/ghost), pill tags & status chips, stat cards, the events
table (zebra by tone, sortable headers, status chips), the wind-gauge, segmented tabs,
the full form kit (text/select/textarea/checkbox/radio/switch/date), toasts, and the
glass overlay panel used on the immersive page. Every one reads colour from the role vars
in §3 and stands on the §6 height.

## 11. Form controls — explicitly styled

No browser defaults are ever visible. Selects get a custom SVG chevron; checkboxes and
radios are custom boxes with an SVG check / filled dot; the switch is a custom track +
knob; date inputs are styled to the one height with a custom calendar affordance. All
share fill, radius, height, and the focus ring from §7.

## 12. Motion

The fully-settled state is the default and renders with no JavaScript. An inline script
sets a gate class on `<html>` to hide start-states, then drives reveals (fades, short
rises, the spinning wheel). All of it yields to `prefers-reduced-motion`. On the immersive
page, motion is the scroll-driven camera through a live 3D world (see that file).

## 13. Responsive

Renders from ~390px to 2560px+. Mobile collapses to one column, hides non-essential nav
and table columns, and never scrolls horizontally. Grids use `minmax(0,1fr)` columns and
`min-width:0` children so they never blow out. On ultra-wide, contained content caps and
centres; only the full-bleed hero spans 100vw.

## 14. Art style & media

Landing and dashboard imagery is **bright, high-key editorial lifestyle photography** —
real koinobori against luminous clear sky, generous negative space, vivid-but-clean
colour pops in the three accents. Photography reads as a shipped product (not a low-poly
or illustrated scene). The immersive page carries **no** photography: it is one
continuous real-time flat-shaded low-poly 3D world.

### Credits
The language is an aggregate of recognizable influences:

- **Koinobori & yaguruma folk tradition** — *kind:* cultural tradition. The carp-streamer
  and the arrow-wheel atop the pole; the source of the signature mechanic and subject.
- **International Typographic Style (Swiss design)** — *kind:* movement. The grid,
  rationed colour, and decisive type-led composition.
- **Mid-century Japanese travel & screen-print poster design** — *kind:* movement. The
  flat highlighter palette and poster-scale graphic confidence.
- **Flat-shaded low-poly game art** — *kind:* tradition. The immersive world's faceted
  meshes, fog, and bloom direction.

Imagery generated with `xai/grok-imagine-image` from text prompts only.
