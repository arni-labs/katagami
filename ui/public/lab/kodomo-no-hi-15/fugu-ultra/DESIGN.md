# Nobori

Nobori is a Katagami design language for Kodomo no Hi launches, civic festivals, and family-facing cultural products that need to feel bright, capable, and grown up. Its signature mechanic is the climb band: broad vertical and diagonal fields of open white interrupted by vivid highlighter strokes that feel like carp streamers catching wind and rising.

Nobori is not cute. It is clean daylight, crisp greenery, civic confidence, and one hot marker line used with restraint.

## Ownable idea

A product surface should feel like a clear early-summer field where important actions rise above the page. The layout has open air, strong masthead type, and one repeated motion idea: content climbs in bands from low ground to high signal.

## Name

**Nobori** is a concrete Japanese festival noun connected to banners, rising marks, and koinobori. It is one word, culturally matched to the subject, and not an adjective.

## Palette

All surfaces use role variables so palette swaps remain possible. The accent inventory is exactly three vivid colours.

```css
:root {
  --bg: #fffdf7;
  --surface: #eefcf5;
  --surface-strong: #ffffff;
  --surface-sky: #e9fbff;
  --text: #071315;
  --muted: #526468;
  --border: #d9eee7;
  --accent: #00a7ff;
  --on-accent: #001014;
  --success: #21e66a;
  --warning: #ff3d6e;
  --error: #ff3d6e;
  --info: #00a7ff;
}
```

### Accent roles

- **Nobori blue** `--accent`, `--info`: primary action, water, sky, data emphasis.
- **Mame green** `--success`: growth, open capacity, completion.
- **Hi coral** `--warning`, `--error`: urgency, deadlines, one hot celebratory pop.

Do not introduce other accent hues. Tonal surfaces are tints of the neutral ground, sky, and green family. Surfaces are separated by tone, scale, shadow, and whitespace rather than visible borders.

## Type

Nobori uses a heavy grotesk masthead paired with a readable product sans. Japanese copy uses the heaviest available local Japanese gothic face.

```css
:root {
  --font-display: "Arial Black", "Avenir Next Condensed", "Helvetica Neue", system-ui, sans-serif;
  --font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-jp: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif;
  --tracking-display: -0.02em;
  --body-size: 17px;
}
```

### Scale

- Display one: clamp(64px, 11vw, 176px), line-height 0.84.
- Display two: clamp(42px, 6vw, 96px), line-height 0.9.
- Section title: clamp(32px, 4vw, 64px), line-height 0.98.
- Product heading: 24px to 32px, line-height 1.08.
- Body: 17px to 19px, line-height 1.55.
- Table rows and dense data: 15px minimum.

Display text uses optical tight tracking. Body never goes below 17px on marketing surfaces. Dense dashboard rows stay 15px or larger.

## Spacing

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 72px;
  --space-9: 96px;
  --space-10: 128px;
}
```

Titles always receive padding above them. Layouts breathe. If a section looks empty, add meaningful scale, imagery, or data rather than boxes.

## Radius

Nobori uses one coherent geometry.

```css
:root {
  --radius-none: 0;
  --radius-small: 16px;
  --radius-panel: 24px;
  --radius-control: 9999px;
}
```

Use `24px` for large panels and imagery, `16px` for small check wells and compact media labels, `9999px` for buttons, pills, toggles, and chips, and `0` for full-bleed hero planes or intentional poster cuts. Do not use arbitrary intermediate radii.

## Shared control height

Every control uses one shared height token.

```css
:root { --control-h: 52px; }
```

Buttons, inputs, selects, search fields, date fields, segmented controls, and compact dashboard actions use `min-height: var(--control-h)`. Textareas use the same vertical rhythm with `min-height: calc(var(--control-h) * 2.4)`.

## State matrix

All interactive controls share this matrix. The primary action is always visually clear; secondary actions are quieter but use the same height and shape.

| State | Primary button | Secondary button | Text input and select | Checkbox, radio, switch |
|---|---|---|---|---|
| Default | Blue fill, dark centred label, pill shape | White or tonal fill, dark centred label, pill shape | White fill, dark text, no browser default chrome | White well with tonal shadow |
| Hover | Blue fill deepens by mixing toward text, lift by 1px | Tonal fill brightens, lift by 1px | Surface shifts toward sky tone | Track brightens with blue or green |
| Focus visible | 3px blue outer outline plus 3px light offset ring | Same visible ring | Same visible ring; label remains readable | Same visible ring around the whole control |
| Active | Compress by 1px, shadow reduced | Compress by 1px, shadow reduced | Inner tone deepens, no layout jump | Knob or mark compresses within the same well |
| Disabled | Neutral fill, muted text, no lift, cursor not allowed | Neutral fill, muted text, no lift | Neutral fill, muted text | Neutral fill, muted mark |

Implementation selector baseline:

```css
button,
input,
select,
textarea {
  font: inherit;
  color: var(--text);
  border: 0;
  border-radius: var(--radius-control);
}

