# Aozora Lift

Aozora Lift is a bright, adult Kodomo no Hi design language for products that coordinate high-energy public moments. It treats koinobori not as decoration, but as a model for interface behavior: clear air, upward direction, shared motion, and a few vivid signals that help people act quickly.

The language is poster-minded and product-ready. It uses generous white space, confident typography, compressed information blocks, and electric accent color like a highlighter. Nothing is muddy, nostalgic, or toy-like. The spirit is early summer after rain: sharp light, fresh leaves, and wind that makes the whole system feel ready.

## Design POV

- Lead with air: white space is an active material, not emptiness.
- Use color as lift: accents mark momentum, priority, and human attention.
- Keep surfaces grown-up: clean alignment, strong type, no novelty clutter.
- Make movement legible: diagonals, rising stacks, and swept spacing imply progress.
- Treat cultural reference as structure: koinobori informs rhythm and direction, not mascot art.

## Core Tokens

### Color

```css
:root {
  --paper: #ffffff;
  --ink: #050505;
  --ink-soft: #3a3d40;
  --ash: #eef3f3;
  --cloud: #f7fbfb;
  --sky: #00a7ff;
  --sky-deep: #005cff;
  --leaf: #18e66b;
  --leaf-deep: #087a3a;
  --hot: #ff2e6d;
  --sun: #f7ff2f;
}
```

Usage:

- `--paper` and `--ink` are the dominant neutrals.
- `--sky`, `--leaf`, and `--hot` are the only signature accents.
- `--sun` is a micro-accent for tiny alerts or selected points only.
- Never wash the page in pale color. Keep backgrounds white or near-white, then use saturated accent blocks.

### Typography

```css
:root {
  --font-sans: "Inter", "Avenir Next", "Helvetica Neue", Arial, sans-serif;
  --font-display: "Arial Narrow", "Inter Tight", "Helvetica Neue", Arial, sans-serif;
  --text-xs: 0.78rem;
  --text-sm: 0.86rem;
  --text-base: 1rem;
  --text-md: 1.12rem;
  --text-lg: 1.35rem;
  --text-xl: clamp(2.1rem, 6vw, 5.9rem);
  --track-display: -0.02em;
}
```

Body copy starts at 17px. Display type is tight, uppercase only when it has a functional editorial purpose. Avoid low-contrast overlays; text should be black on white or white on a dark-enough image area with a solid supporting overlay.

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

Spacing should feel buoyant. Titles never touch the top of their container. Dashboards may be dense, but groups need enough internal air to read as intentional.

### Radius

```css
:root {
  --radius-sm: 16px;
  --radius-md: 24px;
  --radius-pill: 9999px;
}
```

Use `24px` for major panels and image masks, `16px` for compact repeated items, and pill radius for controls and status marks.

### Shared Control Height

```css
:root {
  --control-h: 48px;
}
```

Every interactive control is built from `--control-h`. Buttons, inputs, selects, segmented controls, search, switches, and range rows use this same vertical rhythm. Checkboxes and radio glyphs sit inside label rows whose hit area is `--control-h`. Textareas use multiples of this token.

## Interaction States

All controls must implement these states:

- Default: white or ink surface, strong label contrast, no visible grey border.
- Hover: slight lift, colored inset ring or accent wash, no layout shift.
- Focus: visible ring using `--sky-deep` plus a soft sky halo; never remove focus visibility.
- Active: compressed transform and deeper ink/sky state.
- Disabled: reduced opacity, no pointer affordance, color desaturated.

State CSS:

```css
:where(button, .button, input, select, textarea):focus-visible,
.control-row:focus-within,
.segmented:focus-within {
  outline: none;
  box-shadow: 0 0 0 2px var(--sky-deep), 0 0 0 7px rgba(0, 167, 255, 0.22);
}
```

## Components

### Buttons

- Primary: ink fill, white text, sky highlight underline or icon dot.
- Secondary: white fill with colored inset ring and black text.
- Hot action: `--hot` fill for scarce, high-attention actions only.
- Icon buttons: square `--control-h`, pill or circle radius, accessible label.

States:

- Hover raises by 2px and increases accent ring intensity.
- Focus uses the shared focus ring.
- Active returns to baseline with a 1px downward press.
- Disabled is 40% opacity and ignores hover transforms.

### Text Inputs and Search

Inputs are white capsules with black text, high-contrast placeholder text, and a sky focus ring. Search fields may include a small text label or icon, but no decorative border. Clear actions sit inside the same control height.

### Selects

Selects share the input capsule shape. Use black text, a custom inline chevron if needed, and the same hover/focus/disabled model as inputs.

### Textareas

Textareas use a 24px radius and `min-height: calc(var(--control-h) * 2.5)`. They keep the same focus ring and padding rhythm as inputs.

### Checkboxes and Radios

The row is the control. The glyph is a small high-contrast mark inside a `--control-h` label row. Checked state uses `--leaf` for affirmative selection or `--sky` for neutral filters.

### Switches

Switch tracks are pill controls with a 48px hit height. On state uses `--leaf`; off state uses `--ash`. The knob moves horizontally and keeps strong contrast.

### Range

Range controls live in a 48px row with a clean sky track and an ink thumb. The thumb must show the shared focus ring.

### Data Panels

Panels are white or `--cloud` with no decorative borders. Use spacing, shadow, and accent bars/blobs for hierarchy. Metric panels should include one large number, one plain-language label, and a small momentum signal.

### Tables

Rows use white space and subtle background shifts instead of grid lines. Text in rows is at least 14.5px. Priority cells use accent chips sparingly.

### Charts

Charts are graphic, not default-library. Use solid bars, lines, and dots with the three accents. Keep grid treatment faint and never dominate the data.

### Imagery

Generated bitmap imagery is editorial and luminous: full daylight, strong negative space, upward koinobori-like motion, vivid sky/leaf/hot accents, and adult product-world polish. SVG is reserved for tiny UI marks only.

## Layout Guidance

### Landing Page

- First viewport is a full-bleed hero image with product name and launch proposition layered directly over it.
- Follow with editorial sections that alternate dense copy, large numbers, and generated product-world imagery.
- Avoid token galleries, specimen cards, or rulebook panels.
- CTA forms use the same control system as the product surface.

### Dashboard

- Use a bright shell, white command surfaces, and dense but readable operations data.
- Keep navigation narrow and confident; the main content should feel like a live launch room.
- Use accent color to mark readiness, risk, and lift.
- Every filter, toggle, search field, and action uses the shared `--control-h`.

## Accessibility

- Maintain strong contrast for all text and controls.
- Respect `prefers-reduced-motion`.
- Preserve visible focus rings for keyboard users.
- Do not rely on color alone: pair accent color with labels, numbers, or shape.
- Keep tap targets at least 48px high.
