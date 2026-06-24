# Nobori

Nobori is a Katagami design language for Children's Day products that turn festival courage into an operating system. Its signature mechanic is **wind-lift**: information is arranged like carp streamers climbing a river wind, with wide calm surfaces, bold masthead type, rhythmic vertical spacing, and small highlighter accents that behave like ribbons rather than decorations.

## Point of view

Nobori treats product interfaces as festival ground control: bright, practical, celebratory, and legible while many families, staff, locations, and rituals move at once. It borrows from koinobori cloth, washi paper, river maps, and morning festival signage without becoming nostalgic or ornamental. The system should feel ready for a real venue crew and warm enough for a family-facing launch.

## Naming

- Language name: **Nobori**
- Subject source: the concrete festival object `nobori`, a banner lifted by wind.
- Product scene name used in surfaces: **Nobori Pass**, a festival passport, scheduling, and operations product for Children's Day events.
- Naming rule: use one distinctive noun; never append System, Interface, UI, Style, date, or an adjective.

## Palette

All compositions take colour from semantic role variables. Accents are capped at three and used as highlighters.

```css
:root {
  --bg: #fff8ea;
  --surface: #ffffff;
  --text: #17110c;
  --muted: #5f5147;
  --border: #e7d8bf;
  --accent: #d93622;
  --on-accent: #ffffff;
  --success: #2f8d5b;
  --warning: #d08a13;
  --error: #b42118;
  --info: #2456a6;

  --accent-vermilion: #d93622;
  --accent-indigo: #2456a6;
  --accent-iris: #2f8d5b;
}
```

### Colour behaviour

- Ground: warm ivory, never grey-white.
- Primary accent: vermilion. Use for the one primary action, urgent festival moments, selected states, and the strongest headline mark.
- Secondary accent: indigo. Use for route, schedule, and operational clarity.
- Tertiary accent: iris green. Use for successful check-ins, capacity safety, and growth cues.
- Neutrals are warm and paper-like; do not introduce cool greys.
- Surfaces separate by tone and shadow, not by border dependency.

## Type

Nobori uses compact strength, not fragile elegance.

```css
:root {
  --font-display: "Arial Black", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif;
  --font-jp-heavy: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif;
  --font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --type-hero: clamp(4.6rem, 12vw, 12.5rem);
  --type-h1: clamp(3rem, 7vw, 7.8rem);
  --type-h2: clamp(2rem, 4.4vw, 4.8rem);
  --type-h3: clamp(1.35rem, 2vw, 2.1rem);
  --type-body: clamp(1.0625rem, 1.1vw, 1.2rem);
  --type-small: 0.95rem;
  --tracking-display: -0.02em;
}
```

- Body text is always 17px or larger.
- Hero headlines use heavy display type with tight letter spacing.
- Japanese festival terms use the heavy Japanese stack and should feel like masthead lettering, not annotation.
- Do not stack a tiny uppercase eyebrow above a huge headline. Fold context into natural copy or place it in a substantial badge.

## Spacing

```css
:root {
  --space-1: 0.5rem;
  --space-2: 0.75rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;
  --space-6: 3rem;
  --space-7: 4.5rem;
  --space-8: 7rem;
  --section-pad: clamp(4.5rem, 8vw, 9rem);
  --container: min(1180px, calc(100vw - 40px));
}
```

- Every title gets air above it.
- Product scenes use large section gaps, then dense useful information inside a scene.
- Mobile stacks to one column; grids use `minmax(0, 1fr)` and children set `min-width: 0`.
- Ultra-wide pages cap contained content; only full-bleed heroes span the viewport.

## Radius and geometry

Allowed radii only:

```css
:root {
  --radius-0: 0;
  --radius-16: 16px;
  --radius-24: 24px;
  --radius-pill: 9999px;
}
```

- Buttons, inputs, tags, and compact cards use 9999px when they behave like ties or stamps.
- Large panels use 24px.
- Operational rows and small tiles use 16px.
- Never invent in-between radii.

