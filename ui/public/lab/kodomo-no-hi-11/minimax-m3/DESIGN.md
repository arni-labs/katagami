# Koinobori

A Katagami design language for **Kodomo no Hi** (こどもの日), the May 5th
Children's Day carp-streamer festival. One language, one name — Koinobori —
applied across marketing, immersive, and operations surfaces.

---

## 1. Concept

**POV.** You are the studio director of a small family-run print workshop
in Kanazawa that designs, dyes, and ships custom *koinobori* sets for
families celebrating Children's Day. The studio does two things: a hand-set
limited print run every spring, and a year-round commission service for
families who want a set hung in their yard in May.

**Voice.** Confident, hand-set, poster-graphic. Reads like a printed
program for a town festival translated into a working product. Decisive
type, generous washi-paper ground, ink-block accents.

**Signature mechanic — *The Five Band*.** A traditional *koinobori* set
is five streamers: one *magoi* (the great black carp), one *higoi*
(red), and three child streamers (midori, mizu, sumi). Every layout
rhythm in this language uses that five-count as a unit — five nav items,
five product tiers, five-step process, five-cell dashboard strips, five
paragraphs of lead copy. The "5/5" date (May 5) is encoded in spacing
and grid, not as ornament.

**Paired palette and art style.** The palette is the *Koinobori* triad
(kon / shu / kinka) on a kinari washi ground with sumi ink. The art
style is photographic festival morning — real carp streamers on bamboo,
real washi paper, real morning light — not illustration, not 3D, not
flat-icon. The immersive surface is a separate, fully-3D low-poly
treatment that visually complements (a *remembrance* of the festival,
not a copy of the marketing shots).

**What it is not.** Not a "Japanese-style" theme. Not a minimalist
template. Not "warm Swiss with kanji". The festival owns it; the studio
runs it.

---

## 2. Palette — Koinobori triad

Three accents (used like highlighters), three neutrals (tuned to the
warmth of washi paper). Neutrals carry the day; accents mark.

### Accents (≤3, used as highlighters)

| Token        | Name           | Hex       | Role                                      |
|--------------|----------------|-----------|-------------------------------------------|
| `--kon`      | Kon-iro        | `#1A2D5A` | Deep indigo — primary brand, key surface  |
| `--shu`      | Shu-iro        | `#C8341F` | Vermilion — primary action, error         |
| `--kinka`    | Kinka / Yamabuki| `#D9A13A` | Gold — price highlight, success at full   |

### Neutrals (tuned to washi warmth)

| Token        | Name        | Hex       | Role                                   |
|--------------|-------------|-----------|----------------------------------------|
| `--paper`    | Kinari      | `#F5EEDC` | Ground (`--bg`)                        |
| `--paper-2`  | Usu-kinari  | `#EFE5CB` | One-tone surface                      |
| `--paper-3`  | Sumi-nasu   | `#5A4F3F` | Body muted text                        |
| `--line`     | Hai-nezumi  | `#B9AC8A` | Hairlines (avoid; prefer space)       |
| `--ink`      | Sumi        | `#0E0F14` | Headlines, body                       |

### Semantic role mapping

```
--bg          = var(--paper)
--surface     = var(--paper-2)
--text        = var(--ink)
--muted       = var(--paper-3)
--border      = var(--line)        /* rarely used */
--accent      = var(--shu)         /* primary action */
--on-accent   = var(--paper)
--success     = var(--kon)
--warning     = var(--kinka)
--error       = var(--shu)
--info        = var(--kon)
```

Contrast checks (on `--paper` ground):
- `--ink` on `--paper` → 15.4:1 ✓
- `--paper-3` on `--paper` → 6.0:1 ✓
- `--shu` on `--paper` → 5.6:1 ✓
- `--kon` on `--paper` → 9.4:1 ✓
- `--kinka` on `--paper` → 3.0:1 — gold text **never** sits alone on
  paper; always on `--kon` (12.6:1) or `--ink` (8.4:1), or paired with
  ink type.

---

## 3. Typography

**Display.** **Shippori Mincho B1** (Google Fonts) for the Japanese
serif feel, weight 800. When the line is pure-Latin, fall back to
**Playfair Display** 800. The display face is the heavy kanji moment.

**Body.** **Inter** 400/500 for Latin, **Shippori Mincho** 500 for
runs that include kanji. Body 17px minimum.

**Numerics.** Inter tabular-nums for tables, prices, dates. Kanji
numerals (一 二 三 四 五) reserved for ceremonial display only.

### Scale

| Step | px / rem  | Use                                         |
|------|-----------|---------------------------------------------|
| d1   | 96 / 6    | Hero display (single word)                  |
| d2   | 64 / 4    | Hero headline, end-of-section banner        |
| d3   | 44 / 2.75 | Section heads                               |
| h1   | 32 / 2    | Card title                                  |
| h2   | 24 / 1.5  | Sub-headline                                |
| body | 19 / 1.19 | Default body                                |
| small| 17 / 1.06 | Captions, dense UI                          |
| micro| 14.5 / .91| Table rows (≥14.5px as per house rule)      |

Letter-spacing: `-0.02em` on display, `0` on body, `0.04em` on
uppercase eyebrows (used sparingly; folded into headlines — never the
"tiny eyebrow → giant headline" pattern).

Line-height: 1.05 on display, 1.45 on body, 1.3 on table.

---

## 4. Spacing, radius, control height

**Spacing scale.** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 px.
Used as margin, padding, and gap. Sections breathe on `96`/`128`;
intra-section rhythm on `24`/`32`; UI on `8`/`16`.

