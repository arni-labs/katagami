# Ryūmon — Design Language

> 龍門 — the Dragon Gate. The carp that climbs the waterfall becomes a dragon.
> Every element in this language suggests upward momentum, fluid motion, and the joy of becoming.

## Point of View

Ryūmon is the design language of **ascent and transformation**, drawn from Kodomo no Hi
(こどもの日), the Japanese Children's Day festival where koinobori carp streamers rise on
spring winds. The language carries courage, growth, and celebration — not as sentiment but
as kinetic energy. Surfaces feel alive with current: elements rise, flow, and gather like
carp swimming against the stream. The palette is warm, bold, and unapologetically festive
while remaining disciplined — three accents used like highlighters on a warm neutral ground.

## Signature Mechanic: Rising Currents

Elements ascend. Cards lift on hover with a subtle translate-Y. Section dividers are
asymmetric wave-forms, not horizontal rules. Typography leans into vertical rhythm with
generous leading. Interactive elements pulse gently on focus, suggesting the heartbeat of
a swimming fish. The overall composition pulls the eye upward — heroes bleed to the top
edge, content flows from sky to stream.

## Palette

### Accents (≤3, used as highlighters)

| Token | Hex | Role |
|---|---|---|
| `--accent` | `#D93A20` | Koi Vermillion — primary action, key highlights |
| `--accent-indigo` | `#2B5478` | Ai Indigo — secondary emphasis, depth, links |
| `--accent-shobu` | `#4D8C5E` | Shōbu Green — success states, growth indicators |

### Neutrals (warm temperature)

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#FDFBF7` | Warm paper white — page ground |
| `--surface` | `#F3EDE2` | Warm cream — card/panel surfaces |
| `--surface-raised` | `#FAF6EF` | Lifted surface — elevated cards |
| `--text` | `#1C1915` | Warm near-black — body text |
| `--text-display` | `#0F0D0A` | Deep ink — display headings |
| `--muted` | `#7D776C` | Warm grey — secondary text |
| `--border` | `#E2DBCE` | Warm light — subtle separation |
| `--on-accent` | `#FFFFFF` | On vermillion — button labels |
| `--on-indigo` | `#F0EDE6` | On indigo — light text on dark accent |

### Semantic

| Token | Hex | Role |
|---|---|---|
| `--success` | `#4D8C5E` | Shōbu Green |
| `--warning` | `#D4922A` | Amber — warm caution |
| `--error` | `#D93A20` | Koi Vermillion |
| `--info` | `#2B5478` | Ai Indigo |

## Typography

### Scale

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `--type-display` | 72px / 80px | 800 | Hero headlines |
| `--type-h1` | 48px / 56px | 700 | Section titles |
| `--type-h2` | 36px / 44px | 700 | Sub-sections |
| `--type-h3` | 24px / 32px | 600 | Card titles |
| `--type-body` | 17px / 28px | 400 | Body copy |
| `--type-body-strong` | 17px / 28px | 600 | Emphasized body |
| `--type-small` | 14px / 20px | 400 | Captions, labels |
| `--type-caption` | 12px / 16px | 500 | Metadata, badges |

### Faces

- **Display**: `"DM Sans", system-ui, sans-serif` — geometric, bold, modern
- **Japanese**: `"Noto Sans JP", "Hiragino Sans", sans-serif` — for kanji/kana
- **Body**: `"Inter", system-ui, sans-serif` — readable, clean
- **Mono**: `"JetBrains Mono", monospace` — code/data

Letter-spacing: `-0.02em` on display, `-0.01em` on headings, `0` on body.

## Spacing

Base unit: 4px. Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.

Section padding: `96px` vertical on desktop, `64px` on mobile.
Card padding: `32px` on desktop, `24px` on mobile.
Gap between cards: `24px`.

## Radius

Allowed set: `{0, 16, 24, 9999}`.

- Cards: `24px`
- Buttons: `9999px` (pill)
- Inputs: `16px`
- Badges/tags: `9999px`
- Modals/panels: `24px`
- Sharp decorative elements: `0`

## Control Height

One shared token: `--control-h: 48px`.

All interactive controls — buttons, inputs, selects, toggles — share this height.
Buttons: `height: 48px; padding: 0 32px; border-radius: 9999px`.
Inputs: `height: 48px; padding: 0 16px; border-radius: 16px`.

