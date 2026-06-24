# Nobori Current

Nobori Current is a design language for Kodomo no Hi products that treats childhood growth as wind made visible. It borrows from koinobori without turning the festival into decoration: cloth under tension, carp-scale rhythm, sky pressure, family protection, and upward motion. Interfaces should feel bright, brave, tactile, and exact — like festival fabric snapped clean by a spring gust.

## Point of view

- **Wind is structure.** Layouts use strong diagonals, tiered vertical lift, and off-center composition. Avoid static card grids unless they are interrupted by current lines, elevated modules, or staggered rhythm.
- **Fabric is the surface.** Backgrounds are warm white with faint woven texture. Panels are solid, soft, and shadowed like folded cloth rather than bordered containers.
- **Color is ceremonial but usable.** Three accents carry the system: cobalt sky, persimmon red, and young leaf green. Sumi ink gives contrast. Gold is reserved for tiny signal moments, never as a primary brand color.
- **Children are respected, not infantilized.** Shapes are generous and friendly, but type is crisp, data is serious, and language is direct.
- **Every control is a streamer handle.** Inputs, buttons, selects, toggles, and segmented controls share one height so interaction feels rhythmic across surfaces.

## Tokens

### Color

```css
:root {
  --nobori-paper: #fffdf7;
  --nobori-cloth: #f7f1e4;
  --nobori-foam: #eef7ff;
  --nobori-ink: #111418;
  --nobori-ink-soft: #39414a;
  --nobori-muted: #6f7780;

  --nobori-cobalt: #0757d8;
  --nobori-cobalt-deep: #063c98;
  --nobori-persimmon: #ff4b26;
  --nobori-persimmon-deep: #ba2d15;
  --nobori-leaf: #36a853;
  --nobori-leaf-deep: #21733a;
  --nobori-gold: #d89b10;

  --nobori-shadow: 0 22px 70px rgba(17, 20, 24, 0.14);
  --nobori-shadow-soft: 0 12px 34px rgba(17, 20, 24, 0.10);
  --nobori-ring: 0 0 0 4px rgba(7, 87, 216, 0.22);
}
```

Usage:
- `paper` is the primary canvas.
- `cloth` is used for broad sections and panels.
- `foam` is a cold-light contrast wash for elevated dashboard areas.
- `ink` must be used for primary text on light backgrounds.
- Cobalt is the primary action color.
- Persimmon is the high-energy accent for festival moments, warnings, and live-state emphasis.
- Leaf is progress, growth, completion, and healthy status.
- Gold is limited to small pins, stars, current markers, or celebratory count badges.

### Typography

```css
:root {
  --font-display: "Fraunces", "Iowan Old Style", "Georgia", serif;
  --font-body: "Inter", "Avenir Next", "Helvetica Neue", Arial, sans-serif;

  --step-00: 0.82rem;
  --step-0: 1rem;
  --step-1: 1.125rem;
  --step-2: 1.42rem;
  --step-3: 2rem;
  --step-4: clamp(2.8rem, 7vw, 6.8rem);

  --tracking-display: -0.045em;
  --tracking-label: 0.08em;
  --leading-tight: 0.9;
  --leading-body: 1.58;
}
```

- Display type uses the serif to create a ceremonial, flag-like voice.
- Body/UI type uses the sans-serif for clean product trust.
- Display headlines should be large, compressed in line-height, and never centered by default.
- Labels are uppercase with wide tracking.

