# Koinagare

**One original design language for Kodomo no Hi — the carp streamer festival.**

Koinagare (鯉流れ) — “carp flow”.

## Philosophy & Point of View

Koinagare is the feeling of silk banners catching a steady spring wind and rising with quiet power. It is light without being fragile, optimistic without noise, and precise without coldness.

The language treats upward motion as the primary structural idea. Vertical rhythm, gentle directional curves, generous breathing room, and color used like fabric flags against open sky. Restraint and celebration sit together: clean surfaces and paper warmth hold bright banner accents (blue, red, green, gold) that arrive only where they lift the moment.

Core principles:
- Flow, not weight. Every element suggests movement — soft radii, directional alignment, lifted cards, trailing space.
- Sky first. Vast calm grounds (warm paper and pure white) let the streamers (accent colors) read true.
- One height. All controls share a single 48 px height so rhythm stays predictable and human.
- Visible lift. Focus is a confident, high-contrast ring. Hover adds subtle rise. Active is a clear press. Disabled is calm, never muddy.
- Festival clarity. High contrast always. No light-on-light or dark-on-dark text. Color is never decoration; it carries meaning.

Koinagare is built once. Landing and dashboard are different densities of the same system.

## Tokens

All values are the source of truth. Every component, landing, and dashboard references these tokens only.

### Color (CSS custom properties)

```css
--color-bg: #F8F5EF;           /* warm paper ground */
--color-surface: #FFFFFF;
--color-surface-2: #F1EDE4;    /* soft warm layer */
--color-ink: #0E1B2B;          /* deep navy-ink for primary text */
--color-ink-muted: #4A5568;    /* readable secondary */
--color-blue: #2A6A9C;         /* primary koi blue — main action */
--color-blue-light: #4A8DC2;   /* hover lift */
--color-red: #C94F3A;          /* banner red — emphasis & warmth */
--color-green: #3F7A55;        /* koi green — success & growth */
--color-gold: #C5A05A;         /* tassel gold — celebration accent */
--color-sky: #D4E6F5;          /* very light sky for subtle fills */
--color-border-subtle: #D9D3C7;
--color-focus-ring: #2A6A9C;   /* always matches primary blue */
--color-white: #FFFFFF;
```

Usage rules:
- Backgrounds and large surfaces use --color-bg, --color-surface, --color-surface-2.
- Primary text: --color-ink on light grounds.
- Action and primary links: --color-blue.
- Celebration / important CTAs can use --color-red or --color-gold sparingly.
- Success states: --color-green.
- Never tint text with low opacity on colored grounds.

### Typography

Single font family with weight and size variation.

```css
--font-sans: system-ui, -apple-system, "Segoe UI", "Noto Sans JP", Roboto, "Helvetica Neue", sans-serif;
```

Size & line-height scale (px values for precision):

- --text-xs: 12px / 16px
- --text-sm: 14px / 20px
- --text-base: 16px / 24px   (body)
- --text-lg: 18px / 26px
- --text-xl: 20px / 28px
- --text-2xl: 24px / 30px
- --text-3xl: 30px / 36px
- --text-4xl: 38px / 44px
- --text-5xl: 48px / 54px
- --text-6xl: 60px / 66px   (hero display)

Weights:
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700 (used sparingly for display)

Letter-spacing:
- Body: 0
- Display / headings (≥24px): -0.01em to -0.02em
- Buttons & labels: 0.01em

