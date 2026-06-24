# Aonobori Signal

Aonobori Signal is a bright, adult, early-summer product language for Kodomo no Hi: clear air, white civic space, green lift, koinobori rising like confident signal flags. It treats the festival as an operational force, not a decoration. The system is poster-led and product-ready: large editorial type, hard white negative space, precise highlighter color, and sleek controls that feel fast in the hand.

## Point of view

- **White is the weather.** Most screens are open white, with air between modules and very little visual container noise.
- **Koinobori becomes signal.** Carp streamers are expressed as diagonal flow bands, rising markers, wind lanes, and data ribbons.
- **Color is a highlighter, not wallpaper.** Electric sky blue, live leaf green, and one hot pop mark priority, movement, and action.
- **Grown-up festival energy.** The mood is hopeful and vivid without toy cues, soft pastels, crowded patterns, or mascot language.
- **Graphic confidence.** Composition may crop boldly, rotate lightly, and use oversized numerals, but the UI remains calm and usable.

## Core tokens

### Color

| Token | Value | Role |
|---|---:|---|
| `--paper` | `#FFFFFF` | primary field, cards, controls |
| `--paper-cool` | `#F7FFF9` | fresh section wash, never used behind low-contrast text |
| `--ink` | `#061015` | primary text, primary controls |
| `--ink-soft` | `#20343D` | secondary text |
| `--sky` | `#00A8FF` | electric blue signal, focus, links, positive movement |
| `--leaf` | `#21F26A` | fresh growth, completion, readiness |
| `--hot` | `#FF2D75` | urgent pop, primary CTA accent, sparing emphasis |
| `--sun` | `#D9FF32` | small highlight glints, not a text background unless paired with ink |
| `--mist` | `#EAF8FF` | low-pressure blue surface |
| `--shadow-ink` | `rgba(6, 16, 21, 0.14)` | elevation |
| `--sky-soft` | `rgba(0, 168, 255, 0.16)` | focus halo, ambient mark |
| `--hot-soft` | `rgba(255, 45, 117, 0.18)` | secondary focus halo |
| `--leaf-soft` | `rgba(33, 242, 106, 0.20)` | completion field |

Contrast rule: text is always `--ink` or `--ink-soft` on light fields, or `--paper` on `--ink`. Neon accents may sit behind text only when the text is `--ink` and the color is not washed out.

### Type

| Token | Value | Use |
|---|---|---|
| `--font-sans` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | product UI and body |
| `--font-display` | `Arial Black, Inter, ui-sans-serif, system-ui, sans-serif` | poster headlines, big numerals |
| `--tracking-display` | `-0.055em` | display compression |
| `--tracking-ui` | `0.02em` | labels, nav |
| `--text-xs` | `0.76rem` | metadata |
| `--text-sm` | `0.88rem` | compact UI |
| `--text-md` | `1rem` | forms, nav |
| `--text-lg` | `1.125rem` | body copy |
| `--text-xl` | `1.45rem` | card titles |
| `--text-2xl` | `2rem` | section titles |
| `--text-hero` | `clamp(3.4rem, 9vw, 9.2rem)` | landing headline |

Type behavior: display text is tight, black, and editorial. Body copy is 17px+ on marketing surfaces. Dashboard table text may go to 14.5px only where density is needed.

### Space

`--space-1: 4px`  
`--space-2: 8px`  
`--space-3: 12px`  
`--space-4: 16px`  
`--space-5: 24px`  
`--space-6: 32px`  
`--space-7: 48px`  
`--space-8: 72px`  
`--space-9: 104px`

Spacing is intentionally generous. Titles never touch container tops. Dense dashboard regions still keep at least `--space-4` between control rows and content groups.

### Radius and elevation

| Token | Value | Use |
|---|---:|---|
| `--radius-none` | `0` | poster bands, hard editorial crops |
| `--radius-md` | `16px` | cards, control groups |
| `--radius-lg` | `24px` | major panels, images |
| `--radius-pill` | `9999px` | controls, badges, segmented nav |
| `--shadow-card` | `0 24px 80px rgba(6, 16, 21, 0.12)` | floating cards |
| `--shadow-lift` | `0 18px 46px rgba(0, 168, 255, 0.20)` | highlighted actions |

No grey borders. Separation comes from white space, shadow, filled panels, and highlighter strips.

### Shared control height

