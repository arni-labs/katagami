# KODORI

**One original design language for Kodomo no Hi.**

KODORI captures the moment the wind lifts the koinobori — the instant the heavy fabric catches air, straightens, and rises against a vast open sky. It translates that physical feeling of upward release into a grown-up, confident graphic design language for digital products.

## Philosophy

- Air as structure: generous, breathable white space is the primary material.
- Color as signal, not decoration: vivid electric sky-blue, fresh green, and a hot pop are used like highlighters and directional flags — never tints, washes, or pastels.
- Graphic clarity over ornament: strong verticals, precise edges, clean editorial typography.
- Hope is sharp, not soft: the aesthetic is optimistic and modern, built for adults who value ritual without nostalgia or clutter.
- One motion idea: ascent. Elements align, lift, and resolve upward.

KODORI is sleek, clean, and expressive. It belongs on a serious product used by thoughtful parents and families.

## Tokens

### Color

| Token            | Hex       | Usage                              |
|------------------|-----------|------------------------------------|
| --bg             | #FFFEF8   | App / page background              |
| --surface        | #FFFFFF   | Cards, panels, modals              |
| --surface-subtle | #F7F8F6   | Subtle sections, table headers     |
| --ink            | #0C1118   | Primary text                       |
| --ink-muted      | #475569   | Secondary text, placeholders       |
| --sky            | #00BFFF   | Electric sky-blue (primary accent) |
| --leaf           | #00D68A   | Fresh vivid green (secondary)      |
| --pop            | #FF2759   | Hot pop (CTAs, emphasis)           |
| --border         | #E5E8E5   | Subtle dividers and strokes        |
| --focus          | #00BFFF   | Focus rings (always visible)       |

Accents are never desaturated. White space dominates; color punches.

### Typography

System stack with editorial intent:

```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

Scale (leading tight on display, relaxed on body):

- Display: 64px / 1.05, weight 700, tracking -0.025em
- h1: 48px / 1.08, 700, -0.02em
- h2: 32px / 1.15, 600, -0.015em
- h3: 24px / 1.2, 600
- h4: 20px / 1.25, 600
- body: 16px / 1.6, 400
- small: 14px / 1.5, 400
- label: 13px / 1.3, 500, tracking 0.02em (uppercase where appropriate)

### Spacing

Base unit 4px. Generous rhythm:

4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96 / 128 px

Vertical section rhythm on landing: 96–128px between major blocks. Dashboard tighter: 32–48px.

### Radius

- --r-sm: 6px
- --r: 10px     (default component)
- --r-lg: 16px
- --r-full: 999px

### Control Height (ONE shared token)

--control-h: 48px

Applies to: buttons, text inputs, selects, textareas (min), segmented controls, date pickers, all form fields.

### Elevation

- 0: surface
- 1: subtle drop `0 1px 2px rgba(12,17,24,0.04)`
- 2: cards `0 4px 12px rgba(12,17,24,0.06)`
- 3: floating `0 10px 30px rgba(12,17,24,0.10)`

## Components (built once from tokens)

All components inherit the single control height where interactive.

### Button

Base:
- height: 48px
- padding: 0 28px
- border-radius: 10px
- font: 600 15px / 1, tracking -0.01em
- transition: all 120ms ease

Variants:

**Primary**
- default: bg #FF2759, color #FFFFFF
- hover: #E51E4A
- active: #C4183D
- focus: 3px ring offset 2px #00BFFF
- disabled: opacity 0.4, no pointer

**Sky (secondary action)**
- default: bg #00BFFF, color #FFFFFF
- hover: #00A6D9

**Leaf**
- default: bg #00D68A, color #0C1118
- hover: #00B86F

**Outline**
- default: bg transparent, border 1.5px #0C1118, color #0C1118
- hover: bg #F7F8F6

**Ghost**
- default: transparent, color #475569
- hover: bg #F7F8F6, color #0C1118

### Input, Textarea, Select

- height: 48px (inputs/selects)
- padding: 0 16px
- border: 1.5px solid #E5E8E5
- border-radius: 10px
- bg: #FFFFFF
- font: 16px / 1.5
- placeholder: #94A3B8

States:
- hover: border #CBD2CC
- focus: border #00BFFF, box-shadow 0 0 0 3px rgba(0,191,255,0.12), ring visible
- disabled: bg #F7F8F6, color #94A3B8, border #E5E8E5
- error: border #FF2759

Textarea: min-height 120px, same radius and focus.

### Checkbox & Radio

- Size: 20×20px
- Border 1.5px #0C1118, radius 6px (checkbox) / 999px (radio)
- Checked: bg #00BFFF or #FF2759 (use sky for lists, pop for primary actions), white checkmark
- Focus: 3px ring offset 1px #00BFFF
- Disabled: muted

### Toggle / Switch

Track: 48px wide × 28px high, radius 999px, border #E5E8E5
Thumb: 22px circle, bg white
On: track bg #00D68A
Focus ring on thumb.

### Card

- bg #FFFFFF
- border-radius: 16px
- border: 1px solid #E5E8E5
- padding: 24px or 32px
- shadow: 0 4px 12px rgba(12,17,24,0.06)
- Hover lift (landing cards): translateY(-1px) + stronger shadow

### Badge

- height 28px
- px 12px
- radius 999px
- font 12px 600
- Sky: bg #E0F7FF color #006A8A
- Leaf: bg #E0F9EC color #006B3E
- Pop: bg #FFE1E7 color #8F0E2A
- Neutral: bg #F1F3F0 color #475569

### Nav / Tabs

- Bottom border or pill style on dashboard.
- Active: bold ink + underline or filled leaf/sky pill.
- Hover: muted ink.

### Table

- Header: 14px 600, #475569, surface-subtle bg, bottom border
- Cells: 16px, 48px row height, subtle dividers
- Hover row: #F7F8F6

### Focus Ring Rule (global)

Every interactive element receives a visible 3px ring in #00BFFF (offset 2px) on :focus-visible. Never rely on color change alone for focus.

## Layout Guidance

### Landing
- Full-bleed hero (100vh or min 680px), generous headline left or center-over-image.
- Content width: max 1280px, horizontal padding 48–80px.
- Sections use 2–4 column editorial grids with large gaps (48–64px).
- Imagery treated as full-bleed or edge-to-edge with breathing room above/below.
- Strong vertical rhythm. Headlines never cramped.

### Dashboard
- Top bar: 64px, fixed, surface + subtle border.
- Sidebar: 260px fixed, subtle border.
- Main: generous 40px padding.
- Cards and panels use 16px radius, consistent internal 20–24px padding.
- Data-dense areas use tighter 16px spacing between elements.
- All controls respect the 48px height.

## Surfaces

Both landing.html and dashboard.html are built from the exact same tokens and component definitions above. Color, type, radius, control height, states, and focus behavior are identical. No divergence.

The only differences are compositional: landing is expressive and full-bleed; dashboard is functional, information-dense, and task-oriented.

## Imagery

Hero and feature imagery use the same bright, graphic, clean, hopeful visual language — vivid color, open sky, strong upward lines, sophisticated composition. Images are generated to live inside the system without competing with it.

---

KODORI — one language, one name, two surfaces.
