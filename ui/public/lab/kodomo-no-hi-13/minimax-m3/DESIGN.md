# Nobori

> A Katagami design language for **Kodomo no Hi** — Japanese Children's Day / Koinobori.
> Bright, airy, hopeful early-summer pushed into confident editorial graphic design.
> Sleek, grown-up, never childish, never cluttered.

---

## 1. Concept

**Nobori** (のぼり — the windsock) is the central motif of Kodomo no Hi: a column of carp
streamers climbing a pole, each fish a wish for a child's courage and growth. The festival
is the moment in May when the carp swim upward through clear light, fresh greenery, and
morning sky toward the waterfall that turns them into dragons.

The language takes that **vertical ascent** — the carp climbing, the pole, the column of
color against open sky — and turns it into a graphic-design system. Every surface reads
upward: stacked panels, rising type, accents that mark the climb. The palette is the
festival's actual light: white-paper sky, electric river-blue, fresh-leaf green, and the
single hot vermillion of the madai (red carp) that leads the column.

**One ownable idea — the signature mechanic:**
> **The Highlighter Column.** A vertical accent bar (8px wide, full-bleed top-to-bottom)
> marks the "rise" of the page. Every accent-coloured element (a date, a number, a label)
> sits flush against this column, like a fish swimming up the pole. The column itself is
> the language's spine — it appears on every surface, always in the same place, always
> in the same accent.

**What it is not:** not a pastel nursery, not a folk-art illustration, not a "Japanese
minimalism" cliché. The carp is a graphic mark, not a kawaii mascot. The sky is white,
not grey. The accent is hot, not muted.

---

## 2. POV

> "A grown-up product launched on Children's Day morning. The hero is a poster, not a
> card. The accent is a highlighter, not a decoration. The page reads upward, like the
> carp climbing the pole."

The reader is a parent, a designer, a curator — someone who would actually buy a thing
made in this language. The product world is concrete: a real festival app, a real
community dashboard, a real immersive experience. No lorem, no "design system", no
specimen framing.

---

## 3. Tokens

### 3.1 Color

| Role            | Token             | Value      | Notes                                         |
|-----------------|-------------------|------------|-----------------------------------------------|
| Background      | `--bg`            | `#FFFFFF`  | Pure white paper. The festival's open sky.    |
| Surface         | `--surface`       | `#F4F8FB`  | A barely-there cool tint. Sky-on-paper.       |
| Surface raised  | `--surface-raised`| `#EAF2F7`  | One step deeper, used for inset wells.        |
| Text            | `--text`          | `#0B1220`  | Deep ink. Warm-black, not blue-black.         |
| Muted           | `--muted`         | `#5A6675`  | Cool grey for secondary copy.                 |
| Border (soft)   | `--border`        | `#E2E8EE`  | Hairline. Used sparingly.                     |
| Accent 1 (lead) | `--accent`        | `#00B5FF`  | Electric sky-blue. The river, the sky, the climb. |
| Accent 2        | `--accent-2`      | `#00C853`  | Fresh-leaf green. New growth.                  |
| Accent 3 (hot)  | `--accent-3`      | `#FF3D5A`  | Hot vermillion. The madai — the lead carp.     |
| On-accent       | `--on-accent`     | `#FFFFFF`  | White over any accent.                        |
| Success         | `--success`       | `#00C853`  | = accent-2.                                   |
| Warning         | `--warning`       | `#FFB020`  | Single semantic. Used only for status.        |
| Error           | `--error`         | `#FF3D5A`  | = accent-3.                                   |
| Info            | `--info`          | `#00B5FF`  | = accent.                                     |

**Three accents, used like highlighters.** Never as fills for large surfaces. Never
stacked. The vermillion is the rarest — it marks the lead, the climax, the one thing
that matters.

### 3.2 Typography

