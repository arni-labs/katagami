# Nobori Current

Nobori Current is a design language for Kodomo no Hi products that treats wind as the layout engine. It is festive without becoming toy-like: ceremonial paper, lacquer, carp-streamer scale rhythm, and calm operational clarity. The system should feel like a May morning where everything is moving, but every knot is tied.

## Point Of View

- Motion is implied through diagonals, offset grids, alternating scale patterns, and cloth-like shadows.
- Interfaces are bright, high contrast, and practical. Festival warmth supports work rather than obscuring it.
- Accents behave like koinobori markings: concentrated flashes of lacquer red, river indigo, leaf green, and marigold against rice paper and sumi ink.
- Components are solid, touchable, and clear. A focus ring is always visible; disabled controls look quiet but still legible.
- Imagery should be tactile, editorial, and product-world specific: washi, textile, rooftop wind, route materials, and festival operations.

## Tokens

### Color

```css
--rice: #fffaf0;
--paper: #f5ead8;
--paper-strong: #ead7b8;
--sumi: #11100d;
--sumi-soft: #39352e;
--river: #123e75;
--river-quiet: #dbe9f7;
--lacquer: #d52b1e;
--leaf: #247a55;
--marigold: #f0b72f;
--sky: #d7efff;
--mist: #f8f4ec;
--disabled-bg: #e8dfd0;
--disabled-fg: #8a8172;
--ring: #f0b72f;
--shadow-ink: 0 18px 50px rgba(17, 16, 13, 0.14);
--shadow-cloth: 0 10px 28px rgba(18, 62, 117, 0.13);
```

Usage:

- `--rice` is the primary canvas.
- `--sumi` is the primary text color.
- `--river` is the calm product color for navigation, chart structure, and secondary actions.
- `--lacquer` is the highest-energy accent for primary CTAs and urgent operational markers.
- `--leaf` indicates readiness, assignment, and completed state.
- `--marigold` is used for focus rings, selected state, and small festive highlights.

### Typography

```css
--font-display: "Iowan Old Style", "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif;
--font-body: "Avenir Next", "Hiragino Sans", "Yu Gothic", Verdana, sans-serif;
--type-hero: clamp(4.2rem, 9vw, 9.4rem);
--type-h1: clamp(3rem, 7vw, 6.5rem);
--type-h2: clamp(2.1rem, 5vw, 4.25rem);
--type-h3: clamp(1.45rem, 3vw, 2.25rem);
--type-body: 1.0625rem;
--type-small: 0.9rem;
--type-micro: 0.78rem;
--tracking-display: -0.02em;
--tracking-label: 0.08em;
--leading-tight: 0.9;
--leading-body: 1.58;
```

Rules:

- Display type uses the serif stack with `--tracking-display`.
- Body and controls use the sans stack.
- Numeric dashboard values use tabular numbers.
- Body copy never drops below 17px on content surfaces. Table meta can use 14.5px or larger.

### Spacing

```css
--space-1: 0.375rem;
--space-2: 0.625rem;
--space-3: 1rem;
--space-4: 1.5rem;
--space-5: 2.25rem;
--space-6: 3.5rem;
--space-7: 5rem;
--space-8: 7rem;
--page-x: clamp(1rem, 4vw, 4.75rem);
```

Rules:

- Use wide gutters and generous section rhythm.
- Titles get air above them; never stick headings to container tops.
- Dashboard density comes from column count and table rhythm, not cramped text.

### Radius

```css
--radius-0: 0;
--radius-1: 16px;
--radius-2: 24px;
--radius-pill: 999px;
```

Rules:

- Controls and compact cards use `--radius-1`.
- Large image panels and major dashboard regions use `--radius-2`.
- Pills, switches, and segmented controls use `--radius-pill`.

### Shared Control Height

```css
--control-height: 48px;
```

Every input, select, button, segment, switch target, checkbox/radio row, date control, and range wrapper is built around this one height. Textareas use `min-height: calc(var(--control-height) * 2.4)` while preserving the same padding, ring, radius, and state behavior.

## Components And States

All components are built from the tokens above.

### Buttons

Default:

- Height `--control-height`.
- Radius `--radius-pill`.
- Typeface `--font-body`, bold label.
- Primary: `--sumi` text on `--marigold`, with an ink shadow.
- Secondary: `--rice` text on `--river`.
- Quiet: `--sumi` text on semi-opaque rice paper.

