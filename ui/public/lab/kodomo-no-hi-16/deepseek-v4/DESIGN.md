# Nobori — Design Language

A design language for Kodomo no Hi: the festival of children rising. Named for the
climbing carp streamers (koinobori) that lift against the wind, Nobori is bright,
confident, and editorial — a product language for adults building things that soar.

## Philosophy

**Rise.** Every surface breathes upward. Generous white space acts as clear sky; accents
strike like wind-blown streamers against it. The language is graphic, not decorative —
poster composition meets product UI. No mud, no pastel, no toy-box clutter. One strong
point of view: open, electric, grown-up.

### Principles

1. **White is the canvas.** Open space is the primary material. Content sits in it, never
   fills it.
2. **Accent like a highlighter.** ≤3 vivid colors used sparingly — one stroke, maximum
   impact. Never gradient-washed, never muted.
3. **Type leads.** Editorial scale with confident weight jumps. Display type anchors the
   page; body type stays clean and readable.
4. **One height.** Every interactive control shares one height token. Consistency is
   non-negotiable.
5. **Focus is visible.** Every interactive element gets a bright, unmistakable focus ring.
   No hidden states.

---

## Tokens

### Color

| Token | Hex | Role |
|-------|-----|------|
| `--color-white` | `#FFFFFF` | Page background, card surfaces |
| `--color-black` | `#0D0D0D` | Primary text, icons |
| `--color-sky` | `#00B4F0` | Primary accent — electric sky-blue |
| `--color-leaf` | `#00D86E` | Secondary accent — fresh greenery |
| `--color-flash` | `#FF3B5C` | Tertiary accent — hot coral pop (sparingly) |
| `--color-ink` | `#1A1A2E` | Deep navy for dark surfaces, emphasis |
| `--color-cloud` | `#F5F7FA` | Subtle surface tint, hover backgrounds |
| `--color-slate` | `#6B7280` | Secondary text, muted elements |
| `--color-border` | `#E5E7EB` | Subtle dividers (used minimally) |

### Typography

**Font stack:** `'Inter', system-ui, -apple-system, sans-serif`

| Token | Size / Line | Weight | Use |
|-------|-------------|--------|-----|
| `--text-display` | clamp(3rem, 6vw, 5.5rem) / 1.05 | 700 | Hero headlines |
| `--text-heading-1` | clamp(2rem, 4vw, 3rem) / 1.15 | 700 | Page titles |
| `--text-heading-2` | 1.5rem / 1.25 | 600 | Section headers |
| `--text-heading-3` | 1.125rem / 1.3 | 600 | Card titles, subsection labels |
| `--text-body` | 1.0625rem (17px) / 1.6 | 400 | Body copy |
| `--text-body-sm` | 0.9375rem (15px) / 1.5 | 400 | Secondary body, descriptions |
| `--text-caption` | 0.8125rem (13px) / 1.4 | 500 | Labels, metadata, table cells |
| `--text-overline` | 0.6875rem (11px) / 1.3 | 600 | Overline, tracking 0.12em, uppercase |

Letter-spacing on display text: `-0.02em`.

### Spacing

Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |
| `--space-3xl` | 64px |
| `--space-4xl` | 96px |
| `--space-section` | 128px |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-none` | 0 | Buttons, inputs, cards (default) |
| `--radius-md` | 16px | Large containers, modals |
| `--radius-lg` | 24px | Hero image masks, feature cards |
| `--radius-pill` | 9999px | Tags, badges, chips |

### Control Height

**One shared token:** `--control-height: 48px`

Every button, input, select, and interactive control uses exactly this height.

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.06)` |
| `--shadow-lg` | `0 12px 40px rgba(0,0,0,0.08)` |

### Focus Ring

All interactive elements share one focus style:
```
outline: 2px solid var(--color-sky);
outline-offset: 2px;
```
Never suppressed. Always visible on `:focus-visible`.

---

## Components

### Button

```
height: var(--control-height);  /* 48px */
padding: 0 var(--space-xl);     /* 0 32px */
border-radius: var(--radius-none);
font: var(--text-body);
font-weight: 600;
cursor: pointer;
transition: all 120ms ease;
```

**Variants:**

- **Primary:** `background: var(--color-sky); color: var(--color-white);`
  - Hover: `background: #009CD6;` (sky darkened 8%)
  - Active: `background: #0089BF;` (sky darkened 14%)
  - Focus-visible: sky outline ring
  - Disabled: `opacity: 0.4; cursor: not-allowed;`

- **Secondary:** `background: transparent; color: var(--color-sky); box-shadow: inset 0 0 0 1.5px var(--color-sky);`
  - Hover: `background: rgba(0,180,240,0.06);`
  - Active: `background: rgba(0,180,240,0.12);`
  - Focus-visible: sky outline ring
  - Disabled: `opacity: 0.4; cursor: not-allowed;`

