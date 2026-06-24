# Nobori — Design Language

> Named for the koinobori that rise against clear May skies. Nobori is the design of upward momentum — bright, clean, confident. It treats white space as open sky and uses color like highlighter marks on a fresh page.

## Philosophy

Nobori is grown-up celebration. Not childish, not cluttered — the quiet confidence of a clear early-summer morning where everything feels possible. The aesthetic is editorial and graphic: strong typography carries the weight, vivid accents punctuate like marker strokes, and every element earns its place on the page.

**Core principles:**

- **Sky-first.** White space is not empty — it is the sky the carp swim through. Generous margins, breathing room, nothing cramped.
- **Highlighter color.** Vivid accents used sparingly, like a marker on printed paper. Never washed-out, never muddy. Electric, fresh, intentional.
- **Editorial type.** Large, confident headlines. Tight letter-spacing on display sizes. Clear hierarchy that reads at a glance.
- **Earned ornament.** Every visual element serves the composition. No decoration for its own sake.

## Color Tokens

### Neutrals

| Token | Value | Usage |
|---|---|---|
| `--ink-900` | `#0B0F1A` | Primary text on light backgrounds |
| `--ink-700` | `#1E293B` | Body text |
| `--ink-500` | `#64748B` | Secondary text, captions |
| `--ink-300` | `#CBD5E1` | Disabled text, placeholders |
| `--ink-200` | `#E2E8F0` | Subtle dividers, borders |
| `--ink-100` | `#F1F5F9` | Surface backgrounds |
| `--ink-50` | `#F8FAFC` | Page background |
| `--white` | `#FFFFFF` | Cards, inputs, pure surfaces |

### Accents

| Token | Value | Usage |
|---|---|---|
| `--sky` | `#0052FF` | Primary accent — electric sky blue. Links, primary buttons, active states |
| `--sky-light` | `#E8F0FE` | Sky tint backgrounds, badges |
| `--sky-dark` | `#003ECB` | Sky hover/pressed state |
| `--leaf` | `#00C853` | Secondary accent — fresh green. Success, positive indicators |
| `--leaf-light` | `#E8F8EF` | Leaf tint backgrounds |
| `--leaf-dark` | `#009E3F` | Leaf hover/pressed state |
| `--pop` | `#FF3366` | Pop accent — hot coral-pink. CTAs, alerts, attention |
| `--pop-light` | `#FFF0F3` | Pop tint backgrounds |
| `--pop-dark` | `#D41A50` | Pop hover/pressed state |

### Semantic

| Token | Value |
|---|---|
| `--success` | `#00C853` |
| `--warning` | `#FFB300` |
| `--error` | `#FF3366` |
| `--info` | `#0052FF` |

## Typography

**Family:** `'Inter', system-ui, -apple-system, sans-serif`

| Token | Size | Weight | Letter-spacing | Line-height | Usage |
|---|---|---|---|---|---|
| `--text-display` | 64px | 800 | -0.03em | 1.05 | Hero headlines |
| `--text-h1` | 48px | 700 | -0.025em | 1.1 | Page titles |
| `--text-h2` | 32px | 700 | -0.02em | 1.2 | Section headings |
| `--text-h3` | 24px | 600 | -0.015em | 1.3 | Subsection headings |
| `--text-h4` | 20px | 600 | -0.01em | 1.4 | Card titles |
| `--text-body-lg` | 17px | 400 | 0 | 1.6 | Lead paragraphs |
| `--text-body` | 15px | 400 | 0 | 1.6 | Body text |
| `--text-sm` | 13px | 400 | 0.01em | 1.5 | Captions, metadata |
| `--text-xs` | 11px | 500 | 0.04em | 1.4 | Labels, badges, overlines |

**Emphasis:** Use weight (600/700) for emphasis, not italic. Uppercase + `--text-xs` + `0.08em` letter-spacing for overlines and category labels.

## Spacing