| Role        | Family                          | Size / line-height         | Weight | Tracking |
|-------------|---------------------------------|----------------------------|--------|----------|
| Display XL  | `'Space Grotesk', sans-serif`   | 96px / 0.92                | 700    | -0.03em  |
| Display L   | `'Space Grotesk', sans-serif`   | 72px / 0.95                | 700    | -0.025em |
| Display M   | `'Space Grotesk', sans-serif`   | 56px / 1.02                | 700    | -0.02em  |
| H1          | `'Space Grotesk', sans-serif`   | 40px / 1.1                 | 700    | -0.02em  |
| H2          | `'Space Grotesk', sans-serif`   | 28px / 1.2                 | 600    | -0.01em  |
| H3          | `'Space Grotesk', sans-serif`   | 20px / 1.3                 | 600    | 0        |
| Body        | `'Inter', sans-serif`           | 17px / 1.55                | 400    | 0        |
| Body small  | `'Inter', sans-serif`           | 15px / 1.5                 | 400    | 0        |
| Caption     | `'Inter', sans-serif`           | 13px / 1.4                 | 500    | 0.02em   |
| Kanji heavy | `'Noto Sans JP', sans-serif`    | matches display size       | 900    | -0.02em  |
| Mono        | `'JetBrains Mono', monospace`   | 14px / 1.45                | 500    | 0        |

**Type is the language.** The display face is wide, geometric, slightly condensed —
Space Grotesk's signature. Kanji uses Noto Sans JP Black so こどもの日 / 鯉のぼり sit with
the same weight as the Latin display. Body is Inter — neutral, high-readability.

### 3.3 Spacing

| Token | Value | Use                              |
|-------|-------|----------------------------------|
| `0`   | 0     | Reset                            |
| `1`   | 4px   | Inline gap                       |
| `2`   | 8px   | Tight stack                      |
| `3`   | 12px  | Default stack                    |
| `4`   | 16px  | Card inner padding (min)         |
| `5`   | 24px  | Section inner                    |
| `6`   | 32px  | Block gap                        |
| `7`   | 48px  | Section gap                      |
| `8`   | 64px  | Major section                    |
| `9`   | 96px  | Hero / page-level                |
| `10`  | 128px | Display breathing                |

### 3.4 Radius

Allowed set: `{0, 16, 24, 9999}`.

| Token       | Value | Use                              |
|-------------|-------|----------------------------------|
| `--r-0`     | 0     | Editorial blocks, posters        |
| `--r-16`    | 16px  | Default surface (cards, panels)  |
| `--r-24`    | 24px  | Hero panels, large wells         |
| `--r-pill`  | 9999px| Pills, tags, avatars             |

### 3.5 Elevation

No drop shadows. Surfaces are separated by **tone**, not by shadow or border. The only
"elevation" is a 1px hairline border in `--border` for inputs and dividers — never
decorative.

### 3.6 Control height — ONE token

```css
--control-h: 48px;
```

Every interactive control — button, input, select, checkbox hit area, tag — measures
48px tall. No exceptions. The label is centred, the padding is `0 20px` for buttons,
`0 16px` for inputs. A button set shares one shape (radius 16) and one height.

### 3.7 State matrix

| State     | Treatment                                                                 |
|-----------|---------------------------------------------------------------------------|
| Default   | Token colours as defined.                                                 |
| Hover     | Background darkens 4% (`color-mix(in oklab, var(--bg), var(--text) 4%)`). |
| Focus     | 3px ring `var(--accent)` at 40% opacity, 2px offset. **Always visible.**  |
| Active    | Background darkens 8%, scale 0.98.                                        |
| Disabled  | Opacity 0.4, cursor not-allowed, no transitions.                          |

Focus ring is non-negotiable. Every interactive element gets one.

---

## 4. Surfaces

Surfaces are separated by **tone**, not by borders or shadows.

| Surface        | Tone                | Use                              |
|----------------|---------------------|----------------------------------|
| Page           | `--bg`              | The default. Pure white.         |
| Card           | `--surface`         | One step cooler.                 |
| Well           | `--surface-raised`  | Inset, sunken.                   |
| Accent panel   | `--accent`          | The lead column, the highlighter.|