- **Ghost:** `background: transparent; color: var(--color-black);`
  - Hover: `background: var(--color-cloud);`
  - Active: `background: var(--color-border);`
  - Focus-visible: sky outline ring
  - Disabled: `opacity: 0.4; cursor: not-allowed;`

- **Danger:** `background: var(--color-flash); color: var(--color-white);`
  - Hover: `background: #E6324F;`
  - Active: `background: #CC2D47;`
  - Focus-visible: flash outline ring
  - Disabled: `opacity: 0.4; cursor: not-allowed;`

### Text Input

```
height: var(--control-height);  /* 48px */
padding: 0 var(--space-md);     /* 0 16px */
border-radius: var(--radius-none);
border: 1.5px solid var(--color-border);
background: var(--color-white);
font: var(--text-body);
color: var(--color-black);
transition: border-color 120ms ease, box-shadow 120ms ease;
```

- Default: `border-color: var(--color-border);`
- Hover: `border-color: var(--color-slate);`
- Focus: `border-color: var(--color-sky); box-shadow: 0 0 0 3px rgba(0,180,240,0.15); outline: none;`
- Disabled: `opacity: 0.4; background: var(--color-cloud); cursor: not-allowed;`
- Placeholder: `color: var(--color-slate);`
- Error: `border-color: var(--color-flash);`

### Select

Same as Text Input, plus custom dropdown arrow via `appearance: none` with an inline SVG chevron.

### Textarea

```
min-height: calc(var(--control-height) * 2.5);  /* 120px */
padding: var(--space-md);
border-radius: var(--radius-none);
border: 1.5px solid var(--color-border);
font: var(--text-body);
resize: vertical;
```
States mirror Text Input.

### Checkbox / Radio

Custom-styled with `appearance: none`. 20×20px box, border-radius 0 for checkbox, 9999px for radio.

- Default: `border: 1.5px solid var(--color-border); background: var(--color-white);`
- Hover: `border-color: var(--color-slate);`
- Checked: `background: var(--color-sky); border-color: var(--color-sky);` with white checkmark/indicator
- Focus-visible: sky outline ring
- Disabled: `opacity: 0.4;`

### Toggle Switch

```
width: 44px; height: 24px;
border-radius: var(--radius-pill);
background: var(--color-border);
transition: background 120ms ease;
```
- Checked: `background: var(--color-sky);`
- Knob: 18px white circle, slides with `translateX(20px)` when checked
- Focus-visible: sky outline ring around the track

### Tag / Badge

```
height: 28px;
padding: 0 var(--space-sm);
border-radius: var(--radius-pill);
font: var(--text-caption);
font-weight: 600;
display: inline-flex; align-items: center;
```

- **Default:** `background: var(--color-cloud); color: var(--color-slate);`
- **Accent:** `background: rgba(0,180,240,0.1); color: #0089BF;`
- **Success:** `background: rgba(0,216,110,0.1); color: #00A855;`
- **Alert:** `background: rgba(255,59,92,0.1); color: #CC2D47;`

### Card

```
background: var(--color-white);
border-radius: var(--radius-none);
padding: var(--space-xl);
box-shadow: var(--shadow-sm);
```
Hoverable variant adds `box-shadow: var(--shadow-md);` on hover.

### Table

```
width: 100%;
border-collapse: collapse;
```
- Header: `font: var(--text-overline); color: var(--color-slate); text-align: left; padding: var(--space-md) var(--space-lg); border-bottom: 1.5px solid var(--color-border);`
- Cell: `font: var(--text-caption); padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--color-cloud);`
- Row hover: `background: var(--color-cloud);`

### Divider

`height: 1px; background: var(--color-border); margin: 0;` — used sparingly, never as decoration.

---

## Layout

### Grid

12-column grid. Max content width: 1280px. Gutters: `var(--space-lg)` (24px).

### Section Spacing

Sections are separated by `var(--space-section)` (128px) vertical padding. Hero sections are full-bleed with no top padding.

### Responsive

- Desktop-first, 1280px max-width centered container
- Below 768px: single column, reduced type scale, `--space-section` halves to 64px
- Below 480px: full-width cards, stacked navigation

### Navigation

Top bar: 64px height, white background, subtle bottom shadow. Logo left, links right. Mobile: hamburger to full overlay.

---

## Imagery Style

Photographic with graphic edge — clean compositions, strong negative space, saturated accent
colors against white. Images feel editorial: magazine-spread quality, never stock-photo
generic. The koinobori motif appears as a visual signature — carp streamers rendered as
bold graphic elements, not literal photographs of fabric fish.

---

## Motion

- Transitions: 120ms ease for micro-interactions (hover, focus)
- Page transitions: 200ms ease-out
- Respects `prefers-reduced-motion`: all motion disabled when set
- Scroll reveal: elements fade up 24px on entry (disabled if reduced motion)