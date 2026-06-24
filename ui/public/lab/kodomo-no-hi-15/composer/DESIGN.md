# Nobori

> A Katagami design language for Kodomo no Hi — bright, airy, hopeful early-summer celebration pushed into confident graphic design.

## Point of view

**Nobori** treats Children's Day not as nostalgia but as infrastructure: the moment communities coordinate wind, poles, and courage into something that rises. The signature mechanic is **Highlight Strips** — vivid accent colour laid behind key information like a marker pen on clean white paper. Open space dominates; accents strike once, decisively.

Product world: **Nobori Field** — the operating layer for neighborhood Kodomo no Hi festivals: streamer deployment, wind corridors, family registration, and live field status.

Mode: light. Ground is pure white; surfaces separate by tone, never borders.

## Naming

- Language: **Nobori** (the streamer pole — motif, not mood)
- Product: **Nobori Field**
- Slug: `nobori`

## Palette

Three accent colours, used as highlighters:

| Role | Token | Value | Use |
|------|-------|-------|-----|
| Electric sky | `--accent-sky` | `#00B8FF` | Primary actions, key dates, navigation active |
| Fresh rise | `--accent-green` | `#00E87A` | Growth metrics, success, secondary highlights |
| Hot pop | `--accent-pop` | `#FF2E55` | Urgency, free badges, climax moments |

Neutrals tuned cool for early-summer clarity:

| Role | Token | Value |
|------|-------|-------|
| Ground | `--bg` | `#FFFFFF` |
| Surface | `--surface` | `#F3F6F9` |
| Raised surface | `--surface-raised` | `#E6ECF2` |
| Text | `--text` | `#0A0F14` |
| Muted | `--muted` | `#5A6B7D` |
| On accent | `--on-accent` | `#FFFFFF` |
| Success | `--success` | `#00C96B` |
| Warning | `--warning` | `#E8A800` |
| Error | `--error` | `#E02020` |
| Info | `--info` | `#00B8FF` |

Semantic roles for `injectTheme`:

```css
:root {
  --bg: #FFFFFF;
  --surface: #F3F6F9;
  --text: #0A0F14;
  --muted: #5A6B7D;
  --border: transparent;
  --accent: #00B8FF;
  --on-accent: #FFFFFF;
  --success: #00C96B;
  --warning: #E8A800;
  --error: #E02020;
  --info: #00B8FF;
}
```

## Typography

| Role | Family | Size | Weight | Tracking |
|------|--------|------|--------|----------|
| Display | Bricolage Grotesque | clamp(2.5rem, 6vw, 5rem) | 700 | -0.02em |
| Headline | Bricolage Grotesque | clamp(1.75rem, 3vw, 2.5rem) | 600 | -0.02em |
| Body | Source Sans 3 | 17px | 400 | 0 |
| Small | Source Sans 3 | 14.5px | 400 | 0 |
| Kanji display | Noto Serif JP | clamp(2rem, 5vw, 4rem) | 700 | 0 |
| Label | Source Sans 3 | 13px | 600 | 0.04em |

Minimum body: 17px. Table rows: 14.5px+. High contrast always — dark text on light ground.

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

Titles always have padding above: minimum `--space-lg` from container top.

## Radius

Only: `0`, `16px`, `24px`, `9999px`.

| Token | Value |
|-------|-------|
| `--radius-none` | 0 |
| `--radius-md` | 16px |
| `--radius-lg` | 24px |
| `--radius-pill` | 9999px |

## Control height

Single shared token for all interactive controls:

```css
--control-height: 48px;
```

## Highlight Strips (signature)

```css
.highlight-strip {
  position: relative;
  display: inline;
}
.highlight-strip::before {
  content: '';
  position: absolute;
  left: -0.08em;
  right: -0.08em;
  bottom: 0.08em;
  height: 0.38em;
  z-index: -1;
  border-radius: 0;
}
.highlight-strip--sky::before { background: var(--accent-sky); }
.highlight-strip--green::before { background: var(--accent-green); }
.highlight-strip--pop::before { background: var(--accent-pop); }
```

## Surfaces

Separation by tone, not borders:

- `--bg` → page ground
- `--surface` → cards, panels (no border)
- `--surface-raised` → nested emphasis, table headers

Never nest cards. Nav sits openly across the header — no floating pill bar.

## Components

### Button

Shared shape: `--radius-pill`, height `--control-height`, centred label.

| State | Primary | Secondary | Ghost |
|-------|---------|-----------|-------|
| default | bg `--accent`, color `--on-accent` | bg `--surface`, color `--text` | bg transparent, color `--text` |
| hover | darken 8% | bg `--surface-raised` | color `--accent` |
| focus | ring 3px `--accent` at 40% opacity | same | same |
| active | scale 0.98 | scale 0.98 | scale 0.98 |
| disabled | opacity 0.4, pointer-events none | same | same |

### Input / Select / Textarea

Height `--control-height` (textarea min-height 120px). Background `--surface`, no border. Focus: 3px ring `--accent` at 40%. Placeholder `--muted`.

### Checkbox / Radio

18px custom control, accent fill on checked, focus ring on keyboard focus.

### Toggle

Track `--surface-raised`, thumb white, active track `--accent`.

## Hero

Landing hero: `100vw × 100svh`, `background-image: var(--hero-image)`. Legibility via solid scrim panels and Highlight Strips — no lazy gradient scrim.

## Motion

Default state is fully rendered without JS. Motion gated behind `.motion-ready` on `<html>`. Respect `prefers-reduced-motion`.

## Credits

- Kodomo no Hi / koinobori tradition — Japanese cultural festival imagery
- Swiss poster tradition — bold type on open ground
- Early-summer clarity — cool neutrals, electric accents

## Art direction (landing + dashboard imagery)

Bold editorial graphic photography: bright white negative space, vivid electric accents, grown-up product marketing — never low-poly, never childish, never muddy pastel.

## Immersive (3D)

Separate art direction: flat-shaded low-poly game world. Morning→dusk journey. Pure real-time Three.js — no blended stills.