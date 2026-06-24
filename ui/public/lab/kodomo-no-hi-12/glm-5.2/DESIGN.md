# Aozora — Design Language

> 青空 · "Blue Sky" — a design language inspired by Kodomo no Hi and the koinobori (carp streamer) festival. The sky holds everything; the streamers rise because the wind lifts them. Design creates the space for growth; content is what rises into it.

---

## 1. Philosophy & Point of View

**The sky is the canvas; the streamers are the content.**

Aozora is built on a single metaphor: the May sky above a Japanese home on Children's Day, where koinobori — carp streamers — catch the wind and climb. The sky is vast, open, and calm. The streamers are vivid, kinetic, and full of intent. Every surface in this system follows that division:

- **Space is primary.** Generous whitespace is not emptiness — it is the sky that gives meaning to what rises into it. We resist filling every pixel.
- **Content moves upward.** Hierarchy flows from bottom to top as naturally as it flows top to bottom. Progress, growth, and achievement are always visually ascendant.
- **Color is a highlighter, not a wash.** The palette draws from the traditional koinobori: sapphire blue (the sky), koi red (the mother carp), gold (the child's strength), and deep indigo (the father carp / the night sky). These colors appear as accents against white — never as full-bleed backgrounds.
- **Celebration is a feature, not a decoration.** Milestones, completions, and achievements get visual weight. The system celebrates progress the way the festival celebrates children.
- **No borders.** Separation comes from space, color, and elevation — never from lines. The sky has no fences.

---

## 2. Color Tokens

### Primary

| Token | Value | Usage |
|---|---|---|
| `--aozora-sky` | `#0B5FFF` | Primary actions, links, active states, key accents |
| `--aozora-deep` | `#0A1B3D` | Dark surfaces, footer, high-contrast text on light |
| `--aozora-koi` | `#E8483B` | Celebration, alerts, milestone markers, accent highlights |
| `--aozora-gold` | `#F5A623` | Achievement badges, progress highlights, warm accents |

### Neutrals

| Token | Value | Usage |
|---|---|---|
| `--aozora-cloud` | `#FFFFFF` | Page backgrounds, card surfaces |
| `--aozora-mist` | `#F0F5FF` | Subtle section backgrounds, hover states |
| `--aozora-ink` | `#0F172A` | Primary body text, headings |
| `--aozora-slate` | `#64748B` | Secondary text, captions, metadata |
| `--aozora-slate-light` | `#94A3B8` | Tertiary text, placeholders, disabled labels |

### Semantic

| Token | Value | Usage |
|---|---|---|
| `--aozora-success` | `#16A34A` | Success states, completed goals |
| `--aozora-warning` | `#F5A623` | Warning states (shares gold) |
| `--aozora-error` | `#E8483B` | Error states (shares koi red) |
| `--aozora-info` | `#0B5FFF` | Info states (shares sky blue) |

### Control-surface tokens

| Token | Value | Usage |
|---|---|---|
| `--aozora-control-bg` | `#FFFFFF` | Default control background |
| `--aozora-control-bg-hover` | `#F0F5FF` | Hover background |
| `--aozora-control-bg-active` | `#E0EAFF` | Active/pressed background |
| `--aozora-control-bg-disabled` | `#F1F5F9` | Disabled background |
| `--aozora-control-border` | `transparent` | We use no borders; separation via space and fill |
| `--aozora-focus-ring` | `#0B5FFF` | Focus ring color (3px outline, 2px offset) |
| `--aozora-focus-ring-offset` | `2px` | Gap between control and ring |

---

## 3. Typography

### Font families

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `'Bricolage Grotesque', sans-serif` | Headings, hero text, display numbers |
| `--font-body` | `'Inter', sans-serif` | Body text, UI labels, controls, everything else |

### Type scale

| Token | Size | Line height | Weight | Letter spacing | Usage |
|---|---|---|---|---|---|
| `--text-display` | `64px` | `1.05` | 700 | `-0.03em` | Hero headline |
| `--text-h1` | `48px` | `1.1` | 700 | `-0.02em` | Page titles |
| `--text-h2` | `36px` | `1.15` | 600 | `-0.02em` | Section titles |
| `--text-h3` | `28px` | `1.2` | 600 | `-0.01em` | Subsection titles |
| `--text-h4` | `22px` | `1.3` | 600 | `-0.01em` | Card titles |
| `--text-body-lg` | `19px` | `1.6` | 400 | `0` | Lead paragraphs |
| `--text-body` | `17px` | `1.6` | 400 | `0` | Default body |
| `--text-body-sm` | `15px` | `1.5` | 400 | `0` | Secondary body, table cells |
| `--text-label` | `14px` | `1.4` | 600 | `0.01em` | Control labels, tags |
| `--text-caption` | `13px` | `1.4` | 400 | `0.02em` | Captions, metadata |
| `--text-micro` | `12px` | `1.3` | 600 | `0.04em` | Micro labels, overlines |

---

## 4. Spacing

Based on an 8px grid. All spacing is multiples of 8.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Tight gaps (icon-text) |
| `--space-2` | `8px` | Small gaps |
| `--space-3` | `12px` | Compact padding |
| `--space-4` | `16px` | Default small spacing |
| `--space-5` | `20px` | Control padding |
| `--space-6` | `24px` | Card padding |
| `--space-8` | `32px` | Section internal spacing |
| `--space-10` | `40px` | Between cards |
| `--space-12` | `48px` | Section vertical spacing |
| `--space-16` | `64px` | Large section spacing |
| `--space-20` | `80px` | Section padding |
| `--space-24` | `96px` | Hero spacing |
| `--space-32` | `128px` | Max section spacing |

---

## 5. Radius

Only four values are allowed:

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `0px` | Tags, chips, inline badges |
| `--radius-md` | `16px` | Buttons, inputs, controls, small cards |
| `--radius-lg` | `24px` | Cards, panels, modals |
| `--radius-full` | `9999px` | Avatars, pills, circular elements |

---

## 6. Control Height

**One shared control-height token governs every interactive control.**

| Token | Value | Usage |
|---|---|---|
| `--control-height` | `44px` | Buttons, inputs, selects, toggles — all form controls |

This ensures every control sits on the same baseline regardless of type. Padding varies, but height is constant. The focus ring wraps this height with a 2px offset.

---

## 7. Components

### Button

States: default / hover / focus / active / disabled

- **Default**: `--aozora-sky` background, `--aozora-cloud` text, `--radius-md`, `--control-height`, horizontal padding `--space-5`, `--font-body` at `--text-label` weight 600
- **Hover**: darken background 8% (`#0A52E0`), slight lift (`translateY(-1px)`)
- **Focus**: 3px solid `--aozora-focus-ring` outline at 2px offset — visible ring always
- **Active**: darken 12% (`#0948B8`), `translateY(0)`, inset feel
- **Disabled**: `--aozora-slate-light` background, `--aozora-cloud` text at 60% opacity, no pointer events

Variants: primary (sky), secondary (mist bg, ink text), ghost (transparent, sky text), danger (koi red)

### Input / Text Field

States: default / hover / focus / active / disabled

- **Default**: `--aozora-cloud` background, `--radius-md`, `--control-height`, horizontal padding `--space-4`, `--text-body`, `--aozora-ink` text, `--aozora-slate-light` placeholder
- **Hover**: background `--aozora-mist`
- **Focus**: background `--aozora-cloud`, 3px `--aozora-focus-ring` outline at 2px offset
- **Active**: same as focus
- **Disabled**: `--aozora-control-bg-disabled`, text at 50% opacity, no pointer events

### Select

Same as input, with a custom chevron SVG mark. Dropdown panel: `--aozora-cloud` bg, `--radius-lg`, `--space-2` internal padding, option hover `--aozora-mist`.

### Textarea

Same as input but `min-height: 120px`, vertical resize only, `--radius-md`.

### Checkbox

- **Default**: 20×20px, `--radius-sm` (0px — square for distinction), `--aozora-cloud` bg, subtle inset shadow
- **Checked**: `--aozora-sky` bg, white checkmark SVG
- **Focus**: 3px ring at 2px offset
- **Disabled**: `--aozora-control-bg-disabled`, checkmark at 50% opacity

### Radio

- **Default**: 20×20px circle, `--aozora-cloud` bg, 2px `--aozora-slate-light` ring
- **Selected**: `--aozora-sky` fill in center dot, `--aozora-sky` ring
- **Focus**: 3px `--aozora-focus-ring` outline at 2px offset
- **Disabled**: `--aozora-control-bg-disabled`

### Toggle / Switch

- **Default**: 44×24px pill (`--radius-full`), `--aozora-slate-light` track, white knob
- **On**: `--aozora-sky` track, knob slides right
- **Focus**: 3px ring at 2px offset around the track
- **Disabled**: `--aozora-control-bg-disabled` track, 50% opacity

### Slider / Range

- Track: 4px height, `--aozora-mist` base, `--aozora-sky` fill
- Knob: 20×20px circle, `--aozora-sky`, white ring
- Focus: 3px `--aozora-focus-ring` outline at 2px offset on knob

### Progress Bar

- Track: 8px height, `--aozora-mist`, `--radius-full`
- Fill: `--aozora-sky` (or `--aozora-gold` for milestone progress), `--radius-full`
- Animated width transition on value change

### Badge / Tag

- `--radius-sm` (0px), `--text-label`, horizontal padding `--space-3`, vertical `--space-1`
- Variants: sky (mist bg, sky text), koi (rgba red bg, koi text), gold (rgba gold bg, gold text), slate (mist bg, slate text)

### Card

- `--aozora-cloud` bg, `--radius-lg`, padding `--space-6`, no border
- Separation from surroundings via spacing and subtle elevation (shadow only on hover)
- Hover: subtle shadow `0 8px 24px rgba(10,27,61,0.08)`

### Avatar

- `--radius-full`, 40px default, `--aozora-mist` bg, `--aozora-ink` initials
- Sizes: sm (28px), md (40px), lg (56px)

### Navigation Tab

- `--text-label`, padding `--space-3` horizontal `--space-2` vertical
- Active: `--aozora-ink` text, 3px `--aozora-sky` underline
- Inactive: `--aozora-slate` text
- Hover: `--aozora-ink` text

---

## 8. Layout Guidance

### Grid

- Max content width: `1200px`, centered
- Page padding: `--space-6` on mobile, `--space-12` on desktop
- Card grid: `repeat(auto-fill, minmax(320px, 1fr))`, gap `--space-6`

### Section rhythm

- Section vertical padding: `--space-20` minimum
- Between heading and body: `--space-6`
- Between cards: `--space-6`
- Between major sections: `--space-20` to `--space-32`

### Vertical flow

Content flows upward in meaning: the most important action or state is at the top. Progress bars fill left-to-right but milestone lists stack bottom-to-top (earliest at the bottom, latest at the top) to reinforce the "rising" metaphor.

### Color application

- Page background: `--aozora-cloud` (white)
- Section alternation: `--aozora-cloud` and `--aozora-mist`
- Dark surfaces (footer, sidebar): `--aozora-deep`
- Accent colors used sparingly — never more than 3 visible on a single screen section

---

## 9. Motion

- `prefers-reduced-motion` respected; all animations disabled when set
- Default easing: `cubic-bezier(0.22, 1, 0.36, 1)` — a gentle lift
- Hover transitions: 150ms
- Page/section transitions: 300ms
- Progress bar fill: 600ms with the lift easing

---

## 10. Iconography

- Small UI marks only as inline SVG (chevrons, checkmarks, arrows, etc.)
- 20×20px stroke icons, 2px stroke, `currentColor`
- No icon fonts, no emoji on buttons or in UI labels
