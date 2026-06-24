# Aonagi Rise

## Point of View

Aonagi Rise is a bright civic product language for Kodomo no Hi operations. It treats koinobori as wind instruments: upward, legible, public, and hopeful. The system is not cute. It is a grown-up early-summer command language with white air, sharp black type, vivid accents used like highlighter marks, and large graphic fields that feel like posters pinned to sunlight.

The visual memory: a white sky, a diagonal lift, fresh green ground, electric blue wind, one hot coral priority mark.

## Core Principles

- Keep the canvas open. White space is functional: it creates confidence and lets accents speak.
- Use color as signal, never decoration. Electric blue means wind and movement, fresh green means readiness and growth, hot coral means priority or intervention.
- Let type carry authority. Display type is condensed, black, and slightly tight. Body type is clear and relaxed.
- Build every component from tokens. No one-off heights, radii, focus rings, or disabled states.
- Favor clean planes, soft shadows, offset blocks, clipped shapes, and diagonal composition. Avoid visual mud, grey boxes, heavy outlines, decorative gradients, toy-like illustration, and pastel wash.

## Tokens

```css
:root {
  --ar-white: #ffffff;
  --ar-ink: #05070a;
  --ar-ink-soft: #232a30;
  --ar-paper: #f5fbf8;
  --ar-snow: #f8fbff;
  --ar-mist: #dbe8e7;
  --ar-blue: #05a7ff;
  --ar-blue-deep: #006ad8;
  --ar-green: #28f26b;
  --ar-green-deep: #00a83f;
  --ar-coral: #ff3f67;
  --ar-coral-deep: #b91238;
  --ar-yellow: #fff45c;
  --ar-shadow: 0 24px 70px rgba(5, 7, 10, 0.12);
  --ar-shadow-tight: 0 12px 32px rgba(5, 7, 10, 0.10);

  --font-display: "Avenir Next Condensed", "DIN Condensed", "Arial Narrow", sans-serif;
  --font-body: "Avenir Next", "Helvetica Neue", Helvetica, sans-serif;

  --text-xs: 0.78rem;
  --text-sm: 0.9rem;
  --text-base: 1.0625rem;
  --text-md: 1.22rem;
  --text-lg: 1.55rem;
  --text-xl: 2.2rem;
  --text-hero: clamp(4rem, 11vw, 9.8rem);

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 5rem;
  --space-9: 7rem;

  --radius-none: 0;
  --radius-sm: 16px;
  --radius-md: 24px;
  --radius-pill: 9999px;

  --control-height: 48px;
  --focus-ring: 0 0 0 3px var(--ar-white), 0 0 0 7px var(--ar-blue);
}
```

## Color Application

- Dominant fields: `--ar-white`, `--ar-paper`, and `--ar-snow`.
- Primary action: `--ar-green` with black text.
- Secondary action and focus: `--ar-blue` with black text or blue ring.
- Alerts, overdue states, and priority tags: `--ar-coral`, usually as a small block with black or white text depending on size.
- Never set long body copy in accent colors. Use black for paragraphs and labels.

## Typography

Display headings use `--font-display`, uppercase or title case, `font-weight: 800`, `letter-spacing: -0.02em`, and a tight line height from `0.84` to `0.96`. Body copy uses `--font-body`, `font-weight: 500`, line height `1.5`, and starts at `17px` on marketing surfaces.

Dashboard labels may use `14.5px` minimum. Tables use `14.5px` minimum with generous row height.

## Layout

- Marketing pages open with one full-bleed image hero. Text may sit on a clipped white poster field, but never inside a decorative card.
- Product surfaces use a left navigation rail, an action header, and a dense but calm dashboard grid.
- Diagonals always rise from lower left or lower right toward the upper opposite edge.
- Repeated content uses unbordered planes, not outlines. Separation comes from spacing, shadow, tone, or a small signal tab.
- Breakpoints: single column below `760px`; two-column product grids above `900px`; wide dashboard grids above `1120px`.

## Components

All interactive controls use `--control-height`. All focus states must be visible and keyboard-safe.

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
  font: 800 var(--text-sm) / 1 var(--font-body);
  letter-spacing: 0.02em;
  color: var(--ar-ink);
  background: var(--ar-green);
  box-shadow: var(--ar-shadow-tight);
  cursor: pointer;
}
```

States:

- Default: filled green primary, black text.
- Hover: translate up `-2px`, stronger shadow, blue or green signal underline.
- Focus-visible: `box-shadow: var(--focus-ring), var(--ar-shadow-tight)`.
- Active: translate down `1px`, shadow reduced.
- Disabled: `opacity: 0.42`, `cursor: not-allowed`, no transform.

Variants:

- Secondary: white fill, black text, subtle shadow.
- Blue: blue fill, black text.
- Coral: coral fill, white text for compact priority actions.

### Text Inputs, Search, Date, Select, Textarea

Base:

```css
.field {
  min-height: var(--control-height);
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--ar-white);
  color: var(--ar-ink);
  box-shadow: inset 0 0 0 2px rgba(5, 7, 10, 0.08);
  padding: 0 16px;
  font: 700 var(--text-sm) / 1.2 var(--font-body);
}
```

States:

- Default: white plane with faint inset keyline.
- Hover: inset keyline turns blue at low opacity.
- Focus: visible blue ring plus white separation.
- Active/input: black text, green caret.
- Disabled: snow background, muted text, no pointer.
- Invalid: coral inset keyline and coral helper text.

Textarea uses the same token family with `min-height: calc(var(--control-height) * 2.4)` and `padding: 14px 16px`.

### Segmented Control

Container height is `--control-height`, radius pill, white background, inner padding `4px`. Segment buttons are borderless, equal width, black text. Active segment uses black fill with white text and no outline. Hover uses paper background. Focus-visible uses the shared ring.

### Toggle

Track is `56px` by `32px`, still aligned inside the `--control-height` row. Off is mist on white; on is green with black knob. Focus-visible applies the shared ring to the track.

### Checkbox and Radio

Inputs are custom drawn at `22px`. Checkbox default is white with inset keyline; checked is black fill with a white tick. Radio checked is white outer with black dot. Both use the shared blue focus ring and disabled opacity.

### Range

Range controls sit in a `--control-height` row. Track is `8px` high, paper background, radius pill. Filled portions use blue or green. Thumb is `24px`, white with black shadow. Focus-visible applies the shared ring to the thumb.

### Tables

Rows are at least `58px`. Header text is uppercase, `12px`, and black at `0.58` opacity. Rows are separated by spacing or alternating paper fills, not heavy lines. Status chips use accent backgrounds with black text.

### Cards and Panels

Cards are functional planes: white, radius `24px`, shadow, generous padding. They may use clipped accent corners or signal tabs. Avoid nested card stacks. Priority panels may use coral or blue side blocks, but not heavy borders.

## Motion

Use light transform motion: upward reveals, button lift, and diagonal signal bars. Durations sit between `140ms` and `520ms`. Respect `prefers-reduced-motion: reduce` by disabling transform and animation.

## Surfaces

### Landing Surface

The landing page should feel like a launch poster for a serious civic tool. The hero is photographic-editorial and full-bleed. Copy is sparse, confident, and operational. Feature imagery should show the product world, not token swatches or a component gallery.

### Dashboard Surface

The dashboard is a live operations cockpit for a Kodomo no Hi installation team. It should show real controls: filters, toggles, ranges, tables, checklists, status cards, and a broadcast note. It stays bright and high contrast, with density handled by hierarchy and spacing.
