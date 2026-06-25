# Katagami — the house design language (katagami.ai)

The complete design of the Katagami **site itself** — every token, ink, motif and
rule, extracted from the source. This is *not* the contract for the design languages
Katagami curates (each of those ships its own `DESIGN.md`). This is the style the
katagami.ai product is built in, so that every surface we add — gallery, language
detail, studio, palettes, art styles, lineage, compare, lab, bake-off, owner — reads
as one printed object.

Everything here is extracted from, and must stay in sync with:

- **`ui/src/app/globals.css`** — the tokens, the print layer, every motif primitive.
- **`ui/src/app/layout.tsx`** — the fonts.
- The canonical components — `app/(site)/layout.tsx` (header/footer), `components/page-hero.tsx`,
  `components/language-card.tsx`, `app/(site)/page.tsx` (the hero), `components/header-nav.tsx`.

If you change the design, change it in the CSS **and** here.

---

## 1. The aesthetic — a riso-print specimen catalog

Katagami (型紙) were the carved paper stencils used to dye kimono cloth; risograph
is stencil duplication. The whole site reads as **riso-printed on warm uncoated
paper**: a fixed drum of spot inks, second passes that misregister instead of
bordering, grain instead of gloss, rubber stamps and washi tape instead of chrome.

The paper is plain. The riso lives in the **accents and effects** — never in the
background. Light mode is the default; dark mode is the same press running on deep
indigo card stock (see §12).

The mental model for every surface: *a sheet pulled off the press and pinned to a
catalog board.* Sheets are sharp-cornered. Edges are shadow, not line. The fun lives
in the ink — a highlighter swipe over one word, a strip of tape holding a corner, a
tilted rubber stamp, the registration slipping by half a degree on hover.

---

## 2. Non-negotiables

These are the rules that make it Katagami. Breaking any one of them breaks the look.

1. **Sharp rectangles — never round a card.** `.sticker-card` is `border-radius: 0`.
   Rounding is reserved for: pills, dots, avatars (`rounded-full` = 9999) and the
   2–3px corner of a stamp or seal. **Never** put `rounded-xl` / `rounded-[16px]` on
   a content card. This is the single most common mistake.
2. **No borders.** Separation comes from soft shadow (`--shadow-card`), paper tint,
   overprint, a halftone rule, washi tape, or a stamp — **never** a grey 1px border.
   The only hairlines that exist are ink-toned (the status stamp, the featured seal),
   and even those are tints of an ink, never neutral grey.
3. **≤ 3 accent colors, used like highlighters.** The **signature trio**
   (`--sakura` · `--yuzu` · `--ramune`) carries all chrome. Support inks stay quiet
   and data-driven. `--beni` (red) is destructive-only.
4. **Pure paper + ink.** Background is pure white `--washi` (`#fff`); text is warm
   near-black `--sumi`. No pastel background washes. **No gradients** for color — use
   flat ink fields and overprinting discs for organic color.
5. **Bright and clean, never muddy.** Inks read fluorescent and printed, not painted.
6. **No emoji on buttons.** Buttons are clean, mono-uppercase, intentional.
7. **Generous spacing; titles never stuck to a container top.** Always pad above a title.
8. **Body text ≥ 16–17px.** High contrast — never dark-on-dark or light-on-light.
9. **Mono is the label voice.** Eyebrows, meta, stamps, table heads are
   `font-mono`, uppercase, wide-tracked, small, muted.
10. **Respect `prefers-reduced-motion`.** Every animation has a reduced-motion off-switch.

---

## 3. Color — the spot-ink drum

All colors are CSS custom properties defined in `globals.css` as **OKLCH** (the
source-of-truth values below). OKLCH keeps the inks perceptually even and lets the
night edition lift lightness without shifting hue. sRGB rendering varies by display;
trust the token, not a hex.

### Paper & ink (the ground)

| Token | Day (`:root`) | Role |
|---|---|---|
| `--washi` | `oklch(1 0 0)` → `#fff` | paper / page background |
| `--sumi` | `oklch(0.26 0.015 260)` | text — warm near-black |
| `--graphite` | `oklch(0.5 0.01 260)` | secondary ink |

### The signature trio — carries ALL site chrome

These three are the brand. Use them like highlighters: a swipe, a dot, a tape strip,
a stamp — small areas, high saturation.

