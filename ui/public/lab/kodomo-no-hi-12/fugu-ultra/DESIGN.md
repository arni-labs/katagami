# Windscale Design Language

Windscale is an original product design language for Kodomo no Hi tools: celebration planning software that treats wind, carp streamers, family ritual, and operational clarity as one system. It is not nostalgic craft pasted onto SaaS. It is a bright command surface where fabric movement, scale patterning, spring air, and festival logistics feel precise, generous, and alive.

## Product point of view

Windscale is built around three ideas:

1. **Wind as structure** — layouts use long diagonals, offset bands, and layered surfaces to suggest streamers crossing the sky. The composition should feel directional, not static.
2. **Festival clarity** — the system is expressive but never muddy. Deep indigo carries focus. White carries air. Vermilion, iris, and green are used sparingly as festival signals.
3. **Careful operations** — this language must support both a public marketing story and a real event dashboard. It should hold emotion and scheduling detail without switching personalities.

The language name is **Windscale**. All surfaces, copy, media, and components use that single name.

## Tokens

### Color

```css
:root {
  --ws-ink: #071326;
  --ws-ink-soft: #20314F;
  --ws-indigo: #102D68;
  --ws-indigo-2: #16468E;
  --ws-paper: #FFFDF7;
  --ws-cloud: #F5F8FB;
  --ws-mist: #E8EEF4;
  --ws-vermilion: #D83B18;
  --ws-iris: #6346B8;
  --ws-leaf: #218455;
  --ws-gold: #D99A20;
  --ws-danger: #B82116;
  --ws-focus: #28A8FF;
  --ws-disabled-bg: #E9EDF2;
  --ws-disabled-text: #7B8797;
}
```

**Usage rules**

- `--ws-paper` is the default page field.
- `--ws-ink` is primary text on light surfaces.
- `--ws-indigo` is the dominant dark panel and primary action color.
- `--ws-vermilion`, `--ws-iris`, and `--ws-leaf` are the three accents. They work like festival cords: visible, specific, never sprayed everywhere.
- `--ws-focus` is reserved for focus rings and must not be reused as decorative color.
- Avoid low-contrast pairings. Text on indigo is paper/white; text on paper is ink.

### Typography

Windscale uses two system-safe stacks so the HTML remains self-contained.

```css
--ws-font-display: ui-serif, Georgia, Cambria, "Times New Roman", serif;
--ws-font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--ws-font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;

--ws-size-xs: 0.78rem;
--ws-size-sm: 0.9rem;
--ws-size-md: 1rem;
--ws-size-lg: 1.15rem;
--ws-size-xl: clamp(1.5rem, 1.1rem + 1.4vw, 2.2rem);
--ws-size-2xl: clamp(2.4rem, 1.55rem + 3.1vw, 5.4rem);
--ws-size-3xl: clamp(3.6rem, 2.1rem + 5.5vw, 8rem);
--ws-leading-tight: 0.94;
--ws-leading-body: 1.58;
--ws-tracking-display: -0.045em;
--ws-tracking-label: 0.075em;
```

**Type behavior**

- Display type is serif, tightly tracked, and large enough to feel like fabric in wind.
- Body type is sans-serif, high-contrast, and always readable.
- Labels are uppercase, tracked, and compact.
- Numeric dashboard values use tabular numerals.

### Spacing

```css
--ws-space-1: 4px;
--ws-space-2: 8px;
--ws-space-3: 12px;
--ws-space-4: 16px;
--ws-space-5: 24px;
--ws-space-6: 32px;
--ws-space-7: 48px;
--ws-space-8: 72px;
--ws-space-9: 104px;
```

Spacing should feel airy. Major sections use at least `--ws-space-8` vertically on desktop and at least `--ws-space-6` on mobile.

### Radius

```css
--ws-radius-none: 0;
--ws-radius-sm: 16px;
--ws-radius-md: 24px;
--ws-radius-pill: 999px;
```

Cards use `--ws-radius-md`; controls use `--ws-radius-pill` unless the component is a text area or large panel.

### Elevation and shape

```css
--ws-shadow-soft: 0 24px 80px rgba(7, 19, 38, 0.14);
--ws-shadow-tight: 0 12px 34px rgba(7, 19, 38, 0.18);
--ws-panel-glow: 0 0 0 1px rgba(255,255,255,0.12), 0 26px 70px rgba(7,19,38,0.28);
```

No heavy outlines. Use shadow, contrast, and spacing to separate layers.

### Shared control height

```css
--ws-control-height: 48px;
--ws-focus-ring: 0 0 0 4px rgba(40, 168, 255, 0.38);
```

Every button, input, select, chip, switch label, checkbox row, radio row, and compact interactive control is built around `--ws-control-height`. Textareas use `min-height: calc(var(--ws-control-height) * 2.25)` but keep the same padding, radius, and focus behavior.

## Component system

### Button

Base:

```css
.ws-button {
  min-height: var(--ws-control-height);
  border: 0;
  border-radius: var(--ws-radius-pill);
  padding: 0 22px;
  font: 800 var(--ws-size-sm)/1 var(--ws-font-body);
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease, color .18s ease, opacity .18s ease;
}
```

States:

