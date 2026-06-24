# NOBORI

**Design Language — Kodomo no Hi (Koinobori)**  
One name. One language. Two surfaces.

---

## Philosophy / Point of View

NOBORI is the graphic language of ascent.

It takes the Koinobori — the carp streamers that rise on early-summer wind during Kodomo no Hi — and translates that motion into confident, grown-up product design. 

The feeling is bright, clear, and hopeful. Open white space, crisp daylight, and fresh greenery are the ground. Vivid, almost-neon highlighter colors (electric sky, fresh green, hot pop) are used sparingly like precise marker strokes on a clean page. 

Typography is strong and editorial. Layouts favor generous breathing room, confident asymmetry, and clear visual hierarchy. Components are reduced and precise; they feel alive only through accurate states and restrained motion.

NOBORI is never childish, never cluttered, never pastel. It is sleek, optimistic, and adult — a language for a product that celebrates growth, culture, and forward momentum.

---

## Design Tokens

### Color

```css
--nb-bg:            #FFFFFF;
--nb-surface:       #F7F9FC;
--nb-surface-2:     #EEF2F7;
--nb-text:          #0B111A;
--nb-text-muted:    #4A5568;
--nb-border:        #D8DFE8;

--nb-sky:           #00BFFF;   /* electric sky-blue highlighter */
--nb-green:         #00E68C;   /* fresh vivid green */
--nb-pop:           #FF2E7A;   /* hot pop magenta-pink */

--nb-shadow:        0 10px 30px -15px rgb(11 17 26 / 0.08);
--nb-shadow-sm:     0 2px 8px -2px rgb(11 17 26 / 0.06);
```

Usage: Base surfaces are always near-white. Accents used for emphasis, CTAs, progress, key labels. Never tint backgrounds with accent.

### Typography

```css
--nb-font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

--nb-display: 72px / 1.04;   font-weight: 700; letter-spacing: -0.045em;
--nb-h1:      48px / 1.08;   font-weight: 700; letter-spacing: -0.035em;
--nb-h2:      32px / 1.15;   font-weight: 700; letter-spacing: -0.025em;
--nb-h3:      22px / 1.25;   font-weight: 600; letter-spacing: -0.015em;
--nb-body:    17px / 1.65;   font-weight: 400;
--nb-small:   13px / 1.55;   font-weight: 400;
```

Body text always high contrast on white or light surface. Never light-on-light.

### Spacing

Base unit 8px. Generous application.

```css
--nb-space-1: 4px;
--nb-space-2: 8px;
--nb-space-3: 12px;
--nb-space-4: 16px;
--nb-space-5: 24px;
--nb-space-6: 32px;
--nb-space-7: 40px;
--nb-space-8: 48px;
--nb-space-9: 64px;
--nb-space-10: 80px;
```

Section padding: 80px–120px vertical. Cards use 24–32px internal.

### Radius

```css
--nb-r-sm: 6px;
--nb-r-md: 14px;
--nb-r-lg: 22px;
--nb-r-pill: 999px;
```

Never 0 or extreme unless pill. Cards and controls use md.

### ONE Shared Control Height

```css
--nb-control-h: 48px;
```

Applies to: buttons, text inputs, selects, textareas (min), date inputs, segmented controls, and any actionable form row.

Padding inside controls: 14px horizontal for text fields, 0 24px for primary buttons.

---

## Components — Built from Tokens + All States

### Button

Base: height 48px, border-radius 14px, font 15px/600, display inline-flex center.

**Variants:**

