# Aozora Signal

Aozora Signal is a bright, grown-up Kodomo no Hi product language: clear early-summer air, koinobori rising on wind, and the decisiveness of a launch poster. It keeps most surfaces white and architectural, then uses near-neon color as a signal system: blue for lift, green for growth, vermilion for urgency and delight.

The language is not cute. It is optimistic, precise, and graphic. Carp-streamer forms appear as angled ribbons, wind paths, clipped capsules, and upward diagonals rather than literal decoration.

## Point of view

- **Open sky first.** White space is the primary material. Dense UI is broken into islands with large gutters.
- **Signal color, not wash.** Accents are high-chroma and applied in tight doses: rules, pills, active states, map lines, small panels.
- **Upward motion.** Layouts prefer diagonals, staggered cards, vertical lift, and right-rising composition.
- **Adult festival energy.** Kodomo no Hi references are abstracted into wind, route, fabric, and civic celebration.
- **Poster confidence.** Headlines are compressed, large, and editorial; body copy stays clean and practical.

## Tokens

### Color

| Token | Value | Use |
|---|---:|---|
| `--ink` | `#07110F` | Primary text |
| `--ink-soft` | `#33423E` | Secondary text |
| `--muted` | `#66736F` | Metadata |
| `--paper` | `#FFFFFF` | Page and cards |
| `--paper-cool` | `#F7FBFF` | Subtle elevated panels |
| `--sky` | `#00A8FF` | Primary signal, links, active state |
| `--sky-deep` | `#006DFF` | Hover/active depth |
| `--leaf` | `#28E66A` | Growth signal, success |
| `--hot` | `#FF3D6E` | High-priority pop |
| `--sun` | `#FFE84A` | Small highlight only |
| `--line` | `rgba(7, 17, 15, 0.10)` | Fine structural lines only |
| `--shadow` | `0 24px 70px rgba(0, 109, 255, 0.16)` | Airy elevation |

Color rule: never place light text on bright accents unless contrast is checked. Prefer black text on neon green/yellow; white text only on `--ink`, `--sky-deep`, or dark image overlays.

### Type

- Display: `Arial Narrow`, `Roboto Condensed`, `Helvetica Neue Condensed`, `Arial`, sans-serif.
- Text/UI: `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif.
- Numeric/data: `IBM Plex Mono`, `SFMono-Regular`, `Menlo`, monospace.

Scale:

| Token | Size | Line | Use |
|---|---:|---:|---|
| `--step-0` | `0.875rem` | `1.25` | Metadata, labels |
| `--step-1` | `1rem` | `1.5` | UI text |
| `--step-2` | `1.125rem` | `1.55` | Body |
| `--step-3` | `1.5rem` | `1.2` | Card titles |
| `--step-4` | `2.25rem` | `1.05` | Section titles |
| `--step-5` | `clamp(3.4rem, 9vw, 8.5rem)` | `0.86` | Hero display |

Display text uses `letter-spacing: -0.055em`; body uses normal tracking; labels use uppercase with `0.12em` tracking.

### Spacing

Base unit is 8px.

| Token | Value |
|---|---:|
| `--s1` | `8px` |
| `--s2` | `16px` |
| `--s3` | `24px` |
| `--s4` | `32px` |
| `--s5` | `48px` |
| `--s6` | `72px` |
| `--s7` | `104px` |
| `--s8` | `144px` |

### Radius

| Token | Value | Use |
|---|---:|---|
| `--r0` | `0` | Poster cuts, image masks |
| `--r1` | `16px` | Inputs, small cards |
| `--r2` | `24px` | Large cards and media |
| `--pill` | `999px` | Pills, buttons, tags |

### Shared control height

`--control-h: 48px`

Every button, input, select, toggle, search box, segmented item, and compact action sits on this one height. Textareas use `min-height: calc(var(--control-h) * 2.4)` and share all other control styling.

## Components

### Buttons

- Base: `height: var(--control-h)`, pill radius, 0 border, 16px horizontal padding, medium weight.
- Primary: `--ink` background, white text, hot vermilion comet mark optional.
- Secondary: white background, `--ink` text, inset line using `box-shadow: inset 0 0 0 1px var(--line)`.
- Signal: `--sky` background, `--ink` text for contrast and festival brightness.

States:

- Default: crisp, high contrast, no blur.
- Hover: translate `-2px`, deepen shadow, secondary gains pale sky fill.
- Focus-visible: `outline: 3px solid var(--sun); outline-offset: 3px` plus `box-shadow: 0 0 0 7px rgba(0,168,255,.18)`.
- Active: translate `0`, scale `.985`, color deepens (`--sky-deep` for signal).
- Disabled: opacity `.45`, no transform, cursor `not-allowed`, shadow removed.

### Form controls

Applies to `input`, `select`, `textarea`, checkbox/radio wrappers, segmented controls, range track, and toggles.

- Base: white fill, `height: var(--control-h)`, radius `--r1`, `box-shadow: inset 0 0 0 1px var(--line)`, ink text, 16px padding.
- Placeholder: `--muted` at 78% opacity.
- Hover: `box-shadow: inset 0 0 0 1px rgba(0,168,255,.45)`.
- Focus/focus-within: visible sun outline plus sky halo.
- Active/checked: sky or leaf signal with ink text/checkmark.
- Disabled: cool paper fill, muted text, opacity `.55`, cursor `not-allowed`.
- Error: hot vermilion line and hot-tinted helper text; keep text dark.

### Cards

Cards are white islands with generous padding, large radius, and airy shadows. Avoid grey-border dependence. If separation is needed, use a single color stripe, a clipped corner, or a fine inset line. Card titles sit at least 24px below the card top unless the card is a compact stat.

### Navigation

Navigation is light, fixed or sticky only when useful, and uses one active pill. Active state is sky-filled with dark text. Secondary links use text plus a short hot underline on hover.

### Data display

Dashboard data should feel like a launch-control table in daylight. Use mono numbers, compact labels, and thin sky/leaf/hot signal bars. Tables use 14.5px+ rows, no heavy grids, and row hover as pale sky wash.

## Layout guidance

### Landing page

- One full-bleed hero image at the top.
- Hero copy should cut into the image or sit on a clean white editorial panel, not float aimlessly.
- Use one upward diagonal motif per major section: ribbon, card stagger, chart slope, or media crop.
- Avoid specimen sections: no token swatches, state tables, or design-system displays.

### Dashboard

- Left rail or top rail may be used, but leave breathing room.
- Prioritize live operational surfaces: KPIs, maps, routing, alerts, schedules, and team actions.
- Use signal colors semantically: sky = active motion, leaf = healthy/growing, hot = attention.
- Form controls must look launch-ready, not default browser controls.

## Motion

Use short motion only: 160–220ms, `cubic-bezier(.2,.8,.2,1)`. Reduce or remove transform animation under `prefers-reduced-motion: reduce`. Motion should imply wind lift, not bounce.