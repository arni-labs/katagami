# Harema — 晴れ間

**A design language for Kodomo no Hi, built around a clear-sky moment.**

*Harema* (晴れ間) means the break in the clouds — the patch of bright sky that opens up
mid-season and lets the koinobori rise. It is the feeling this language is built to hold:
clear light, fresh early-summer air, carp streamers lifting on a confident wind. Children's
Day, but designed the way an adult product team would ship it — calm, sharp, and grown-up.

Harema is the brand of a real product: a platform where families log their children's
milestones and plan the small celebrations around them. The landing page sells that product;
the dashboard *is* that product. One language, both surfaces.

---

## 1. Point of view

Three commitments hold the whole system together.

1. **Open white first.** The page is mostly air. White is not the gap between content — it
   *is* the content. Everything else earns its place against a wide, bright field.

2. **Accent like a highlighter, never like paint.** Colour arrives in sharp, vivid hits — a
   marker swash under a headline, a single solid block, one carp-red call to action. The
   palette is almost-neon and absolutely clean. We never wash a whole section in pastel, never
   muddy a colour, never gradient-fade. A highlighter is opaque, deliberate, and small.

3. **Editorial type, distributed weight.** Big Space Grotesk display set tight, against quiet
   Hanken Grotesk text. Posters, not paragraphs. The composition does the talking; ornament
   stays out of the way.

What Harema is **not**: childish, cluttered, toy-like, gradient-soaked, or border-heavy. The
festival is the subject; the treatment stays adult.

---

## 2. Colour

Pure neutrals carry the system. Three accents do the highlighting — and only the highlighting.

### Neutrals
| Token | Value | Role |
|---|---|---|
| `--paper` | `#FFFFFF` | Default surface. The dominant colour of every page. |
| `--paper-2` | `#F4F7FB` | A near-white cool tint for the occasional grouped panel. Used sparingly; never a mood wash. |
| `--ink` | `#0B1020` | Primary text and display. Near-black with a trace of blue. |
| `--ink-2` | `#3A4254` | Secondary text. |
| `--ink-3` | `#6B7385` | Muted labels, captions, placeholders (4.76:1 on white). |
| `--hairline` | `rgba(11,16,32,.08)` | The *only* sanctioned line — table row dividers. Nothing decorative. |

### Accents (use like a highlighter — ≤3, sparing)
| Token | Value | Meaning | Text rule |
|---|---|---|---|
| `--azure` | `#1657FF` | Primary. The clear sky. Brand, primary actions, focus, links. | White text OK (5.47:1). |
| `--green` | `#00C271` | Growth, "on track", positive data. | **Ink text only** (7.99:1). White fails — never use it. |
| `--vermilion` | `#FF3B1E` | The carp red. One hot pop: a single hero CTA, the marker swash, large display words. | Decorative / large display only (3.56:1) — never as small body text on white, never white small text on it. |

Supporting tints (for chip fills and bars, derived — still clean, never muddy):
`--azure-700 #0E45D8` (hover), `--azure-050 #EAF0FF`, `--green-050 #E4F8EF`,
`--vermilion-050 #FFEBE7`.

**Contrast law.** Every colour pairing in this system was checked. White-on-azure 5.47,
ink-on-green 7.99, ink-on-white 19+, muted-on-white 4.76. Green and vermilion never carry
small text on a light field. No light-on-light, no dark-on-dark, anywhere.

### The highlighter mechanic
The signature gesture. A marker swash sits in the bottom third of a word, text stays full ink:

```css
.hl { background: linear-gradient(transparent 60%, var(--c) 60%, var(--c) 92%, transparent 92%); }
.hl-azure { --c: #1657FF; }  .hl-green { --c: #00C271; }  .hl-vermilion { --c: #FF3B1E; }
```

Used on at most one or two words per view. It is the whole brand in one move.

---

## 3. Type

Two grotesks and one kana face. Loaded from Google Fonts.

| Role | Family | Notes |
|---|---|---|
| Display / headings | **Space Grotesk** | 500 & 700. Tracking `-0.03em` on large sizes. Carries the poster voice and all big numerals. |
| Body / UI | **Hanken Grotesk** | 400–700. Everything you read and click. Warm, even, legible small. |
| Japanese (晴れ間, kana labels) | **Zen Kaku Gothic New** | 500 & 700. For the wordmark and Japanese accents. |

### Scale
| Token | Size | Use |
|---|---|---|
| `--fs-display` | `clamp(2.8rem, 6vw, 5.5rem)` | Hero headline |
| `--fs-h1` | `clamp(2.1rem, 4vw, 3.4rem)` | Section titles |
| `--fs-h2` | `clamp(1.55rem, 2.6vw, 2.3rem)` | Sub-section / card group titles |
| `--fs-h3` | `1.35rem` | Card titles |
| `--fs-lead` | `1.3rem` | Lead paragraph under a title |
| `--fs-body` | `1.0625rem` (17px) | Body — the floor for reading text |
| `--fs-sm` | `0.9375rem` (15px) | Secondary, table cells (≥14.5px) |
| `--fs-xs` | `0.8125rem` (13px) | Eyebrows & labels — always uppercase, `letter-spacing:.14em` |

Line-height: `1.04` display, `1.18` headings, `1.6` body. Display always carries top
margin/padding — titles never touch a container's top edge.

---

## 4. Space, radius, elevation

**Spacing** — 4px base: `4 8 12 16 20 24 32 40 48 64 80 96 128`. Generous by default; section
vertical rhythm runs 96–128 on the landing, 24–32 inside the dashboard.

