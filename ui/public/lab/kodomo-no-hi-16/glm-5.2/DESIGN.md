# Sōryū (蒼流) — Azure Current

> A design language for Kodomo no Hi. One name, one system, two surfaces.

---

## 1. Philosophy / Point of View

Sōryū means "azure current" — the upward flow of the koinobori carp streamer
against a clear early-summer sky. The language captures three things at once:

1. **Clarity of light.** Kodomo no Hi falls in early May, when the air is
   bright, the foliage is new, and the sky is an electric, washed blue. Sōryū
   leads with generous white space and lets vivid colour land on it like light
   through a window.

2. **Upward motion.** The carp streamer rises. Every surface has a sense of
   lift — type sits high in its container, accents pull the eye upward, sections
   breathe from the top. Nothing sinks.

3. **Grown-up graphic confidence.** This is not a children's toy. It is the
   design language an adult would ship for a premium product: editorial
   composition, strong type, almost-neon accents used like highlighters, and
   the restraint of a Japanese design magazine.

The accent palette is signature-led: **electric sky-blue** is the primary,
**fresh green** is the secondary, and **coral red** is the single hot pop —
used sparingly, never decoratively. Neutrals are pure `#FFFFFF` and `#0A0A0B`.
No greys, no muddy pastels, no gradients.

---

## 2. Color Tokens

### Neutrals

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0A0A0B` | Primary text, dark surfaces |
| `--ink-soft` | `#3A3A3F` | Secondary text |
| `--ink-mute` | `#6B6B72` | Tertiary / captions |
| `--paper` | `#FFFFFF` | Primary background |
| `--paper-tint` | `#F0F7FF` | Surface tint (very light sky) |
| `--paper-warm` | `#FAFBFD` | Card / panel background |

### Accents

| Token | Value | Role |
|---|---|---|
| `--sky` | `#0066FF` | Primary accent — electric sky-blue |
| `--sky-deep` | `#0052CC` | Pressed / active sky |
| `--sky-soft` | `#E6F0FF` | Sky tint surface |
| `--green` | `#00C853` | Secondary accent — fresh foliage |
| `--green-deep` | `#00A843` | Pressed / active green |
| `--coral` | `#FF3B47` | Hot pop — koinobori mouth |
| `--coral-deep` | `#E62E39` | Pressed / active coral |

### Semantic

| Token | Value | Use |
|---|---|---|
| `--success` | `#00C853` | Same as green |
| `--warning` | `#FF9500` | Amber — used minimally |
| `--danger` | `#FF3B47` | Same as coral |
| `--focus-ring` | `#0066FF` | Visible focus ring (sky) |

---

## 3. Typography

| Token | Value |
|---|---|
| `--font-display` | `'Space Grotesk', 'Helvetica Neue', sans-serif` |
| `--font-body` | `'Inter', 'Helvetica Neue', sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', monospace` |
| `--tracking-display` | `-0.02em` |
| `--tracking-body` | `0` |
| `--tracking-label` | `0.04em` |

### Type scale

| Role | Size | Line-height | Weight | Font |
|---|---|---|---|---|
| Display XL | 72px | 1.05 | 700 | Display |
| Display L | 56px | 1.05 | 700 | Display |
| Display M | 40px | 1.1 | 600 | Display |
| Title | 28px | 1.2 | 600 | Display |
| Heading | 22px | 1.3 | 600 | Body |
| Body L | 19px | 1.55 | 400 | Body |
| Body | 17px | 1.6 | 400 | Body |
| Body S | 15px | 1.5 | 400 | Body |
| Caption | 13px | 1.4 | 500 | Body |
| Label | 12px | 1.2 | 600 | Body, tracked |
| Mono | 14px | 1.4 | 500 | Mono |

Body text minimum is 17px. Table rows 14.5px+. Display text uses `-0.02em`
letter-spacing. Labels are uppercase, tracked `0.04em`.

---

## 4. Spacing

Based on an 8px grid.

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |
| `--space-8` | `64px` |
| `--space-9` | `96px` |
| `--space-10` | `128px` |

Section padding top is always ≥ `--space-7` (48px). Titles never sit flush to
the top of a container.

---

## 5. Radius

Only four values, used deliberately.

| Token | Value | Use |
|---|---|---|
| `--radius-0` | `0` | Images, full-bleed media, sharp editorial blocks |
| `--radius-16` | `16px` | Cards, panels, inputs |
| `--radius-24` | `24px` | Large surfaces, modals, hero cards |
| `--radius-pill` | `9999px` | Buttons (primary/secondary), pills, tags |

---

## 6. Control Height (shared token)

Every interactive control — buttons, inputs, selects, toggles, search bars —
sits on one height:

| Token | Value |
|---|---|
| `--ctrl-h` | `48px` |

No control is shorter or taller than `--ctrl-h`. Compact variants use the same
height; density is achieved through spacing, not shrinking controls.

