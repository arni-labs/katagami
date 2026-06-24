# Seiran — Design Language

> **Seiran** (清蘭) — "clear blue." A bright, airy, hopeful early-summer Kodomo no Hi aesthetic: clear light, fresh greenery, koinobori rising — pushed into confident graphic design. Lots of open white, then vivid almost-neon accent colour used like highlighters. Bright and clean, never muddy or washed-out pastel. Sleek, clean, grown-up — a product an adult would launch.

## Concept

One signature mechanic: **koinobori rhythm** — upward-rising vertical energy, layered depth, and wind-driven motion. Every surface carries the feeling of carp streamers catching morning light against a clear blue sky.

## Palette

| Role | Token | Hex | Usage |
|---|---|---|---|
| Primary accent | `--accent` | `#00A0E0` | Electric sky blue — koi swimming, clear sky, primary actions |
| Secondary accent | `--accent-secondary` | `#22D95E` | Fresh green — early summer foliage, growth, success states |
| Hot pop | `--accent-hot` | `#FF3366` | Hot coral — celebration, attention, CTA highlights |
| Background | `--bg` | `#FFFFFF` | Pure white — page surface |
| Surface | `--surface` | `#F6F9FA` | Tinted cool-white — card backgrounds, section separation |
| Surface dark | `--surface-dark` | `#0A1520` | Near-black ink — press blocks, dark sections, hero overlays |
| Text | `--text` | `#0A1520` | Near-black — body copy, headings |
| Muted | `--muted` | `#5B7A8C` | Cool slate derived from primary blue hue — secondary text |
| On accent | `--on-accent` | `#FFFFFF` | Text on accent backgrounds |
| On surface dark | `--on-surface-dark` | `#E8F1F5` | Text on dark surfaces |
| Success | `--success` | `#22D95E` | Same as secondary accent |
| Warning | `--warning` | `#FFB833` | Warm amber — alerts, caution |
| Error | `--error` | `#FF3366` | Same as hot pop — errors, destructive |
| Info | `--info` | `#00A0E0` | Same as primary accent — informational |

### Neutral derivation

All mid-greys are derived from the primary blue hue (`#00A0E0`). The muted tone `#5B7A8C` is a cool slate with blue undertones — never a true neutral grey. This keeps the palette cohesive: every shade carries the blue sky DNA.

## Typography

| Role | Token | Value | Font |
|---|---|---|---|
| Display | `--font-display` | `700 3.5rem/1.1 "Inter", system-ui, sans-serif` | Inter — bold, tight |
| Headline | `--font-headline` | `600 2.25rem/1.15 "Inter", system-ui, sans-serif` | Inter |
| Title | `--font-title` | `600 1.5rem/1.3 "Inter", system-ui, sans-serif` | Inter |
| Body | `--font-body` | `400 1.0625rem/1.65 "Inter", "Noto Sans JP", system-ui, sans-serif` | Inter + Noto Sans JP for kanji |
| Caption | `--font-caption` | `400 0.8125rem/1.5 "Inter", system-ui, sans-serif` | Inter |
| Mono | `--font-mono` | `400 0.875rem/1.5 "JetBrains Mono", "Fira Code", monospace` | JetBrains Mono |

**Display text:** `-0.02em` letter-spacing. Body text: `1.65` line-height minimum.

## Spacing

| Token | Value |
|---|---|
| `--space-xs` | `0.25rem` (4px) |
| `--space-sm` | `0.5rem` (8px) |
| `--space-md` | `1rem` (16px) |
| `--space-lg` | `1.5rem` (24px) |
| `--space-xl` | `2rem` (32px) |
| `--space-2xl` | `3rem` (48px) |
| `--space-3xl` | `4rem` (64px) |
| `--space-4xl` | `6rem` (96px) |

Container max-width: `1200px`, centered. Generous padding above all titles.

## Radius

Only these values — one geometry system:

| Token | Value |
|---|---|
| `--radius-none` | `0` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-full` | `9999px` |

Cards use `--radius-lg` (24px). Buttons use `--radius-full` (pill). Input fields use `--radius-md` (16px).

## Control Height

All interactive controls share one height token:

| Token | Value |
|---|---|
| `--control-height` | `44px` |

Buttons, inputs, selects, textareas, and all form controls use `height: var(--control-height)` (or `min-height`).

## State Matrix

Every interactive element has these states, styled from tokens:

### Default
```css
background: var(--accent);
color: var(--on-accent);
border: none;
outline: none;
```

### Hover
```css
background: color-mix(in srgb, var(--accent) 85%, white);
/* Darker shade of the same accent */
```

### Focus (with visible ring)
```css
outline: 3px solid color-mix(in srgb, var(--accent) 40%, transparent);
outline-offset: 2px;
```

### Active
```css
background: color-mix(in srgb, var(--accent) 70%, black);
transform: scale(0.98);
```

### Disabled
```css
opacity: 0.4;
cursor: not-allowed;
pointer-events: none;
```

## Surfaces

Cards and sections separate by **tinted surface and space**, never by borders.

| Layer | Background | Use |
|---|---|---|
| Page | `--bg` (#FFFFFF) | Base canvas |
| Card | `--surface` (#F6F9FA) | Content containers |
| Dark | `--surface-dark` (#0A1520) | Press blocks, hero overlays, immersive overlays |
| Accent tint | `color-mix(in srgb, var(--accent) 6%, transparent)` | Highlight rows, active states |

## Components

### Buttons
- Primary: `background: var(--accent)`, `color: var(--on-accent)`, `height: var(--control-height)`, `border-radius: var(--radius-full)`, centered label, even padding (`1rem 2rem`)
- Secondary: `background: transparent`, `color: var(--text)`, `border: 2px solid var(--surface-dark)` (no, wait — no borders. Use tinted surface instead)
- Actually: Secondary uses `background: var(--surface)`, `color: var(--text)`, `height: var(--control-height)`, `border-radius: var(--radius-full)`
- Destructive: `background: var(--error)`, `color: var(--on-accent)`, same shape

### Form Controls
All explicitly styled, no browser defaults:
- Inputs: `height: var(--control-height)`, `border-radius: var(--radius-md)`, `background: var(--surface)`, `color: var(--text)`, `padding: 0 1rem`, borderless
- Focus state adds `outline: 3px solid color-mix(in srgb, var(--accent) 40%, transparent)`
- Selects, textareas follow same pattern
- Checkboxes: custom styled boxes with accent fill

### Cards
- `background: var(--surface)`, `border-radius: var(--radius-lg)`, `padding: var(--space-xl)`
- No borders, no shadows (or very subtle if needed)
- Separated by spacing from other content

### Navigation
- Clean, minimal nav bar
- Logo/brand on left, links on right
- Transparent over hero, solid `--bg` when scrolled

## Motion

- Scroll-reveal per section (IntersectionObserver)
- Hero parallax + subtle ken-burns on hero image
- Cards lift on hover
- Image zoom on hover within constrained containers
- Staggered character reveals on the immersive page
- Respect `prefers-reduced-motion`

## Art Style Pairing

**Style name:** "Clear Summer Print"

**Treatment:** Clean editorial illustration with flat color blocks, subtle grain texture, and a sense of early-morning light. Inspired by Japanese Showa-era poster design and mid-century graphic illustration — bold, simple shapes with confident color blocking.

**Credits:**
- **Japanese Showa-era poster design** (tradition) — bold color blocking, confident composition
- **Mid-century editorial illustration** (movement) — flat shapes, clean lines, expressive simplicity
- **Gekiga** (tradition) — dramatic contrast, emotional clarity (subtle influence on the immersive page's mood)

## Responsive

- Mobile-first, stacks to single column below 768px
- Container max-width: 1200px, centered
- Hero spans full 100vw × 100svh
- Ultra-wide: content capped at 1200px, hero still full-bleed
- `minmax(0, 1fr)` on grid children, `min-width: 0` on flex children
- Hide non-essential nav links and table columns on mobile

## Naming

**Seiran** — one distinctive evocative noun, drawn from Japanese. The slug is `seiran`. Tags carry uniqueness: `kodomo-no-hi`, `koinobori`, `early-summer`, `clear-blue`.