| Token | Day | Night (`.dark`) | Character |
|---|---|---|---|
| `--sakura` | `oklch(0.7 0.21 0)` | `oklch(0.74 0.16 0)` | fluorescent pink |
| `--yuzu` | `oklch(0.88 0.18 96)` | `oklch(0.85 0.13 96)` | riso yellow |
| `--ramune` | `oklch(0.58 0.13 245)` | `oklch(0.7 0.11 245)` | riso medium blue |

### Support inks — quiet, data-driven only

Tuned to sit in the trio's family. Use for charts, per-item tints, category dots —
**never** as primary chrome. They should never compete with the trio.

| Token | Day | Night | Family |
|---|---|---|---|
| `--salad` | `oklch(0.82 0.13 112)` | `oklch(0.8 0.1 112)` | yellow-green (yuzu family) |
| `--matcha` | `oklch(0.68 0.09 150)` | `oklch(0.73 0.07 150)` | quiet green |
| `--shiso` | `oklch(0.78 0.06 175)` | `oklch(0.78 0.05 175)` | quiet mint |
| `--teal` | `oklch(0.62 0.08 222)` | `oklch(0.7 0.07 222)` | slate blue (ramune family) |
| `--sumire` | `oklch(0.55 0.09 290)` | `oklch(0.68 0.08 290)` | ink violet, subdued |

### Destructive — one ink, used sparingly

| Token | Day | Night | Role |
|---|---|---|---|
| `--beni` | `oklch(0.62 0.19 27)` | `oklch(0.7 0.17 25)` | destructive actions only |

### Semantic / shadcn mappings (day)

The shadcn-compatible variables resolve to the drum so any borrowed component inherits
the house palette:

```
--background: var(--washi);        --foreground: var(--sumi);
--card: oklch(1 0 0);              --card-foreground: var(--sumi);
--primary: var(--sumi);           --primary-foreground: oklch(1 0 0);   /* ink-on-paper button */
--secondary: oklch(0.975 0.004 260);
--muted: oklch(0.97 0.004 260);    --muted-foreground: oklch(0.52 0.012 260);
--accent: oklch(0.96 0.03 245);    /* faint ramune wash */
--destructive: var(--beni);
--border: oklch(0.9 0.006 260);    --input: oklch(0.88 0.006 260);   --ring: var(--ramune);
--chart-1..5: sakura, salad, yuzu, teal, sumire;
```

`--border` exists for borrowed shadcn chrome only. **Do not reach for it on
katagami surfaces** — the house style is borderless.

### How color is actually used (the patterns in the code)

- **Tint a card by its subject.** A language card mixes its own primary ink into the
  paper at 5%: `background: color-mix(in srgb, <tint> 5%, var(--paper-tint-base))`,
  with `--card-ink: <tint>` driving the hover overprint.
- **Stamp/chip backgrounds** are a 10–14% ink mix into paper:
  `bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))]` with the label in
  a 72% ink mix: `text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))]`.
  This is the canonical "tinted ink chip" recipe used across owner/studio controls.
- **Registration bar** — the trio as three flat squares in order (sakura, yuzu, ramune),
  e.g. footer version stamp, hero eyebrow. `REGISTRATION_INKS` in `(site)/layout.tsx`.
- **Overprint** — when two inks overlap, blend with `mix-blend-mode: var(--ink-blend)`
  (multiply by day) so the overlap darkens like real ink, never a flat stack.

---

## 4. Typography

Three families, loaded in `layout.tsx` via `next/font/google`, each exposed as a CSS
variable.

| Variable | Family | Weights | Voice |
|---|---|---|---|
| `--font-display` | **Bricolage Grotesque** | 400–800 | display — h1/h2/h3, big numbers, the logo wordmark |
| `--font-sans` | **Nunito** | 400–800 | body prose, the default |
| `--font-geist-mono` / `--font-mono` | **Geist Mono** | — | the label/caption voice |

> A curated preview theme (`dew-candy`) additionally loads Instrument Serif, IBM Plex
> Sans and IBM Plex Mono as `--font-dew-*`. Those belong to that one sample only — they
> are **not** part of the house style.

### Rules (from `globals.css` `@layer base`)

```css
h1, h2, h3, .font-display {
  font-family: var(--font-display), var(--font-sans);
  letter-spacing: -0.02em;
  font-feature-settings: "ss02", "ss04";
}
```