---

## 7. Components

All components are built from the tokens above. Every interactive component
has five states: **default, hover, focus (with a visible ring), active
(pressed), disabled.**

### 7.1 Button

- **Primary**: `--ink` background, `--paper` text, `--radius-pill`, height
  `--ctrl-h`. Hover: `--sky` background. Focus: `2px` solid `--focus-ring`
  ring offset `2px`. Active: `--sky-deep`. Disabled: `opacity 0.4`,
  `cursor: not-allowed`.
- **Secondary**: `--paper` background, `--ink` text, `--radius-pill`, height
  `--ctrl-h`. Hover: `--paper-tint` background. Focus ring sky. Active:
  `--sky-soft`. Disabled same as primary.
- **Accent (green)**: `--green` background, `--paper` text. Hover:
  `--green-deep`. Focus ring sky. Active: darken further. Disabled same.
- **Ghost**: transparent background, `--ink` text. Hover: `--paper-tint`.
  Focus ring sky. Active: `--sky-soft`.

### 7.2 Input / Text Field

- Height `--ctrl-h`, `--radius-16`, `--paper-warm` background, `--ink` text.
- Border: none (rely on background contrast). On focus: `2px` solid
  `--focus-ring` ring, background → `--paper`.
- Placeholder: `--ink-mute`.
- Disabled: `--paper-tint` background, `--ink-mute` text, `cursor: not-allowed`.
- Label sits above the input, `--font-body`, Label style (12px, 600, tracked).

### 7.3 Select

- Same shell as input. A custom chevron (SVG) in `--ink-soft` on the right.
- Open state: a `--radius-16` dropdown panel, `--paper` background, shadow.
- Focus ring on the trigger. Disabled same as input.

### 7.4 Toggle

- Track: `--ctrl-h` wide × 28px tall, `--radius-pill`, `--paper-tint` default.
- Knob: 20px circle, `--paper`, shadow.
- On: track `--sky`, knob slides right.
- Focus ring on the track. Disabled: `opacity 0.4`.

### 7.5 Checkbox

- 20px square, `--radius-16` (scaled — visually ~6px), `--paper-warm` bg.
- Checked: `--sky` background, white check SVG.
- Focus ring. Disabled: `opacity 0.4`.

### 7.6 Radio

- 20px circle, `--paper-warm` bg, 2px `--ink-mute` ring.
- Selected: `--sky` ring, `--sky` dot center.
- Focus ring. Disabled: `opacity 0.4`.

### 7.7 Slider

- Track: 4px tall, `--radius-pill`, `--paper-tint` base.
- Filled portion: `--sky`.
- Thumb: 20px circle, `--paper`, shadow, `--radius-pill`.
- Focus ring on thumb. Disabled: `opacity 0.4`.

### 7.8 Tag / Pill

- `--radius-pill`, height 28px, `--paper-tint` bg, `--ink-soft` text, 12px
  label style. Accent variants: `--sky-soft` bg + `--sky` text, etc.

### 7.9 Card

- `--radius-24`, `--paper-warm` bg, no border. Shadow: `0 1px 3px rgba(10,10,11,0.04)`.
- Padding `--space-6` minimum.

### 7.10 Navigation / Tabs

- Tab trigger: height `--ctrl-h`, transparent bg, `--ink-soft` text. Active:
  `--ink` text, 2px `--sky` underline. Hover: `--paper-tint` bg. Focus ring.

---

## 8. Layout Guidance

- **Grid**: 12-column on desktop, collapsing to 1 on mobile. Max content
  width 1280px, gutters `--space-5`.
- **Vertical rhythm**: sections separated by `--space-9` (96px) on desktop,
  `--space-7` (48px) on mobile.
- **Titles lift**: every section title has `--space-7` padding above it.
- **White space is the design.** Do not fill it. Negative space carries the
  "airy, hopeful" feeling.
- **Accents as highlighters**: a single accent block, a single colored word,
  a thin underline. Never a wash.
- **No borders.** Separate surfaces with background contrast and spacing, not
  lines. The only lines are the 2px focus ring and the tab underline.
- **Responsive**: 100% on mobile. Type scales down via `clamp()`. Diagrams
  stay legible.

---

## 9. Motion

- `prefers-reduced-motion` respected. Default transitions: `150ms ease-out`.
- Hover lifts: `translateY(-2px)` on cards.
- Focus ring: appears on `:focus-visible`, never on mouse click.

---

## 10. Surfaces

This language lives in two surfaces:

1. **landing.html** — marketing landing for **Sōryū**, a product that helps
   families and communities organize Kodomo no Hi celebrations (streamer
   displays, gatherings, wish-lists for children). Full-bleed hero, editorial
   feature blocks, strong type.

2. **dashboard.html** — the Sōryū product dashboard: manage celebrations,
   track streamer displays, see community activity, manage wish-lists. Real
   controls, real data tables, real forms.
