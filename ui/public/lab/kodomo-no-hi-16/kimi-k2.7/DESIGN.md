# Kodomo Rise — Design Language

## Philosophy

Kodomo Rise is a bright, airy, hopeful early-summer design language inspired by Kodomo no Hi and the sight of koinobori carp streamers rising into clear light. It treats vivid colour as a highlighter against open white space: electric sky-blues, fresh greens, and a hot coral pop. The mood is editorial, confident, and grown-up — a product an adult would launch, never childish or cluttered.

The system favors generous whitespace, strong typographic contrast, and decisive accent geometry. Surfaces feel breathable and optimistic, with motion implied through diagonal rises, rounded pill shapes, and clean horizontal bands.

## Tokens

### Color

| Token | Value | Usage |
|-------|-------|-------|
| `--kr-white` | `#FFFFFF` | backgrounds, cards, negative space |
| `--kr-ink` | `#0A0F14` | primary text, strong surfaces |
| `--kr-sky` | `#00D4FF` | primary accent, CTAs, highlights |
| `--kr-leaf` | `#00E676` | secondary accent, growth, success |
| `--kr-coral` | `#FF4D6D` | hot pop, alerts, emphasis |
| `--kr-mist` | `#F6FAFC` | subtle fills, alternate backgrounds |
| `--kr-steel` | `#8A9AA8` | muted text, secondary labels |
| `--kr-cloud` | `#E5EDF2` | borders, dividers |

### Typography

| Token | Value |
|-------|-------|
| `--kr-font-display` | `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--kr-font-body` | `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--kr-letter-tight` | `-0.03em` |
| `--kr-letter-loose` | `0.08em` |

| Scale | Size | Line | Weight | Usage |
|-------|------|------|--------|-------|
| Hero | 72px / 56px mobile | 1.05 | 800 | landing hero headline |
| Display | 56px / 40px mobile | 1.08 | 800 | section headlines |
| Title | 40px / 32px mobile | 1.12 | 700 | page titles |
| Headline | 32px / 24px mobile | 1.15 | 700 | sub-sections |
| Lead | 24px / 20px mobile | 1.35 | 500 | intro paragraphs |
| Body | 17px | 1.6 | 400 | body copy |
| Small | 14px | 1.5 | 500 | labels, captions |
| Tiny | 12px | 1.4 | 600 | badges, metadata |

### Spacing

| Token | Value |
|-------|-------|
| `--kr-space-1` | 4px |
| `--kr-space-2` | 8px |
| `--kr-space-3` | 12px |
| `--kr-space-4` | 16px |
| `--kr-space-5` | 24px |
| `--kr-space-6` | 32px |
| `--kr-space-7` | 48px |
| `--kr-space-8` | 64px |
| `--kr-space-9` | 96px |

### Radius

Allowed values: `0`, `16px`, `24px`, `9999px`.

| Token | Value |
|-------|-------|
| `--kr-radius-sm` | 16px |
| `--kr-radius-md` | 24px |
| `--kr-radius-pill` | 9999px |

### Elevation

| Token | Value |
|-------|-------|
| `--kr-shadow-sm` | `0 2px 8px rgba(10,15,20,0.06)` |
| `--kr-shadow-md` | `0 8px 24px rgba(10,15,20,0.08)` |
| `--kr-shadow-lg` | `0 24px 64px rgba(10,15,20,0.10)` |

### Layout

| Token | Value |
|-------|-------|
| `--kr-max-content` | 1280px |
| `--kr-control-height` | 44px |
| `--kr-grid-gap` | 24px |

## Components

All interactive controls share `--kr-control-height: 44px` and receive a visible focus ring.

### Button

- Height: 44px
- Padding: 0 24px
- Border-radius: 9999px (pill)
- Font: 14px / 600 / uppercase / letter-spacing 0.08em
- Default: background `--kr-sky`, text `--kr-ink`
- Hover: background `--kr-ink`, text `--kr-white`
- Focus: outline 3px solid `--kr-sky` at 40% opacity, outline-offset 3px
- Active: scale(0.98), background `--kr-ink`
- Disabled: opacity 0.4, cursor not-allowed, no transform

Variants:
- `.btn-primary`: sky fill, ink text
- `.btn-leaf`: leaf fill, ink text
- `.btn-coral`: coral fill, white text
- `.btn-ghost`: transparent, ink text, cloud border

### Input / Textarea / Select

- Height: 44px (textarea min-height 96px)
- Padding: 0 16px
- Border: 2px solid `--kr-cloud`
- Border-radius: 16px
- Background: `--kr-white`
- Font: 16px / 400
- Placeholder: `--kr-steel`
- Hover: border `--kr-steel`
- Focus: border `--kr-sky`, outline 3px solid `--kr-sky` at 30% opacity, outline-offset 2px
- Disabled: background `--kr-mist`, opacity 0.6

### Card

- Background: `--kr-white`
- Border-radius: 24px
- Padding: 32px
- Shadow: `--kr-shadow-md`
- Hover (interactive): translateY(-4px), shadow `--kr-shadow-lg`

### Badge

- Padding: 6px 14px
- Border-radius: 9999px
- Font: 12px / 600 / uppercase / letter-spacing 0.08em
- Variants: sky, leaf, coral, mist

### Switch

- Width: 44px, height: 24px
- Border-radius: 9999px
- Track: `--kr-cloud` off, `--kr-sky` on
- Thumb: 20px circle, white shadow
- Focus: outline ring on the track

### Checkbox / Radio

- Size: 20px
- Border: 2px solid `--kr-cloud`
- Border-radius: 6px (radio: 50%)
- Checked: background `--kr-sky`, border `--kr-sky`, white check/dot
- Focus: outline ring

## Layout Guidance

- Pages sit on `--kr-white` with `--kr-mist` bands for rhythm.
- Major sections use `--kr-space-9` (96px) vertical padding.
- Content is constrained to `--kr-max-content` and centered.
- Use the accent colours as highlighters: small fields of sky/leaf/coral against large white areas.
- Editorial type: big display headlines, generous line-height, tight letter-spacing on display.
- Avoid grey borders as decoration; use whitespace and shadow for separation.
- Motion: prefer `transform` and `opacity`; respect `prefers-reduced-motion`.
