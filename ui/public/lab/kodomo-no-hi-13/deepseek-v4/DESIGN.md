# Koinobori

> A Katagami design language for Kodomo no Hi — Japanese Children's Day, the festival of
> carp streamers rising against early-summer skies. Bright, airy, hopeful; pushed into
> confident graphic design. Open white, vivid accents like highlighters, strong editorial
> type. Sleek, clean, grown-up — a product an adult launches.

## POV

Kodomo no Hi is a festival of clear light, fresh greenery, and koinobori climbing the wind.
This language captures that moment as **graphic design**, not illustration: lots of open white
space, then vivid, almost-neon accent colour used like highlighters — electric sky-blues,
fresh greens, a hot coral pop. Bright and clean, never muddy or washed-out pastel. Editorial
composition, strong type, poster-grade layouts. A product an adult would ship.

**Signature mechanic**: the *rising line* — a thin diagonal accent stroke that cuts through
sections at ~15°, suggesting koinobori rising on the wind. It is a compositional tool, never
decoration: it leads the eye, separates surfaces, or anchors type. One per section at most;
never repetitive wallpaper.

## Palette

### Accents (≤3, used like highlighters)

| Token | Value | Role |
|---|---|---|
| `--accent-sky` | `#0EA5E9` | Primary accent — sky, wind, koinobori blue |
| `--accent-green` | `#22C55E` | Secondary accent — fresh early-summer greenery |
| `--accent-coral` | `#FF6B6B` | Tertiary accent — hot pop, festival energy |

### Neutrals (tuned warm)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FAFAF8` | Page background — warm white |
| `--surface` | `#FFFFFF` | Card/section surface — pure white |
| `--text` | `#1A1A1A` | Primary text — near-black |
| `--muted` | `#6B7280` | Secondary text, captions |
| `--border` | `#E5E7EB` | Subtle divider (used sparingly; prefer space) |

### Semantic

| Token | Value | Role |
|---|---|---|
| `--success` | `#22C55E` | Positive states |
| `--warning` | `#F59E0B` | Caution states |
| `--error` | `#EF4444` | Error/destructive |
| `--info` | `#0EA5E9` | Informational |

### On-accent

| Token | Value |
|---|---|
| `--on-accent-sky` | `#FFFFFF` |
| `--on-accent-green` | `#FFFFFF` |
| `--on-accent-coral` | `#FFFFFF` |

## Typography

### Font stack

```
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-display: 'Inter', system-ui, -apple-system, sans-serif;
--font-jp: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
```

### Scale

| Token | Size | Leading | Tracking | Weight |
|---|---|---|---|---|
| `--text-display` | clamp(48px, 6vw, 96px) | 0.88 | -0.02em | 800 |
| `--text-h1` | clamp(32px, 4vw, 56px) | 1.1 | -0.01em | 700 |
| `--text-h2` | clamp(24px, 3vw, 40px) | 1.15 | 0 | 700 |
| `--text-h3` | clamp(20px, 2vw, 28px) | 1.2 | 0 | 600 |
| `--text-body` | 17px | 1.5 | 0 | 400 |
| `--text-body-lg` | 19px | 1.5 | 0 | 400 |
| `--text-small` | 14px | 1.4 | 0 | 400 |
| `--text-caption` | 12px | 1.4 | 0.02em | 500 |

Japanese display text (`--font-jp`) uses the same size tokens but at weight 900 for maximum
presence. Kanji headlines sit at `--text-display` size; kana subtitles at `--text-h3`.

## Spacing

Base unit: 4px. Generous throughout — titles never stuck to container tops.

| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |
| `--space-3xl` | 64px |
| `--space-4xl` | 96px |
| `--space-5xl` | 128px |

Section padding: `--space-3xl` (64px) minimum vertical; `--space-4xl` (96px) preferred.
Hero padding-top: `--space-5xl` (128px) minimum.

## Radius

One coherent geometry. Allowed values only:

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Sharp edges, the rising line, dividers |
| `--radius-md` | 16px | Cards, buttons, inputs, selects |
| `--radius-lg` | 24px | Large containers, modals, hero image masks |
| `--radius-full` | 9999px | Pills, badges, tags, toggle switches |

## Control height

**One shared height**: `--control-height: 44px`.

Every form control — buttons, inputs, selects, toggles — uses this exact height.
Labels sit above, optically centred padding inside.

### Button states (full matrix)

