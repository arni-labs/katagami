# Nobori

> One Katagami design language for Kodomo no Hi — the Japanese Children's Day / Koinobori festival. Bright, airy, hopeful early-summer: clear light, fresh greenery, carp streamers rising. Pushed into confident graphic design.

## POV

Nobori treats the festival not as decoration but as a **direction**. Every surface climbs: streamers rise, rivers run upward, children grow. The signature mechanic is **upward momentum expressed through diagonal thrust, stacked vertical rhythm, and high-contrast accent highlights**. White space is the sky; colour is the wind.

The aesthetic is **grown-up graphic design**, not childish illustration. Layouts are editorial, type is bold, accents are vivid and almost neon (electric sky-blue, fresh green, hot coral) used like highlighters. Clean, never muddy. Sleek, never cluttered.

## Name

**Nobori** — Japanese for a banner, flag, or streamer; the same root as *koinobori* (carp streamer). One concrete noun, ownable, motif-first.

## Influences & credits

- **Japanese municipal Kodomo no Hi posters** — public festival graphics that pair huge kanji with open sky and vertical carp poles.
- **Ikko Tanaka** — graphic clarity, flat colour planes, and the disciplined use of empty space.
- **Tadashi Nadamoto** — festival poster colour blocking and rhythmic vertical compositions.
- **Studio Ghibli** (especially *My Neighbor Totoro*) — the saturated-but-clean early-summer palette of bright sky, new leaves, and warm light.
- **Koinobori craft tradition** — the five-colour carp ladder (black, red, blue, green, orange) reinterpreted as three electric accents on a white ground.

## Tokens

### Colour

Neutrals are tuned slightly warm so the cool accents pop.

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#FDFCF8` | page ground |
| `--surface` | `#FFFFFF` | cards, panels, inputs |
| `--surface-2` | `#F3F6F4` | secondary surfaces, stripes |
| `--text` | `#0F1115` | primary copy |
| `--muted` | `#6B7280` | secondary / meta copy |
| `--border` | `#E8EBE9` | hairline separators only |
| `--accent` | `#00CFFF` | primary accent — electric sky |
| `--accent-2` | `#00E676` | secondary accent — fresh leaf |
| `--accent-3` | `#FF4D6D` | tertiary accent — hot ember |
| `--on-accent` | `#0F1115` | text on accent fills |
| `--success` | `#00C853` | confirmations |
| `--warning` | `#FFB300` | cautions |
| `--error` | `#FF1744` | errors |
| `--info` | `#00B0FF` | informational |

Accent count: **3** (`--accent`, `--accent-2`, `--accent-3`).

### Typography

- **Display / Latin**: `Inter` (Google Fonts), weights 400–900.
- **Japanese / kanji**: `Noto Sans JP`, weights 400–900.
- **Display treatment**: tight letter-spacing `-0.02em`, bold weights, large scale.
- **Body**: minimum `17px` (`1.0625rem` on a 16px base).

Scale:

| Token | Size | Use |
|-------|------|-----|
| `--text-xs` | `0.75rem` (12px) | captions, micro labels |
| `--text-sm` | `0.875rem` (14px) | meta, table rows |
| `--text-base` | `1.0625rem` (17px) | body |
| `--text-lg` | `1.25rem` (20px) | lead |
| `--text-xl` | `1.5rem` (24px) | section subheads |
| `--text-2xl` | `2rem` (32px) | h3 |
| `--text-3xl` | `3rem` (48px) | h2 |
| `--text-4xl` | `4.5rem` (72px) | h1 / hero |
| `--text-5xl` | `6rem` (96px) | masthead only |

Line-height: `--leading-tight: 0.95`, `--leading-snug: 1.1`, `--leading-normal: 1.5`, `--leading-relaxed: 1.65`.

### Spacing

Base unit `4px`.

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

### Radius

Allowed set only: `{0, 16px, 24px, 9999px}`.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-0` | `0` | sharp edges, full-bleed panels |
| `--radius-card` | `16px` | cards, buttons, inputs |
| `--radius-lg` | `24px` | large panels, modals |
| `--radius-pill` | `9999px` | pills, badges, chips |

### Elevation

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(15,17,21,0.06)` |
| `--shadow-md` | `0 8px 24px rgba(15,17,21,0.08)` |
| `--shadow-lg` | `0 24px 64px rgba(15,17,21,0.12)` |