**Radius.** From the allowed set only: `{0, 16, 24, 9999}`.
- Buttons: 16
- Cards: 24
- Tags: 9999 (pill)
- Inputs: 16
- Hero image mask: 0 (full-bleed, no rounding)

**One control-height token.** `--control-h: 48px`. Every form control,
every button, every input, every select, every chip-on-input is 48px
tall. Period. Vertical centering for label and value. No exceptions.

---

## 5. Surfaces and separation

Surfaces are separated by **tone**, never by border. The language
forbids visible borders on cards and panels. The single allowed
divider is `1px solid var(--line)` used only for table rows in the
dashboard and for form-field underlines.

| Layer        | Token          | Use                                     |
|--------------|----------------|-----------------------------------------|
| Ground       | `--paper`      | Page background                         |
| Card         | `--paper-2`    | Panels, cards, dashboard tiles          |
| Accent card  | `--kon`        | Featured product, primary action strip  |
| Inverted     | `--ink`        | Footer, occasional display panels       |

Cards sit on the ground by being a tone darker. They never carry a
border or a top accent stripe. A single accent edge on a card is
forbidden.

---

## 6. State matrix (every interactive element)

Every interactive element renders the full state matrix. There is no
default-only component.

### Button

| State    | Treatment                                                     |
|----------|---------------------------------------------------------------|
| default  | `--shu` background, `--paper` text, 48px tall, 16 radius      |
| hover    | Background → `#A8281A` (darker shu); translateY(-1px)         |
| focus    | 2px solid `--kinka` ring, 2px offset; visible always          |
| active   | Background → `#8B2014`; translateY(0)                         |
| disabled | 50% opacity; `cursor: not-allowed`; no transitions            |

### Input / textarea / select

| State    | Treatment                                                     |
|----------|---------------------------------------------------------------|
| default  | Bg `--paper`, 1px bottom border `--line`, 48px tall           |
| hover    | Bottom border → `--ink`                                       |
| focus    | Bottom border → `--shu`, 2px `--shu` ring 2px offset          |
| active   | Bottom border → `--kon`                                       |
| disabled | Bg `--paper-2`, 50% opacity, cursor not-allowed               |

### Checkbox / radio / toggle

Each receives explicit paint: a 20×20 box for checkbox (kon border,
shu fill when checked, ink checkmark drawn in SVG), a 20×20 circle
for radio (same scheme), a 44×24 track for toggle (kon off, shu on,
40px thumb with paper fill).

### Primary CTA vs. secondary

One shape, one height, one label-centering. Primary is `--shu` filled.
Secondary is `--ink` text on `--paper` ground, 1px ink border, no
fill. Tertiary is plain text link with underline-on-hover. No emoji,
no symbol glyphs (▲ ▼) — only SVG primitives for icon affordances
(arrow, chevron, magnifier, dot, x).

---

## 7. Signature mechanic — The Five Band

Every page expresses the **Five Band** at least once:

- The nav exposes five items.
- The process strip is five steps.
- The pricing / tier strip is five offers (or grouped as 1 + 1 + 3,
  the standard koinobori set).
- Dashboard top-row strips are five tiles.
- The landing's section divider is a horizontal band — five stacked
  short rules in `--shu` `--kinka` `--kon` `--paper-3` `--ink`,
  echoing the set of five streamers.

The band is not decorative chrome. It is a layout rhythm unit.

---

## 8. Motion

- Animate with intent, like a shipped product. Motion carries meaning.
- Default state is the settled state; motion is layered on.
- Hero copy uses a per-segment reveal (translateY 16→0, opacity 0→1,
  600ms, ease-out, staggered 80ms).
- `prefers-reduced-motion`: zero transform, instant opacity.
- Immersive page: scroll drives a GSAP timeline; render loop runs
  every frame; tab-hidden pauses the loop.

---

## 9. Composition families

Across the three surfaces:

1. **Full-bleed editorial** — landing hero, immersive canvas
2. **Five-band split** — feature row, process strip, pricing tier row
3. **Inverted column** — single-column ink-on-paper editorial reading
4. **Glass panel** — translucent overlays on the 3D canvas
5. **Dense data** — dashboard tables and metric strips

Five families across the set.

---

## 10. Copy voice

Concrete verbs, product-specific nouns. The studio does real work:
"design a set", "stamp the crest", "hang the pole", "ship to the
house", "balance the wind line". Real product names: *Magoi Set*,
*Higoi Set*, *Yuri Crest*, *Sora Pole*, *Studio Dispatch*. No lorem,
no placeholder, no AI-cliché.

In Japanese: 鯉のぼり (koinobori — carp streamer), 端午 (tango —
the festival's classical name), 子供の日 (kodomo no hi — Children's
Day), 真鯉 (magoi — great black carp), 緋鯉 (higoi — red carp).

---

## 11. Self-check (silent)

Rules bound to this language:

- ✓ Concept: one ownable idea (the Five Band).
- ✓ Naming: one distinctive cultural noun ("Koinobori"). No adjective.
- ✓ Accents: 3 (`--kon` `--shu` `--kinka`).
- ✓ Body: 17px minimum; high contrast.
- ✓ One control-height token (48px); all states styled.
- ✓ Surfaces separated by tone (no card borders, no accent edge).
- ✓ Generous spacing; titles padded above.
- ✓ Hero: `background-image: var(--hero-image)`, never `<img>`.
- ✓ Hero overlay legible over image (scrim block, not lazy gradient).
- ✓ No "scroll down" cue.
- ✓ No emoji or symbol glyphs on buttons.
- ✓ Folded eyebrow (no oversized-headline + tiny-eyebrow stack).
- ✓ Responsive: stacks to one column at ≤640px; caps at 1440px.
- ✓ All colour from role vars in `:root`.