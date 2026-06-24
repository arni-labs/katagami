# Kōyoi (この宵) — Design Language

> "This evening" — the hopeful, bright early-summer feeling of Kodomo no Hi (Children's Day), when koinobori carp streamers rise against a clear sky. Pushed into confident, grown-up graphic design.

## Philosophy

Kōyoi is **bright, airy, and hopeful** — but never childish. Think editorial poster meets product interface: massive white space punctuated by vivid, almost-neon accent colors used like highlighters. Electric sky-blues, fresh greens, a hot pop of coral. Every surface feels like it has room to breathe.

The aesthetic is **confident and clean** — a product an adult would launch. No muddy pastels, no gradients, no decorative borders. Pure whites and near-blacks as the foundation; accent colors as intentional bursts.

## Tokens

### Colors

**Neutrals**

| Token | Value | Use |
|---|---|---|
| `--color-white` | `#FFFFFF` | Page backgrounds, card surfaces |
| `--color-off-white` | `#FAFBFC` | Section backgrounds, alternating rows |
| `--color-surface` | `#F3F4F6` | Subtle elevation, input backgrounds |
| `--color-muted` | `#9CA3AF` | Placeholder text, disabled states |
| `--color-secondary` | `#6B7280` | Secondary text, descriptions |
| `--color-primary` | `#1F2937` | Body text, headings |
| `--color-black` | `#0A0A0A` | Display headings, strong emphasis |

**Accents**

| Token | Value | Use |
|---|---|---|
| `--color-accent-blue` | `#0090FF` | Primary CTA, links, active states |
| `--color-accent-blue-hover` | `#0077DD` | CTA hover |
| `--color-accent-green` | `#00D68F` | Success states, secondary accents |
| `--color-accent-green-light` | `#E8FFF3` | Green backgrounds (light wash) |
| `--color-accent-coral` | `#FF3N6C` | Tertiary accent, highlights, badges |
| `--color-accent-coral-hover` | `#E8345D` | Coral hover |

### Typography

| Token | Value | Use |
|---|---|---|
| `--font-display` | `'Inter', 'Noto Sans JP', system-ui, sans-serif` | All headings, display text |
| `--font-body` | `'Inter', 'Noto Sans JP', system-ui, sans-serif` | Body text, UI text |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', monospace` | Code, data values |
| `--text-xs` | `0.75rem` / `1rem` | Labels, captions |
| `--text-sm` | `0.875rem` / `1.375rem` | Secondary text |
| `--text-base` | `1rem` / `1.625rem` | Body text |
| `--text-lg` | `1.125rem` / `1.75rem` | Lead paragraphs |
| `--text-xl` | `1.25rem` / `1.875rem` | Subheadings |
| `--text-2xl` | `1.5rem` / `2rem` | Section headings |
| `--text-3xl` | `2rem` / `2.5rem` | Page titles |
| `--text-4xl` | `2.5rem` / `3.125rem` | Hero headings |
| `--text-5xl` | `3.5rem` / `4.25rem` | Display hero text |

**Display text**: `-0.02em` letter-spacing. Body text: normal.

### Spacing

| Token | Value |
|---|---|
| `--space-1` | `0.25rem` (4px) |
| `--space-2` | `0.5rem` (8px) |
| `--space-3` | `0.75rem` (12px) |
| `--space-4` | `1rem` (16px) |
| `--space-5` | `1.25rem` (20px) |
| `--space-6` | `1.5rem` (24px) |
| `--space-8` | `2rem` (32px) |
| `--space-10` | `2.5rem` (40px) |
| `--space-12` | `3rem` (48px) |
| `--space-16` | `4rem` (64px) |
| `--space-20` | `5rem` (80px) |
| `--space-24` | `6rem` (96px) |

### Border Radius

Only these values: `0`, `16px`, `24px`, `9999px` (full pill).

| Token | Value |
|---|---|
| `--radius-sm` | `0` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-full` | `9999px` |

### Control Height

**One shared token for all interactive controls:**

| Token | Value |
|---|---|
| `--control-height` | `44px` |

Applied to: buttons, inputs, selects, checkboxes, radio buttons, toggles.

### Layout Guidance

- **Page padding**: `--space-8` (32px) on mobile, `--space-16` (64px) on desktop
- **Section gap**: `--space-24` (96px) between major sections
- **Card gap**: `--space-6` (24px) in grids
- **Container max-width**: `1200px` centered
- **Generous spacing**: titles never stuck to container tops — always `--space-12` minimum above

## Components

### Button

- Height: `--control-height` (44px)
- Padding: `--space-4` `--space-6` (16px 24px)
- Radius: `--radius-md` (16px)
- Font: `--text-sm`, weight 600, letter-spacing `-0.01em`
- **States**:
  - **Default**: `--color-accent-blue` background, white text
  - **Hover**: `--color-accent-blue-hover` background, slight scale up (1.02)
  - **Focus**: visible ring — `outline: 3px solid color-mix(in srgb, var(--color-accent-blue) 40%, transparent)`, offset 2px
  - **Active**: `--color-accent-blue` background, scale 0.98
  - **Disabled**: `--color-surface` background, `--color-muted` text, no pointer events, opacity 0.5

- **Secondary variant**: outline in `--color-accent-blue`, text `--color-accent-blue`, transparent background
- **Ghost variant**: transparent background, text `--color-accent-blue`, no border

### Input

- Height: `--control-height` (44px)
- Padding: `0 --space-4` (0 16px)
- Radius: `--radius-md` (16px)
- Border: `1px solid --color-surface`
- Background: `--color-white`
- Font: `--text-base`, color `--color-primary`
- **States**:
  - **Default**: border `--color-surface`
  - **Hover**: border `--color-muted`
  - **Focus**: border `--color-accent-blue`, ring `3px solid color-mix(in srgb, var(--color-accent-blue) 30%, transparent)`, offset 2px
  - **Disabled**: background `--color-surface`, text `--color-muted`, cursor not-allowed

### Card

- Background: `--color-white`
- Radius: `--radius-lg` (24px)
- Padding: `--space-8` (32px)
- Shadow: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)`
- No borders

### Badge / Pill

- Height: `--control-height` (44px) — but for small badges, 28px
- Padding: `0 --space-4`
- Radius: `--radius-full`
- Font: `--text-xs`, weight 600
- Background: accent color at 10% opacity, text at 100%

### Table

- Row height: minimum `48px`
- Font: `--text-sm` for data rows, `--text-xs` for labels
- Letter-spacing: `-0.02em` on headers
- No borders between rows — use subtle background alternation (`--color-off-white`)
- Header background: `--color-white`, sticky

## Surface Separation

**Landing pages** are expressive and editorial — hero imagery, bold typography, narrative flow. No token swatches, no spec sheets.

**Dashboards** are functional and clean — metric cards, data tables, charts. Same tokens, same components, denser layout.