**Radius** — `--r-sm 10` · `--r-md 14` (controls) · `--r-lg 22` (cards) · `--r-xl 28`
(feature panels) · `--r-pill 9999` · `--r-0 0` (highlighter blocks, editorial dividers).

**Elevation** — no borders; depth comes from soft shadow and white space.
- `--shadow-sm`: `0 1px 2px rgba(11,16,32,.06)`
- `--shadow-md`: `0 6px 22px -8px rgba(11,16,32,.14), 0 2px 6px rgba(11,16,32,.05)`
- `--shadow-lg`: `0 28px 70px -24px rgba(11,16,32,.24)`

**No borders.** Anywhere a border is tempting, use shadow, a fill change, or space instead.
The single exception is the `--hairline` table row divider.

---

## 5. The one control height

```
--control-h: 48px;
```

Every line control sits on it: buttons, text inputs, selects, search, the date field.
Textareas use it as their *minimum* row height. This single token is what makes a Harema
toolbar line up perfectly without anyone measuring.

Selection controls are a deliberate, separate family — a checkbox, radio dot, or switch is
not a 48px line control. They share `--select-size: 22px` and the same focus ring, so they
read as one system while staying correctly small.

---

## 6. Components (built once, every state)

All interactive states are defined: **default → hover → focus (visible ring) → active →
disabled**, plus error where it applies. The focus ring is universal:

```
--ring: 0 0 0 3px rgba(22,87,255,.40);   /* azure, 3px, offset by the control's own shadow */
```

It is shown on `:focus-visible` for every focusable element — buttons, fields, tabs, links,
checkboxes, switches.

### Buttons (height = `--control-h`, radius `--r-md`, Hanken 600)
- **Primary** — azure fill, white text. Hover → `--azure-700` + `--shadow-md` lift. Active →
  translateY(1px), no lift. Focus → ring. Disabled → opacity .45, `not-allowed`, no hover.
- **Accent** — vermilion fill, white **large** label. The single hottest CTA per surface
  (large/bold keeps it ≥3:1). Same state ladder.
- **Secondary** — white fill, ink text, `--shadow-sm`. Hover → `--paper-2` + `--shadow-md`.
- **Ghost** — transparent, ink text. Hover → `--paper-2` fill. For low-priority and icon
  buttons (icon buttons are 48×48, ghost).

### Text input / select / textarea / search
White fill, `--shadow-sm` (no border), radius `--r-md`, 48px tall, ink text, `--ink-3`
placeholder. **Focus** → azure inner outline + `--ring`. **Disabled** → `--paper-2` fill,
`--ink-3` text. **Error** → vermilion ring + helper text in vermilion. Select uses a custom
chevron (inline SVG mark), native arrow removed.

### Checkbox / radio / switch (`--select-size`)
- Checkbox — 22px, radius 6, white. Checked → azure fill + white check. Focus → ring.
- Radio — 22px circle, checked → azure ring + azure dot.
- Switch — 48×28 track, 22px knob. Off → `--paper-2`. On → azure. Focus → ring on track.

### Tabs
Text + underline. Active → ink text, 2px azure underline. Hover → ink. Focus → ring. Inactive
→ `--ink-3`.

### Chips / tags / status
Pill, `--fs-xs`. Solid vivid fills with correct text: `azure→white`, `green→ink`,
`neutral→ink on paper-2`. A status dot (green/azure/vermilion) precedes the label.

### Card
White, radius `--r-lg`, `--shadow-md`, padding 24–32, no border. Interactive cards lift to
`--shadow-lg` and translateY(-2px) on hover; focusable ones take the ring.

### Stat tile
Large Space Grotesk numeral (`--fs-h1`), eyebrow label above, a delta chip (green up /
vermilion down) below.

### Table
Header row in eyebrow style. Body cells `--fs-sm` (15px). Rows separated by `--hairline`
only; hover row → `--paper-2`. No vertical lines, no outer border.

### Progress / "rising carp"
Track `--paper-2`, fill azure or green, pill ends. In the dashboard, each child's celebration
readiness is a rising bar capped with a small carp mark — the festival metaphor made literal,
built from tokens.

---

## 7. Layout

**Landing.** A single full-bleed hero photograph opens the page; the headline and one marker
swash sit over its clean sky. Below, an editorial 12-column feel at `max-width: 1240px` with
wide gutters: alternating image/text splits, one stats band, a real in-product preview, a
traditions section, and a vermilion CTA block before the footer. Sections breathe at 96–128px
vertical rhythm.

**Dashboard.** Fixed left sidebar (nav + account), main column with a sticky top bar (title,
search, filter select, primary action, avatar). Content is a responsive card grid: a welcome
banner over a calm sky photo, a row of four stat tiles, a milestones table, the rising-carp
celebration tracker, an SVG moments chart, an upcoming list, and a full "add a milestone" form
that exercises every control and state.

**Imagery.** Bright, high-key, editorial photography — clear cerulean sky, fresh greens, a
single vermilion carp — generated to match this palette. Photographs are the only illustration;
SVG is reserved for icons, chevrons, the chart, and the carp mark. Hero gets exactly one
full-bleed image.

**Motion.** 140ms ease on hover, 90ms on active. A slow, optional carp flutter on the hero
mark. All motion is wrapped in `prefers-reduced-motion: reduce` and disabled when asked.
Light mode is the default and only mode.

---

## 8. Files
- `landing.html` — the marketing surface.
- `dashboard.html` — the product surface.
- `media/` — generated hero & feature imagery (xai/grok-imagine-image).

Both HTML files are self-contained: tokens, components, and states live in an inline
stylesheet identical across the two, so the language stays consistent surface to surface.