- **Display** — heavy (`font-bold`/`font-black`), tight tracking
  `-0.02em … -0.04em`. Big titles and big tabular numbers. Leading is tight
  (`leading-none … leading-[0.98]`).
- **Mono (the label voice)** — small (8.5–11px), `uppercase`, wide tracking
  `[0.12em … 0.2em]`, `text-muted-foreground`. This is how eyebrows, meta lines,
  stamps, "open →" affordances, and table headers speak. Wide-tracked uppercase mono
  is the single most recognizable typographic tell of the site.
- **Body** — Nunito, ≥ 15.5–17px, `leading-relaxed`, secondary copy in
  `text-muted-foreground`.

### Type scale seen in the wild

| Use | Class shape |
|---|---|
| Home hero h1 | `font-display text-[44px] sm:text-[64px] lg:text-[76px] font-bold tracking-[-0.03em] leading-[0.98]` |
| Page hero h1 | `font-display text-[32px] sm:text-5xl lg:text-[52px] font-bold tracking-[-0.03em]` |
| Section h2 | `font-display text-[26px] font-bold tracking-[-0.02em]` |
| Card title h3 | `font-display text-[16px] font-bold tracking-[-0.02em] leading-tight` |
| Big stat number | `font-display text-[44px] sm:text-[56px] font-bold tracking-[-0.04em] tabular-nums` |
| Eyebrow / meta | `font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground` |
| Card tag | `font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground/85` |

---

## 5. Shape & space

### Radius

The radius vocabulary is deliberately tiny: **{0, 2–3, 9999}**.

- **Content cards: `0`.** `.sticker-card { border-radius: 0 }`. Sharp corners are the look.
- **Stamps / seals / die-cut dashes: `1–3px`.** Just enough to read as a rubber stamp
  or a sticker corner, never as a rounded UI card.
- **Pills, dots, avatars, the ink-dot logo: `9999`** (`rounded-full`).
- `--radius: 0.375rem` (6px) exists **only** for borrowed shadcn preview chrome and the
  `--radius-*` scale derived from it. Katagami cards do not use it.

### No borders → shadow, tint, overprint

Separation is achieved with, in rough order of preference:

1. **Soft paper shadow** — `--shadow-card` (and `--shadow-card-hover` on lift).
2. **Paper tint** — a card faintly tinted by its subject's ink (5% mix).
3. **A halftone rule** — `.sticker-perforation` (a dashed/screened line) where a divider
   is genuinely needed (header bottom edge, footer, hero close).
4. **Overprint / tape / stamp** — decorative anchors that imply an edge without drawing one.

### Shadows (tokens)

```
--shadow-card:        0 1px 2px rgba(30,35,45,.04), 0 6px 18px rgba(30,35,45,.06);
--shadow-card-hover:  0 2px 4px rgba(30,35,45,.06), 0 18px 36px rgba(30,35,45,.09);
--shadow-sticker:     0 1px 0 rgba(30,35,45,.06), 0 4px 10px rgba(30,35,45,.05);
--shadow-sticker-lift:0 2px 0 rgba(30,35,45,.08), 0 10px 22px rgba(30,35,45,.08);
--shadow-paper / -sm / -lg   /* softer paper-stack shadows */
```

All shadows are warm-grey and soft. There are no hard black drop shadows except the
deliberate **hard offset** sticker shadow on buttons and the dealt-card flash
(`2–3px 2–3px 0 color-mix(...)`), which reads as a second ink pass, not a glow.

### Spacing

Generous and printed-margin-like. Patterns from the code:

- Page gutters `px-4`; content column capped at `max-w-7xl`.
- Sections `py-10 … py-14`; vertical rhythm `space-y-12 … space-y-16`.
- Card padding `p-6`+; compact card footer `px-3.5 py-3`.
- Footer sits `mt-24` below content. Titles always carry padding/margin above them.

---

## 6. The print layer (the riso effects)

These run globally and give every page its paper-and-ink texture. All defined in
`globals.css`.

### Paper-fiber grain

A single fixed compositing layer over everything — `feTurbulence` fractal noise,
desaturated, blended with the ink.

```css
body::before {
  position: fixed; inset: 0; z-index: 60; pointer-events: none;
  background-image: var(--grain-url);   /* inline feTurbulence SVG, 180×180 tile */
  opacity: var(--grain-opacity);        /* 0.018 day · 0.03 night */
  mix-blend-mode: var(--ink-blend);     /* multiply day · screen night */
}
```

