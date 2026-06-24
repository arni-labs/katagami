# Nobori

> A graphic-design-forward festival identity for Kodomo no Hi — the fifth day of May, when koinobori carp streamers rise against open early-summer sky.

## Point of view

Nobori treats the rising koinobori as a **diagonal vector system**: streamers ascend at a fixed 28° angle through vast white air, punctuated by three highlighter accents — electric sky, fresh grass, hot pop. The aesthetic is a grown-up event poster brought to life: confident type, editorial composition, generous white, zero clutter. This is a public celebration adults proudly produce, not a toy catalogue.

**Signature mechanic — Rising Stream:** Every accent application follows an ascending diagonal band (28°) or offset block that echoes carp streamers climbing a pole. Headlines sit in open white; accents strike like markers on a layout table.

## Naming

- **Language:** Nobori
- **Subject noun:** nobori (the streamer flag — Kodomo no Hi's strongest motif)
- **Culture:** Japanese — the festival's own tradition

## Palette

### Neutrals (cool early-summer temperature)

| Token | Value | Role |
|-------|-------|------|
| `--color-white` | `#FFFFFF` | Primary ground |
| `--color-ink` | `#0A0F0D` | Primary text |
| `--color-muted` | `#5A6B62` | Secondary text |
| `--color-surface` | `#F5FAF7` | Recessed panels |
| `--color-surface-raised` | `#EBF5EF` | Elevated panels |

### Accents (≤3 highlighter colours)

| Token | Value | Use |
|-------|-------|-----|
| `--accent-sky` | `#00B8FF` | Primary actions, sky bands, info |
| `--accent-grass` | `#00E070` | Success, greenery, secondary highlights |
| `--accent-pop` | `#FF2E4D` | Koinobori coral, warnings, emphasis |

### Semantic roles (`injectTheme` overrides)

| Role | Default | Maps to |
|------|---------|---------|
| `--bg` | `#FFFFFF` | Ground |
| `--surface` | `#F5FAF7` | Panels |
| `--text` | `#0A0F0D` | Body copy |
| `--muted` | `#5A6B62` | Captions |
| `--border` | `transparent` | Surfaces separated by tone, not borders |
| `--accent` | `#00B8FF` | Primary CTA |
| `--on-accent` | `#0A0F0D` | Text on accent fills |
| `--success` | `#00E070` | Positive states |
| `--warning` | `#FFB800` | Caution |
| `--error` | `#FF2E4D` | Errors |
| `--info` | `#00B8FF` | Informational |

## Typography

| Token | Value |
|-------|-------|
| `--font-display` | `'Syne', system-ui, sans-serif` |
| `--font-body` | `'DM Sans', system-ui, sans-serif` |
| `--text-xs` | `14.5px` |
| `--text-sm` | `15px` |
| `--text-base` | `17px` |
| `--text-lg` | `20px` |
| `--text-xl` | `24px` |
| `--text-2xl` | `32px` |
| `--text-3xl` | `48px` |
| `--text-4xl` | `clamp(3.5rem, 8vw, 6rem)` |
| `--tracking-display` | `-0.02em` |
| `--leading-body` | `1.6` |
| `--leading-tight` | `1.15` |

Display type uses Syne at tight tracking. Body never drops below 17px. Table rows use 14.5px minimum.

## Spacing

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |
| `--space-8` | `64px` |
| `--space-9` | `96px` |
| `--space-10` | `128px` |

Titles always carry padding above (`--space-7` minimum). Section gaps use `--space-9`.

## Radius

Only from the allowed set:

| Token | Value |
|-------|-------|
| `--radius-none` | `0` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-pill` | `9999px` |

## Control height

| Token | Value |
|-------|-------|
| `--control-height` | `48px` |

All buttons, inputs, selects, and toggles share this single height token.

## State matrix

### Button — primary (accent fill)

| State | Background | Text | Other |
|-------|------------|------|-------|
| default | `--accent` | `--on-accent` | — |
| hover | `#0099D6` | `--on-accent` | `transform: translateY(-1px)` |
| focus-visible | `--accent` | `--on-accent` | `outline: 3px solid var(--accent-grass); outline-offset: 2px` |
| active | `#0088C2` | `--on-accent` | `transform: translateY(0)` |
| disabled | `#B8E8FA` | `#5A6B62` | `pointer-events: none; opacity: 0.7` |

### Button — secondary (surface)

| State | Background | Text | Other |
|-------|------------|------|-------|
| default | `--surface` | `--text` | — |
| hover | `--color-surface-raised` | `--text` | — |
| focus-visible | `--surface` | `--text` | `outline: 3px solid var(--accent-sky); outline-offset: 2px` |
| active | `#D8EDE4` | `--text` | — |
| disabled | `--surface` | `--muted` | `opacity: 0.6` |

### Button — ghost

| State | Background | Text | Other |
|-------|------------|------|-------|
| default | `transparent` | `--text` | — |
| hover | `--surface` | `--text` | — |
| focus-visible | `transparent` | `--text` | `outline: 3px solid var(--accent-sky); outline-offset: 2px` |
| active | `--color-surface-raised` | `--text` | — |
| disabled | `transparent` | `--muted` | `opacity: 0.5` |

### Text input / select / textarea

| State | Background | Border | Other |
|-------|------------|--------|-------|
| default | `--bg` | `2px solid var(--color-surface-raised)` | — |
| hover | `--bg` | `2px solid #C8DDD4` | — |
| focus-visible | `--bg` | `2px solid var(--accent-sky)` | `outline: 3px solid rgba(0,184,255,0.25); outline-offset: 0` |
| active | `--bg` | `2px solid var(--accent-sky)` | — |
| disabled | `--surface` | `2px solid var(--surface)` | `color: var(--muted)` |

## Surfaces

Panels are separated by **tone shift** (`--bg` → `--surface` → `--color-surface-raised`), never by grey borders or card edge highlights. No nested cards. Navigation sits flush in the page flow.

## Components

### Rising band

A 28° diagonal accent stripe — the signature ornament. Used sparingly behind headlines or as section markers. Never wallpapered.

### Koinobori mark

Minimal SVG carp silhouette in `--accent-pop`, used as a festival stamp — one per section maximum.

### Programme row

Dense dashboard row: time column (accent-sky), title, location (muted). No row borders; alternating surface tone.

## Imagery

- **Art style:** Editorial graphic photography — bright airy early-summer light, vivid clean accents, grown-up event composition.
- **Hero:** Full-bleed via `background-image: var(--hero-image)`.
- **Credits:** Influenced by Japanese festival poster tradition (matsuri nobori), contemporary Swiss editorial layout (Massimo Vignelli lineage), and early-summer landscape photography.

## Motion

Landing reveals use staggered translate on the Rising Stream axis. `prefers-reduced-motion` disables all animation. Settled state is visible without JavaScript; motion gates behind an `html.motion-ready` class set by inline script.

## Responsive

- Mobile (≥390px): single column, essential nav only.
- Ultra-wide (2560px+): content capped at 1280px, centred; hero spans 100vw.
- Grids use `minmax(0, 1fr)` to prevent overflow.