## State Matrix

Every interactive control implements all five states:

| State | Visual Treatment |
|---|---|
| **Default** | Token-defined base style |
| **Hover** | `brightness(1.08)` + `translateY(-1px)` + `shadow-sm` |
| **Focus** | `outline: 3px solid var(--accent-indigo)` + `outline-offset: 2px` (visible ring) |
| **Active** | `brightness(0.95)` + `translateY(0)` + `scale(0.98)` |
| **Disabled** | `opacity: 0.4` + `pointer-events: none` + `cursor: not-allowed` |

### Button Variants

- **Primary**: `background: var(--accent); color: var(--on-accent)` — one per group
- **Secondary**: `background: var(--surface); color: var(--text); border: 1px solid var(--border)`
- **Ghost**: `background: transparent; color: var(--accent-indigo)`
- **Danger**: `background: var(--error); color: var(--on-accent)`

All buttons share: `height: 48px; border-radius: 9999px; font-weight: 600; font-size: 14px; letter-spacing: 0.01em`.

### Form Controls

Every form control is explicitly styled — no browser defaults visible.

- **Text inputs**: `height: 48px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 16px; padding: 0 16px; font-size: 17px; color: var(--text)`. Focus: border becomes `var(--accent-indigo)`, ring appears.
- **Selects**: Same as text input with a custom SVG chevron (no native arrow).
- **Checkboxes**: `20×20px`, `border-radius: 4px`, checked state fills `var(--accent)` with a white SVG checkmark.
- **Radio buttons**: `20×20px`, circle, checked state shows inner dot in `var(--accent)`.
- **Toggles**: `48×28px` track, `24px` thumb, active track is `var(--accent-shobu)`.
- **Textareas**: Same styling as text inputs, `border-radius: 16px`, min-height `120px`.

## Surfaces

Surfaces are separated by **tone, not borders**. The page ground (`--bg`) hosts cards
(`--surface`), which host content. No visible borders between sections — whitespace and
background-tone shifts define hierarchy.

Cards use `background: var(--surface); border-radius: 24px; padding: 32px` with no border.
Elevation is expressed through subtle shadow on hover only: `box-shadow: 0 8px 32px rgba(28,25,21,0.08)`.

## Components

### Badge
`display: inline-flex; height: 28px; padding: 0 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: var(--surface); color: var(--accent-indigo)`.

### Card
`background: var(--surface); border-radius: 24px; padding: 32px; transition: transform 0.2s, box-shadow 0.2s`.
Hover: `transform: translateY(-2px); box-shadow: 0 8px 32px rgba(28,25,21,0.08)`.

### Navigation
`height: 64px; background: rgba(253,251,247,0.85); backdrop-filter: blur(12px); position: sticky; top: 0`.
Logo left, links center (hidden on mobile), CTA right.

### Data Display
Tables: `border-collapse: separate; border-spacing: 0`. Header row: `background: var(--surface); font-weight: 600; font-size: 14px`. Body rows: `font-size: 14.5px; padding: 12px 16px`. Alternate row tone: `background: var(--surface-raised)`.

### Stat Card
`background: var(--surface); border-radius: 24px; padding: 24px`. Large number: `font-size: 36px; font-weight: 800; color: var(--text-display)`. Label: `font-size: 14px; color: var(--muted)`.

## Art Direction

The art style for generated imagery is **warm editorial illustration** — painterly textures
with bold graphic shapes, inspired by Japanese woodblock prints (ukiyo-e) reinterpreted
through contemporary editorial design. Flat color fields with subtle grain, strong
silhouettes, and a sense of wind and water in motion. Not photorealistic, not cartoon —
a sophisticated middle ground that feels handcrafted.

## Credits

- **Ukiyo-e tradition**: The flat-color layering, strong silhouettes, and nature-as-subject
  approach draws from Hokusai, Hiroshige, and the broader Japanese woodblock print tradition.
- **Contemporary Japanese graphic design**: The disciplined use of bold color on neutral
  ground references the work of Kenya Hara and the Nippon Design Center.
- **Festival culture**: Kodomo no Hi (こどもの日) and its koinobori tradition provide the
  cultural palette and emotional core.