- **Primary** (`nb-btn--primary`): bg `--nb-pop`, color white.  
  Default: solid pop.  
  Hover: slightly darker pop (#E61A65).  
  Focus: 3px ring offset 2px in `--nb-pop` + slight lift.  
  Active: scale 0.985 + darker.  
  Disabled: 40% opacity, no hover, cursor default.

- **Secondary** (`nb-btn--secondary`): bg `--nb-surface`, color `--nb-text`, subtle border `--nb-border`.  
  Hover: surface-2.  
  Focus: ring in `--nb-sky`.  
  Active: surface.

- **Ghost** (`nb-btn--ghost`): transparent, color `--nb-text`.  
  Hover: light surface tint.  
  Focus: ring `--nb-green`.

- **Accent Sky / Green** used for supporting actions where pop would overwhelm.

All buttons use the single height. No smaller or taller variants.

### Text Input, Textarea, Select, Date

All height 48px (textarea min-height 120px but base row respects).

- bg white, border 1px `--nb-border`, radius 14px, padding 0 16px, font 16px.
- Placeholder: `--nb-text-muted`.
- Hover: border slightly stronger.
- **Focus (visible ring required)**: border color accent (sky for neutral, pop for primary fields), 3px solid ring offset 2px matching accent, box-shadow none or very light.
- Active (while typing): no change beyond focus.
- Disabled: bg surface-2, muted text, no ring, cursor not-allowed.
- Error state: border `--nb-pop`, small label below in pop.

Select uses native + custom chevron via background or adjacent SVG. Same states.

### Checkbox & Radio

- Size 20×20px, radius 6px (checkbox) / full (radio).
- Unchecked: border `--nb-border`, bg white.
- Checked: bg `--nb-sky` or `--nb-green`, border same, white check or dot.
- Focus: visible 3px ring offset 1px in accent.
- Hover: subtle border accent.
- Disabled: muted.

Label always 17px, same line height aligned.

### Toggle (switch)

Track: 52px × 28px, radius pill.
Knob: 22px, white with shadow.
On: track `--nb-green`.
Focus ring on container.

### Card

- bg `--nb-surface` or white.
- radius `--nb-r-md`.
- padding 28px.
- Optional left accent bar (4px) in sky / green / pop.
- Hover (interactive cards): translateY(-1px) + stronger shadow-sm.
- No heavy borders. Subtle divider lines only when needed.

### Progress / Lift indicators

- Bar: height 6px, radius 999px, track surface-2, fill uses sky/green/pop.
- Or radial: 48px circle using conic or two-tone accent.

### Navigation & Tabs

- Horizontal tabs: 48px height, bottom border or pill underline accent.
- Active tab: weight 600 + accent underline or bg surface + border accent.

### Table (dashboard)

- Clean rows, generous padding.
- Header: 13px uppercase tracking, muted.
- Hover row: very light surface tint.
- No vertical lines. Subtle horizontal.

---

## Layout Guidance

### Landing Page

- Fixed minimal nav, 80px tall, logo left + links + CTAs right.
- Full-bleed hero: viewport height, generous inner padding, large editorial headline (display or h1), supporting text 20px, two buttons (primary + ghost).
- Hero image: full bleed background or right 55% with overlay text left. Strong cropping, graphic power.
- Subsequent sections use 80–120px vertical rhythm.
- Feature blocks: 3-col or 2-col asymmetric. Big image + text stack. Headlines strong.
- Editorial "manifesto" block with large quote.
- Image grids or poster sections with one large + supporting.
- Final CTA band full width, strong pop button.

Never crowd. Always ≥ 64px gaps between major blocks. Use white.

### Dashboard

- Top bar: 64px, logo + primary nav (horizontal) + global search (48px input) + avatar.
- Main content padded 40px–48px.
- Welcome header: large greeting + short context line + season accent tag.
- Responsive 12-col grid.
- Primary content left 8-col: goal cards grid, data sections.
- Sidebar 4-col: upcoming, quick-add form, small chart.
- Cards use left accent bars or colored header labels.
- All data numbers bold, clean.
- Forms in sidebar and modals follow exact control height and ring states.
- Subtle dividers between groups. No visual noise.

Motion: 160–220ms ease-out on hovers, focus, card lifts. Respect reduced-motion.

---

## Surfaces

Both `landing.html` and `dashboard.html` use identical tokens, identical component definitions, and the same one control-height. The language reads as one continuous system.

- Landing expresses the brand emotionally and editorially.
- Dashboard applies the language to real work: tracking, adding, viewing — clean, fast, grown-up.

All form elements are styled explicitly. All interactive states are defined and implemented.

---

## Imagery

Hero and feature photography are generated to match: bright, open, crisp, graphic-quality images of koinobori in real early-summer light with fresh greenery. They are used full-bleed or contained without heavy frames. No illustration or hand-drawn marks except minimal UI SVGs.

---

**NOBORI — one language, rising.**
