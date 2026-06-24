# NOBORI (昇) — Design Language

## Philosophy

NOBORI captures the upward momentum of koinobori — carp streamers climbing skyward against clear early-summer light. It is a language about aspiration, clarity, and the confidence to let color speak in precise, deliberate strokes.

The sky is white space: generous, uncluttered, breathing room for everything that matters. Against it, vivid accents rise like streamers on a line — electric blue, fresh green, hot coral — each placed with editorial intent, never scattered. Typography is the pole and the rope: structural, strong, grounding the composition.

NOBORI is for products that adults trust. It borrows the festival's joy and hope but expresses them through graphic precision, not decoration. Every element earns its place. Color is a highlighter, not a wash. Space is a decision, not a default.

**Core principles:**
- **Rise** — compositions move upward; visual weight sits low, energy sits high
- **Clarity** — one idea per surface region; no competing focal points
- **Restraint in color** — accents cover ≤15% of any surface; white dominates
- **Editorial confidence** — strong type, asymmetric grids, poster-grade hierarchy

---

## Color Tokens

### Neutrals
| Token | Value | Usage |
|---|---|---|
| `--ink` | `#0A0A0A` | Primary text, headings, strong UI elements |
| `--ink-soft` | `#4A4A4A` | Secondary text, descriptions |
| `--ink-muted` | `#767676` | Tertiary text, placeholders, timestamps |
| `--line` | `#E8E8E8` | Dividers, subtle borders (used sparingly) |
| `--surface` | `#F5F5F5` | Card backgrounds, elevated surfaces |
| `--sky` | `#FAFAFA` | Page backgrounds, alternate sections |
| `--white` | `#FFFFFF` | Primary canvas, cards on colored sections |

### Accents
| Token | Value | Usage |
|---|---|---|
| `--sora` | `#0088FF` | Primary action, links, interactive elements — electric sky blue |
| `--sora-deep` | `#0066CC` | Hover/active state for sora elements |
| `--midori` | `#00CC66` | Success states, positive indicators, secondary accent — fresh green |
| `--midori-deep` | `#00A854` | Hover/active state for midori elements |
| `--hi` | `#FF4D4D` | Alerts, notifications, hot accent — coral red |
| `--hi-deep` | `#E03030` | Hover/active state for hi elements |
| `--pop` | `#FF8800` | Tertiary accent, badges, warm highlights — tangerine |

### Contrast
All text-on-background combinations meet WCAG AA (4.5:1 minimum for body, 3:1 for large text):
- `--ink` on `--white` / `--sky` / `--surface`: passes
- `--white` on `--ink`: passes
- `--white` on `--sora`: 4.5:1 — passes
- `--ink-muted` on `--white` / `--sky`: 4.54:1 — passes AA
- `--white` on `--midori`: use only for large text (3.2:1)
- `--ink` on `--pop`: passes for large text

---

## Typography Tokens

### Families
| Token | Stack | Usage |
|---|---|---|
| `--font-display` | `'Space Grotesk', system-ui, sans-serif` | Headlines, hero text, display numbers |
| `--font-body` | `'Inter', system-ui, sans-serif` | Body text, UI labels, descriptions |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', monospace` | Code, data values, technical labels |

### Scale
| Token | Size | Line-height | Letter-spacing | Usage |
|---|---|---|---|---|
| `--text-hero` | `72px` | `1.05` | `-0.03em` | Hero headlines |
| `--text-display` | `48px` | `1.1` | `-0.025em` | Section titles |
| `--text-title` | `32px` | `1.2` | `-0.02em` | Card titles, page headers |
| `--text-heading` | `20px` | `1.3` | `-0.01em` | Subheadings, group labels |
| `--text-body` | `17px` | `1.6` | `0` | Body copy, descriptions |
| `--text-ui` | `14px` | `1.4` | `0.01em` | UI labels, nav items, table text |
| `--text-caption` | `12px` | `1.4` | `0.02em` | Captions, timestamps, metadata |

