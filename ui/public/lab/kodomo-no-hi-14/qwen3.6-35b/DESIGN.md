# KOI — Design Language

*Japanese Children's Day reimagined for the modern web. Bright. Graphic. Confident.*

## Philosophy

Kodomo no Hi is about koinobori — carp streamers rising into early-summer sky. The design language captures that sense of **ascent, clarity, and vivid hope**. Not childish. Not muted. A grown-up product system that channels the energy of carp swimming upstream into electric color on clean white space.

The system is **graphic-first**: bold typography, generous whitespace, and accent colors used like highlighters — sparing, vivid, purposeful. Every surface should feel like it belongs on a poster from a Tokyo design museum, then work flawlessly as a product interface.

**One height token.** Every interactive control shares a single `--height-control` value so the system feels unified across landing pages, dashboards, and everything in between.

**Color as direction.** Electric sky-blue pulls upward like the carp. Fresh green grounds the system in early-summer greenery. A hot coral pop provides urgency without aggression. These are accent colors, never backgrounds.

## Tokens

### Color

```css
/* Neutrals — pure, high contrast */
--color-white:        #FFFFFF;
--color-bg:           #FAFBFC;
--color-surface:      #FFFFFF;
--color-border:       #E8ECF0;
--color-text:         #0F1923;
--color-text-secondary: #5A6A7A;
--color-text-tertiary:#8A96A4;

/* Accent — electric sky-blue (primary direction) */
--color-accent:       #00A0FF;
--color-accent-hover: #0088DD;
--color-accent-active:#006BBB;
--color-accent-light: #E8F6FF;

/* Accent — fresh green (grounding) */
--color-green:        #00D68F;
--color-green-hover:  #00B87A;
--color-green-light:  #E6FAF3;

/* Accent — hot coral (urgency, attention) */
--color-coral:        #FF4D6A;
--color-coral-hover:  #E63A55;
--color-coral-light:  #FFF0F3;

/* Semantic */
--color-success:       #00D68F;
--color-warning:       #FFB020;
--color-error:         #FF4D6A;
--color-info:          #00A0FF;
```

### Typography

```css
/* Inter — clean, geometric, editorial */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Type scale — editorial, poster-like */
--text-display:      3.5rem / 1.05 — 3.5rem, tight leading, poster impact
--text-h1:           2.75rem / 1.1   — section titles
--text-h2:           2.25rem / 1.15  — sub-sections
--text-h3:           1.75rem / 1.2   — card titles
--text-h4:           1.375rem / 1.3  — inline headings
--text-body:         1.125rem / 1.65 — 18px, comfortable reading
--text-body-sm:      0.9375rem / 1.5 — 15px, secondary text
--text-caption:      0.8125rem / 1.4 — 13px, labels, meta
--text-overline:     0.6875rem / 1.3 — 11px, all-caps tracking

/* Letter spacing — display text gets tight tracking for poster feel */
--tracking-tight:    -0.02em;
--tracking-normal:    0em;
--tracking-wide:      0.05em;
--tracking-wider:     0.1em;
```

### Spacing

```css
--space-xs:   0.25rem  /* 4px */
--space-sm:   0.5rem   /* 8px */
--space-md:   1rem     /* 16px */
--space-lg:   1.5rem   /* 24px */
--space-xl:   2rem     /* 32px */
--space-2xl:  3rem     /* 48px */
--space-3xl:  4rem     /* 64px */
--space-4xl:  6rem     /* 96px */
```

### Radius

```css
/* Only these values — no arbitrary radii */
--radius-none:     0;
--radius-lg:       16px;
--radius-xl:       24px;
--radius-round:    9999px;
```

### Height Token (shared control height)

```css
/* ONE height for ALL interactive controls — buttons, inputs, selects, checkboxes, toggles */
--height-control:  44px;
```

### Shadows

```css
--shadow-sm:   0 1px 3px rgba(15,25,35,0.06);
--shadow-md:   0 4px 16px rgba(15,25,35,0.08);
--shadow-lg:   0 8px 32px rgba(15,25,35,0.10);
--shadow-accent: 0 4px 24px rgba(0,160,255,0.15);
```

## Layout

