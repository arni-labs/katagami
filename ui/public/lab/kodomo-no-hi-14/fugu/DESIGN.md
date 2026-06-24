# Updraft Kin

A design language for Kodomo no Hi translated into grown-up product design: clear May light, koinobori lift, fresh greenery, and confident editorial graphics. Updraft Kin is not nostalgic decoration. It treats the carp streamer as an operating metaphor: visible motion, shared direction, and family systems rising into clarity.

## Point of view

Updraft Kin is bright, airy, and decisive. The page should feel like opening a white studio window on a clear early-summer morning: mostly white space, then electric marks that behave like wind indicators. It is expressive through scale, cropping, angle, and color placement rather than ornament.

Principles:

1. **White is the atmosphere.** Use large areas of white and near-white. Do not tint entire sections pastel.
2. **Color behaves like highlighter tape.** Accent color marks the important path, not every surface.
3. **Everything rises.** Diagonals, stacked cards, charts, and image crops should imply upward wind or progress.
4. **Adult, never toy-like.** Koinobori references are abstracted into ribbons, flags, fins, counters, and motion trails.
5. **Sleek systems, not folk craft.** Crisp forms, editorial typography, and sharp contrast lead; texture is subtle.

## Core tokens

### Color

| Token | Value | Use |
|---|---:|---|
| `--paper` | `#FFFFFF` | Main canvas |
| `--mist` | `#F6FFF8` | Quiet elevated panels |
| `--ink` | `#07110F` | Primary text |
| `--ink-soft` | `#35504A` | Secondary text |
| `--line` | `rgba(7, 17, 15, 0.10)` | Hairline separators only |
| `--sky` | `#00A6FF` | Primary electric accent |
| `--sky-deep` | `#006DFF` | Hover/active accent depth |
| `--leaf` | `#28F06B` | Success, lift, live signals |
| `--hot` | `#FF2E7A` | Rare urgent pop / conversion |
| `--sun` | `#FFF246` | Tiny highlight, never a field color |
| `--shadow` | `rgba(7, 17, 15, 0.12)` | Soft elevation |

Usage ratio: 80% white, 12% ink/neutral, 6% sky/leaf, 2% hot/sun.

Contrast rules:

- Text on white or mist uses `--ink` or `--ink-soft`.
- Text on `--ink` uses white.
- Do not put normal text on `--leaf`, `--sun`, or pale imagery.
- `--hot` is an accent, not a large background for paragraphs.

### Typography

Use native system fonts for speed and fidelity:

