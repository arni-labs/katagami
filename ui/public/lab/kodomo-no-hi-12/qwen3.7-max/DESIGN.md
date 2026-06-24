# Nobori (昇) — Design Language

> "The carp swims upward, against the current, and in doing so becomes a dragon."

## Philosophy

Nobori draws its soul from Kodomo no Hi — the Japanese Children's Day when koinobori carp streamers ascend into open sky. The language embodies **purposeful upward movement**: bold, celebratory, and confident. Every surface feels like it's rising. Every interaction rewards the user with a sense of momentum and achievement.

**Core principles:**

- **Ascending energy** — Visual weight sits low; content and motion reach upward. Whitespace breathes like open sky above a river of streamers.
- **Celebratory restraint** — Color is vivid but disciplined. Three accents, used like brushstrokes on a white canvas. Never a flood.
- **Fluid confidence** — Corners are rounded, transitions are smooth, interactions feel like silk in wind. No sharp edges, no hesitation.
- **Honest clarity** — Typography is large, readable, and direct. No decorative noise. The content is the hero.

## Color Tokens

### Brand

| Token | Hex | Role |
|---|---|---|
| `--nobori-indigo` | `#1B1464` | Primary brand. Depth, authority, the river at dusk. |
| `--nobori-indigo-light` | `#3D348B` | Secondary indigo for hover states and lighter surfaces. |
| `--nobori-coral` | `#E8553D` | Primary action. Energy of the red koinobori. |
| `--nobori-coral-hover` | `#D4432B` | Coral hover/active state. |
| `--nobori-coral-light` | `#FFF0ED` | Coral tint for badges, highlights, subtle backgrounds. |
| `--nobori-gold` | `#D4A843` | Celebration accent. Achievement, warmth. |
| `--nobori-gold-light` | `#FDF6E3` | Gold tint for success states, warm backgrounds. |
| `--nobori-sky` | `#4A90D9` | Informational accent. Open sky, links, info states. |
| `--nobori-sky-light` | `#EBF3FC` | Sky tint for info backgrounds. |

### Neutrals

| Token | Hex | Role |
|---|---|---|
| `--nobori-900` | `#1A1A2E` | Headlines, primary text on light backgrounds. |
| `--nobori-700` | `#4A4A5A` | Body text, secondary content. |
| `--nobori-500` | `#8B8B9E` | Captions, disabled text, placeholders. |
| `--nobori-300` | `#C8C8D4` | Borders, dividers, inactive states. |
| `--nobori-200` | `#E8E8EE` | Card borders, subtle dividers. |
| `--nobori-100` | `#F5F5F8` | Backgrounds, card fills, section alternation. |
| `--nobori-50` | `#FAFAFC` | Page background, lightest surface. |
| `--nobori-white` | `#FFFFFF` | Pure white. Cards, inputs, overlays. |

### Semantic

| Token | Hex | Role |
|---|---|---|
| `--nobori-success` | `#2D9F6F` | Success states, positive metrics. |
| `--nobori-warning` | `#E8A33D` | Warnings, attention needed. |
| `--nobori-error` | `#D94040` | Errors, destructive actions. |

### Contrast Rules

- Text on white/50/100 backgrounds: use `--nobori-900` or `--nobori-700`. Never below `--nobori-500` for body text.
- White text on `--nobori-indigo`, `--nobori-coral`, `--nobori-900`: always passes WCAG AA.
- `--nobori-gold` is NEVER used as text on light backgrounds (insufficient contrast). Use only as an accent on dark surfaces or as a fill color.
- No dark-on-dark or light-on-light text combinations.

## Typography

### Font Families

- **Display:** `Outfit` (Google Fonts, weights 600/700/800) — Bold geometric sans-serif with character. Confident, modern, slightly warm.
- **Body:** `DM Sans` (Google Fonts, weights 400/500/600) — Clean humanist sans-serif. Highly readable, friendly without being casual.

### Type Scale

| Token | Size | Line Height | Letter Spacing | Weight | Use |
|---|---|---|---|---|---|
| `--text-display` | 56px | 1.1 | -0.03em | 800 | Hero headlines |
| `--text-h1` | 40px | 1.15 | -0.02em | 700 | Section titles |
| `--text-h2` | 28px | 1.25 | -0.02em | 700 | Subsection titles |
| `--text-h3` | 22px | 1.3 | -0.01em | 600 | Card titles, labels |
| `--text-body-lg` | 18px | 1.6 | 0 | 400 | Lead paragraphs |
| `--text-body` | 16px | 1.6 | 0 | 400 | Body text |
| `--text-body-sm` | 14px | 1.5 | 0.01em | 400 | Captions, table rows |
| `--text-label` | 13px | 1.3 | 0.04em | 600 | Form labels, nav items, uppercase labels |

