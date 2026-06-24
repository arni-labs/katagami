# Koinobori

> A design language for Kodomo no Hi — the Japanese Children's Day festival of rising carp, courage, and growth.

## Point of view

**Signature mechanic: Ascent Ribbon.** Diagonal ribbons of scarlet and indigo sweep upward through layouts like carp climbing a waterfall — never horizontal dividers, never card borders. Information rides these ascent lines; accent colour marks momentum (dates, ages, free tiers). Surfaces separate by warm tone steps, not strokes. Wind-swept translucent panels carry copy over bright skies with heavy scrims for legibility.

**Product world:** Koi Stream — a family festival planning app that helps households coordinate Kodomo no Hi gatherings, carp-streamer displays, iris planting, and children's courage rituals across generations.

## Palette

Warm morning festival light. Three accent highlighters only.

| Role | Token | Value |
|------|-------|-------|
| Background | `--bg` | `#FFFBF7` |
| Surface | `--surface` | `#F5F0E8` |
| Surface raised | `--surface-raised` | `#FFFFFF` |
| Text | `--text` | `#1A1512` |
| Muted | `--muted` | `#5C534A` |
| Border (minimal) | `--border` | `rgba(26, 21, 18, 0.08)` |
| Accent primary (Koi Scarlet) | `--accent` | `#D62839` |
| On accent | `--on-accent` | `#FFFFFF` |
| Accent secondary (Indigo Scale) | `--accent-indigo` | `#1D3557` |
| Accent tertiary (Golden Kite) | `--accent-gold` | `#E9A319` |
| Success | `--success` | `#2A6F4E` |
| Warning | `--warning` | `#B45309` |
| Error | `--error` | `#B91C1C` |
| Info | `--info` | `#1D4E89` |

Semantic colours stay small; scarlet leads calls-to-action, indigo anchors navigation and data, gold highlights dates and free-tier markers.

## Typography

| Role | Family | Size | Weight | Tracking |
|------|--------|------|--------|----------|
| Display | "Fraunces", Georgia, serif | clamp(2.5rem, 6vw, 4.5rem) | 600 | -0.02em |
| Display JP | "Zen Old Mincho", "Noto Serif JP", serif | clamp(2rem, 5vw, 3.5rem) | 700 | 0 |
| Heading | "Fraunces", Georgia, serif | clamp(1.5rem, 3vw, 2.25rem) | 600 | -0.02em |
| Body | "Source Sans 3", system-ui, sans-serif | 17px (1.0625rem) | 400 | 0 |
| Small / table | "Source Sans 3", system-ui, sans-serif | 14.5px (0.90625rem) | 400 | 0 |
| Label | "Source Sans 3", system-ui, sans-serif | 14.5px | 600 | 0.04em |

Body minimum 17px. Table rows 14.5px+. High contrast everywhere — never light-on-light or dark-on-dark.

## Spacing

Base unit: 8px.

| Token | Value |
|-------|-------|
| `--space-xs` | 8px |
| `--space-sm` | 16px |
| `--space-md` | 24px |
| `--space-lg` | 40px |
| `--space-xl` | 64px |
| `--space-2xl` | 96px |

Generous padding above all titles (`--space-md` minimum). Section gaps `--space-xl`+.

## Radius

Only: `0`, `16px`, `24px`, `9999px`.

| Token | Value |
|-------|-------|
| `--radius-none` | 0 |
| `--radius-md` | 16px |
| `--radius-lg` | 24px |
| `--radius-pill` | 9999px |

## Control height

Single shared token for every interactive control:

| Token | Value |
|-------|-------|
| `--control-height` | 48px |

## State matrix

All buttons, inputs, selects, toggles, and chips use `--control-height` and these states:

| State | Background | Text | Border/ring | Notes |
|-------|------------|------|-------------|-------|
| Default | role default | role default | none or `--border` | — |
| Hover | 8% darker or `--surface-raised` | unchanged | none | `transition: 150ms` |
| Focus-visible | unchanged | unchanged | `2px solid var(--accent)` offset 2px | visible ring always |
| Active | 12% darker | unchanged | none | `transform: scale(0.98)` |
| Disabled | `--surface` | `--muted` at 60% | none | `pointer-events: none; opacity: 0.55` |

### Primary button
- Default: `--accent` bg, `--on-accent` text, `--radius-pill`
- Hover: `#B91F2E`
- Focus-visible: ring `--accent`
- Active: `#9A1A27`, scale 0.98
- Disabled: `--surface`, `--muted` text

### Secondary button
- Default: `--surface-raised` bg, `--text` text, `--radius-pill`
- Hover: `--surface`
- Focus-visible: ring `--accent`
- Active: scale 0.98
- Disabled: as above

### Ghost button
- Default: transparent, `--text`
- Hover: `rgba(26,21,18,0.06)` bg
- Focus-visible: ring `--accent`
- Active: scale 0.98

### Text input / select / textarea
- Default: `--surface-raised` bg, `--radius-md`, 1px `--border`, `--control-height` for single-line
- Hover: border `rgba(26,21,18,0.14)`
- Focus-visible: ring `--accent`, border `--accent`
- Active: unchanged
- Disabled: `--surface` bg, muted text

### Checkbox / radio / toggle
- Default: 20px control, `--radius-none` checkbox / `--radius-pill` toggle
- Checked: `--accent` fill
- Focus-visible: ring `--accent`
- Disabled: muted, reduced opacity

## Surfaces

Hierarchy via tone, never nested cards or accent edges:
- `--bg` — page ground
- `--surface` — recessed panels, table stripes
- `--surface-raised` — elevated panels, inputs, hero scrims

Glass panels (immersive overlay): `rgba(255, 251, 247, 0.82)` with `backdrop-filter: blur(12px)`, `--radius-lg`.

## Components

Built once from tokens. No browser defaults visible.

- **Nav bar:** `--surface-raised`, no bottom border; logo Fraunces + 鯉のぼり kanji accent
- **Ascent ribbon:** diagonal `--accent` or `--accent-indigo` band at 12° — signature pattern
- **Stat chip:** `--radius-pill`, `--control-height`, gold highlight for "free"
- **Data table:** 14.5px rows, `--surface` zebra, no vertical rules
- **Form field group:** label above, `--space-xs` gap, full state matrix
- **Alert banners:** semantic bg at 12% opacity, `--radius-md`, no border
- **Glass panel:** immersive overlays only

## Motion

Respect `prefers-reduced-motion`. Landing uses progressive enhancement: `.anim` class via inline script; static state always readable. Scroll reveals stagger children 80ms. Immersive: GSAP ScrollTrigger scrub, frame-locked camera — paused when tab hidden.

## Art direction (landing + dashboard imagery)

Editorial festival photography — warm golden morning, azure sky, vivid koinobori scarlet/indigo/black against clean neutrals. Photographic realism, never low-poly. Credits: Japanese kodomo-no-hi tradition, editorial product photography.

## Responsive

390px–2560px+. Mobile: single column, hide non-essential nav. Ultra-wide: cap content `max-width: 1280px`, hero full-bleed only. `minmax(0,1fr)` grids, `min-width: 0` on flex children.

## injectTheme roles

```css
:root {
  --bg: #FFFBF7;
  --surface: #F5F0E8;
  --text: #1A1512;
  --muted: #5C534A;
  --border: rgba(26, 21, 18, 0.08);
  --accent: #D62839;
  --on-accent: #FFFFFF;
  --success: #2A6F4E;
  --warning: #B45309;
  --error: #B91C1C;
  --info: #1D4E89;
}
```