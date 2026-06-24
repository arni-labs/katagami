# Sora-Koi

A design language for Kodomo no Hi — the upward, wind-borne optimism of koinobori swimming through open sky.

## Philosophy

Sora-Koi (sky carp) treats interfaces as open air: generous space, bold vertical motion, and a palette drawn from carp streamers against summer clouds. It is confident and playful without being childish. Every element should feel like it is catching an updraft — light, intentional, and ascending.

## Primitives

### Color

| Token | Hex | Usage |
|-------|-----|-------|
| `--sk-ink` | `#0B1220` | Primary text, strong surfaces |
| `--sk-cloud` | `#FFFFFF` | Backgrounds, cards, text on dark |
| `--sk-sky-50` | `#F7FAFF` | Subtle fills, hover grounds |
| `--sk-sky-100` | `#E8F0FF` | Secondary backgrounds, focus rings |
| `--sk-sky-200` | `#D0E0FF` | Borders, dividers, disabled accents |
| `--sk-sky-500` | `#6B8CFF` | Links, active states |
| `--sk-sky-700` | `#3B5BDB` | Primary interactive accent |
| `--sk-sky-900` | `#1A2B6B` | Deep headers, footer |
| `--sk-carp-red` | `#E8462B` | Primary CTA, hero accents |
| `--sk-carp-blue` | `#2B5CE8` | Secondary CTA, selection |
| `--sk-carp-black` | `#1A1A1A` | Strong type, koinobori detail |
| `--sk-sun-gold` | `#F5B800` | Highlights, badges, stars |
| `--sk-wind-mint` | `#7EE8C7` | Tertiary accent, success tint |
| `--sk-success` | `#2E9D6A` | Positive states |
| `--sk-warning` | `#F59E0B` | Caution states |
| `--sk-error` | `#DC2626` | Errors, destructive actions |

### Typography

- Display: `"DM Serif Display", Georgia, serif`
- Body: `"Inter", system-ui, -apple-system, sans-serif`
- Mono: `"JetBrains Mono", "SF Mono", monospace`

Scale (rem / px at 16px root):

| Token | Size | Line | Letter-spacing | Usage |
|-------|------|------|----------------|-------|
| `--text-xs` | 0.75rem / 12px | 1.4 | 0 | Captions, timestamps |
| `--text-sm` | 0.875rem / 14px | 1.5 | 0 | Body small, labels |
| `--text-base` | 1rem / 16px | 1.6 | 0 | Body |
| `--text-lg` | 1.25rem / 20px | 1.4 | -0.01em | Lead paragraphs |
| `--text-xl` | 1.5rem / 24px | 1.3 | -0.01em | H4 |
| `--text-2xl` | 2rem / 32px | 1.2 | -0.02em | H3 |
| `--text-3xl` | 2.5rem / 40px | 1.15 | -0.02em | H2 |
| `--text-4xl` | 3rem / 48px | 1.1 | -0.02em | Hero subhead |
| `--text-5xl` | 4rem / 64px | 1.05 | -0.02em | Hero headline |
| `--text-6xl` | 5rem / 80px | 1 | -0.03em | Display headline |

### Spacing

`--space-1` through `--space-16`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160, 192, 256, 320, 384, 512 (px)

### Radius

Allowed values: `0`, `12px`, `16px`, `24px`, `9999px`.

- `--radius-sm`: 12px
- `--radius-md`: 16px
- `--radius-lg`: 24px
- `--radius-pill`: 9999px

### Shared Control Height

`--control-height: 48px` — the single canonical height for buttons, inputs, selects, and compact list rows.

### Elevation

- `--shadow-sm`: `0 1px 2px rgba(11,18,32,0.06)`
- `--shadow-md`: `0 8px 24px rgba(11,18,32,0.08)`
- `--shadow-lg`: `0 24px 64px rgba(11,18,32,0.12)`

## Components

### Button

Height: `--control-height` (48px). Padding: `0 24px`. Radius: `--radius-pill`. Font: `--text-base` / 500.

- **Primary**: `bg-carp-red`, `text-cloud`. Hover: `#D13D24`. Active: `#B8341E`. Focus: `outline-none ring-[3px] ring-sky-200 ring-offset-2 ring-offset-cloud`. Disabled: `opacity-50`, `cursor-not-allowed`.
- **Secondary**: `bg-sky-100`, `text-sky-900`. Hover: `bg-sky-200`. Active: `bg-sky-500/20`. Focus: same ring. Disabled: opacity 0.5.
- **Ghost**: `bg-transparent`, `text-ink`. Hover: `bg-sky-50`. Active: `bg-sky-100`. Focus: same ring. Disabled: opacity 0.5.

### Input / Select / Textarea

- Input/Select height: `--control-height`. Padding: `0 16px`. Radius: `--radius-sm`. Border: `2px solid sky-200`. Background: `cloud`. Text: `ink`.
  - Hover: border `sky-500`.
  - Focus: border `sky-700`, ring `3px sky-200`.
  - Disabled: `bg-sky-50`, border `sky-200`, text `ink/50`.
- Textarea: min-height `96px`, padding `16px`, radius `--radius-sm`, same border/focus states.

### Checkbox / Radio

Size `24px × 24px`. Radius `6px` (checkbox) / `9999px` (radio). Border `2px sky-500`.

- Default: `bg-cloud`.
- Hover: border `sky-700`.
- Checked: `bg-carp-blue`, border `carp-blue`, white checkmark/dot.
- Focus: ring `3px sky-200`.
- Disabled: opacity 0.5.

### Card

Background `cloud`. Radius `--radius-lg`. Padding `32px`. Shadow `--shadow-md` on hover. No borders.

### Badge

Height `28px`. Padding `0 12px`. Radius `--radius-pill`. Font `--text-xs` / 600.

- Default: `bg-sky-100`, `text-sky-900`.
- Accent: `bg-sun-gold`, `text-carp-black`.
- Success: `bg-wind-mint/40`, `text-success`.

### Navigation

Height `72px`. Background `cloud/80` with `backdrop-blur`. Border-bottom `1px sky-200`. Logo + links + primary CTA.

### Link

Color `sky-700`. Hover: `carp-red`. Focus: `ring-2 sky-200`. Active: `sky-900`. Underline on hover only.

## Layout

- Max content width: `1280px`.
- Grid: 12 columns, gap `24px`.
- Page horizontal padding: `24px` (mobile), `48px` (desktop).
- Section vertical padding: `96px` desktop, `64px` mobile.
- Hero: full-bleed, min-height `90vh`, one dominant image.

## Imagery

Imagery is editorial and modern: bold flat color, subtle paper texture, wind-swept motion. Koinobori, sky, clouds, and golden light are the recurring motifs. No gradients; color is held in clean shapes.