## Elevation and surface separation

```css
:root {
  --shadow-soft: 0 24px 80px rgba(58, 37, 17, 0.14);
  --shadow-tight: 0 12px 32px rgba(58, 37, 17, 0.12);
  --surface-warm: #fffdf7;
  --surface-raised: #ffffff;
  --surface-tint: #f4ead8;
}
```

- Separate surfaces by tone, spacing, and soft elevation.
- Do not rely on single accent edges.
- Do not nest cards. A panel can contain rows, charts, or controls, but not another card chassis.

## Shared control token

Every button, input, select, textarea row header, tab, segmented option, and compact table filter uses the same height token unless the control is intentionally multiline.

```css
:root {
  --control-height: 48px;
  --control-padding-x: 20px;
  --focus-ring: 0 0 0 4px rgba(36, 86, 166, 0.24);
}
```

## State matrix

| State | Visual treatment | Behaviour |
|---|---|---|
| Default | Warm surface or accent fill, centred label, `min-height: var(--control-height)` | Ready and legible |
| Hover | Tone deepens by one step, shadow tightens, no size shift | Communicates touchable surface |
| Focus visible | Strong indigo ring using `--focus-ring`; ring must be visible against both light and dark panels | Keyboard path is obvious |
| Active | Surface compresses with `transform: translateY(1px)` and the fill deepens | Confirms press |
| Disabled | Lower contrast, no shadow, `cursor: not-allowed`, opacity below active elements | Clearly unavailable without looking broken |

## Components

Build components once from the tokens.

### Buttons

- One primary button: vermilion fill, white text.
- Secondary buttons: warm surface or translucent panel with dark text.
- All button labels centred; all button shapes share the pill shape and `--control-height`.
- No emoji and no symbol glyphs in button labels.

### Inputs and selects

- Inputs, selects, search fields, date fields, number fields, and textareas are explicitly styled.
- Default: warm raised surface, dark text, pill or 24px radius depending on field shape.
- Placeholder: muted warm neutral, still readable.
- Focus visible: indigo ring.
- Invalid: error text and a soft error-tinted surface, not a border-only warning.
- Disabled: warm tint with muted text.

### Tables

- Rows use warm alternating tones and 14.5px minimum text where density is required.
- Hide non-essential columns on mobile.
- Avoid hard gridlines; row tone and spacing do the work.

### Tags and badges

- Use accent colours as highlighters: vermilion for attention, indigo for routing, iris for completion.
- Tags are not decorative confetti; each label carries status or category.

### Charts

- Use the same three accent colours plus neutral fills.
- Chart backgrounds are open, not boxed into nested cards.
- Labels stay high contrast.

## Art direction for generated landing and dashboard media

- Bright editorial product photography with washi collage textures and real festival operations objects.
- Vermilion, indigo, and iris accents on warm ivory.
- No low-poly, no 3D render, no generated text, no logo marks.
- The imagery should look like a believable product world, not token specimens.

## Immersive 3D art direction

The immersive surface translates Nobori into a pure real-time low-poly game world. It does not use generated stills, videos, or photographic media.

- Flat-shaded meshes, cohesive low-poly geometry, morning-to-dusk atmosphere.
- Ground, sky, river, waterfall, distant scenery, poles, fukinagashi, koinobori, petals, particles, and dragon climax all belong to the same 3D world.
- Cloth uses a custom GLSL vertex shader with traveling sine waves and wind uniforms.
- The scroll camera uses separate position and look-at targets, updated every frame.

## Responsive contract

- 390px to 2560px+ without horizontal overflow.
- Mobile: single-column sections, non-essential nav hidden, tables simplify.
- Ultra-wide: contained content capped and centred, full-bleed hero remains edge-to-edge.

## Accessibility

- High contrast on all copy.
- Visible keyboard focus on every interactive control.
- Reduced motion: disable decorative transforms and provide a static world fallback for the immersive page.
- No information conveyed by colour alone; badges and labels carry text.
