# TATSUMI — Design Language

> Named for 龍門 (Ryūmon, the Dragon Gate) — the waterfall where carp transform into dragons.
> A design system for Kodomo no Hi: a platform celebrating children's growth, strength, and aspiration.

## Philosophy

TATSUMI carries the spirit of koinobori — carp streamers flying toward the sky — through every pixel.
The system is built on three principles:

1. **Flowing strength** — like carp swimming upstream, the interface conveys determination with grace.
   Nothing is static; everything has direction and momentum.
2. **Celebration clarity** — bright, optimistic, never muddy. Color is purposeful, not decorative.
   Every accent exists to mark what matters.
3. **Japanese precision** — clean systems, generous whitespace, intentional contrast.
   The space between things is as important as the things themselves.

## Tokens

### Colors

| Token | Value | Use |
|---|---|---|
| `indigo-950` | `#0B1D3A` | Page backgrounds, text on light |
| `indigo-900` | `#132D54` | Headers, dark surfaces |
| `indigo-800` | `#1A3A6B` | Secondary backgrounds |
| `indigo-700` | `#224A85` | Hover states, subtle depth |
| `indigo-600` | `#2B5BA0` | Links, secondary actions |
| `indigo-500` | `#3D7BC8` | Primary interactive elements |
| `indigo-400` | `#6B9FE0` | Focus rings, subtle highlights |
| `indigo-300` | `#9DBCEB` | Borders, dividers |
| `indigo-100` | `#DCE8F7` | Subtle backgrounds |
| `indigo-50` | `#F0F5FC` | Page backgrounds |
| `white` | `#FFFFFF` | Cards, surfaces, text on dark |
| `carp-red` | `#D94F3D` | Primary accent — CTAs, highlights, celebration |
| `carp-red-hover` | `#C23F2E` | Carp red hover |
| `carp-red-active` | `#A83526` | Carp red pressed |
| `gold` | `#C9A84C` | Celebration accent — milestones, achievements |
| `gold-light` | `#F5E6B8` | Gold on dark backgrounds |
| `sea-green` | `#3AAFB0` | Tertiary accent — growth, progress |
| `sea-green-light` | `#D4F0F0` | Sea green on light backgrounds |
| `gray-100` | `#F3F4F6` | Light borders |
| `gray-200` | `#E5E7EB` | Dividers |
| `gray-400` | `#9CA3AF` | Placeholder text |
| `gray-500` | `#6B7280` | Secondary text |
| `gray-700` | `#374151` | Body text on light |
| `gray-900` | `#111827` | Primary text on light |

### Typography

| Token | Value | Use |
|---|---|---|
| `font-sans` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | All text |
| `display-xl` | `4rem / 1.1 / -0.03em` | Hero headlines |
| `display-lg` | `3rem / 1.15 / -0.025em` | Section headlines |
| `display-md` | `2.25rem / 1.2 / -0.02em` | Page titles |
| `heading-lg` | `1.75rem / 1.3 / -0.02em` | Card titles, section subheads |
| `heading-md` | `1.375rem / 1.35 / -0.015em` | Component titles |
| `heading-sm` | `1.125rem / 1.4 / -0.01em` | Small titles |
| `body-lg` | `1.25rem / 1.65` | Lead paragraphs |
| `body` | `1.0625rem / 1.65` | Body text (17px) |
| `body-sm` | `0.9375rem / 1.6` | Secondary body (15px) |
| `caption` | `0.8125rem / 1.5 / 0.01em` | Captions, metadata |
| `label` | `0.8125rem / 1.4 / 0.05em` | Form labels, uppercase tracking |

### Spacing (8px base)

| Token | Value |
|---|---|
| `space-1` | 0.25rem (4px) |
| `space-2` | 0.5rem (8px) |
| `space-3` | 0.75rem (12px) |
| `space-4` | 1rem (16px) |
| `space-6` | 1.5rem (24px) |
| `space-8` | 2rem (32px) |
| `space-10` | 2.5rem (40px) |
| `space-12` | 3rem (48px) |
| `space-16` | 4rem (64px) |
| `space-20` | 5rem (80px) |
| `space-24` | 6rem (96px) |