### Grid-paper dots

A faint Hobonichi-style dot grid under everything:

```css
body {
  background-image: radial-gradient(circle at 1px 1px, var(--paper-dot) 1px, transparent 0);
  background-size: 24px 24px;            /* paper-dot flips to light specks in .dark */
}
```

### `--ink-blend` — the overprint switch

`multiply` by day, `screen` by night. Any decorative ink that overlaps another surface
(logo dots, marker fill, stamps, riso-double, highlighter underlines) sets
`mix-blend-mode: var(--ink-blend)` so it overprints correctly in both editions.

### Overprint disc & halftone

Organic color comes from **flat ink fields, overprinting discs (a circle at
`mix-blend-mode: multiply`), and halftone screens** (a `radial-gradient` dot field) —
never CSS gradients. See `PreviewPlaceholder` (§7) and `.halftone-wash`.

---

## 7. The motif library

Every reusable motif, its CSS, and when to use it. These are the pieces the user means
by "the washi tape, the highlighters, the markers, the dashed lines." Use them; don't
reinvent them.

### Highlighter — `.marker`  *(the highlighter)*

A fluor swipe behind text. Use it on **one** word of a title — never a whole line.

```css
.marker { position: relative; display: inline-block; }
.marker > .marker-fill {
  position: absolute; inset: auto -2px 2px -2px; height: 42%; z-index: 0;
  border-radius: 2px; transform: rotate(-0.3deg);
  opacity: var(--marker-opacity);       /* 0.85 day · 0.55 night */
  mix-blend-mode: var(--ink-blend);
}
.marker > .marker-text { position: relative; z-index: 1; }
```

```html
<span class="marker">
  <span class="marker-fill" style="background: var(--yuzu)"></span>
  <span class="marker-text">taste</span>
</span>
```

There is a ready React helper: `Marker` in `components/page-hero.tsx`
(`<Marker color="yuzu">word</Marker>`). The swipe sits low (42% height, bottom-aligned)
and tilts -0.3°, so it reads as a real highlighter pass over the baseline. Home hero
uses sakura on "languages" and yuzu on "taste."

### Marker / nav highlight — `.ink-underline`  *(the active-link swipe)*

A yuzu underline that wipes in from the left on hover / active. This is how nav links
and inline links signal state — not an underline, a printed swipe.

```css
.ink-underline::after {
  content: ""; position: absolute; left: -2px; right: -2px; bottom: -2px; height: 7px;
  background: var(--yuzu); z-index: -1; border-radius: 1px;
  transform: rotate(-0.3deg) skewX(-6deg) scaleX(0);  /* hidden */
  transform-origin: left center; opacity: 0.9; mix-blend-mode: var(--ink-blend);
  transition: transform 200ms cubic-bezier(0.22,1,0.36,1);
}
.ink-underline[data-active="true"]::after,
.ink-underline:hover::after { transform: rotate(-0.3deg) skewX(-6deg) scaleX(1); }
```

Header nav (`header-nav.tsx`) sets `data-active` per route. A hand-rolled variant
(skewed yuzu bar) appears on the inline `@arni0x9053` links in the hero and footer.

### Washi tape — `.washi-tape`  *(the tape)*

A striped strip of tape, set with `--strip-ink`. Pin it across a corner of a card or a
divider. Always `position: absolute`; rotate it a few degrees so it looks placed by hand.

```css
.washi-tape {
  position: absolute; width: 70px; height: 16px;
  background: repeating-linear-gradient(45deg,
    color-mix(in oklch, var(--strip-ink, var(--sakura)) 75%, var(--paper-tape-mix)) 0 7px,
    color-mix(in oklch, var(--strip-ink, var(--sakura)) 40%, var(--paper-tape-mix)) 7px 14px);
  opacity: 0.85; border-radius: 1px; box-shadow: 0 1px 2px rgba(30,35,45,.05);
}
```

```html
<span class="washi-tape -left-3 -top-2"
      style="--strip-ink: var(--sakura); transform: rotate(-5deg)"></span>
```

Used on the footer (two strips, ramune + sakura) and the home "today's pull" row.
`--paper-tape-mix` flips white → dark paper in `.dark` so the tape stays translucent.

