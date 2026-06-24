# Koinobori

> The carp streamer — rising against clear sky, vivid and sure.

**POV:** Standing on the festival grounds looking up. The sky is electric blue, the carp
streamers pull and swim against the wind, fresh green canopy frames the edges. Everything
rises. The light is early-summer bright — clean, hopeful, confident.

**Signature mechanic:** *Rising* — elements ascend, float upward, stream against gravity.
Cards lift on hover. Headlines break above their containers. Accent lines rise vertically
through sections. The koinobori never swim down.

**Art style:** Bold graphic poster — clean geometric shapes, strong diagonal energy, editorial
composition. Vivid near-neon accents used as highlighter strokes on a white ground. Grown-up,
sleek, never childish.

**Paired palette:** *Sora* (sky) — cool-toned neutrals with electric sky-blue primary,
fresh-leaf green secondary, and a hot coral pop tertiary.

---

## Tokens

### Colour

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Background | `--bg` | `#FFFFFF` | Page ground |
| Surface | `--surface` | `#F5F7FA` | Cards, panels — cool-tuned to palette temp |
| Text | `--text` | `#0B0D12` | Primary text — near-black with cool undertone |
| Muted | `--muted` | `#64748B` | Secondary text, captions |
| Border | `--border` | `#E2E8F0` | Structural lines only — surfaces separate by tone |
| Accent (primary) | `--accent` | `#0066FF` | Electric sky-blue — the sky the koinobori swim in |
| On-accent | `--on-accent` | `#FFFFFF` | Text on accent surfaces |
| Accent 2 | `--accent-2` | `#00C853` | Fresh-leaf green — new growth, rising energy |
| Accent 3 | `--accent-3` | `#FF2D55` | Hot coral pop — the flash of the carp, celebration |
| Success | `--success` | `#00C853` | Positive states |
| Warning | `--warning` | `#FFAB00` | Caution states |
| Error | `--error` | `#FF2D55` | Error states |
| Info | `--info` | `#0066FF` | Informational states |

Accent count: 3 (sky-blue, leaf-green, coral-pop). Used like highlighters, never as fills.

### Typography

| Role | Token | Size / Line-height | Weight |
|------|-------|-------------------|--------|
| Display XL | `--text-display-xl` | 72px / 80px | 800 |
| Display | `--text-display` | 56px / 64px | 800 |
| Heading 1 | `--text-h1` | 40px / 48px | 700 |
| Heading 2 | `--text-h2` | 32px / 40px | 700 |
| Heading 3 | `--text-h3` | 24px / 32px | 600 |
| Body | `--text-body` | 17px / 28px | 400 |
| Body strong | `--text-body-strong` | 17px / 28px | 600 |
| Small | `--text-small` | 14px / 20px | 400 |
| Caption | `--text-caption` | 12px / 16px | 500 |

Font stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

Letter-spacing: display text gets `-0.03em`; body gets `-0.01em`.

### Spacing

8px base grid.

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 40px |
| `--space-2xl` | 64px |
| `--space-3xl` | 96px |
| `--space-4xl` | 128px |

### Radius

Allowed set: `{0, 16, 24, 9999}`.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | 0 | Sharp edges — hero, full-bleed sections |
| `--radius-md` | 16px | Cards, panels |
| `--radius-lg` | 24px | Feature containers, modals |
| `--radius-full` | 9999px | Pills, avatars, circular controls |

### Control height

One shared token: `--control-h: 48px`.

All interactive controls — buttons, inputs, selects, checkboxes, toggles — share this height.

---

## State matrix

Every interactive element implements all five states:

| State | Visual treatment |
|-------|-----------------|
| Default | Accent background, on-accent text, radius-full, control-h |
| Hover | Background darkens 12% (`filter: brightness(0.88)`), subtle lift (`translateY(-1px)`) |
| Focus | Visible ring: `outline: 3px solid var(--accent)`, `outline-offset: 3px` |
| Active | Background darkens 18% (`filter: brightness(0.82)`), press (`translateY(0)`) |
| Disabled | `opacity: 0.4`, `pointer-events: none`, no hover/focus effects |

