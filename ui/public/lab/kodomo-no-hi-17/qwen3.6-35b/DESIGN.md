# Nobori (昇) — Design Language

> "To rise" — the early-summer moment when koinobori carp streamers catch the wind and climb into a clear blue sky. Pushed into confident, grown-up graphic design: editorial posters, product interfaces, bold type on generous white.

## Philosophy

Nobori is **bright, airy, and hopeful** — but never childish. Think editorial poster meets product interface: massive white space punctuated by vivid, almost-neon accent colors used like highlighters. Electric sky-blues, fresh greens, a hot pop of coral. Every surface feels like it has room to breathe.

The aesthetic is **confident and clean** — a festival a grown adult would proudly make. No muddy pastels, no gradients, no decorative borders. Pure whites and near-blacks as the foundation; accent colors as intentional bursts.

## Sources & Lineage

Nobori draws from three real precedents:

- **Japanese early-summer photography** — the vivid blue skies and fresh green foliage of late May / early June in Japan, captured by editorial photographers like Shigeo Anzai.
- **Swiss graphic design** — the bold typographic hierarchy, generous white space, and grid-based layouts of the mid-century Swiss school (Josef Müller-Brockmann).
- **Contemporary Japanese festival posters** — the high-contrast, high-energy compositions of modern Japanese event design (e.g. Aichi Triennale, Sapporo Snow Festival).

Transformed through Nobori's lens: the vividness of Japanese summer skies meets the structural rigor of Swiss design, producing something that feels simultaneously Japanese and universal.

## Tokens

### Colors

**Neutrals**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page backgrounds |
| `--surface` | `#F7F8FA` | Section alternates, input backgrounds |
| `--muted` | `#9CA3AF` | Placeholder text, disabled states |
| `--secondary` | `#6B7280` | Secondary text, descriptions |
| `--text` | `#1F2937` | Body text, regular headings |
| `--border` | `transparent` | No borders (rule 10) |

**Accents**

| Token | Value | Use |
|---|---|---|
| `--accent` | `#0090FF` | Primary CTA, links, active states |
| `--accent-hover` | `#0077DD` | CTA hover |
| `--accent-active` | `#0066BB` | CTA pressed |
| `--accent-ring` | `rgba(0,144,255,0.35)` | Focus ring |
| `--success` | `#00D68F` | Success states |
| `--success-light` | `#E8FFF3` | Success backgrounds |
| `--warning` | `#F59E0B` | Warning states |
| `--error` | `#FF3D6C` | Error / destructive actions |
| `--error-hover` | `#E8345D` | Error hover |
| `--info` | `#0090FF` | Info (same as accent) |

Three accent colors in active use at any time: electric blue (`#0090FF`), fresh green (`#00D68F`), hot coral (`#FF3D6C`).

### Typography

| Token | Value | Use |
|---|---|---|
| `--font-display` | `'Inter', 'Noto Sans JP', system-ui, sans-serif` | All headings, display text |
| `--font-body` | `'Inter', 'Noto Sans JP', system-ui, sans-serif` | Body text, UI text |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', monospace` | Code, data values |
| `--text-xs` | `0.75rem` / `1rem` | Labels, captions |
| `--text-sm` | `0.875rem` / `1.375rem` | Secondary text |
| `--text-base` | `1rem` / `1.625rem` | Body text (≥17px line-height) |
| `--text-lg` | `1.125rem` / `1.75rem` | Lead paragraphs |
| `--text-xl` | `1.25rem` / `1.875rem` | Subheadings |
| `--text-2xl` | `1.5rem` / `2rem` | Section headings |
| `--text-3xl` | `2rem` / `2.5rem` | Page titles |
| `--text-4xl` | `2.5rem` / `3.125rem` | Hero headings |
| `--text-5xl` | `3.5rem` / `4.25rem` | Display hero text |
| `--text-6xl` | `4.5rem` / `5rem` | Hero masthead |

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

Only these values: `0`, `16px`, `24px`, `9999px`.

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

- **Page padding**: `--space-6` (24px) on mobile, `--space-12` (48px) on desktop
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
  - **Default**: `--accent` background, white text
  - **Hover**: `--accent-hover` background, slight scale up (1.02)
  - **Focus**: visible ring — `outline: 3px solid var(--accent-ring)`, offset 2px
  - **Active**: `--accent-active` background, scale 0.98
  - **Disabled**: `--surface` background, `--muted` text, no pointer events, opacity 0.5

- **Secondary variant**: outline 1px solid `--accent`, text `--accent`, transparent background
- **Ghost variant**: transparent background, text `--accent`, no border
- **Destructive variant**: `--error` background, white text; hover → `--error-hover`

### Input

- Height: `--control-height` (44px)
- Padding: `0 --space-4` (0 16px)
- Radius: `--radius-md` (16px)
- Border: `1px solid var(--surface)`
- Background: `--bg`
- Font: `--text-base`, color `--text`
- **States**:
  - **Default**: border `--surface`
  - **Hover**: border `--muted`
  - **Focus**: border `--accent`, ring `3px solid var(--accent-ring)`, offset 2px
  - **Disabled**: background `--surface`, text `--muted`, cursor not-allowed

### Select

- Height: `--control-height` (44px)
- Padding: `0 --space-4` (0 16px)
- Radius: `--radius-md` (16px)
- Border: `1px solid var(--surface)`
- Background: `--bg`
- Font: `--text-base`, color `--text`
- Custom SVG chevron arrow (downward triangle)
- **States**: same as input

### Checkbox

- Size: `20px × 20px`
- Border radius: `--radius-sm` (0) for square, or `6px` via variant
- Border: `2px solid var(--muted)`
- Checked: `--accent` background, white checkmark SVG
- Indeterminate: `--accent` background, white dash
- Label: `--space-3` (12px) left margin
- **States**: default, hover (border `--accent`), focus (ring `var(--accent-ring)`), checked, disabled

### Radio Button

- Size: `20px × 20px`
- Border radius: `50%` (circle)
- Border: `2px solid var(--muted)`
- Checked: `--accent` border, `--accent` inner dot (8px)
- Label: `--space-3` (12px) left margin
- **States**: same pattern as checkbox

### Toggle Switch

- Width: `44px`, Height: `--control-height` (44px)
- Track: `24px` × `44px`, radius `--radius-full`
- Thumb: `20px` × `20px`, radius `50%`, positioned left by default
- Unchecked: track `--surface`, thumb `--text`
- Checked: track `--accent`, thumb `--bg`
- **States**: default, hover (track slightly darker), focus (ring `var(--accent-ring)`), checked, disabled

### Card

- Background: `--bg`
- Radius: `--radius-lg` (24px)
- Padding: `--space-8` (32px)
- Shadow: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)`
- No borders (rule 10)

### Badge / Pill

- Height: `28px` (compact) or `--control-height` (full)
- Padding: `0 --space-4`
- Radius: `--radius-full`
- Font: `--text-xs`, weight 600
- Background: accent color at 10% opacity, text at 100%

### Table

- Row height: minimum `48px`
- Font: `--text-sm` for data rows, `--text-xs` for labels
- Letter-spacing: `-0.02em` on headers
- No borders between rows — use subtle background alternation (`--surface`)
- Header background: `--bg`, sticky

## Surface Separation

**Landing pages** are expressive and editorial — hero imagery, bold typography, narrative flow. No token swatches, no spec sheets.

**Dashboards** are functional and clean — metric cards, data tables, schedules. Same tokens, same components, denser layout.

Surfaces separated by tinted backgrounds and space — never borders (rule 10).