Hover:

- Translate up by 1px.
- Increase shadow contrast.
- Primary shifts to a warmer marigold tint.

Focus:

- `outline: 3px solid var(--ring)`.
- `outline-offset: 3px`.
- Add a thin sumi contrast shadow when the button itself is marigold.

Active:

- Translate down by 1px.
- Shadow compresses.

Disabled:

- `--disabled-bg` background and `--disabled-fg` text.
- No transform.
- Cursor default.

### Text Inputs, Search, Email, Date, Select, Textarea

Default:

- Background `--rice`.
- Text `--sumi`.
- Radius `--radius-1`.
- Min-height `--control-height`.
- Inset paper shadow instead of a heavy border.

Hover:

- Background brightens to white.
- Inset shadow darkens slightly.

Focus:

- Ring uses `--ring`.
- Parent field also supports `:focus-within` for grouped controls.

Active:

- Inset shadow tightens.

Disabled:

- `--disabled-bg` fill, `--disabled-fg` text, muted placeholder.

### Checkbox And Radio

Default:

- Row min-height `--control-height`.
- Control size is derived from `--control-height`.
- Checkbox radius `6px`; radio radius `--radius-pill`.
- Ink outline is rendered with box-shadow, not a separate decorative border.

Hover:

- Label background shifts to white.
- Control receives a faint marigold halo.

Focus:

- Visible ring around the native control.

Active:

- Control scales to 0.96.

Disabled:

- Muted background and text; checked marks remain legible.

### Switch

Default:

- Track height derives from `--control-height`.
- Off track is `--paper-strong`; on track is `--river`.
- Thumb is rice white with a cloth shadow.

Hover:

- Track becomes brighter.

Focus:

- Ring around the whole switch target.

Active:

- Thumb compresses horizontally.

Disabled:

- Track and thumb use disabled tokens.

### Range

Default:

- Wrapper min-height `--control-height`.
- Track is paper with a river fill implied through accent color.
- Thumb uses `--lacquer`.

Hover:

- Thumb grows by 2px.

Focus:

- Ring on the input.

Active:

- Thumb uses `--sumi`.

Disabled:

- Track and thumb use disabled tokens.

### Cards And Panels

- No generic grey frames.
- Use paper fills, cloth shadows, diagonals, scale patterns, and spacing to separate regions.
- Cards can overlap imagery slightly if the overlap reinforces the wind direction.
- Operational panels are flatter and denser than marketing panels.

### Tables

- Header labels use uppercase micro typography.
- Rows are at least 52px high.
- Row hover uses `--river-quiet`.
- Risk and status marks are compact pills with text labels, never color alone.

## Layout Guidance

### Shared

- Use diagonal composition: content should feel lifted by wind from lower left to upper right.
- Avoid centered sameness. Major blocks can offset or overlap, but the reading path must remain obvious.
- Create rhythm with repeating scale marks: small rounded lozenges, staggered bars, or soft shadow cuts.
- Light mode is default. Dark zones are reserved for emphasis, charts, and hero overlays.
- Respect `prefers-reduced-motion`; movement should disappear without losing meaning.

### Landing Surface

- Begin with one large full-bleed hero image that shows the product world, not a generic festival poster.
- Put text directly over the image field with a translucent paper veil only where readability requires it.
- Feature sections should describe lived product moments: routes, family kits, volunteers, weather, and day-of coordination.
- Do not expose token swatches, type specimens, or a component gallery.

### Dashboard Surface

- Prioritize scan speed: high-contrast metrics, compact status pills, clear tables, and obvious controls.
- Use the same festive accents sparingly so operational meaning stays legible.
- Inputs should be grouped by real workflows: search, date, ward/area, route risk, assignment mode.
- Charts should feel like route/weather instruments rather than generic SaaS widgets.

## Accessibility And Contrast

- Sumi on rice/paper, rice on river, and rice on lacquer are the main text pairings.
- Marigold is not used for small text on rice; it is a fill, highlight, or focus color.
- Every interactive element has a visible focus state.
- No control relies on color alone; status pills include text.
- Motion honors `prefers-reduced-motion`.

## Surface Names

The language name is **Nobori Current** across both surfaces. The example product using it is **TomoTrail**, a coordination platform for Kodomo no Hi neighborhood celebrations.