Secondary buttons: transparent background, accent text, accent border on hover.
Ghost buttons: transparent background, text color, surface background on hover.

---

## Surfaces

Surfaces separate by **tone**, not borders. The page ground is `--bg` (white); cards and
panels sit on `--surface` (cool light grey). No border needed — the tonal shift is enough.
When a structural line is required (tables, dividers), use `--border` at 1px.

---

## Components

### Button (primary)
```
height: var(--control-h)          /* 48px */
padding: 0 var(--space-lg)        /* 0 24px */
background: var(--accent)
color: var(--on-accent)
border-radius: var(--radius-full)
font: var(--text-body-strong)
border: none
cursor: pointer
```

### Button (secondary)
```
height: var(--control-h)
padding: 0 var(--space-lg)
background: transparent
color: var(--accent)
border: 2px solid var(--accent)
border-radius: var(--radius-full)
```

### Text input
```
height: var(--control-h)
padding: 0 var(--space-md)
background: var(--surface)
color: var(--text)
border: 2px solid transparent
border-radius: var(--radius-md)
font: var(--text-body)
```
Focus: `border-color: var(--accent)`, `outline: 3px solid var(--accent)`, `outline-offset: 2px`.

### Select
```
height: var(--control-h)
padding: 0 var(--space-md)
padding-right: var(--space-xl)
background: var(--surface)
color: var(--text)
border: 2px solid transparent
border-radius: var(--radius-md)
appearance: none
/* Custom chevron via SVG background-image */
```

### Checkbox / Toggle
```
width: var(--control-h)   /* square checkbox or toggle track width */
height: 24px              /* toggle track; checkbox is 24×24 */
accent-color: var(--accent)
border-radius: var(--radius-full)  /* toggle */
border-radius: 4px → 0   /* checkbox uses radius-none for crisp look */
```
All checkboxes and toggles are explicitly styled — no browser defaults visible.

### Card
```
background: var(--surface)
border-radius: var(--radius-md)
padding: var(--space-lg)
/* No border — tone separation from --bg ground */
```
Hover (interactive cards): `transform: translateY(-4px)`, subtle shadow.

### Badge / Tag
```
height: 28px
padding: 0 var(--space-md)
background: var(--accent) at 10% opacity
color: var(--accent)
border-radius: var(--radius-full)
font: var(--text-small)
font-weight: 600
```

---

## Motion

- Landing hero: headline and subtext fade-up on load (600ms ease-out, staggered 150ms).
- Section entries: `IntersectionObserver` triggers fade-up (400ms) as sections scroll in.
- Card hover: `translateY(-4px)` over 200ms ease.
- Button hover: `translateY(-1px)` over 150ms.
- All motion gated behind `html.has-motion` class set by inline script.
- `prefers-reduced-motion: reduce` disables all animation.
- Settled state is the default — page is fully visible with no JavaScript.

---

## Responsive

- Mobile (< 768px): single column, stacked sections, condensed nav.
- Tablet (768–1024px): 2-column grids.
- Desktop (1024–1440px): 3-column grids, full spacing.
- Ultra-wide (> 1440px): content capped at 1200px and centred; only hero spans 100vw.
- Grids use `minmax(0, 1fr)` + `min-width: 0` to prevent overflow.

---

## Art style credits

| Name | Kind | Note |
|------|------|------|
| Japanese koinobori tradition | Cultural tradition | The carp-streamer festival aesthetic — vivid fabric forms rising against sky |
| Swiss International Style | Design movement | Clean grid, strong type hierarchy, purposeful whitespace |
| Ikko Tanaka | Artist | Bold geometric poster design, vivid flat colour, Japanese graphic tradition |
