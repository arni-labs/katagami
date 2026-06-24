# Nobori — Design Language

**Nobori** (昇り, "rising") is a design language born from Kodomo no Hi — the Japanese
festival of children and rising carp streamers. It captures the feeling of early summer:
clear light, fresh wind, and the upward surge of koinobori against an open sky.

The language is **graphic, editorial, and grown-up** — a product language for adults, not a
children's theme. It uses generous white space as its canvas, then deploys vivid, almost-neon
accents like highlighter marks: electric sky-blue, fresh green, and a single hot coral pop.
Type is bold and declarative. The result is bright, airy, and confident — never muddy, never
pastel, never cluttered.

---

## Philosophy / Point of View

1. **White is the canvas.** Open space is the primary material. Content breathes. Nothing is
   crammed. Padding and margins are generous; titles never touch container tops.

2. **Three accents, used like highlighters.** Electric sky-blue carries interaction and
   structure. Fresh green signals success, growth, and positive state. Coral is the hot pop —
   used sparingly for CTAs, critical data, and moments that demand attention. Never more than
   three accent colors on screen at once.

3. **Type leads.** Display type is large, tight, and declarative — editorial-scale headings
   that command the page. Body type is clean and readable at 17px+. No type below 12px.

4. **Flat, no shadows.** Depth comes from color contrast and spatial arrangement, not from
   box-shadows or elevation. The language is graphic and two-dimensional by conviction.

5. **One control height.** Every interactive control — buttons, inputs, selects — sits on a
   shared 44px height. This creates a rigid, satisfying horizontal rhythm across all surfaces.

6. **Visible focus always.** Every interactive element has a 2px offset focus ring in
   accent-sky. No focus state is ever hidden or suppressed.

7. **Grown-up, not childish.** Kodomo no Hi is the inspiration, not the literal subject. The
   language is sleek, clean, and product-grade — something an adult would launch, not a toy.

---

## Color Tokens

| Token             | Hex       | Role                                      |
|-------------------|-----------|-------------------------------------------|
| `bg-primary`      | `#FFFFFF` | Page background                           |
| `bg-surface`      | `#F8F7F5` | Card, panel, and raised surface background |
| `text-primary`    | `#1A1A1A` | Primary body text, headings                |
| `text-secondary`  | `#6B6B6B` | Secondary text, descriptions               |
| `text-tertiary`   | `#9E9E9E` | Placeholder, disabled, metadata            |
| `accent-sky`      | `#00A8FF` | Primary interactive, links, focus rings    |
| `accent-green`    | `#00E85C` | Success, positive, growth                  |
| `accent-coral`    | `#FF4D3A` | CTAs, critical, hot emphasis               |
| `border-subtle`   | `#E8E6E1` | Dividers, input borders, subtle separation |
| `focus-ring`      | `#00A8FF` | Focus ring color (same as accent-sky)      |