### Border Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 8px | Small badges, tags |
| `radius-md` | 16px | Cards, buttons, inputs |
| `radius-lg` | 24px | Large containers, hero sections |
| `radius-full` | 9999px | Pill buttons, avatars, chips |

### Control Height

| Token | Value | Use |
|---|---|---|
| `control-h` | 2.5rem (40px) | **The single shared height** — all form controls, buttons, inputs, selects use this. |

## Layout

- **Page max-width**: 1280px for content, full-bleed for hero imagery
- **Container padding**: 2rem on desktop, 1rem on mobile
- **Grid gutters**: 1.5rem between columns
- **Section spacing**: 5rem between major sections on landing, 3rem on dashboard
- Cards use `radius-md` (16px); hero sections use `radius-lg` (24px)

## Component States

All interactive components use `control-h` (40px) as their base height.

| State | Behavior | Visual |
|---|---|---|
| **default** | Resting state | Clean, no emphasis |
| **hover** | Mouse over | Slight darkening (buttons), 2px lift (cards) |
| **focus** | Keyboard focus | 3px solid `indigo-400` ring, 1px offset |
| **active** | Pressed | 1px darker fill, subtle scale down (0.98) |
| **disabled** | Non-interactive | 50% opacity, cursor not-allowed |

### Button: Primary (Carp Red)
- Default: `carp-red` bg, white text, `radius-md`
- Hover: `carp-red-hover`
- Focus: 3px `indigo-400` ring, 1px offset
- Active: `carp-red-active`, scale 0.98
- Disabled: `carp-red` at 50% opacity, cursor not-allowed

### Button: Secondary (Indigo Outline)
- Default: indigo-700 border, indigo-700 text, transparent bg
- Hover: indigo-700 bg, white text
- Focus: 3px `indigo-400` ring, 1px offset
- Active: indigo-800 bg
- Disabled: border at 50%, text at 50%, cursor not-allowed

### Button: Ghost
- Default: transparent bg, indigo-600 text
- Hover: indigo-100 bg
- Focus: 3px `indigo-400` ring, 1px offset
- Active: indigo-300 bg
- Disabled: text at 50%, cursor not-allowed

### Input / Text Field
- Default: white bg, gray-200 border, gray-900 text
- Hover: indigo-300 border
- Focus: indigo-500 border + 3px `indigo-400` ring, 1px offset
- Disabled: gray-100 bg, gray-200 border, gray-400 text, cursor not-allowed

### Select / Dropdown
- Default: white bg, gray-200 border, chevron indicator
- Hover: indigo-300 border
- Focus: indigo-500 border + 3px `indigo-400` ring, 1px offset
- Disabled: gray-100 bg, gray-200 border

### Checkbox
- Default: white bg, gray-200 border, 4px inner radius
- Checked: carp-red bg, white checkmark
- Focus: 3px `indigo-400` ring around the box
- Disabled: gray-200 border, at 50% opacity

### Toggle / Switch
- Default: gray-200 track, white knob
- On: carp-red track
- Focus: 3px `indigo-400` ring around the whole control
- Disabled: gray-200 track at 50% opacity

### Card
- Default: white bg, subtle shadow, `radius-md`
- Hover: shadow increases, 2px lift
- Focus: 3px `indigo-400` ring, 1px offset
- Disabled: 50% opacity

## Imagery Style

- **Photorealistic product imagery** — bright, clean, optimistic
- **Full-bleed hero images** — no borders, no frames, edge to edge
- **Organic flowing shapes** — water ribbons, wind currents, carp silhouettes
- **Color palette in imagery** — indigo skies, red/gold accents, clean whites
- **Never hand-drawn SVG** for hero/feature imagery; SVG only for small UI marks (icons, decorative dividers)

## Surfaces

### Landing Page
- Full-bleed hero with generated imagery
- Feature sections with alternating layouts
- No token swatches, no spec sheets — real product storytelling
- Generous section spacing (5rem)
- Navigation bar with logo, links, and CTA button

### Dashboard
- Indigo-50 page background
- White card surfaces
- Sidebar navigation with indigo-900 background
- Data tables, charts, and form controls
- Consistent use of accent colors for status and priority
- Header bar with search, notifications, and user menu