### Spacing

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4.5rem;
  --space-9: 7rem;
}
```

- Use larger vertical jumps than horizontal gaps.
- Section padding begins at `space-7` on mobile and `space-9` on desktop.
- Panels use `space-5` or `space-6` internal padding.

### Radius

```css
:root {
  --radius-none: 0;
  --radius-small: 16px;
  --radius-panel: 28px;
  --radius-sail: 42px;
  --radius-round: 999px;
}
```

- `small` for inputs and small controls.
- `panel` for dashboard cards and landing modules.
- `sail` for hero media, large panels, and expressive feature imagery.
- `round` for pills, avatar rings, and toggles.

### Shared control height

```css
:root {
  --control-height: 48px;
}
```

Every interactive form control uses `--control-height` as its block-size or minimum block-size. This includes buttons, inputs, selects, textareas, check/radio rows, switches, segmented options, tabs, and range rows. Textarea may grow taller, but its minimum starts from the same token.

## Components

All component states are built from tokens. Do not introduce one-off colors, one-off focus rings, or one-off control heights.

### Buttons

Base:
- `min-height: var(--control-height)`
- horizontal padding `space-5`
- radius `round`
- font body, `step-0`, weight 800
- no border; use background, shadow, and transform for state

Primary button:
- Default: cobalt background, paper text, soft shadow.
- Hover: cobalt-deep background, translateY(-2px), stronger shadow.
- Focus: visible `--nobori-ring`, plus 2px internal paper outline if on dark/image background.
- Active: translateY(1px), shadow reduced.
- Disabled: muted text on cloth background, no shadow, no transform, cursor not-allowed.

Secondary button:
- Default: paper background, ink text, inset cloth highlight, soft shadow.
- Hover: foam background.
- Focus: `--nobori-ring`.
- Active: cloth background.
- Disabled: cloth background, muted text.

Danger or high-energy button:
- Uses persimmon background only for destructive, urgent, or festival-live actions.
- Same interaction pattern as primary with persimmon-deep hover.

### Text inputs, selects, textarea

Base:
- `min-height: var(--control-height)`
- radius `small`
- paper background
- no visible border by default
- inset shadow `0 0 0 1px rgba(17,20,24,.14)`
- padding inline `space-4`
- text ink, placeholder muted

States:
- Hover: inset shadow darkens to `.24` alpha.
- Focus: remove outline, apply `--nobori-ring` and inset cobalt line.
- Active/filled: ink text, paper background.
- Disabled: cloth background, muted text, reduced opacity.
- Invalid: persimmon inset line plus focus ring mixed from persimmon.

Selects use a custom chevron or background glyph in ink. They must not rely on browser default arrows.

### Checkbox and radio

Use a full hit row:
- row `min-height: var(--control-height)`
- gap `space-3`
- radius `small`
- paper or transparent background

Glyph:
- checkbox square radius `6px`
- radio round
- default inset neutral line
- checked background cobalt; check/dot paper

States:
- Hover row: foam background.
- Focus-visible on input or row: `--nobori-ring`.
- Active: row cloth background.
- Disabled: muted row, cloth glyph, cursor not-allowed.

### Switch

Track:
- row `min-height: var(--control-height)`
- visual track 48px × 28px, radius round
- default cloth background
- checked cobalt background
- thumb paper with soft shadow

States:
- Hover: track gains ink-soft overlay or cobalt-deep when checked.
- Focus-visible: `--nobori-ring` on the track.
- Active: thumb compresses horizontally.
- Disabled: muted opacity and no shadow.

### Segmented control and tabs

- Container: cloth background, radius round, padding `4px`, min-height `var(--control-height)`.
- Option: min-height `calc(var(--control-height) - 8px)`, radius round, padding `space-4`, font weight 800.
- Selected: paper background, ink text, soft shadow.
- Hover: foam or paper wash.
- Focus: visible ring around the option.
- Disabled: muted text, no shadow.

### Cards and panels

- No borders.
- Use cloth/paper/foam fills, clear spacing, and shadows.
- Large panels may use an angled `::before` current stripe in cobalt or persimmon at low opacity.
- Cards should have at least one of: diagonal composition, fabric texture, current stripe, or elevated overlap.

### Tables and dense data

- No grid borders.
- Use row rhythm: alternating paper/cloth fills, large row padding, and strong labels.
- Focusable rows use the same ring.
- Numeric columns align right.
- Status uses small text pills with cobalt/leaf/persimmon fills at high contrast.

## Layout guidance

### Landing surfaces

Landing pages should feel like a festival morning becoming a product world.

- One full-bleed hero image at the top, edge-to-edge.
- Content can overlap the hero with a paper panel or float directly on high-contrast areas.
- Use sweeping diagonal section breaks and staggered modules.
- Avoid design-system specimen layouts: no token swatches, component galleries, or chip rows.
- Imagery should be premium editorial product photography, tactile fabric, spring sky, and koinobori motion.

### Dashboard surfaces

Dashboards should feel calm and operational, not decorative.

- Left navigation is narrow, ink-led, and stable.
- Main content uses a lifted canvas with large summary cards and compact work queues.
- Use color to prioritize: cobalt for actions, leaf for healthy growth, persimmon for time-sensitive festival tasks.
- Keep every data control on the shared height token.
- Prefer roomy cards over cramped widgets.

## Accessibility and contrast

- Primary text is always ink on paper/cloth/foam or paper on cobalt/sumi.
- Never place muted text on imagery without a solid paper/ink backing.
- Focus rings are always visible and never removed.
- Controls have a minimum hit height of 48px.
- Motion uses transform/opacity only and must respect `prefers-reduced-motion`.