8px base grid. All spacing derives from multiples.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-20` | 80px |
| `--space-24` | 96px |
| `--space-32` | 128px |

## Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-none` | 0 | Sharp edges, full-bleed sections |
| `--radius-sm` | 8px | Inputs, small cards, badges |
| `--radius-md` | 16px | Cards, modals, containers |
| `--radius-full` | 9999px | Pills, avatars, circular buttons |

## Shadows

Minimal. Nobori prefers flat surfaces with subtle elevation only where needed.

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(11,15,26,0.04)` | Inputs, subtle lift |
| `--shadow-md` | `0 4px 12px rgba(11,15,26,0.06)` | Cards, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(11,15,26,0.08)` | Modals, popovers |

## Control Height

**One shared token:** `--control-h: 48px`

All interactive controls — buttons, inputs, selects, toggles — share this height. This ensures visual rhythm across every form and toolbar.

## Components

### Button

All buttons: `height: var(--control-h)`, `padding: 0 var(--space-6)`, `border-radius: var(--radius-sm)`, `font-size: var(--text-body)`, `font-weight: 600`, `cursor: pointer`, `transition: all 150ms ease`.

**Primary (sky):**
- Default: `background: var(--sky)`, `color: #FFF`, `border: none`
- Hover: `background: var(--sky-dark)`
- Focus: `outline: 2px solid var(--sky)`, `outline-offset: 2px`
- Active: `transform: scale(0.98)`, `background: var(--sky-dark)`
- Disabled: `background: var(--ink-200)`, `color: var(--ink-300)`, `cursor: not-allowed`

**Secondary (outline):**
- Default: `background: transparent`, `color: var(--ink-900)`, `border: 1.5px solid var(--ink-200)`
- Hover: `border-color: var(--ink-900)`, `background: var(--ink-50)`
- Focus: `outline: 2px solid var(--sky)`, `outline-offset: 2px`
- Active: `transform: scale(0.98)`, `background: var(--ink-100)`
- Disabled: `border-color: var(--ink-200)`, `color: var(--ink-300)`, `cursor: not-allowed`

**Pop (CTA):**
- Default: `background: var(--pop)`, `color: #FFF`, `border: none`
- Hover: `background: var(--pop-dark)`
- Focus: `outline: 2px solid var(--pop)`, `outline-offset: 2px`
- Active: `transform: scale(0.98)`, `background: var(--pop-dark)`
- Disabled: `background: var(--ink-200)`, `color: var(--ink-300)`, `cursor: not-allowed`

**Ghost:**
- Default: `background: transparent`, `color: var(--ink-700)`, `border: none`
- Hover: `background: var(--ink-100)`
- Focus: `outline: 2px solid var(--sky)`, `outline-offset: 2px`
- Active: `background: var(--ink-200)`
- Disabled: `color: var(--ink-300)`, `cursor: not-allowed`

**Icon button:** `width: var(--control-h)`, `padding: 0`, `display: inline-flex`, `align-items: center`, `justify-content: center`. Same state matrix as its variant.

### Text Input

- `height: var(--control-h)`, `padding: 0 var(--space-4)`, `border: 1.5px solid var(--ink-200)`, `border-radius: var(--radius-sm)`, `background: var(--white)`, `font-size: var(--text-body)`, `color: var(--ink-900)`
- Placeholder: `color: var(--ink-300)`
- Hover: `border-color: var(--ink-500)`
- Focus: `border-color: var(--sky)`, `outline: 2px solid var(--sky)`, `outline-offset: -2px` (ring inside border, 2px visible)
- Disabled: `background: var(--ink-100)`, `color: var(--ink-300)`, `cursor: not-allowed`
- Error: `border-color: var(--error)`

### Select

Same as text input with a chevron icon right-aligned. `appearance: none`, `padding-right: var(--space-10)`. Same state matrix.

### Textarea

Same styling as text input. `min-height: 120px`, `padding: var(--space-3) var(--space-4)`, `resize: vertical`. Same state matrix.

### Checkbox / Radio

