# Nobori

Nobori is a bright, adult Kodomo no Hi language built around one mechanic: wind-ribbons. Large white air, strong black masthead type, and solid highlighter bands catch the rhythm of koinobori without turning the product into festival decoration.

## Point of View

Nobori is for public-facing products that need hope, motion, and operational confidence at once: community festival planning, youth programs, civic calendars, family services, and cultural launches. The system treats colour as signal. Most of the interface stays white or cool-leaf neutral, then three vivid accents arrive as precise marks: sky, leaf, and ume.

The visual character is grown-up graphic design: editorial cropping, open fields, exact alignment, oversized display type, and angled solid ribbons that imply wind. Components never depend on borders for structure. Tone, space, shadow, and type create hierarchy.

## Name

Nobori is a concrete cultural noun from the streamer and banner world of Kodomo no Hi. It is short enough to work as a masthead and specific enough to avoid a generic seasonal language.

## Core Tokens

```css
:root {
  --bg: #ffffff;
  --surface: #f4f8f0;
  --surface-strong: #eaf3e6;
  --text: #050505;
  --muted: #4b5a54;
  --border: #dce7d8;
  --accent: #00a8ff;
  --accent-leaf: #35f866;
  --accent-pop: #ff2e7e;
  --on-accent: #050505;
  --success: #35f866;
  --warning: #ff2e7e;
  --error: #ff2e7e;
  --info: #00a8ff;

  --font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-display: "Arial Black", "Hiragino Sans", "Yu Gothic", Meiryo, ui-sans-serif, system-ui, sans-serif;
  --font-jp: "Hiragino Sans", "Yu Gothic", Meiryo, ui-sans-serif, system-ui, sans-serif;

  --text-xs: 0.875rem;
  --text-sm: 0.9375rem;
  --text-base: 1.0625rem;
  --text-lg: 1.25rem;
  --text-xl: 1.625rem;
  --text-2xl: clamp(2rem, 5vw, 5.8rem);
  --text-3xl: clamp(3.8rem, 10vw, 11rem);

  --space-1: 0.5rem;
  --space-2: 0.75rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;
  --space-6: 3rem;
  --space-7: 4.5rem;
  --space-8: 7rem;

  --radius-control: 16px;
  --radius-panel: 24px;
  --radius-pill: 9999px;
  --control-height: 52px;
  --focus-ring: 0 0 0 4px rgba(0, 168, 255, 0.28);
  --shadow-soft: 0 24px 70px rgba(5, 5, 5, 0.12);
}
```

## Accent Discipline

Nobori uses exactly three accent colours.

- Sky signal: `#00A8FF`, used for primary action, data focus, route markers, and the main highlighter ribbon.
- Leaf signal: `#35F866`, used for success, available capacity, and growth moments.
- Ume signal: `#FF2E7E`, used for urgency, warning, special dates, and sparse heat.

No other accent colours are introduced. Semantic roles map to these three signals.

## Typography

Display text uses `--font-display`, black weight, tight optical rhythm, and `letter-spacing: -0.02em`. Japanese masthead phrases use `--font-jp` at heavy weight. Body text starts at 17px and stays high contrast against its surface. Tables use 15px minimum rows with strong black labels and muted secondary values.

## Geometry

The system uses one rounded geometry family:

- `0` for full-bleed edges, tables, and hard editorial crops.
- `16px` for controls.
- `24px` for panels and media wells.
- `9999px` only for deliberate pills, status capsules, and round toggles.

No arbitrary intermediate radius is allowed.

## Surface Model

Surfaces separate by tone, scale, and shadow. The default field is white. Secondary panels use cool leaf neutral. Emphasized panels use the stronger cool-leaf surface. Borders are not used as the main separator, and cards never receive a single highlighted top, side, or bottom edge.

## Signature Mechanic

Wind-ribbons are solid blocks of accent colour, clipped with shallow diagonal geometry and placed behind or beside content as meaning-bearing direction. They are not decorative stripes. Each ribbon marks route flow, launch windows, lift, or a key civic moment. Ribbons can be blue, green, or hot pink, but never all three at equal volume in one small area.

## Shared Controls

All controls use the shared `--control-height` token. Labels are centred optically, padding is generous, and every state is explicit.

### Button Matrix

- Default: height `var(--control-height)`, radius `16px`, centred label, black text on quiet surface or black text on sky accent for primary.
- Hover: primary shifts to leaf accent; quiet buttons lift with a stronger tonal surface.
- Focus: visible `--focus-ring` plus a 2px black outline offset outside the control.
- Active: translate down 1px and reduce shadow.
- Disabled: opacity `0.44`, no pointer events, no lift.

### Input Matrix

- Default: height `var(--control-height)`, radius `16px`, black text, white or cool-leaf surface, no visible browser default.
- Hover: surface moves one tone stronger.
- Focus: visible sky focus ring, black outline, caret in sky accent.
- Active: same as focus, without layout shift.
- Disabled: cool neutral surface, muted text, opacity `0.54`.

### Select, Textarea, Checkbox, Radio, Toggle

Selects share the control height and use a custom SVG chevron background. Textareas use the same radius and padding with a minimum height of 132px. Checkboxes and radios are drawn from CSS, not browser defaults. Toggles are pill tracks with sky/leaf fill and a white knob.

## Component Recipes

- Masthead: open nav on the page field, never trapped inside a floating pill or card.
- Hero: full-viewport image, `background-image: var(--hero-image)`, solid translucent scrim shape for contrast, never a gradient scrim.
- Product panel: tonal surface, 24px radius, generous padding, shadow only when it needs elevation.
- Stat: black display number, muted noun, optional tiny accent ribbon as a background plate.
- Table: no vertical borders, tonal row states, controls clipped to the shared height.
- Form group: label above control, 8px gap, helper copy in muted 15px text.
- Status capsule: 9999px radius, high-contrast text, one accent family per state.

## Motion

The settled state is visible without JavaScript. Motion is opt-in through a class added by inline script. Reveals travel upward with a small wind-like delay. Reduced-motion users get the finished state without transforms.

## Responsive Rules

Layouts are built with `minmax(0, 1fr)` and `min-width: 0`. Mobile stacks to one column around 390px. Non-essential nav links and table columns are hidden on small screens. Ultra-wide content is capped and centred, while the landing hero remains full-bleed.

## Art Direction for Generated Media

Landing and dashboard imagery should be editorial, photographic, and graphic: real adults, real festival operations, bright open air, white sky, fresh greenery, crisp city riverside, koinobori in motion, and accents limited to sky blue, leaf green, and ume pink. It must not be low-poly, toy-like, pastel, muddy, or childish.

## Immersive Art Direction

The immersive surface is separate from generated media. It uses one cohesive real-time low-poly game world: terrain, river, waterfall, distant scenery, moving koinobori, atmosphere, and camera reveal. The low-poly look belongs only to that showpiece and does not leak into product imagery.