A card never gets a border. A card never gets a shadow. A card is just a tone, with
generous padding above its title.

---

## 5. Components

All components are built from tokens. No magic numbers.

### 5.1 Button

```
height: var(--control-h)
padding: 0 20px
radius: 16
font: H3 weight 600
label centred
```

| Variant     | Background    | Text         | Use                       |
|-------------|---------------|--------------|---------------------------|
| Primary     | `--accent`    | `--on-accent`| The one clear action.     |
| Secondary   | `--surface`   | `--text`     | Quiet supporting action.  |
| Ghost       | transparent   | `--text`     | Tertiary, in-text action. |
| Hot         | `--accent-3`  | `--on-accent`| The lead, the climax.      |

### 5.2 Input

```
height: var(--control-h)
padding: 0 16px
radius: 16
background: --bg
border: 1px solid --border
focus: 3px ring --accent at 40%, 2px offset
```

Every form control is styled. No browser defaults. Checkbox, radio, select, textarea,
toggle, slider — all built once from tokens.

### 5.3 Tag / Pill

```
height: 28px
padding: 0 12px
radius: 9999
font: caption weight 500
```

### 5.4 The Highlighter Column

The signature mechanic. An 8px wide vertical bar, full height of its container,
background `--accent`. Used to mark the "rise" of a section. Accent-coloured text and
numbers sit flush against it. The column is the language's spine.

### 5.5 The Carp Mark

A flat geometric carp silhouette, built from primitives — a teardrop body, a circular
eye, a triangular tail. Used as a logo mark, a section divider, a loading state. Never
illustrated, never kawaii — always a graphic mark.

---

## 6. Motion

Motion is intentional, not decorative. The settled state is the default — visible
without JavaScript. An inline script gates a hidden start-state behind a class on
`<html>`, drives the reveal, and respects `prefers-reduced-motion`.

| Pattern        | Duration | Easing                        | Use                |
|----------------|----------|-------------------------------|--------------------|
| Rise           | 600ms    | `cubic-bezier(.2,.7,.2,1)`    | Vertical reveal    |
| Settle         | 400ms    | `cubic-bezier(.2,.7,.2,1)`    | Hover settle       |
| Page enter     | 800ms    | `cubic-bezier(.16,1,.3,1)`    | First paint        |
| Camera         | scroll   | CustomEase per segment        | Immersive only     |

---

## 7. Layout families

The landing uses four distinct layout families across its sections (per TR-029 spirit):

1. **Editorial poster** — hero. Asymmetric, large type, single accent.
2. **Stacked column** — features. Vertical rhythm, the highlighter column on the left.
3. **Bento grid** — programs. Mixed sizes, accent-highlighted tiles.
4. **Long-form prose** — story. Single column, generous measure, accent pull-quotes.

The dashboard uses: a top metric row, a two-column main, a wide chart, a side rail.
The immersive page is one continuous canvas.

---

## 8. Naming

- **Language:** Nobori (のぼり) — the windsock itself.
- **Product (landing):** Nobori Festival — a real Children's Day app for families.
- **Product (dashboard):** Nobori Studio — the curation console for festival organizers.
- **Product (immersive):** Nobori World — the 3D climb experience.

Names are concrete product names, not lorem.

---

## 9. Credits

- **Inspiration:** Japanese Children's Day festival tradition, koinobori carp streamers,
  the madai (red carp) as the lead of the column.
- **Type:** Space Grotesk (Florian Karsten, SIL OFL), Inter (Rasmus Andersson, SIL OFL),
  Noto Sans JP (Google, SIL OFL), JetBrains Mono (JetBrains, SIL OFL).
- **Art direction:** Editorial poster tradition — Müller-Brockmann, Japanese travel
  posters (1930s), contemporary Swiss editorial.
- **3D direction:** Flat-shaded low-poly game aesthetic — Monument Valley, Alto's
  Odyssey, Journey.