### Rubber stamps — `.stamp` and `.ink-stamp`

A tilted, grain-inked impression — **no border**. The ink is a soft tint of the color
plus a whisper of grain, which reads as printed, not boxed. Two variants:

- **`.stamp`** keys off `currentColor` — set `style={{ color }}` or a `text-[var(--ink)]` class.
- **`.ink-stamp`** keys off a `--ink` variable — for when the text color can't carry the ink.

```css
.stamp, .ink-stamp {
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 3px; padding: 3px 9px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  transform: rotate(-1.5deg); opacity: 0.95;
  background: color-mix(in oklch, currentColor 12%, var(--paper-stamp-mix));  /* .ink-stamp uses var(--ink) */
  background-image: var(--grain-url); background-size: 90px 90px;
  background-blend-mode: var(--ink-blend);
}
```

```html
<span class="stamp text-[var(--ramune)]">details inside</span>
<span class="ink-stamp" style="--ink: var(--sakura)">today's pull</span>
```

Use for status, section asides ("details inside"), contact ("say hi"). Tilt is part of
the look — never set it upright.

### Dashed line — `.sticker-perforation`  *(the die-cut / dashed rule)*

The repeating dash. This is the divider of choice — a sticker die-cut perforation that
replaces every horizontal border on the site.

```css
.sticker-perforation {
  height: 1px; border: none;
  background-image: linear-gradient(90deg, var(--border) 50%, transparent 50%);
  background-size: 6px 1px; background-repeat: repeat-x;
}
```

Used as: the header's bottom edge, the footer's top edge, the close of every `PageHero`,
and section breaks on the home page. When you need a horizontal rule, use this — not a border.

> Dashed lines also appear as **outlines** in two house elements: the `FeaturedSeal`
> (`border border-dashed`, ink-toned) and the embodiment preview's dashed-border family
> and tab bar (§11). Both are intentional, ink-toned dashes — never neutral grey.

### Misregistered display type — `.riso-double`

A second ink pass printed offset under display type, so big type looks misregistered.
Give the element `data-text` equal to its text and an `--ink`.

```css
.riso-double::before {
  content: attr(data-text); position: absolute; inset: 0; z-index: -1;
  color: var(--ink, var(--sakura)); transform: translate(0.028em, 0.03em);
  opacity: 0.55; mix-blend-mode: var(--ink-blend);
}
```

```html
<span class="riso-double font-display" data-text="型紙" style="--ink: var(--sakura)">型紙</span>
```

Used on the footer 型紙 logotype. Reserve for large, deliberate display moments.

### Corner halftone — `.halftone-wash`

A screened dot-field bleeding from a corner — a printed wash for section/hero corners,
keyed by `--wash-ink`. Masked to fade out radially.

```css
.halftone-wash {
  position: absolute; pointer-events: none;
  background-image: radial-gradient(circle at 2px 2px,
    color-mix(in srgb, var(--wash-ink, var(--teal)) 38%, transparent) 1.6px, transparent 0);
  background-size: 12px 12px;
  mask-image: radial-gradient(closest-side, black 20%, transparent 100%);
  mix-blend-mode: var(--ink-blend); opacity: 0.6;
}
```

`PageHero` drops one in the top-right corner, inked with the eyebrow accent.

### Sticker card — `.sticker-card`  *(the card)*

The original katagami sheet: translucent paper, sharp corners, shadow-only edges,
a faint ink pass on hover.

```css
.sticker-card {
  position: relative; background: var(--paper-sticker);
  border: none; border-radius: 0; box-shadow: var(--shadow-card);
  transition: transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease, background-color 220ms ease;
}
.sticker-card:hover {
  transform: translateY(-3px) rotate(-0.4deg);
  background: var(--paper-sticker-hover);
  box-shadow: var(--shadow-card-hover), 2px 2px 0 color-mix(in srgb, var(--card-ink, var(--ramune)) 7%, transparent);
}
```

Tint per subject: set `--card-ink` and
`background: color-mix(in srgb, <tint> 5%, var(--paper-tint-base))`. On hover the card
lifts 3px and rotates -0.4° — the sheet peels off the board — and a 2px ink offset
appears bottom-right (the second pass). See `language-card.tsx`.

### The logo — three overprinting ink dots