### Typography Rules

- Headlines use `Outfit`, body uses `DM Sans`.
- Display size (56px) is reserved for hero sections only.
- Minimum body text size is 14px. Never go below.
- Uppercase is reserved for `--text-label` only. Never uppercase body text.
- Font loading: use `<link>` preconnect + swap display.

## Spacing

Base unit: **8px**. All spacing derives from multiples.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4px | Tight gaps (icon to text) |
| `--space-2` | 8px | Inline spacing, small gaps |
| `--space-3` | 12px | Input padding, compact spacing |
| `--space-4` | 16px | Standard padding, card internal gaps |
| `--space-5` | 24px | Section internal padding |
| `--space-6` | 32px | Card padding, group spacing |
| `--space-8` | 48px | Section vertical padding (mobile) |
| `--space-10` | 64px | Section vertical padding (tablet) |
| `--space-12` | 80px | Section vertical padding (desktop) |
| `--space-16` | 120px | Hero top/bottom padding |
| `--space-20` | 160px | Major section breaks |

### Spacing Rules

- Generous by default. When in doubt, add more space.
- Section padding is always vertically generous (80px+ on desktop).
- Card internal padding is always `--space-6` (32px).
- Titles always have `--space-4` (16px) minimum above them — never stuck to container tops.

## Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 8px | Badges, tags, small chips |
| `--radius-md` | 16px | Cards, inputs, selects, buttons |
| `--radius-lg` | 24px | Large cards, modals, panels |
| `--radius-full` | 9999px | Pills, avatars, circular buttons |

### Radius Rules

- Only these four values. No arbitrary radii.
- Buttons and inputs always use `--radius-md` (16px).
- Cards always use `--radius-lg` (24px).
- Badges and tags always use `--radius-sm` (8px).

## Control Height Token

**One shared height for all interactive controls: `--control-h: 48px`.**

This applies to: buttons (all sizes), text inputs, selects, dropdowns, search bars, toggles, and any other interactive form control. This creates visual rhythm across all surfaces — every control aligns to the same vertical grid.

### Small Variant

A `--control-h-sm: 36px` exists for dense UI (dashboard tables, compact toolbars). It is used sparingly and never mixed with the default height in the same context.

## Components

### Button

Built from tokens. All variants share `--control-h: 48px`, `--radius-md: 16px`, `font: DM Sans 600 16px`.

**Primary (Coral):**
- Default: `bg: --nobori-coral`, `color: white`, `shadow: 0 2px 8px rgba(232,85,61,0.2)`
- Hover: `bg: --nobori-coral-hover`, `shadow: 0 4px 16px rgba(232,85,61,0.3)`, `translateY(-1px)`
- Focus: `outline: 3px solid --nobori-coral`, `outline-offset: 2px` (visible ring)
- Active: `bg: --nobori-coral-hover`, `translateY(0)`, `shadow: 0 1px 4px rgba(232,85,61,0.2)`
- Disabled: `bg: --nobori-200`, `color: --nobori-500`, `shadow: none`, `cursor: not-allowed`

**Secondary (Indigo outline):**
- Default: `bg: transparent`, `border: 2px solid --nobori-indigo`, `color: --nobori-indigo`
- Hover: `bg: --nobori-indigo`, `color: white`
- Focus: `outline: 3px solid --nobori-indigo`, `outline-offset: 2px`
- Active: `bg: --nobori-indigo-light`, `color: white`
- Disabled: `border-color: --nobori-300`, `color: --nobori-500`

**Ghost:**
- Default: `bg: transparent`, `color: --nobori-700`
- Hover: `bg: --nobori-100`
- Focus: `outline: 3px solid --nobori-indigo`, `outline-offset: 2px`
- Active: `bg: --nobori-200`
- Disabled: `color: --nobori-300`

### Text Input

- Height: `--control-h: 48px`
- Default: `bg: --nobori-white`, `border: 2px solid --nobori-300`, `radius: --radius-md`, `padding: 0 --space-4`
- Hover: `border-color: --nobori-500`
- Focus: `border-color: --nobori-indigo`, `outline: 3px solid rgba(27,20,100,0.15)`, `outline-offset: 0`
- Error: `border-color: --nobori-error`
- Disabled: `bg: --nobori-100`, `color: --nobori-500`, `cursor: not-allowed`
- Placeholder: `color: --nobori-500`
- Label: `font: DM Sans 600 13px`, `color: --nobori-700`, `margin-bottom: --space-2`, uppercase with `letter-spacing: 0.04em`

### Select / Dropdown