- `width: 20px`, `height: 20px`, `border: 1.5px solid var(--ink-200)`, `border-radius: 4px` (checkbox) or `var(--radius-full)` (radio)
- Checked: `background: var(--sky)`, `border-color: var(--sky)`, white checkmark/dot
- Focus: `outline: 2px solid var(--sky)`, `outline-offset: 2px`
- Disabled: `border-color: var(--ink-200)`, `background: var(--ink-100)`

### Toggle Switch

- Track: `width: 44px`, `height: 24px`, `border-radius: var(--radius-full)`, `background: var(--ink-200)`
- Thumb: `width: 20px`, `height: 20px`, `border-radius: var(--radius-full)`, `background: var(--white)`, `shadow: var(--shadow-sm)`
- On: track `background: var(--sky)`, thumb translates right
- Focus: `outline: 2px solid var(--sky)`, `outline-offset: 2px`
- Disabled: `opacity: 0.5`, `cursor: not-allowed`

### Card

- `background: var(--white)`, `border-radius: var(--radius-md)`, `padding: var(--space-6)`, `box-shadow: var(--shadow-md)`
- Hover (interactive): `box-shadow: var(--shadow-lg)`, `transform: translateY(-2px)`, `transition: all 200ms ease`
- No border. Elevation via shadow only.

### Badge

- `display: inline-flex`, `padding: var(--space-1) var(--space-3)`, `border-radius: var(--radius-full)`, `font-size: var(--text-xs)`, `font-weight: 600`, `letter-spacing: 0.02em`
- Sky: `background: var(--sky-light)`, `color: var(--sky)`
- Leaf: `background: var(--leaf-light)`, `color: var(--leaf-dark)`
- Pop: `background: var(--pop-light)`, `color: var(--pop-dark)`
- Neutral: `background: var(--ink-100)`, `color: var(--ink-500)`

### Tabs

- Tab item: `height: var(--control-h)`, `padding: 0 var(--space-5)`, `font-size: var(--text-body)`, `font-weight: 500`, `color: var(--ink-500)`, `border-bottom: 2px solid transparent`, `background: none`, `cursor: pointer`
- Active: `color: var(--ink-900)`, `border-bottom-color: var(--sky)`
- Hover: `color: var(--ink-900)`
- Focus: `outline: 2px solid var(--sky)`, `outline-offset: -2px`
- Tab bar: `border-bottom: 1px solid var(--ink-200)`

### Navigation

- Height: `72px`, `background: var(--white)`, `border-bottom: 1px solid var(--ink-200)`
- Logo: left-aligned, `font-weight: 800`, `font-size: var(--text-h4)`
- Links: `font-size: var(--text-body)`, `font-weight: 500`, `color: var(--ink-700)`, hover `color: var(--ink-900)`
- Active link: `color: var(--sky)`

## Layout Guidance

- **Max content width:** 1200px centered, with `var(--space-6)` minimum side padding on mobile.
- **Section spacing:** `var(--space-24)` to `var(--space-32)` between major sections on desktop.
- **Grid:** 12-column on desktop, 4-column on tablet, single column on mobile. Gutters: `var(--space-6)`.
- **Hero sections:** Full-bleed imagery, text overlaid with sufficient contrast (white text on dark imagery, or dark text on light areas). Minimum height: 80vh.
- **Cards in grids:** 3-column on desktop, 2 on tablet, 1 on mobile.
- **Dashboard sidebar:** 260px fixed width, `background: var(--white)`, `border-right: 1px solid var(--ink-200)`.
- **Dashboard main:** `padding: var(--space-8)`, `background: var(--ink-50)`.

## Motion

- `transition: all 150ms ease` for micro-interactions (buttons, inputs).
- `transition: all 200ms ease` for card hovers and surface changes.
- `transition: all 300ms ease` for page-level transitions and modals.
- Respect `prefers-reduced-motion: reduce` — disable all transitions and animations.

## Accessibility

- All text meets WCAG AA contrast (4.5:1 for body, 3:1 for large text).
- Focus rings are always visible — never suppressed with `outline: none` without replacement.
- Touch targets minimum 44x44px.
- Color is never the sole indicator — always paired with text, icon, or shape.
