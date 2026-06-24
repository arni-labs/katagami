# Kazeform

**Design language for family growth, milestone tracking, and tradition planning — inspired by Kodomo no Hi's upward hope.**

Kazeform (風形, "wind-form") treats koinobori not as decoration but as motion: things rising, families ascending together. The aesthetic is early-summer clarity — open white fields, electric accents used like editorial highlighters, strong typographic confidence. Grown-up product surfaces for adults who steward childhood; never childish, never cluttered.

---

## Philosophy

| Principle | Expression |
|-----------|------------|
| **Ascent** | Vertical rhythm, upward gestures, koinobori as metaphor for growth |
| **Airy clarity** | Generous white space; content breathes like clear May sky |
| **Highlighter discipline** | ≤3 accent colors, applied sparingly for emphasis |
| **Editorial confidence** | Poster-scale type, asymmetric layouts, intentional asymmetry |
| **Sleek adulthood** | Professional SaaS polish; celebration without kitsch |

---

## Color Tokens

```css
--color-white:        #FFFFFF;
--color-ink:          #0A0A0A;
--color-ink-secondary:#2E2E2E;
--color-ink-muted:    #5C5C5C;
--color-sky:          #0099FF;   /* electric sky-blue — primary accent */
--color-leaf:         #00E070;   /* fresh neon green — secondary accent */
--color-pop:          #FF2D55;   /* hot coral-pink — tertiary pop */
--color-surface-muted:#F6F6F6;
--color-surface-sky:  #E8F6FF;   /* sky tint for subtle fills */
--color-surface-leaf: #E8FFF2;   /* leaf tint for subtle fills */
--color-focus-ring:   #0099FF;
--color-error:        #D4002A;
--color-warning:      #E68A00;
--color-success:      #00A854;
```

### Usage

- **Backgrounds**: `--color-white` default; `--color-surface-muted` for recessed panels only.
- **Text**: `--color-ink` on white (contrast 19.5:1). Muted copy uses `--color-ink-muted` (7.2:1).
- **Accents**: Sky for primary actions and links. Leaf for positive/growth states. Pop for urgent highlights — one element per viewport section maximum.
- **Never**: gradients, muddy pastels, grey borders, decorative sidelines.

---

## Typography