| State | Style |
|---|---|
| Default | `bg: --accent-sky`, `color: --on-accent-sky`, `radius: --radius-md` |
| Hover | `filter: brightness(1.08)`, `transform: translateY(-1px)`, `box-shadow: 0 4px 12px rgba(14,165,233,0.25)` |
| Focus | `outline: 2px solid --accent-sky`, `outline-offset: 2px` (visible ring) |
| Active | `filter: brightness(0.95)`, `transform: translateY(0)`, `box-shadow: none` |
| Disabled | `opacity: 0.4`, `cursor: not-allowed`, `pointer-events: none` |

Primary button: filled `--accent-sky`. Secondary button: `bg: transparent`, `color: --accent-sky`,
`box-shadow: inset 0 0 0 1.5px --accent-sky` (no border — use inset shadow for the outline).
Tertiary/ghost: `bg: transparent`, `color: --text`, hover reveals `bg: rgba(14,165,233,0.06)`.

### Input states

| State | Style |
|---|---|
| Default | `bg: --surface`, `box-shadow: inset 0 0 0 1px --border`, `radius: --radius-md` |
| Hover | `box-shadow: inset 0 0 0 1.5px --muted` |
| Focus | `outline: 2px solid --accent-sky`, `outline-offset: 2px`, `box-shadow: none` |
| Active | Same as focus while typing |
| Disabled | `opacity: 0.4`, `bg: --bg`, `cursor: not-allowed` |
| Error | `box-shadow: inset 0 0 0 1.5px --error` |
| Placeholder | `color: --muted`, `opacity: 0.6` |

### Select, textarea, checkbox, radio, toggle

All follow the same 44px height, radius, and state matrix. Toggle switch: `--radius-full`,
44×24px track, 20px thumb, `--accent-sky` when checked.

## Surfaces

Surfaces are separated by **tone, not borders**. Cards sit on `--bg` as `--surface` with
a subtle `box-shadow` (0 1px 3px rgba(0,0,0,0.04)). Sections alternate between `--bg` and
`--surface` backgrounds. No card nesting — hierarchy through space, type, and surface tone.

## The rising line (signature mechanic)

A thin (2px) diagonal stroke at ~15° in `--accent-sky` or `--accent-green`. Applied as an
`::after` pseudo-element or an inline SVG. It cuts across section boundaries, leads the eye
from one content block to the next, or anchors a headline. Never repeated mechanically —
each use is a deliberate compositional choice.

CSS implementation:
```css
.rising-line {
  position: relative;
}
.rising-line::after {
  content: '';
  position: absolute;
  width: 120px;
  height: 2px;
  background: var(--accent-sky);
  transform: rotate(-15deg);
  transform-origin: left center;
}
```

## Compositions

### Landing page
- Full-bleed hero (100vw × 100svh), `background-image: var(--hero-image)`
- Hero overlay: bold display headline in `--font-jp` + `--font-display`, legible over image
- Below hero: rich full sections with generous vertical rhythm
- Rising line used as section dividers and headline anchors
- Motion: staggered fade-up reveals, gated behind `.js` class on `<html>`
- No scroll cues or down arrows

### Dashboard
- Sidebar + main content layout
- Cards on `--surface` with subtle shadow, no borders
- Data tables: `--text-small` (14px+), striped rows with `--bg` alternate
- Charts use accent palette only; semantic colors for alerts
- All controls at 44px height, full state matrix
- Rising line as sidebar accent or header underline

### Immersive
- One continuous low-poly 3D world (Three.js), camera driven by native scroll
- Content panels overlaid in the language's type system
- Translucent glass panels (`backdrop-filter: blur(16px)`) with strong readability scrims
- Accent-highlighted key info
- Rising line expressed as camera path diagonals and world geometry

## Art style

The language's visual imagery (landing hero, dashboard illustrations) uses a **graphic poster**
style: flat colour fields, bold silhouettes, editorial composition. Think Japanese graphic
design posters — strong negative space, one dominant image, typography as architecture.
Not low-poly (that is the immersive surface's domain); not photographic; not illustrated
children's-book. Clean, confident, adult.

Credits: Influenced by the Japanese graphic design tradition — Ikko Tanaka, Kazumasa Nagai,
Tadanori Yokoo — and the editorial clarity of contemporary Japanese independent magazines.

## Responsive

- 390px mobile to 2560px+ ultra-wide
- Mobile: single column, stacked sections, hidden non-essential nav
- Ultra-wide: content capped and centred at 1280px; only hero spans 100vw
- `minmax(0,1fr)` grid columns, `min-width: 0` on flex children

## shadcn

Full component recipes in `components.md` (component-recipes-v1, Author: katagami-agent).
Preview shots in `preview-shots.json` (renderable-v1, ≥3 product scenes, all 16 primitives).
Registry theme honours this language's borders (none), radius (16px), and material (flat, no
gradients).