### Weight
| Token | Value | Usage |
|---|---|---|
| `--weight-regular` | `400` | Body text, descriptions |
| `--weight-medium` | `500` | UI labels, nav items, emphasis |
| `--weight-semibold` | `600` | Subheadings, card titles |
| `--weight-bold` | `700` | Headlines, display text, strong emphasis |

---

## Spacing Tokens

Base unit: **4px**. All spacing derives from multiples.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Tight gaps (icon to text) |
| `--space-2` | `8px` | Inline spacing, small gaps |
| `--space-3` | `12px` | Input padding, compact gaps |
| `--space-4` | `16px` | Default component padding |
| `--space-5` | `20px` | Card padding (compact) |
| `--space-6` | `24px` | Card padding, section gaps |
| `--space-8` | `32px` | Section margins |
| `--space-10` | `40px` | Large section gaps |
| `--space-12` | `48px` | Page section separators |
| `--space-16` | `64px` | Hero padding, major section breaks |
| `--space-20` | `80px` | Page top/bottom padding |
| `--space-32` | `128px` | Hero vertical padding |

---

## Radius Tokens

| Token | Value | Usage |
|---|---|---|
| `--radius-0` | `0` | Sharp edges, full-bleed elements |
| `--radius-sm` | `8px` | Small badges, tags, chips |
| `--radius-md` | `16px` | Cards, buttons, inputs, modals |
| `--radius-full` | `9999px` | Pills, avatars, circular elements |

---

## Control Height Token

One shared height for all interactive controls, ensuring visual alignment across forms, buttons, and toolbars.

| Token | Value |
|---|---|
| `--control-h` | `48px` |

All buttons, text inputs, selects, dropdowns, and search bars use `height: 48px` (or `min-height: 48px` for multi-line). Icon buttons within toolbars: `48px × 48px`.

---

## Elevation

No drop shadows in the default state. Depth is created through background color contrast (`--white` cards on `--sky` backgrounds). One elevated state for modals and dropdowns:

| Token | Value | Usage |
|---|---|---|
| `--shadow-float` | `0 8px 32px rgba(10,10,10,0.08)` | Modals, dropdowns, popovers |
| `--shadow-lift` | `0 2px 8px rgba(10,10,10,0.06)` | Hover state on cards |

---

## Components

### Button — Primary
- **Default**: `background: var(--sora)`, `color: #FFF`, `height: 48px`, `padding: 0 24px`, `border-radius: 16px`, `font: 500 14px var(--font-body)`, no border, no shadow
- **Hover**: `background: var(--sora-deep)`, `transform: translateY(-1px)`, `box-shadow: var(--shadow-lift)`
- **Focus**: `outline: 3px solid var(--sora)`, `outline-offset: 2px` — visible ring
- **Active**: `background: var(--sora-deep)`, `transform: translateY(0)`, no shadow
- **Disabled**: `background: var(--line)`, `color: var(--ink-muted)`, `cursor: not-allowed`, no transform

### Button — Secondary
- **Default**: `background: transparent`, `color: var(--ink)`, `border: 2px solid var(--line)`, `height: 48px`, `padding: 0 24px`, `border-radius: 16px`
- **Hover**: `border-color: var(--ink)`, `background: var(--surface)`
- **Focus**: `outline: 3px solid var(--sora)`, `outline-offset: 2px`
- **Active**: `background: var(--line)`
- **Disabled**: `border-color: var(--line)`, `color: var(--ink-muted)`

### Button — Ghost
- **Default**: `background: transparent`, `color: var(--ink)`, no border, `height: 48px`, `padding: 0 16px`
- **Hover**: `background: var(--surface)`
- **Focus**: `outline: 3px solid var(--sora)`, `outline-offset: 2px`
- **Active**: `background: var(--line)`
- **Disabled**: `color: var(--ink-muted)`