button,
input,
select { min-height: var(--control-h); }

textarea {
  min-height: calc(var(--control-h) * 2.4);
  border-radius: var(--radius-panel);
  resize: vertical;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[role="button"]:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
```

All checkboxes, radio buttons, switches, ranges, selects, search fields, and textareas must be explicitly styled. No visible browser default controls are acceptable.

## Components

Components are built once from tokens and reused across landing, immersive presentation, and dashboard.

- **Masthead:** open nav across the header, never boxed inside a floating pill or card.
- **Climb band:** large tonal panel or full-bleed plane that rises behind content. It may use blue, green, or coral, but never adds a single accent edge to a card.
- **Glass panel:** translucent white or ink scrim with blur, used only when readability must be protected over imagery or 3D.
- **Signal number:** oversized metric with one accent underline drawn as a filled shape, not a border.
- **Action row:** primary button plus quiet secondary controls, same shape and height.
- **Data river:** dashboard chart motif where data moves as broad blue and green streams, not thin default chart lines.

## Landing rules

The landing opens with a true full-viewport full-bleed hero. The hero image is always swappable through `background-image: var(--hero-image)`. Copy sits on a tonal or glass readability plate, not on a lazy gradient scrim. The headline must look like Nobori: compressed, high-impact, climbing, and culturally grounded without becoming decorative costume.

Below the hero, sections are real product scenes: launch planning, family registration, volunteer coordination, river route operations, and sponsor reporting. Never present token swatches, specimen cards, or design documentation as the landing content.

## Immersive rules

The immersive surface translates Nobori into a pure real-time low-poly world. It keeps the same three accents, white daylight clarity, heavy type, and climb mechanic, but its imagery is generated by meshes, materials, light, fog, and camera movement only. No still or video media is blended into the scene.

## Dashboard rules

The dashboard is operational and believable. It uses the same accents for actions and states, the same control height, and the same panel radius. It uses tone blocks and whitespace instead of border boxes. Tables hide non-essential columns on mobile and rows stay legible.

## Motion

Settled content is visible without JavaScript. Motion is a progressive enhancement gated by a class set on `html`. Motion should express rising wind, reveal, and readiness. Respect `prefers-reduced-motion`; do not hide content by default.

## Art direction

Landing and dashboard imagery use premium editorial product photography crossed with bold graphic poster composition: clear white daylight, crisp fabric arcs, fresh leaves, civic operations objects, and highlighter accents. It is not low-poly and not childish. The immersive page has its own live low-poly game-world expression, but it still follows the same Nobori colour, type, and spacing system.

## Credits

- Japanese koinobori and nobori festival craft: cultural source for subject, motion, and climbing motif.
- Contemporary civic poster design: influence for open white fields, strong mastheads, and highlighter accents.
- Editorial product photography: influence for the landing and dashboard media style.
