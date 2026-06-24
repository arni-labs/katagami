# Aonami Rise

Aonami Rise is a bright, adult Kodomo no Hi design language for products that coordinate public moments: launches, routes, sponsorships, field teams, and live audience signals. It treats koinobori not as decoration, but as a visual model for lift, current, and confidence.

## Point of view

- **Air first.** White space is the main material. It should feel like standing under clear May light before the festival starts.
- **Graphic, not cute.** Carp-streamer references become diagonal ribbons, lifted panels, velocity cuts, and signal marks. No toy shapes, no novelty illustration language.
- **Three vivid accents.** Electric blue, fresh green, and hot koi vermilion behave like highlighter ink on white paper.
- **Strong editorial type.** Headlines are compressed, confident, and close to poster scale. Body copy stays plain and readable.
- **Operational optimism.** Product surfaces should feel useful and real: calendars, route maps, broadcasts, inventory, sponsor moments, field status.

## Core tokens

```css
:root {
  color-scheme: light;

  --paper: #ffffff;
  --paper-warm: #fbfff7;
  --ink: #06151c;
  --ink-soft: #243840;
  --ink-muted: #5a7178;
  --line-air: rgba(6, 21, 28, 0.11);
  --veil-blue: rgba(0, 168, 255, 0.10);
  --veil-green: rgba(0, 230, 110, 0.12);
  --veil-hot: rgba(255, 61, 53, 0.12);

  --sky: #00a8ff;
  --leaf: #00e66e;
  --koi: #ff3d35;

  --shadow-lift: 0 24px 80px rgba(6, 21, 28, 0.14);
  --shadow-cut: 0 12px 36px rgba(0, 168, 255, 0.18);

  --font-display: "Arial Narrow", "Avenir Next Condensed", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Avenir Next", "Inter", "Helvetica Neue", Arial, sans-serif;

  --type-hero: clamp(4.6rem, 12vw, 12.5rem);
  --type-title: clamp(3rem, 7vw, 7.2rem);
  --type-section: clamp(2rem, 4.5vw, 4.8rem);
  --type-card: clamp(1.35rem, 2vw, 2rem);
  --type-body: 1.0625rem;
  --type-small: 0.875rem;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;
  --space-10: 9rem;

  --radius-none: 0;
  --radius-card: 16px;
  --radius-panel: 24px;
  --radius-pill: 999px;

  --control-h: 52px;
  --focus-ring: 0 0 0 3px #ffffff, 0 0 0 7px rgba(0, 168, 255, 0.82);
}
```

## Type

| Role | Token | Use |
|---|---:|---|
| Hero | `--type-hero` | One phrase only; uppercase or tight title case; line height `0.82–0.92`. |
| Page title | `--type-title` | Campaign sections, dashboard title blocks. |
| Section | `--type-section` | Marketing and dashboard module headers. |
| Card title | `--type-card` | Metric cards, feature cards, task headers. |
| Body | `--type-body` | Product copy, field notes, table rows. |
| Small | `--type-small` | Labels, eyebrow text, timestamps. |

Display type uses `--font-display`, `font-weight: 900`, `letter-spacing: -0.055em`, and tight line-height. Body text uses `--font-body`, `font-weight: 500`, `line-height: 1.55`.

## Color rules

- Backgrounds are `--paper` or `--paper-warm`.
- Text on light backgrounds is always `--ink` or `--ink-soft`.
- `--sky` is the primary action color and route/signal color.
- `--leaf` marks growth, readiness, route health, and positive field status.
- `--koi` marks urgency, the single hot pop, active counts, and live moments.
- Pale veils are allowed only as transparent accent washes over white. Never use low-contrast pastel text.

## Layout system

- Default max content width: `1180px`; dashboard shell max width may stretch to `1440px`.
- Hero sections are full-bleed, image-led, and should reserve one strong text block rather than many small elements.
- Use a 12-column grid on marketing surfaces and a `280px + fluid` dashboard shell.
- Diagonal cuts, streamer strips, and highlight blocks should lean upward from left to right by `-4deg` to `-9deg`.
- Cards should sit on white with lift shadows, not boxed grey borders.
- Large type can overlap image edges or white panels, but must stay readable.

## Shared component contract

All interactive controls use the single shared token `--control-h: 52px`. Controls may grow vertically only when their purpose requires multiple lines, but their base rhythm, padding, and hit target derive from `--control-h`.

### Buttons

Base: height `var(--control-h)`, horizontal padding `24px`, radius `--radius-pill`, body font `800`, no border, high contrast.

| State | Primary button | Quiet button |
|---|---|---|
| Default | `--ink` background, `--paper` text, `--sky` accent slash. | White background, `--ink` text, soft shadow. |
| Hover | Translate up `-2px`, stronger `--shadow-cut`, reveal brighter accent. | White with `--veil-blue`, translate up `-2px`. |
| Focus visible | `box-shadow: var(--focus-ring)`; no outline suppression unless ring is present. | Same visible ring. |
| Active | Translate `0`, scale `0.985`, background deepens. | Translate `0`, scale `0.985`. |
| Disabled | Opacity `0.45`, grayscale feel, `cursor: not-allowed`, no transform. | Same. |

### Form controls

Applies to `input`, `select`, `textarea`, `button`, checkbox, radio, range, and switch controls.

| State | Rule |
|---|---|
| Default | White surface, `--ink` text, soft inset line using `--line-air`, height `--control-h`. |
| Hover | Surface shifts to `--paper-warm`; line becomes `rgba(0,168,255,.32)`. |
| Focus / focus-within | Visible ring `var(--focus-ring)` and line `--sky`. |
| Active | Slight inner compression; active accent is `--sky`. |
| Disabled | Opacity `.48`, `not-allowed`, no hover transform. |

Checkboxes and radios are 22px but live inside a label row with min-height `--control-h`. Checked state uses `--sky` fill and `--ink` mark. Ranges use a 6px track, `--sky` progress, and a 22px thumb.

### Cards and panels

| State | Rule |
|---|---|
| Default | White or warm-white, radius `--radius-panel`, shadow `--shadow-lift`, generous padding. |
| Hover | Lift `-3px`; optional accent strip brightens. |
| Focus within | Apply `var(--focus-ring)` to the panel. |
| Active | Lift relaxes; accent strip compresses. |
| Disabled | Opacity `.52`; remove decorative motion. |

### Navigation

- Navigation items use pill geometry and the same `--control-h` vertical rhythm.
- Active route uses black text on `--leaf` or black text on `--sky` depending on context.
- Hover states must be visible through background change, not only color.
- Focus states use the same visible ring as controls.

### Tables and data rows

- Table rows are at least 52px tall.
- Use white cards and accent blocks instead of dense ruled grids.
- Numeric data is strong black; status chips use the three accents with black text.

## Imagery direction

Generated imagery should feel like premium launch-campaign photography pushed into graphic editorial collage: clear sky, fresh green, koinobori rising, open white architecture, vivid electric accents. Avoid hand-drawn kid illustration, toy-like carp, vintage paper texture, washed pastel, muddy gradients, and visible text inside images.

## Surface guidance

### Marketing landing

The landing page should sell a real product world: Aonami Launch OS, a platform for teams planning high-visibility seasonal activations. It should feel like a product an adult team would launch. Use one full-bleed hero image at top, large editorial headline, and sections about launch planning, route operations, sponsor inventory, and live signal capture.

### Product dashboard

The dashboard should look like a working operational console for the same product. It needs live status, event routes, audience signals, broadcast controls, sponsor/inventory progress, and field-team tasks. Use the same type, accent system, radius, and controls as the landing page.
