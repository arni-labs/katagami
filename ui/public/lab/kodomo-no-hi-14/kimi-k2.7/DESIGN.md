# Koinobori Design Language

## Philosophy / POV

Koinobori is a graphic-design system inspired by Kodomo no Hi — Japanese Children's Day — reinterpreted for confident, grown-up product surfaces. The world is bright, airy, and hopeful: clear early-summer light, fresh greenery, and carp streamers rising upward.

The aesthetic is **editorial and poster-like**, not childish or cluttered. We use lots of open white space, then hit it with vivid, almost-neon accents used like highlighters — electric sky-blue, fresh green, and a hot pop of coral-magenta. Forms are clean, type is bold, motion is minimal and purposeful. Every element should feel intentional, breathable, and energetic.

## Tokens

### Color

| Token | Hex | Usage |
|-------|-----|-------|
| `--ko-white` | `#FFFFFF` | backgrounds, cards, text on dark |
| `--ko-ink` | `#081922` | primary text, key UI lines |
| `--ko-sky` | `#00D4FF` | primary accent, CTAs, highlights |
| `--ko-leaf` | `#00E676` | success, growth, secondary accent |
| `--ko-pop` | `#FF3366` | hot accent, alerts, emphasis |
| `--ko-sky-50` | `#E6FBFF` | subtle tint backgrounds |
| `--ko-leaf-50` | `#E6FFF0` | subtle tint backgrounds |
| `--ko-pop-50` | `#FFE6ED` | subtle tint backgrounds |
| `--ko-ink-8` | `rgba(8, 25, 34, 0.08)` | borders, dividers |
| `--ko-ink-48` | `rgba(8, 25, 34, 0.48)` | secondary text, placeholders |
| `--ko-ink-64` | `rgba(8, 25, 34, 0.64)` | meta text |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--ko-font` | `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | all text |
| `--ko-text-display` | `3.5rem / 1.05 / -0.03em / 800` | hero headline |
| `--ko-text-title` | `2.25rem / 1.1 / -0.02em / 800` | section titles |
| `--ko-text-heading` | `1.5rem / 1.2 / -0.02em / 700` | card headings |
| `--ko-text-body` | `1.0625rem / 1.6 / 0 / 500` | body copy (17px) |
| `--ko-text-small` | `0.875rem / 1.5 / 0 / 600` | labels, captions |
| `--ko-text-micro` | `0.75rem / 1.4 / 0.04em / 700` | badges, uppercase microcopy |

### Spacing

| Token | Value |
|-------|-------|
| `--ko-space-1` | `0.25rem` |
| `--ko-space-2` | `0.5rem` |
| `--ko-space-3` | `0.75rem` |
| `--ko-space-4` | `1rem` |
| `--ko-space-6` | `1.5rem` |
| `--ko-space-8` | `2rem` |
| `--ko-space-12` | `3rem` |
| `--ko-space-16` | `4rem` |
| `--ko-space-24` | `6rem` |
| `--ko-space-32` | `8rem` |

### Radius

Allowed values: `0`, `16px`, `24px`, `9999px`.

| Token | Value | Usage |
|-------|-------|-------|
| `--ko-radius-none` | `0` | editorial cuts |
| `--ko-radius-md` | `16px` | cards, panels |
| `--ko-radius-lg` | `24px` | large cards, hero media |
| `--ko-radius-full` | `9999px` | pills, buttons, chips |

### Shared Control Height

| Token | Value |
|-------|-------|
| `--ko-control-height` | `48px` |

All interactive controls — buttons, inputs, selects — sit on this single height. Textarea and multi-line elements are the exception.

## Components

### Button

- Height: `--ko-control-height` (48px)
- Padding: `0 1.5rem`
- Border-radius: `--ko-radius-full`
- Font: `--ko-text-small`, uppercase tracking (`0.04em`)
- Default: ink background, white text
- Hover: `translateY(-2px)`, soft shadow `0 8px 24px rgba(8,25,34,0.12)`
- Focus: visible ring `0 0 0 4px rgba(0, 212, 255, 0.35)`
- Active: `translateY(0)`, reduced shadow
- Disabled: `opacity 0.45`, `cursor not-allowed`, no transform/shadow

Variants:
- Primary: ink bg / white text
- Sky: `--ko-sky` bg / ink text
- Pop: `--ko-pop` bg / white text
- Ghost: transparent bg / ink text, ink border `1.5px solid rgba(8,25,34,0.12)`

### Input / Select / Textarea

- Height: `--ko-control-height` for input/select; textarea min-height `120px`
- Padding: `0 1rem` (input/select), `1rem` (textarea)
- Border-radius: `--ko-radius-full` for input/select; `--ko-radius-md` for textarea
- Border: `1.5px solid rgba(8,25,34,0.12)`
- Background: white
- Placeholder: `--ko-ink-48`
- Hover: border color `--ko-ink-64`
- Focus: border `--ko-sky`, ring `0 0 0 4px rgba(0, 212, 255, 0.25)`
- Disabled: background `--ko-sky-50`, opacity `0.6`

### Checkbox / Radio

- Size: `20px`
- Border-radius: `6px` checkbox, `9999px` radio
- Border: `2px solid rgba(8,25,34,0.16)`
- Checked: `--ko-sky` fill, white checkmark/dot
- Focus: ring `0 0 0 4px rgba(0, 212, 255, 0.35)`

### Card

- Background: white
- Border-radius: `--ko-radius-lg`
- Padding: `--ko-space-8`
- Shadow: none by default; optional `0 16px 40px rgba(8,25,34,0.06)`
- No visible borders; separation comes from whitespace or subtle tint fills

### Badge / Chip

- Height: `28px`
- Padding: `0 0.75rem`
- Border-radius: `--ko-radius-full`
- Font: `--ko-text-micro`
- Variants: sky tint, leaf tint, pop tint, ink

### Link

- Default: `--ko-ink`, underline offset `3px`
- Hover: `--ko-sky`
- Focus: ring `0 0 0 4px rgba(0, 212, 255, 0.35)`

## Layout Guidance

- Container max-width: `1280px`, centered
- Page horizontal padding: `--ko-space-6` mobile, `--ko-space-12` desktop
- Section vertical spacing: `--ko-space-24` to `--ko-space-32`
- Grid: 12-column, gap `--ko-space-6`
- Hero: full-bleed imagery, large display type, minimal overlay
- Dashboard: sidebar + main, generous whitespace, tinted section panels
- Titles never touch container tops — always padding above
- Body text never below 17px
- High contrast only: ink on white, white on ink, ink on sky/leaf/pop when those are solid fills

## Interaction Principles

- Focus rings are always visible and sky-colored.
- Hover lifts or tints; never muddy.
- Active states settle back to rest.
- Disabled states reduce opacity and remove motion.
- Respect `prefers-reduced-motion`: disable transforms and shadows on hover/active.