The trademark in the header: sakura, yuzu, ramune dots overlapping at
`mix-blend-mode: var(--ink-blend)`. On hover they separate (registration drift). The
footer pairs the dots' spirit with the `型紙` `.riso-double` logotype + a mono `no.002`.

### Palette ink strip

On a language card preview, the subject's palette prints as a **5px flush row of color
bars** across the top of the image — the signature card detail (`language-card.tsx`).

### Status stamp & featured seal (card chrome)

- **`StatusStamp`** — a rotated (`-0.7°`) rubber-stamp pill with a little **tape tab**
  on its left edge; ink-toned hairline (never grey). Shows Draft / Under review / Archived.
- **`FeaturedSeal`** — a `rotate(2°)` dashed-border seal containing four overprinting
  petal dots (sakura, yuzu, subject tint, ramune).

### Riso swatch proof — `PreviewPlaceholder`

When a card has no thumbnail, it prints a proof from the language's own palette, in four
passes — the canonical demonstration of "color from ink, not gradients":

1. **ink field** — a flat primary block, slightly rotated;
2. **overprint disc** — a secondary-ink circle at `mix-blend-mode: multiply`;
3. **halftone screen** — an accent dot-field masked to fade up;
4. **type specimen** — a big `Aa` in the heading font + four palette dots.

Layout varies by a per-card `seed` so a wall of placeholders never reads as copies.

---

## 8. Motion

Cubic-bezier `(0.22, 1, 0.36, 1)` is the house easing — used on nearly every transition.
Every animation below has a `prefers-reduced-motion: reduce` off-switch.

### Default interaction transition (base layer)

All `a`, `button`, `summary`, `[role=button]` get a soft multi-prop transition (color,
background, border, opacity, `transform 200ms` on the house easing, box-shadow). Hover
states never snap.

### Hover idiom — lift + tiny rotate

The recurring hover is **`translateY(-1px … -3px)` plus a fractional rotate**
(`rotate(-0.4deg)` cards, `rotate(-1deg)` primary button, `rotate(-4deg)` social
stickers). Things lift off the board and tilt a hair, like a peeled sticker.

### Named keyframes (globals.css)

| Animation | What it does |
|---|---|
| `riso-reveal` | staggered rise+fade on load; stagger via `--reveal-i` (×70ms) |
| `deck-deal` | a fresh sheet slides in from the right with a slight rotate |
| `riso-deal` | the "dealt" flash — registration slips, then settles (`[data-dealt]`) |
| `route-enter` | every route change slides the new sheet onto the press bed |
| gallery stagger | `[data-gallery-card]` fade up with `:nth-child` delays |

### Scroll reveal

Elements marked `[data-reveal]` (and direct children of `[data-reveal-children]`) rise
and fade in on entering the viewport. The hidden start state lives behind
`html.reveal-ready` (set pre-paint by JS only when motion is allowed), and the reveal is
played by the Web Animations API — so JS-off and reduced-motion users see everything
immediately with no flash, and it never diverges the DOM during hydration. Driven by
`components/scroll-reveal.tsx`.

---

## 9. Buttons & controls

- **Primary** — ink-on-paper: `bg-foreground text-background`, sharp corners, a **hard
  offset shadow** `shadow-[0_2px_0_rgba(30,35,45,0.16)]`, mono uppercase label, lifts and
  tilts on hover (`hover:-translate-y-[2px] hover:rotate-[-1deg]`). No emoji.
- **Tinted ink chip / button** — the workhorse control across owner/studio: a 14% ink
  mix background, 72% ink-mix label, soft shadow, `hover:-translate-y-[2px]`. Pattern:
  `bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))]
  text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))]`.
- **Social sticker** — a square paper chip (`box-shadow: var(--shadow-card)`) with the
  accent ink flashing in on hover at `mix-blend-mode: var(--ink-blend)`; tilts `-4°`.
- Labels are mono, uppercase, `tracking-[0.15em–0.16em]`. Affordance arrows (`→`) nudge
  on hover (`group-hover:translate-x-0.5`).

---

## 10. Layout patterns

- **Hero is full-bleed.** The home hero's ink connects to the header and both screen
  edges (no padding around the art); the headline sits in a `max-w-3xl` column over it.
  The art is `.hero-art` (a masked layer of `RisoInkField` + `RisoHeroPress`) that on
  phones becomes a top-right corner wash kept out of the text column, and on tablet+ a
  right-anchored composition beside the headline. One element, two masks.