- **Generous whitespace** — surfaces breathe. Minimum 3rem padding on page-level containers.
- **Grid** — 12-column, 8px baseline grid. Content max-width 1280px.
- **Cards** — white surface on light gray background, 24px radius, no borders.
- **Sections** — separated by vertical rhythm (multiples of 4rem), not by lines or dividers.

## Components

### Buttons

All buttons use `--height-control: 44px`. Full interaction states:

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default (primary) | `--color-accent` | `--color-white` | none |
| Hover (primary) | `--color-accent-hover` | `--color-white` | none |
| Active (primary) | `--color-accent-active` | `--color-white` | none |
| Disabled (primary) | `--color-text-tertiary` (40% opacity) | `--color-white` | none |
| Default (secondary) | transparent | `--color-accent` | 2px solid `--color-accent` |
| Hover (secondary) | `--color-accent-light` | `--color-accent-hover` | 2px solid `--color-accent-hover` |
| Default (ghost) | transparent | `--color-text` | none |
| Hover (ghost) | `--color-bg` | `--color-text` | none |

### Form Controls

All form controls use `--height-control: 44px`.

**Text Input:**
- Height: `44px`
- Background: `--color-white`
- Border: `1px solid --color-border`
- Border-radius: `16px`
- Padding: `0 16px`
- Focus: `2px solid --color-accent` + `2px --color-accent-light` ring (visible, high contrast)
- Placeholder: `--color-text-tertiary`
- Disabled: `--color-bg` background, `--color-text-tertiary` text, cursor not-allowed

**Select:**
- Same dimensions as text input
- Custom chevron indicator (12×8px, `--color-text-secondary`)
- Focus ring matches text input

**Checkbox:**
- Size: `20×20px` (sits in 44px container with padding)
- Checked: `--color-accent` fill, white checkmark
- Focus: `2px solid --color-accent` ring around checkbox
- Disabled: `--color-text-tertiary` (40% opacity)

**Toggle/Switch:**
- Track: `--color-border`, thumb: `--color-white`
- On: track `--color-accent`
- Focus: `2px solid --color-accent` ring
- Disabled: `--color-text-tertiary` (40% opacity)

### Cards

- Background: `--color-surface`
- Radius: `24px`
- Padding: `24px`
- Shadow: `--shadow-sm`
- Hover: shadow elevates to `--shadow-md`, subtle translate-y(-2px)
- No borders

### Navigation

- **Landing page**: minimal top nav, transparent on hero, white on scroll
- **Dashboard**: sidebar navigation with active state indicators

### Badges / Tags

- Height: `28px` (smaller than control height, for meta info)
- Radius: `9999px` (pill)
- Background: accent light variant, text: accent color
- Example: `--color-accent-light` bg, `--color-accent` text

### Tables (Dashboard)

- Header: `--color-bg` background, `--color-text` text, weight 600
- Rows: white background, `--color-border` bottom border (1px)
- Hover row: `--color-accent-light` (very subtle)
- No vertical borders
- Row height: `52px`
- Font: `--text-body-sm`, tracking: `--tracking-tight`

## Interaction States Summary

Every interactive element follows this pattern:

1. **Default** — clean, defined by accent color or neutral
2. **Hover** — darker shade of accent / light background
3. **Focus** — `2px solid --color-accent` visible ring (never invisible focus)
4. **Active** — pressed state, darker shade
5. **Disabled** — 40% opacity tertiary color, `cursor: not-allowed`

## Imagery Style

Hero and feature imagery should evoke:
- Early summer Japanese sky — clear blue, bright light
- Koinobori (carp streamers) — dynamic upward motion, vivid colors against sky
- Editorial poster aesthetic — strong composition, graphic, not photographic
- Clean, modern Japanese design sensibility — negative space, intentional composition

Generate imagery that feels like a **Tokyo design museum poster** — bold, graphic, aspirational. Never clip-art, never hand-drawn, never childish.

## Accessibility

- Body text minimum 18px (`1.125rem`)
- Display text uses tight tracking `-0.02em` for impact
- All interactive elements have visible focus rings (2px accent color)
- No light-on-light or dark-on-dark text
- Color is never the only indicator (icons + text for status)
- `prefers-reduced-motion` respected for all motion
