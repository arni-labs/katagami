# Koinobori

A design language for Kodomo no Hi — the Japanese Children's Day / Koinobori festival.

## POV

Koinobori treats the festival as a grown-up public celebration: bright, airy, and hopeful early-summer. The signature mechanic is **rising colour** — vivid accents (electric sky-blue, fresh green, hot coral-pink) cut across open white like carp streamers climbing into clear light. Everything floats upward: type stacks from bottom-left, cards lift on hover, sections breathe with generous sky-like spacing. The mood is confident graphic design, not childish decoration.

## Art style

Photographic-real scenes rendered as bold editorial posters. Clean whites, crisp shapes, high-contrast type, and a single hero image that fills the viewport. Ornament is minimal and meaningful: only the carp-scale dot pattern and the rising diagonal, used sparingly.

## Palette

### Accent colours (3)
- **Sky** `#00D4FF` — primary accent, electric sky-blue, the colour of clear May light.
- **Leaf** `#00E676` — fresh green, growth and festival vitality.
- **Coral** `#FF3366` — hot pop, energy, the red of the leading koinobori.

### Neutrals
- **Ink** `#0A1628` — primary text, deep cool navy-black.
- **Slate** `#5B6F83` — muted text, cool grey with a cyan undertone.
- **Mist** `#E1F0F5` — borders and dividers, very light cyan-grey.
- **Cloud** `#F7FBFD` — secondary surfaces, cool white.
- **Paper** `#FFFFFF` — ground, primary background.

### Semantic mapping
- `--bg`: Paper `#FFFFFF`
- `--surface`: Cloud `#F7FBFD`
- `--text`: Ink `#0A1628`
- `--muted`: Slate `#5B6F83`
- `--border`: Mist `#E1F0F5`
- `--accent`: Sky `#00D4FF`
- `--on-accent`: Ink `#0A1628`
- `--success`: Leaf `#00E676`
- `--warning`: `#FFB800`
- `--error`: Coral `#FF3366`
- `--info`: Sky `#00D4FF`

## Typography

- **Display**: `Space Grotesk`, 700/600, tight tracking `-0.04em` on mastheads, `-0.02em` on body.
- **Body**: `Inter`, 400/500.
- **Scale**: 12px, 14px, 17px, 20px, 24px, 32px, 40px, 56px, 72px, 96px.
- **Body minimum**: 17px.
- **Line-height**: 1.1 display, 1.35 headings, 1.6 body.

## Spacing

- **Base**: 4px
- **Scale**: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- **Section padding**: 96px–128px vertical.
- **Card padding**: 24px–32px.
- **Titles always have padding above**; never touch a container top.

## Radius

Allowed values: `{0, 16px, 24px, 9999px}`.
- **Cards / panels**: 24px
- **Buttons**: 9999px (pill)
- **Inputs**: 16px
- **Tags / chips**: 9999px

## Control height

`--control-height: 48px` — shared by buttons, inputs, selects, and chips. Labels centred. Buttons use 24px horizontal padding minimum.

## Components

### Button
- Height: 48px; padding: 0 28px; radius: 9999px; font: 17px/1 Inter 600.
- Primary: bg `accent`, text `on-accent`, no border.
- Secondary: bg transparent, border 2px `accent`, text `accent`.
- Ghost: bg transparent, text `text`.
- States:
  - default: as above
  - hover: translateY(-2px), shadow `0 8px 24px rgba(0,212,255,0.25)` (primary) / bg `surface` (ghost)
  - focus: outline 3px solid `accent` at 2px offset, outline-offset 2px
  - active: translateY(0), shadow none, brightness 0.95
  - disabled: opacity 0.45, pointer-events none, no transform/shadow

### Input / Select / Textarea
- Height: 48px (textarea min-height 120px); padding: 0 16px; radius: 16px; border 2px `border`; bg `bg`; color `text`; font 17px/1 Inter.
- Placeholder: `muted`.
- States:
  - hover: border `accent`
  - focus: border `accent`, ring 3px `accent` at 20% opacity, outline none
  - active: border `accent`
  - disabled: bg `surface`, opacity 0.5

### Card
- bg `surface`; radius 24px; padding 32px; no border, no single-edge highlight.
- Shadow: none by default; on hover lift `translateY(-4px)` with soft shadow.
- Separated by tone (`surface` on `bg`) not borders.

### Tag / Chip
- Height 32px (compact variant of control height); radius 9999px; padding 0 14px; bg `surface`; border 1px `border`; font 14px Inter 500.
- Active accent variant: bg `accent`, color `on-accent`.

### Navigation
- No floating rounded card or pill bar. Navigation sits as part of the page, using space and type hierarchy.
- Links: 17px Inter 500; hover `accent`; focus ring.

## State matrix (all interactive controls)

| State | Button Primary | Button Secondary | Button Ghost | Input / Select |
|-------|---------------|------------------|--------------|----------------|
| default | accent bg, ink text | transparent, accent border/text | transparent, ink text | border mist, bg white |
| hover | lift + cyan shadow | bg surface | text accent | border accent |
| focus | 3px accent ring, offset 2px | same | same | 3px accent ring |
| active | pressed, brightness 95% | same | same | border accent |
| disabled | opacity 45%, no lift | same | same | opacity 50%, bg surface |

## Surfaces

### landing.html
Festival welcome. Full-viewport hero with `background-image: var(--hero-image)`. Hero headline is confident and ownable, not generic italic serif. Below: rich sections on the carp streamers, customs, food, and the feeling of the day. Motion is added via JS behind an `html.anim` class; no-JS render shows the settled state.

### dashboard.html
Festival companion. Dense, information-rich: programme schedule, guide, map, family album. Same tokens, same components, same rising accent logic. Functional cards, tables, and forms all use the shared control height and state matrix.

## Motion

- Reduced motion is respected via `prefers-reduced-motion`.
- Default (no JS) shows the final settled state.
- With JS, `html` gets class `anim`; hero content reveals with a staggered upward fade (`translateY(24px)` to `0`), duration 700ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- Cards lift on hover; buttons lift on hover.
- No scroll cues, no down arrows, no decorative loops.

## Responsive

- Mobile (< 640px): single column, hide non-essential nav links, no horizontal overflow, section padding reduced to 64px.
- Tablet (640–1024px): 2-column grids.
- Desktop (1024px+): max content width 1280px, centred; only hero spans 100vw.
- Ultra-wide (1920px+): content capped at 1440px.
- Grids use `minmax(0, 1fr)` and `min-width: 0` to prevent blowout.