- **`PageHero`** is the standard inner-page header: a mono eyebrow (a 3px accent tick +
  uppercase mono), a big display `h1`, optional description, an optional `rightSlot`
  (often a `HeroStat`), a corner `.halftone-wash`, closed by a `.sticker-perforation`.
- **Content column** caps at `max-w-7xl` with `px-4` gutters.
- **Drawer shelves — `.shelf-row`.** The catalog is a cabinet, not a list: each shelf is
  a horizontally-scrolling rail of fixed-width sheets (`236–268px`) with a right-edge
  mask-fade signalling "more in the drawer," scroll-snap, and a thin ink scrollbar.
  `[data-spread="true"]` pulls the drawer open into an `auto-fill minmax(250px,1fr)` grid.
- **Mobile nav** is a bottom bar (`MobileNav`); the desktop nav is inline `.ink-underline`
  links. A command palette (⌘K) indexes languages, palettes, art styles and pages.

---

## 11. The embodiment preview chrome (`shadsync-*`) — a sub-system

`globals.css` also defines a `shadsync-*` layer. This is **not** the house style — it's
the chassis that **previews the design languages Katagami generates** inside the site
(the shadcn-export preview). It deliberately renders *each generated theme's* tokens
(`--shadsync-*`), and it has its own profiles driven by data-attributes on
`.shadsync-preview`:

- **`paper-collage` family** — leans into the Katagami idiom: **washi-tape corners**
  (`.shadsync-tape`, two striped strips), organic **blob icon chips**
  (`border-radius: 42% 58% 52% 48%`), and **hard offset "sticker" shadows**.
- **`[data-shadsync-border="dashed"]`** — switches every panel/control to a **dashed
  border** (the dashed-outline language family). The tab bar is dashed by default.
- **`[data-shadsync-border="none"]`** — the flat / no-border profile (constructivist,
  swiss, system languages): strips the collage chassis entirely — no borders, no
  decorative gradients, no offset shadows — so flat themes show on clean ink-tinted surfaces.
- **`[data-shadsync-underlay]`** — a rotated offset "patch" behind metric panels (paper-collage only).
- **`dew-candy`** — one fully bespoke curated sample with its own fonts/tokens.

When you touch the preview chrome, keep it faithful to the *previewed* language's profile,
not to the house style — that's the whole point of it.

---

## 12. Dark mode — riso press, night edition

`.dark` is the same press printing on **deep indigo card stock**. The flips:

- **Paper goes near-black blue** (`--washi: oklch(0.19 0.012 265)`); **ink goes warm
  off-white** (`--sumi: oklch(0.94 0.006 85)`).
- **Inks lift lightness, moderate chroma** — luminous but still reading as ink, not neon
  (see the night column in §3).
- **Overprint flips to `screen`** (`--ink-blend: screen`) — light ink on dark paper glows
  instead of darkening. Grain rises (`0.03`); the highlighter dims (`--marker-opacity: 0.55`).
- **Cards are lifted** — slightly lighter than the body — with an inset top highlight and
  a deep soft shadow (`--shadow-card` gains an `inset` rule).
- Default is **day**. Dark applies only when the user opts in (saved in
  `localStorage['katagami-theme']`, set pre-paint to avoid a flash). OS preference is ignored.

---

## 13. Checklist before you ship a katagami.ai surface

- [ ] No rounded content cards (radius 0). Rounding only on pills/dots/avatars/stamps.
- [ ] No borders. Dividers are `.sticker-perforation`; separation is shadow + tint.
- [ ] ≤ 3 accents, and they're the trio. Support inks only for data; `--beni` only for destructive.
- [ ] Paper is `#fff`, text is `--sumi`. No pastel washes, no color gradients.
- [ ] Eyebrows/meta/stamps/table-heads are mono, uppercase, wide-tracked, muted.
- [ ] Titles padded above; body ≥ 16–17px; high contrast.
- [ ] Decorative inks set `mix-blend-mode: var(--ink-blend)` so they overprint in both editions.
- [ ] Hover lifts + tilts a hair on the house easing; every animation honors reduced-motion.
- [ ] Buttons: sharp, mono-uppercase, no emoji; primary carries the hard offset shadow.
- [ ] Looks right in **both** day and night.