`--control-height: 52px`

Every interactive control is built on this single height. Buttons, inputs, selects, search fields, date fields, segmented controls, and compact toggle rows all use `height` or `min-height: var(--control-height)`. Multi-line textareas use multiples of the same token: `min-height: calc(var(--control-height) * 2.45)`.

### Motion

- Fast UI motion: `160ms cubic-bezier(.2,.8,.2,1)`.
- Section and card motion: `420ms cubic-bezier(.16,1,.3,1)`.
- Hover lift is tiny: `translateY(-2px)` max.
- Respect `prefers-reduced-motion: reduce`; disable transforms and decorative drifting.

## Components built from tokens

### Buttons

Base: `height: var(--control-height)`, pill radius, 18px horizontal padding, bold UI label, no grey border.

- **Default primary:** `--ink` background, `--paper` text, hot/sky highlighter shadow.
- **Hover:** add a hot accent streak or lift shadow; never change to a low-contrast color.
- **Focus visible:** remove default outline and apply `0 0 0 4px var(--sky-soft), 0 0 0 7px var(--hot-soft)` plus an ink inset where needed.
- **Active:** `translateY(1px) scale(.99)`.
- **Disabled:** opacity `.42`, no transform, no shadow, cursor `not-allowed`.

### Fields

Applies to `input[type=text]`, `input[type=email]`, `input[type=search]`, `input[type=date]`, `input[type=number]`, `select`, and `textarea`.

- **Default:** white fill, ink text, subtle ink inset using box-shadow, pill radius for one-line fields, 24px radius for textarea.
- **Hover:** stronger ink inset and sky glow at low opacity.
- **Focus / focus-within:** visible sky + hot ring; label may turn ink or sky.
- **Active:** no layout shift; caret uses `--hot`.
- **Disabled:** cool white fill, reduced opacity, no pointer events.
- **Placeholder:** `rgba(32, 52, 61, .58)`.

`select` uses a custom chevron drawn with CSS background imagery. `textarea` is resizable vertically only.

### Checkboxes, radios, switches, and ranges

- Checkbox/radio controls are 22px marks inside a 52px tappable row.
- Checked state uses `--ink` fill with `--leaf` or `--sky` inner mark.
- Switches are 52px tall, pill radius, with a circular thumb and a sky/leaf active track.
- Range inputs use a 6px ink track and hot thumb; focus ring still uses the shared sky/hot halo.

### Cards and panels

Cards are white or `--paper-cool`, radius 24px, no borders, and deliberate spacing. Cards use large top padding and one vivid signal mark: a diagonal stripe, a small hot dot, a sky badge, or a leaf progress fill. Avoid repeating all three accents in every card.

### Navigation and tabs

Navigation is quiet: ink labels, plenty of air, one active highlighter pill. Tabs use the shared control height and pill radius. The active tab is ink-on-leaf or ink-on-sky; inactive tabs are white with an inset shadow.

### Tables and data blocks

Tables are dashboard-only. They use no grid borders. Rows separate by space, alternating white and cool fields, or by a left highlighter status rail. Minimum row text size is 14.5px. Status tags are high-contrast pills.

### Charts

Charts are graphic, not skeuomorphic. Use thick bars, diagonal flow lines, large numerals, and highlighter overlays. Avoid pale chart palettes; use ink, sky, leaf, and one hot exception.

## Layout guidance

### Landing surface

- Top hero is full-bleed and image-led.
- Hero content may overlap the image in a strong editorial block, but the image must remain the lead visual.
- Use oversized display type, diagonal signal bands, and large whitespace.
- Feature modules should read like a real product story: planning, wind windows, partner readiness, live public moments.
- Do not show token swatches, component galleries, or style specimens.

### Dashboard surface

- Dashboard is a real operator workspace for the same product world.
- Keep the white field and highlighter logic, but tighten spacing enough for operational density.
- Persistent navigation stays calm; live readiness, wind windows, inventory, field updates, and partner status carry the visual energy.
- Forms and filters must reuse the same controls and focus behavior from the landing page.

## Imagery direction

Generated imagery should be cohesive: high-key early-summer light, white negative space, koinobori as aerodynamic fabric/data ribbons, fresh green leaves, electric sky-blue highlighter marks, one hot coral-magenta pop, no readable text, no mascots, no toy style, no washed-out pastels.