```css
--font-display: "Arial Narrow", "Aptos Display", "Helvetica Neue", Arial, sans-serif;
--font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

Type scale:

| Token | Size | Line-height | Weight | Tracking | Use |
|---|---:|---:|---:|---:|---|
| `--type-hero` | `clamp(4.5rem, 13vw, 11.5rem)` | `.82` | `900` | `-0.075em` | Landing hero headline |
| `--type-h1` | `clamp(3.25rem, 8vw, 7rem)` | `.88` | `900` | `-0.065em` | Page titles |
| `--type-h2` | `clamp(2.25rem, 5vw, 4.6rem)` | `.92` | `900` | `-0.055em` | Section titles |
| `--type-h3` | `1.55rem` | `1.05` | `850` | `-0.035em` | Card titles |
| `--type-body` | `1.0625rem` | `1.62` | `500` | `-0.01em` | Body text |
| `--type-small` | `.88rem` | `1.4` | `700` | `.01em` | Labels, metadata |
| `--type-micro` | `.72rem` | `1.25` | `800` | `.14em` | Eyebrows, badges |

Display type should be tight and editorial. Body copy should stay legible and calm.

### Spacing

Base unit: `8px`.

| Token | Value | Use |
|---|---:|---|
| `--space-1` | `8px` | Tiny gaps |
| `--space-2` | `16px` | Inline spacing |
| `--space-3` | `24px` | Card padding small |
| `--space-4` | `32px` | Standard card padding |
| `--space-5` | `48px` | Section internal gaps |
| `--space-6` | `72px` | Major section gaps |
| `--space-7` | `112px` | Landing section spacing |
| `--space-8` | `160px` | Hero / campaign scale |

Layout maximums:

- Marketing content width: `min(1180px, calc(100vw - 48px))`
- Dashboard shell: `minmax(260px, 300px) 1fr`
- Comfortable card minimum: `260px`

### Radius

Only these radii are used:

| Token | Value | Use |
|---|---:|---|
| `--radius-none` | `0` | Image cuts, editorial blocks |
| `--radius-s` | `16px` | Inputs, small controls |
| `--radius-m` | `24px` | Cards, panels, images |
| `--radius-pill` | `9999px` | Pills, buttons, status chips |

### Elevation

Updraft Kin avoids grey boxes. Elevation is created with spacing, white, soft shadows, and accent slashes.

```css
--elevate-1: 0 18px 50px rgba(7, 17, 15, .08);
--elevate-2: 0 32px 90px rgba(7, 17, 15, .12);
```

### Shared control token

All interactive controls use one height token:

```css
--control-height: 48px;
```

Buttons, inputs, selects, search fields, compact nav actions, segmented controls, and date fields sit on `--control-height`. Larger CTAs use the same height with wider padding, not a different height.

## Components

### Buttons

Base:

```css
.button {
  min-height: var(--control-height);
  border: 0;
  border-radius: var(--radius-pill);
  padding: 0 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font: 850 .9rem/1 var(--font-body);
  letter-spacing: .03em;
  cursor: pointer;
  transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease, opacity .18s ease;
}
```

Variants:

- **Primary:** `--ink` background, white text, sky underline glow.
- **Sky:** `--sky` background, `--ink` text, used sparingly for creation actions.
- **Ghost:** transparent background, `--ink` text, soft mist hover.
- **Hot:** `--hot` background, white text, only for conversion or urgent action.

States:

| State | Behavior |
|---|---|
| Default | Solid, no visible border, clear label |
| Hover | Translate up `-2px`, add `--elevate-1`, deepen accent if colored |
| Focus-visible | `outline: 3px solid var(--sun); outline-offset: 3px;` |
| Active | Translate down `1px`, shadow reduced |
| Disabled | `opacity: .42; cursor: not-allowed; transform: none; box-shadow: none;` |

### Text inputs, search, email, password, number, date, textarea

All controls are explicitly styled. Borders are not the visual system; controls use filled white/mist surfaces plus focus rings.

```css
.input, input, select, textarea {
  min-height: var(--control-height);
  width: 100%;
  border: 0;
  border-radius: var(--radius-s);
  background: var(--mist);
  color: var(--ink);
  padding: 0 16px;
  font: 700 .96rem/1.2 var(--font-body);
  box-shadow: inset 0 0 0 1px rgba(7, 17, 15, .08);
}
textarea { min-height: calc(var(--control-height) * 2.6); padding-block: 14px; resize: vertical; }
```

States:

| State | Behavior |
|---|---|
| Default | Mist fill, subtle inset hairline |
| Placeholder | `rgba(53, 80, 74, .62)` |
| Hover | White fill, inset sky tint `rgba(0, 166, 255, .22)` |
| Focus | White fill, `outline: 3px solid var(--sun); outline-offset: 2px; box-shadow: 0 0 0 6px rgba(0, 166, 255, .14);` |
| Invalid | `box-shadow: inset 0 0 0 2px var(--hot);` |
| Disabled | `opacity: .48; cursor: not-allowed;` |

### Selects

Selects use the input base, `appearance: none`, and a background chevron drawn in CSS. They keep the same `--control-height`.

### Checkbox and radio

- Visual size: `22px`.
- Accent color: `--sky`.
- Focus-visible ring: `3px solid var(--sun)` with `3px` offset.
- Disabled opacity: `.45`.

### Toggles

Toggle track is `48px x 28px` inside the control row. The row itself still uses `min-height: var(--control-height)`. Checked state uses `--leaf`; focus ring uses `--sun`.

### Cards and panels

Cards are white or mist, radius `--radius-m`, no grey border. Use shadow, spacing, and one accent marker.

- Marketing cards: large padding, oversized title, diagonal accent slash.
- Dashboard cards: denser, data-first, still airy.
- Empty states include generated imagery or an abstract ribbon mark, never token swatches.

States for clickable cards:

| State | Behavior |
|---|---|
| Default | White/mist, soft shadow or none |
| Hover | Lift `-4px`, stronger shadow, accent marker grows |
| Focus-visible | Same ring as controls |
| Active | Lift reduced to `-1px` |
| Disabled | Opacity `.5`, no interaction |

### Pills and status chips

Pills use radius pill, height `32px`, uppercase micro type. They are metadata, not primary actions. Use sky/leaf/hot as left-side dot or small fill, not full neon backgrounds unless the chip is tiny.

### Tables

Tables should feel like operational air traffic, not spreadsheets.

- Header: micro uppercase, `--ink-soft`.
- Rows: minimum `64px`, white background with generous spacing.
- Row hover: mist background.
- Focusable row: visible sun ring.
- Numbers use mono font.

### Charts

Charts are thin, bright, and sparse. Use sky for primary trend, leaf for healthy capacity, hot only for exception. Gridlines are either absent or `rgba(7, 17, 15, .07)`.

## Layout guidance

### Marketing landing

- One full-bleed hero image sits at the top of the story and is cropped boldly.
- Headline overlaps or follows the hero with strong editorial scale.
- Use asymmetry: one wide feature, two narrow proof blocks, one angled CTA.
- Avoid component galleries, token rows, and design-system exposition.
- Copy should sell a believable product world.

### Product dashboard

- Left rail is calm and narrow.
- Main area has a bright header, KPI strip, operational table, and action panel.
- Use one image banner or artwork panel as atmosphere, not decoration everywhere.
- Data density is moderate; every number needs a label.
- Forms and controls must be usable and visibly focused.

## Motion

Motion is quick and upward: `180ms` for controls, `260ms` for cards, `520ms` for ambient ribbons. Respect reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
```

## Imagery direction

Generated imagery should be cohesive with the language:

- Clear white early-summer light.
- Koinobori abstracted as wind ribbons, flags, and rising data trails.
- Electric sky blue, fresh leaf green, one hot vermilion/magenta pop.
- Crisp editorial graphic composition, subtle texture.
- No childish illustrations, no mascot energy, no token specimen layouts.

## Accessibility

- Body text is at least `17px`.
- Focus rings are visible and not color-only: sun outline plus sky halo.
- Disabled controls remain legible but clearly inactive.
- Never rely on neon text on white; neon is for backgrounds, marks, and fills.
- Form labels are visible. Placeholder text is never the only label.