### Spacing (vertical & horizontal rhythm)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 40px;
--space-9: 48px;
--space-10: 64px;
--space-11: 80px;
--space-12: 96px;
```

Section vertical rhythm on landing: --space-10 or --space-11 between major blocks. Cards and dashboard use --space-6 / --space-7 inside.

### Radius

```css
--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 20px;
--radius-xl: 28px;
--radius-full: 9999px;
```

Default component radius: --radius-md. Cards and larger surfaces: --radius-lg. Hero and full-bleed elements can use 0.

### Elevation (shadows)

- Resting surface: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 10px rgb(0 0 0 / 0.03)
- Lifted (hover / card): 0 4px 12px rgb(0 0 0 / 0.06), 0 12px 28px rgb(0 0 0 / 0.05)
- Modal: 0 10px 40px rgb(0 0 0 / 0.12), 0 30px 80px rgb(0 0 0 / 0.08)

### Control Height (single source)

```css
--control-h: 48px;
```

This token governs **every** interactive control:
- Buttons (all variants)
- Text inputs, textareas (min-height), selects
- Checkboxes / radios (visual size scaled to match visual weight)
- Switches / toggles
- Segmented controls, pills used as buttons

Padding inside controls: horizontal 18px for buttons/inputs. Vertical padding is implicit via height + line-height centering.

### Motion & Timing

- Hover lift: 120ms ease
- Press / active: 80ms ease
- Focus ring appear: 0ms (instant)
- Page section transitions and card entrance: 200ms ease-out
- Never animate layout changes that affect reading flow on dashboard.

## Components

All components are built from the tokens above. No magic numbers.

### Buttons

Base (all):
- height: var(--control-h)
- border-radius: var(--radius-md)
- font-weight: 600
- font-size: 15px
- letter-spacing: 0.01em
- padding: 0 20px
- transition: all 120ms ease
- display: inline-flex; align-items: center; justify-content: center; gap: 8px

Primary (blue):
- bg: var(--color-blue)
- color: white
- border: none
Hover: bg: var(--color-blue-light); transform: translateY(-1px)
Focus: outline: none; box-shadow: 0 0 0 3px var(--color-focus-ring), 0 0 0 6px rgba(255,255,255,0.9) (offset visible ring)
Active: transform: translateY(0); filter: brightness(0.96)
Disabled: opacity: 0.5; pointer-events: none

Secondary (outline on surface):
- bg: transparent
- color: var(--color-ink)
- border: 1.5px solid var(--color-border-subtle)
Hover: border-color: var(--color-blue); color: var(--color-blue); bg: rgba(42,106,156,0.04)
Focus: same ring treatment as primary
Active: bg: rgba(42,106,156,0.08)
Disabled: same

Ghost:
- bg: transparent
- color: var(--color-ink-muted)
- border: none
Hover: bg: var(--color-surface-2); color: var(--color-ink)
Focus: ring
Active: bg: var(--color-border-subtle)
Disabled: opacity 0.5

Red emphasis (for key destructive or warm actions):
- bg: var(--color-red)
- color: white
- same states as primary, hover shifts slightly warmer

### Form Controls — All sit on --control-h

Text Input, Select:
- height: var(--control-h)
- border-radius: var(--radius-md)
- border: 1.5px solid var(--color-border-subtle)
- background: var(--color-surface)
- color: var(--color-ink)
- padding: 0 16px
- font-size: 15px
- transition: border-color 120ms, box-shadow 120ms
Hover: border-color: #C8C0B0
Focus: border-color: var(--color-blue); box-shadow: 0 0 0 3px rgba(42,106,156,0.18); outline: none
Disabled: bg: var(--color-surface-2); color: var(--color-ink-muted); border-color: var(--color-border-subtle); cursor: not-allowed

Textarea:
- min-height: 120px
- padding: 14px 16px
- same border / focus treatment
- resize: vertical

Checkbox (custom):
- 20×20px square (visually balanced with 48px controls)
- border: 1.5px solid var(--color-border-subtle)
- border-radius: var(--radius-sm)
- background: var(--color-surface)
- checked: bg: var(--color-blue); border-color: var(--color-blue); color: white (use check SVG inline)
- Focus: 0 0 0 3px rgba(42,106,156,0.18)
- Hover: border-color: var(--color-blue)

Radio:
- 20px diameter circle
- same states

Switch / Toggle:
- track: 48px wide × 28px tall, radius-full, bg: var(--color-surface-2), border 1px solid var(--color-border-subtle)
- thumb: 22px circle, white, shadow
- on: track bg: var(--color-blue)
- focus ring around the whole control
- smooth 160ms ease slide

All labels: 14px, 600 weight, color var(--color-ink), margin-bottom 6px.

Help text / error: 13px, muted or red.

### Cards

Base card:
- bg: var(--color-surface)
- border-radius: var(--radius-lg)
- box-shadow: resting elevation
- border: 1px solid var(--color-border-subtle)   [very light]
- padding: var(--space-6) or var(--space-7)

Lifted / feature card on landing:
- same + hover: stronger shadow + tiny translateY(-1px)

On dashboard: tighter padding var(--space-5) inside when dense.

### Badges / Pills

- height: 28px
- px: 12px
- font-size: 12px
- font-weight: 600
- border-radius: var(--radius-full)
- variants: blue (soft bg #E6EEF7 + ink blue), red, green, gold, neutral (surface-2 + muted)
- no borders

### Navigation & Tabs

Top nav (landing + dashboard):
- height 72px on landing, 64px on dashboard
- bg: rgba(255,255,255,0.92) or solid surface with subtle border-bottom
- logo: semibold 21px, ink
- links: 15px medium, hover color blue

Tabs:
- height matches control
- inactive: muted ink + bottom border subtle
- active: blue ink + 2px blue underline
- focus ring on the tab pill

### Tables (dashboard)

- header: 13px semibold, muted, uppercase tracking
- rows: 48px min height, subtle bottom border
- hover row: bg surface-2
- zebra optional: very light surface-2 on alternate
- numeric right aligned
- first column can be avatar + name

### Avatars

- 40px or 48px (dashboard uses 40px)
- border-radius: var(--radius-full)
- ring: 2px white + subtle border
- fallback initials centered, medium weight

### Progress / Streamer visual

Use a simple horizontal bar or stacked vertical “height” marker using the banner colors. Height expressed with colored segments or filled bar using --color-blue / red / green.

## Layout Guidance

### Landing (expressive)
- Full-bleed hero, no top padding on image.
- Content max-width 1080–1120px centered.
- Generous vertical space: major sections separated by --space-11 / --space-12.
- Feature blocks: two-column or 3-column grid at --space-7 gap.
- Imagery: full-width or contained with --radius-lg, never framed like specimens.
- CTA buttons always use primary height token.
- Footer: tight, simple, 80px tall.

### Dashboard (productive)
- Fixed top nav 64px.
- Sidebar (optional, 240px) or top secondary nav.
- Main content max-width 1200px, generous side padding.
- Cards sit in grids with --space-6 gap.
- Controls remain 48px high even when dense.
- Lists use 48–56px row height.
- Modals are --radius-lg, max-w 520px, centered, with focus trap implied by design.

### Responsive
- Breakpoints: 640, 1024, 1280.
- On mobile: control height remains 48px (touch friendly), stack grids, reduce display sizes by one step.

### Accessibility notes (internal)
- All controls have visible focus ring of at least 3px using primary blue.
- Text contrast minimum 4.5:1 (ink on paper is ~18:1).
- No state communicated by color alone.
- Interactive elements never rely on hover only.

Koinagare is complete when both surfaces use only these tokens, every control is 48px tall with all five states, and the visual language of wind-lifted banners is felt but never explained.