- Same as Text Input for container styling.
- Chevron icon on right, `color: --nobori-500`.
- Dropdown panel: `bg: --nobori-white`, `shadow: 0 8px 32px rgba(26,26,46,0.12)`, `radius: --radius-md`, `border: 1px solid --nobori-200`.
- Options: `padding: --space-3 --space-4`, `hover: bg --nobori-100`, `selected: bg --nobori-coral-light, color --nobori-coral`.

### Toggle / Switch

- Track: `width: 52px`, `height: 28px`, `radius: --radius-full`.
- Default: `bg: --nobori-300`, knob `bg: white`, `shadow: 0 1px 3px rgba(0,0,0,0.15)`.
- Active/on: `bg: --nobori-coral`, knob translates right.
- Focus: `outline: 3px solid rgba(232,85,61,0.3)`, `outline-offset: 2px`.
- Disabled: `opacity: 0.5`, `cursor: not-allowed`.

### Checkbox

- Box: `20px × 20px`, `radius: 6px`, `border: 2px solid --nobori-300`.
- Checked: `bg: --nobori-indigo`, `border-color: --nobori-indigo`, white checkmark.
- Focus: `outline: 3px solid rgba(27,20,100,0.15)`, `outline-offset: 2px`.
- Disabled: `opacity: 0.5`.

### Card

- `bg: --nobori-white`, `radius: --radius-lg (24px)`, `padding: --space-6 (32px)`.
- Default: `shadow: 0 1px 3px rgba(26,26,46,0.04)`.
- Hover (interactive cards): `shadow: 0 8px 32px rgba(26,26,46,0.08)`, `translateY(-2px)`.
- No borders. Elevation through shadow only.

### Tab Bar

- Container: `border-bottom: 2px solid --nobori-200`.
- Tab: `padding: --space-3 --space-5`, `font: DM Sans 600 14px`, `color: --nobori-500`.
- Active tab: `color: --nobori-indigo`, `border-bottom: 3px solid --nobori-coral` (overlapping container border).
- Hover: `color: --nobori-700`.
- Focus: `outline: 3px solid rgba(27,20,100,0.15)`, `outline-offset: -3px`.

### Badge / Tag

- `padding: 4px 12px`, `radius: --radius-sm (8px)`, `font: DM Sans 600 13px`.
- Default: `bg: --nobori-100`, `color: --nobori-700`.
- Accent variants: coral-light/coral, gold-light/gold (text on gold-light uses `--nobori-900` for contrast), sky-light/sky.

### Tooltip

- `bg: --nobori-900`, `color: white`, `radius: --radius-sm`, `padding: --space-2 --space-3`, `font: DM Sans 400 13px`.
- Arrow: 6px, same bg color.
- `shadow: 0 4px 16px rgba(26,26,46,0.2)`.

## Layout Guidance

### Grid

- Desktop: 12-column grid, `max-width: 1200px`, `gutter: 24px`.
- Tablet: 8-column grid, `gutter: 16px`.
- Mobile: 4-column grid, `gutter: 16px`, `padding: 0 20px`.

### Section Rhythm

- Sections alternate between `--nobori-white` and `--nobori-50` backgrounds.
- Vertical padding: `--space-12` (80px) desktop, `--space-8` (48px) mobile.
- Hero sections get `--space-16` (120px) top/bottom minimum.

### Navigation

- Height: `72px`, `bg: --nobori-white` with subtle bottom shadow on scroll.
- Logo left, nav center, CTA right.
- Mobile: hamburger menu, full-screen overlay with `bg: --nobori-indigo`, `color: white`.

### Dashboard Layout

- Sidebar: `width: 260px`, `bg: --nobori-indigo`, `color: white`. Fixed on desktop, collapsible on tablet, hidden on mobile.
- Top bar: `height: 72px`, `bg: --nobori-white`, search + user avatar.
- Content area: `bg: --nobori-50`, `padding: --space-6`.
- Metric cards in a responsive grid (4 columns desktop, 2 tablet, 1 mobile).

## Motion

- All transitions: `200ms ease-out` for color/opacity, `300ms ease-out` for transform/shadow.
- Hover lifts: `translateY(-1px)` for buttons, `translateY(-2px)` for cards.
- Page transitions: subtle fade `200ms`.
- Always respect `prefers-reduced-motion: reduce` — disable transforms and use instant transitions.

## Imagery Direction

Photography and generated imagery should feel:
- **Cinematic and atmospheric** — volumetric light, mist, depth.
- **Color-aligned** — indigo, coral, gold tones dominant.
- **Japanese-inspired** — natural elements, flowing movement, water, sky.
- **Never stock-generic** — every image should feel bespoke and intentional.

SVG is reserved for small UI marks (icons, logos, decorative dots). Feature and hero imagery is always photographic or high-quality generated art.