**Contrast guarantees:**
- `text-primary` (#1A1A1A) on `bg-primary` (#FFFFFF): ratio 15.4:1 (AAA)
- `text-secondary` (#6B6B6B) on `bg-primary` (#FFFFFF): ratio 5.2:1 (AA)
- `text-primary` on `bg-surface` (#F8F7F5): ratio 14.8:1 (AAA)
- `accent-sky` (#00A8FF) on `bg-primary`: ratio 3.1:1 — used only for UI chrome, never body text
- `accent-coral` (#FF4D3A) on `bg-primary`: ratio 4.0:1 — used only for large CTAs and emphasis
- `text-tertiary` (#9E9E9E) on `bg-primary`: ratio 2.9:1 — used only for placeholder/decorative text

---

## Typography

**Typeface:** Inter (variable), served from Google Fonts.

| Token        | Size / Line-height | Weight | Letter-spacing | Use                           |
|--------------|---------------------|--------|----------------|-------------------------------|
| `display`    | 72px / 0.88        | 700    | -0.02em        | Hero headlines, page titles   |
| `h1`         | 48px / 1.1         | 700    | -0.02em        | Section titles                |
| `h2`         | 36px / 1.15        | 700    | -0.015em       | Subsection titles             |
| `h3`         | 24px / 1.25        | 600    | -0.01em        | Card titles, panel headers    |
| `body-lg`    | 18px / 1.6         | 400    | 0              | Large body, lead paragraphs   |
| `body`       | 17px / 1.55        | 400    | 0              | Standard body text            |
| `body-sm`    | 14px / 1.5         | 400    | 0              | Secondary body, table cells   |
| `caption`    | 12px / 1.4         | 500    | 0.02em         | Metadata, timestamps          |
| `label`      | 13px / 1.3         | 600    | 0.03em         | Form labels, UPPERCASE        |

---

## Spacing Scale

Base unit: 4px.

| Token | Value | Use                                  |
|-------|-------|--------------------------------------|
| 0     | 0     | Flush edges                          |
| 1     | 4px   | Tight gaps, icon-to-label            |
| 2     | 8px   | Inline gaps, compact padding         |
| 3     | 12px  | Internal card padding (compact)      |
| 4     | 16px  | Standard gap, card padding           |
| 5     | 20px  | Section gap (small)                  |
| 6     | 24px  | Section padding, card gap            |
| 8     | 32px  | Large section gap                    |
| 10    | 40px  | Section top/bottom padding           |
| 12    | 48px  | Major section padding                |
| 16    | 64px  | Hero padding, page-level spacing     |
| 20    | 80px  | Page-section separation              |
| 24    | 96px  | Large page-section separation        |
| 32    | 128px | Maximum spacing                      |

---

## Border Radius

| Token  | Value  | Use                                      |
|--------|--------|------------------------------------------|
| `none` | 0      | Default — most elements                  |
| `md`   | 16px   | Cards, panels, modals                    |
| `lg`   | 24px   | Large containers, hero image masks       |
| `full` | 9999px | Pills, badges, toggle chips, avatars     |

---

## Shared Control Height

**44px** — every interactive control uses this exact height:
- Buttons (all variants)
- Text inputs
- Select dropdowns
- Textareas (min-height, not fixed)
- Toggle chips / pills

This creates a rigid horizontal rhythm. Controls align perfectly when placed side by side.

---

## Component Library

### Button

```
Height: 44px
Padding: 0 24px
Radius: full (pill shape)
Font: label token (13px, 600, 0.03em, uppercase)
Border: none
Cursor: pointer
Transition: all 150ms ease
```

**Variants:**

| Variant   | Background      | Text color      | Border                          |
|-----------|-----------------|-----------------|---------------------------------|
| primary   | accent-coral    | #FFFFFF         | none                            |
| secondary | transparent     | text-primary    | 1.5px solid border-subtle       |
| ghost     | transparent     | accent-sky      | none                            |
| success   | accent-green    | #FFFFFF         | none                            |

**States (all variants):**

| State       | Visual change                                                    |
|-------------|------------------------------------------------------------------|
| default     | As above                                                         |
| hover       | Brightness reduced to 92% (primary/success), bg-surface (secondary/ghost) |
| focus-visible | 2px solid focus-ring offset by 2px, border-radius: full         |
| active      | Brightness reduced to 88% (primary/success), bg: #EEECE8 (secondary/ghost) |
| disabled    | Opacity 0.4, cursor: not-allowed, no hover/active/focus effects |

### Text Input

```
Height: 44px
Padding: 0 16px
Font: body token (17px, 400)
Background: bg-primary
Border: 1.5px solid border-subtle
Radius: md (16px)
Color: text-primary
Transition: border-color 150ms ease, box-shadow 150ms ease
```

| State          | Visual change                                              |
|----------------|------------------------------------------------------------|
| default        | As above                                                   |
| hover          | border-color: accent-sky at 40% opacity                    |
| focus-visible  | border-color: focus-ring, box-shadow: 0 0 0 3px rgba(0,168,255,0.15), outline: none |
| active         | Same as focus-visible (input is focused)                   |
| disabled       | Opacity 0.4, bg: bg-surface, cursor: not-allowed           |
| placeholder    | color: text-tertiary, font-style: italic                   |

### Select

Same as Text Input, plus:
- Custom chevron icon (SVG, 16px, text-secondary) positioned right 16px
- Native select hidden; custom dropdown trigger
- Options panel: bg-primary, border: 1.5px solid border-subtle, radius: md, max-height: 264px (6 × 44px), overflow-y: auto
- Option items: height 44px, padding 0 16px, font: body, hover: bg-surface

### Textarea

```
Min-height: 44px (single line), expands
Padding: 12px 16px
Font: body token (17px, 400)
Background: bg-primary
Border: 1.5px solid border-subtle
Radius: md (16px)
Color: text-primary
Resize: vertical
```

States identical to Text Input.

### Checkbox / Radio

```
Size: 20px × 20px
Border: 1.5px solid border-subtle
Radius: 4px (checkbox), full (radio)
Background: bg-primary
```

| State          | Visual change                                                    |
|----------------|------------------------------------------------------------------|
| default        | As above                                                         |
| hover          | border-color: accent-sky at 40% opacity                          |
| focus-visible  | 2px solid focus-ring offset by 2px, border-radius: 4px / full    |
| checked        | bg: accent-sky, border-color: accent-sky, white checkmark/dot    |
| disabled       | Opacity 0.4, cursor: not-allowed                                 |

### Toggle Switch

```
Width: 44px, Height: 24px
Track radius: full
Thumb: 18px circle, white, drop-shadow
```

| State          | Visual change                                          |
|----------------|--------------------------------------------------------|
| off            | Track: border-subtle, Thumb: white                     |
| off:hover      | Track: #D5D3CE                                        |
| off:focus      | 2px focus-ring offset 2px                              |
| on             | Track: accent-sky, Thumb: white (right-aligned)        |
| on:hover       | Track brightness 92%                                   |
| disabled       | Opacity 0.4, cursor: not-allowed                       |

### Badge / Pill

```
Height: 24px (compact badge, not on the 44px grid)
Padding: 0 12px
Font: caption token (12px, 500, 0.02em)
Radius: full
```

| Variant  | Background              | Text color       |
|----------|-------------------------|------------------|
| neutral  | bg-surface              | text-secondary   |
| sky      | accent-sky at 12% alpha | accent-sky       |
| green    | accent-green at 12% alpha | accent-green   |
| coral    | accent-coral at 12% alpha | accent-coral   |

### Divider

```
Height: 1px
Background: border-subtle
Margin: spacing-4 (16px) vertical
```

### Card

```
Background: bg-surface
Radius: md (16px)
Padding: spacing-6 (24px)
Border: none
```

---

## Layout Guidance

### Page Structure

- **Max content width:** 1200px, centered with auto margins
- **Page padding:** 32px left/right on desktop, 16px on mobile (<768px)
- **Section vertical padding:** spacing-20 (80px) default, spacing-32 (128px) for hero sections

### Grid

- 12-column grid for dashboard layouts
- Column gap: spacing-6 (24px)
- Row gap: spacing-6 (24px)

### Responsive Breakpoints

| Breakpoint | Width    | Behavior                                    |
|------------|----------|---------------------------------------------|
| mobile     | < 768px  | Single column, reduced type scale, 16px pad |
| tablet     | 768-1023 | 2-column where applicable                   |
| desktop    | ≥ 1024px | Full multi-column, full type scale          |

### Typography Hierarchy Rules

1. One `display` per page (hero headline)
2. `h1` for major sections
3. `h2` for subsections
4. `h3` for cards and panels
5. Body text always `body` (17px) or `body-lg` (18px) for lead paragraphs
6. Never skip heading levels

### Color Usage Rules

1. `accent-coral` reserved for primary CTAs and critical data points only — never for decoration
2. `accent-sky` is the workhorse: links, focus rings, active states, data visualization primary
3. `accent-green` for success states, positive metrics, completion indicators
4. Never use accent colors on body text — only on UI chrome, data viz, and interactive elements
5. Maximum 3 accent colors visible on any single screen

### Imagery

- Full-bleed hero images with no borders or frames
- Feature images float in open white space
- No image borders, no drop shadows on images
- Images may use `radius: lg` (24px) for contained placement

---

## Form Layout

- Labels above inputs, using `label` token (13px, 600, uppercase, 0.03em)
- Label-to-input gap: spacing-2 (8px)
- Input-to-input gap: spacing-4 (16px)
- Error messages below input, `body-sm`, accent-coral
- Helper text below input, `caption`, text-tertiary

---

## Data Visualization (Dashboard)

- Chart accent order: accent-sky, accent-green, accent-coral
- Gridlines: border-subtle at 50% opacity
- Axis labels: caption token, text-secondary
- Data labels: body-sm token, text-primary
- No chart borders, no chart backgrounds (transparent on bg-primary)
- Legend: inline, body-sm, text-secondary

---

## Iconography

- SVG icons only, 20px default size
- Stroke width: 2px
- Color: currentColor (inherits from parent text color)
- Icon-button hit area: 44px × 44px (on the control height grid)