### Shared control height

All buttons, inputs, selects, and chips share:

```
--control-height: 48px;
```

### Layout

| Token | Value |
|-------|-------|
| `--max-content` | `1280px` |
| `--max-prose` | `640px` |
| `--gutter` | `24px` |
| `--hero-image` | swappable image URL |

## Components

### Button

Shared height `48px`, label centred, one clearly primary per group.

- **Primary**: bg `--accent`, text `--on-accent`, radius `--radius-card`, padding `0 24px`, font-weight 600.
- **Secondary**: bg `--surface`, text `--text`, border `1px solid --border`.
- **Ghost**: transparent bg, text `--text`, hover bg `--surface-2`.
- **Pill**: radius `--radius-pill`.

### Input / Select / Textarea

- Height `48px` (textarea auto).
- bg `--surface`, border `1.5px solid --border`, radius `--radius-card`.
- Padding `12px 16px`.
- Placeholder colour `--muted`.
- Focus: border `--accent`, ring `0 0 0 3px rgba(0,207,255,0.25)`.

### Checkbox / Radio

- Custom `20px` square/circle, border `1.5px solid --border`, bg `--surface`.
- Checked: bg `--accent`, tick/dot `--on-accent`.
- Focus: ring as above.

### Card

- bg `--surface`, radius `--radius-card`, padding `--space-6`.
- No single-edge highlight; no nested cards.
- Separation from ground via bg tone, shadow, and generous space.

### Badge / Pill

- Height `28px` (smaller than control height, but consistent pill language).
- Radius `--radius-pill`, padding `0 12px`, font-weight 600.
- Variants: accent, accent-2, accent-3, muted.

### Surface separation

Use **tone, not borders**: `--bg` for page, `--surface` for cards, `--surface-2` for secondary bands. Hairline borders only where needed for accessibility or form boundaries.

## State matrix

Every interactive control has the same five states, styled explicitly:

| State | Visual |
|-------|--------|
| Default | token values above |
| Hover | `filter: brightness(1.04)` or bg shift to `--surface-2`; cursor pointer |
| Focus visible | `outline: none; box-shadow: 0 0 0 3px rgba(0,207,255,0.35)` (accent ring) |
| Active | `transform: translateY(1px)` or `scale(0.98)`; darker fill |
| Disabled | `opacity: 0.45; pointer-events: none` |

Focus rings are always visible and use `--accent`.

## Responsive

- Mobile: single column, hide non-essential nav, no horizontal overflow.
- Tablet: 2-column grids.
- Desktop: up to 4-column grids, capped content width `--max-content`.
- Ultra-wide: content centred; only full-bleed hero spans `100vw`.
- Grid children use `minmax(0,1fr)` and `min-width:0` to prevent blowout.

## Motion

- Motion carries meaning: reveals follow scroll, accents pulse on interaction, upward transitions echo the streamer motif.
- Default / no-JS state is the settled design; JS adds entrance reveals behind a class set on `<html>`.
- Respect `prefers-reduced-motion`: disable transforms and parallax.

## Surfaces

- **landing.html** — expressive product landing. Full-bleed hero via `--hero-image`, editorial sections, real product copy, generated imagery.
- **immersive.html** — scroll-driven real-time low-poly 3D world. One continuous scene: ground, river, waterfall, koinobori avenue, dragon climax. No generated stills or video blended in.
- **dashboard.html** — real product dashboard using the same tokens and components.

## Constraints checklist

- [x] One ownable idea (upward momentum / streamer direction).
- [x] Distinctive one-word name, no banned tokens.
- [x] ≤3 accent colours.
- [x] Neutrals tuned warm; high contrast; body 17px+.
- [x] Radius from allowed set only.
- [x] One shared control height (`48px`).
- [x] Full state matrix for every control.
- [x] No single-edge card highlights; no nested cards.
- [x] No emoji or symbol glyphs in copy or buttons.
- [x] Hero uses `background-image: var(--hero-image)`.
- [x] No scroll cues / down arrows.
- [x] Responsive from 390px to 2560px+.
- [x] Credits included.