- **Default**: primary background `--ws-indigo`, text `--ws-paper`, soft shadow.
- **Hover**: background `--ws-indigo-2`, translate up 1px, tighter shadow.
- **Focus with visible ring**: keep hover/default color and add `box-shadow: var(--ws-focus-ring), var(--ws-shadow-tight)`.
- **Active**: translate down 1px and reduce shadow.
- **Disabled**: background `--ws-disabled-bg`, text `--ws-disabled-text`, no shadow, `cursor: not-allowed`, opacity 1.

Secondary buttons are paper on indigo panels or cloud on paper fields. Destructive buttons use `--ws-danger` only for confirmed destructive actions.

### Text input, search input, email input, number input, date input, select

Base:

```css
.ws-field {
  min-height: var(--ws-control-height);
  width: 100%;
  border: 0;
  border-radius: var(--ws-radius-pill);
  background: var(--ws-cloud);
  color: var(--ws-ink);
  padding: 0 18px;
  font: 700 var(--ws-size-sm)/1 var(--ws-font-body);
  box-shadow: inset 0 0 0 1px rgba(16,45,104,.12);
  transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
}
```

States:

- **Default**: cloud fill, ink text, subtle inset line.
- **Hover**: background `#EEF4FA`; inset line darkens slightly.
- **Focus with visible ring**: paper fill and `box-shadow: var(--ws-focus-ring), inset 0 0 0 2px var(--ws-indigo-2)`.
- **Active**: translate down 1px while focused or pressed.
- **Disabled**: disabled fill/text, no transform, not-allowed cursor.

Select controls include a custom chevron using CSS background or a small inline mark; never browser-default grey styling.

### Textarea

Textarea uses `.ws-field` plus:

```css
min-height: calc(var(--ws-control-height) * 2.25);
border-radius: var(--ws-radius-md);
padding: 15px 18px;
line-height: 1.45;
resize: vertical;
```

It shares the same hover, focus, active, and disabled states as text inputs.

### Checkbox and radio rows

The row is the control. The row height is `--ws-control-height`; the indicator sits inside it.

States:

- **Default**: cloud row, ink label, custom 22px indicator with inset line.
- **Hover**: row shifts to mist/cloud and indicator line darkens.
- **Focus with visible ring**: ring around the whole row.
- **Active**: row compresses by translating down 1px.
- **Checked**: indicator fills indigo; checkbox shows a paper tick, radio shows a paper center dot.
- **Disabled**: muted row, muted label, no transform.

### Switch

Switch row height is `--ws-control-height`. Track is 46px × 26px; thumb is 20px. Checked track uses `--ws-leaf`, unchecked track uses muted indigo.

States: same as checkbox row, with a visible focus ring around the whole row.

### Range

Range input occupies `--ws-control-height`. Track is indigo-mist; thumb is a 24px paper disk with indigo fill/shadow. Focus adds the same focus ring to the input box. Disabled range mutes thumb and track.

### Cards and panels

Cards are fabric panels, not bordered boxes.

- Light cards: paper or cloud fill, radius md, soft shadow.
- Dark cards: indigo fill, paper text, panel glow.
- Operational cards can include a diagonal top accent, but never a decorative border frame.

### Navigation

Navigation uses pill-shaped active states and strong spacing. Active nav items use indigo on light surfaces or paper on dark surfaces. Hover states should be obvious but calm.

### Tables

Tables are used only for operational detail. Header labels are uppercase, tracked, and muted. Rows sit on alternating paper/cloud fills with generous row height. Focusable row actions follow button/control rules.

## Layout guidance

### Landing surface

- Use one full-bleed hero image at the top, with content layered in a high-contrast panel or over a safe gradient scrim.
- Avoid spec-sheet language, swatches, token chips, and component galleries.
- The product story should feel real: planning routes, family groups, volunteers, weather windows, public festival readiness.
- Use large display type and diagonal streamer bands to make the page feel wind-driven.

### Dashboard surface

- The dashboard should feel like an operations cockpit for a real Kodomo no Hi event.
- Use dense-but-readable cards, schedule lists, risk signals, volunteer controls, and route health.
- Keep the same Windscale palette and control system as the landing page.
- Dashboard density comes from hierarchy and grouping, not tiny type.

### Responsive behavior

- Desktop max content width: 1180px–1240px.
- Marketing sections collapse to single-column below 820px.
- Dashboard panels collapse from 12-column grid to 1-column below 820px.
- Controls retain the same height token on all breakpoints.

## Imagery direction

Generated imagery must be created from text prompts only with `xai/grok-imagine-image`, saved in `./media/`, and not inspected or fed back into an image model. Windscale imagery should be cohesive:

- bright spring air;
- deep indigo carp streamers;
- vermilion, iris, and fresh green accents;
- paper, silk, and scale textures;
- premium editorial realism with a small poetic/surreal lift;
- no text, logos, UI labels, or token/specimen framing.

Generated files:

- `media/windscale-hero.png` — full-bleed landing hero panorama.
- `media/windscale-planning.png` — landing feature/product-world image.
- `media/windscale-ops.png` — dashboard operations/product-world image.

## Accessibility and contrast

- Body text on light surfaces uses `--ws-ink`; body text on dark surfaces uses `--ws-paper`.
- Accent colors are not used for small body text on white unless paired with a dark supporting background.
- All focusable controls must expose a visible focus ring using `--ws-focus-ring`.
- Disabled controls remain readable but clearly inactive.
- Motion is subtle and disabled under `prefers-reduced-motion`.