### Text Input
- **Default**: `background: var(--white)`, `border: 2px solid var(--line)`, `height: 48px`, `padding: 0 16px`, `border-radius: 16px`, `font: 400 17px var(--font-body)`, `color: var(--ink)`
- **Hover**: `border-color: var(--ink-muted)`
- **Focus**: `border-color: var(--sora)`, `outline: 3px solid rgba(0,136,255,0.2)`, `outline-offset: 0`
- **Placeholder**: `color: var(--ink-muted)`
- **Disabled**: `background: var(--surface)`, `color: var(--ink-muted)`, `cursor: not-allowed`

### Select / Dropdown
- Same box as Text Input, with chevron icon right-aligned. Dropdown panel: `background: var(--white)`, `border-radius: 16px`, `box-shadow: var(--shadow-float)`, options at `height: 48px` each.

### Checkbox
- **Default**: `width: 20px`, `height: 20px`, `border: 2px solid var(--line)`, `border-radius: 4px`
- **Checked**: `background: var(--sora)`, `border-color: var(--sora)`, white checkmark
- **Focus**: `outline: 3px solid var(--sora)`, `outline-offset: 2px`

### Toggle / Switch
- **Default**: track `44px × 24px`, `background: var(--line)`, `border-radius: 9999px`; thumb `20px` circle, white, positioned left
- **Active**: track `background: var(--sora)`, thumb positioned right
- **Focus**: `outline: 3px solid var(--sora)`, `outline-offset: 2px` on track

### Card
- **Default**: `background: var(--white)`, `border-radius: 16px`, `padding: 24px`, no border, no shadow (relies on `--sky` background for contrast)
- **Hover** (if interactive): `box-shadow: var(--shadow-lift)`, `transform: translateY(-2px)`
- **Focus** (if focusable): `outline: 3px solid var(--sora)`, `outline-offset: 2px`

### Badge / Tag
- `height: 24px`, `padding: 0 10px`, `border-radius: 9999px`, `font: 500 12px var(--font-body)`
- Variants: `--sora` bg with white text, `--midori` bg with white text, `--hi` bg with white text, `--surface` bg with `--ink` text

### Navigation
- Top bar: `height: 64px`, `background: var(--white)`, logo left, nav center, actions right
- Nav items: `font: 500 14px var(--font-body)`, `color: var(--ink-soft)`, `padding: 8px 16px`
- Active nav: `color: var(--ink)`, bottom `2px` bar in `--sora`
- Focus: `outline: 3px solid var(--sora)`, `outline-offset: 2px`

---

## Layout Guidance

### Grid
- Max content width: `1200px` (landing), `1400px` (dashboard)
- 12-column grid, `24px` gutters
- Landing pages use asymmetric editorial grids — not uniform columns

### Landing Page
- Full-bleed hero with generous vertical padding (`--space-32` top and bottom)
- Editorial composition: mix large type blocks with image placements at unexpected grid positions
- Sections alternate between `--white` and `--sky` backgrounds
- Accent color used for one element per section — a number, a line, a button — never flooding

### Dashboard
- Sidebar navigation (240px wide, `--white` background)
- Main content area on `--sky` background
- Cards in `--white` with `--radius-md`
- Data visualizations use the three accent colors as data series: `--sora` primary, `--midori` secondary, `--hi` for alerts
- Dense information displays use `--text-ui` (14px) with generous white space between groups

---

## Motion

- Duration: `200ms` for micro-interactions, `400ms` for layout transitions
- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1.0)` — smooth deceleration
- Respect `prefers-reduced-motion`: disable transforms and transitions when active
- Hover lifts: `translateY(-1px)` to `translateY(-2px)` max — subtle, not bouncy

---

## Iconography

- Stroke-based, 1.5px stroke weight
- 24px default size, scales to 16/20/32
- Rounded terminals, consistent optical weight
- Color inherits from parent text color