**Display**: [Syne](https://fonts.google.com/specimen/Syne) — bold editorial headlines  
**Body**: [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) — clean UI and prose  
**Mono**: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — data, timestamps

```css
--font-display: 'Syne', system-ui, sans-serif;
--font-body:    'Instrument Sans', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', monospace;

--text-xs:   12px;    /* captions, table meta */
--text-sm:   14.5px;  /* table rows, labels */
--text-base: 17px;    /* body */
--text-lg:   20px;    /* lead paragraphs */
--text-xl:   24px;    /* section subheads */
--text-2xl:  32px;    /* card titles */
--text-3xl:  48px;    /* section heads */
--text-4xl:  64px;    /* hero secondary */
--text-5xl:  80px;    /* hero primary */

--leading-tight:  1.1;
--leading-snug:   1.3;
--leading-normal: 1.55;
--tracking-display: -0.02em;
--tracking-body:    0;
```

| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Hero headline | Syne | 80px / 64px mobile | 800 | -0.02em |
| Section title | Syne | 48px | 700 | -0.02em |
| Card title | Syne | 32px | 700 | -0.02em |
| Body | Instrument Sans | 17px | 400 | 0 |
| Table row | Instrument Sans | 14.5px | 400 | 0 |
| Label | Instrument Sans | 14.5px | 600 | 0.01em |
| Mono data | JetBrains Mono | 14.5px | 400 | 0 |

---

## Spacing

4px base grid.

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  24px;
--space-6:  32px;
--space-7:  48px;
--space-8:  64px;
--space-9:  96px;
--space-10: 128px;
```

- Section vertical padding: `--space-9` minimum; titles never flush to container top — add `--space-6` above.
- Content max-width: `1200px` (landing), `1440px` (dashboard).
- Gutters: `--space-5` mobile, `--space-7` desktop.

---

## Radius

Only these values:

```css
--radius-none: 0;
--radius-md:   16px;
--radius-lg:   24px;
--radius-pill: 9999px;
```

Cards and images: `--radius-lg`. Buttons and inputs: `--radius-md`. Badges and pills: `--radius-pill`.

---

## Elevation & Motion

No box shadows on cards — depth via color blocks and spacing. Subtle `transform` on interactive elements only.

```css
--transition-fast: 120ms ease;
--transition-base: 200ms ease;

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## Control Height

**Single shared token for all interactive controls:**

```css
--control-height: 44px;
```

Applies to: buttons, text inputs, selects, combobox triggers, toggles (track height), nav pills.

---

## Components

### Button — Primary

```css
.btn-primary {
  height: var(--control-height);
  padding: 0 var(--space-5);
  font: 600 var(--text-sm) var(--font-body);
  color: var(--color-white);
  background: var(--color-ink);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}
.btn-primary:hover   { background: var(--color-ink-secondary); }
.btn-primary:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.btn-primary:active  { transform: scale(0.98); background: #000000; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
```

### Button — Secondary (Sky)

```css
.btn-secondary {
  height: var(--control-height);
  padding: 0 var(--space-5);
  font: 600 var(--text-sm) var(--font-body);
  color: var(--color-ink);
  background: var(--color-surface-sky);
  border: none;
  border-radius: var(--radius-md);
}
.btn-secondary:hover   { background: #D4EEFF; }
.btn-secondary:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.btn-secondary:active  { background: #B8E4FF; transform: scale(0.98); }
.btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
```

### Button — Ghost

```css
.btn-ghost {
  height: var(--control-height);
  padding: 0 var(--space-4);
  font: 500 var(--text-sm) var(--font-body);
  color: var(--color-ink-muted);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
}
.btn-ghost:hover   { color: var(--color-ink); background: var(--color-surface-muted); }
.btn-ghost:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.btn-ghost:active  { background: #EBEBEB; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
```

### Text Input

```css
.input {
  height: var(--control-height);
  padding: 0 var(--space-4);
  font: 400 var(--text-base) var(--font-body);
  color: var(--color-ink);
  background: var(--color-white);
  border: none;
  border-radius: var(--radius-md);
  box-shadow: inset 0 0 0 2px var(--color-surface-muted);
}
.input::placeholder { color: var(--color-ink-muted); }
.input:hover   { box-shadow: inset 0 0 0 2px #E0E0E0; }
.input:focus   { outline: none; box-shadow: inset 0 0 0 2px var(--color-sky), 0 0 0 3px rgba(0,153,255,0.25); }
.input:disabled { opacity: 0.5; background: var(--color-surface-muted); cursor: not-allowed; }
```

### Select

Same dimensions and states as `.input`. Custom chevron via background SVG. Focus ring identical.

### Textarea

Min-height `120px`, padding `--space-4`, same border/focus/disabled states as input.

### Checkbox

```css
.checkbox {
  width: 20px; height: 20px;
  border-radius: 4px;
  box-shadow: inset 0 0 0 2px var(--color-ink-muted);
  background: var(--color-white);
}
.checkbox:hover   { box-shadow: inset 0 0 0 2px var(--color-ink); }
.checkbox:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.checkbox:checked { background: var(--color-sky); box-shadow: none; }
.checkbox:disabled { opacity: 0.4; }
```

### Toggle

Track: `44px × 24px`, `--radius-pill`. Thumb: `20px` circle. Off: `--color-surface-muted`. On: `--color-leaf`. Focus ring on track.

### Badge

```css
.badge {
  height: 28px;
  padding: 0 var(--space-3);
  font: 600 12px var(--font-body);
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
}
.badge-sky  { background: var(--color-surface-sky); color: #0066AA; }
.badge-leaf { background: var(--color-surface-leaf); color: #007A3D; }
.badge-pop  { background: #FFE8ED; color: #CC0033; }
```

### Card

```css
.card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
/* No borders. Separation via background blocks or spacing. */
```

### Nav Link

```css
.nav-link {
  height: var(--control-height);
  padding: 0 var(--space-4);
  font: 500 var(--text-sm) var(--font-body);
  color: var(--color-ink-muted);
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
}
.nav-link:hover   { color: var(--color-ink); background: var(--color-surface-muted); }
.nav-link:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.nav-link.active  { color: var(--color-ink); background: var(--color-surface-sky); font-weight: 600; }
```

### Highlighter Mark

Editorial accent — a skewed color block behind key words:

```css
.mark-sky  { background: linear-gradient(transparent 40%, rgba(0,153,255,0.35) 40%); }
.mark-leaf { background: linear-gradient(transparent 40%, rgba(0,224,112,0.35) 40%); }
.mark-pop  { background: linear-gradient(transparent 40%, rgba(255,45,85,0.3) 40%); }
```

---

## Layout

### Landing

- Full-bleed hero image, no border radius, min-height `70vh`
- Asymmetric editorial grids: 5/7 or 4/8 column splits
- Feature blocks alternate text/image alignment
- Section titles left-aligned with highlighter marks on one keyword

### Dashboard

- Fixed sidebar `260px`, white background, no border — separated by `--color-surface-muted` content well
- Top bar: search input + primary action, height `72px`
- Stat cards in 4-column grid with sky/leaf/pop accent dots
- Data tables: no row borders; zebra via `--color-surface-muted` every other row
- Main content padding: `--space-6`

---

## Iconography

Small inline SVG only — geometric koinobori pennant shapes, ascending chevrons, wind lines. Stroke `1.5px`, no fill except accent marks.

---

## Accessibility

- Minimum body 17px, table 14.5px
- Focus rings always visible (2px solid + offset)
- `prefers-reduced-motion` respected
- Color never sole indicator — pair with text labels

---

## Product Context

**Kazeform** is a family growth platform: milestone journals, tradition calendars (Kodomo no Hi, Shichi-Go-San), shared memory timelines. Landing sells the vision; dashboard is the daily workspace for parents and caregivers.