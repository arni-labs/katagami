# Nobori

Nobori is a bright civic design language for Kodomo no Hi products. Its signature mechanic is the wind-lift: large white fields, black editorial type, and three vivid highlight colours that rise through the composition like koinobori in early-summer air.

## Point Of View

Nobori treats the festival as grown-up launch energy, not nostalgia or toy graphics. It uses confident poster scale, civic clarity, and a visible sense of lift. Surfaces stay open and white. Accents act as precise highlighter strokes for status, priority, and movement.

The language is built for products that coordinate real-world celebration: routes, permits, family programs, volunteer teams, weather windows, and public spaces.

## Naming

- Name: Nobori
- Form: one distinctive cultural noun
- Motif: festival streamers and rising banners
- Product voice: concrete, operational, optimistic
- Never use: childish mascot language, generic startup claims, pastel softness, muddy seasonal washes

## Credits

- Japanese koinobori craft, tradition: carp streamer forms, fukinagashi wind language, and Kodomo no Hi civic imagery.
- Japanese festival poster composition, tradition: strong blocks of type, clear hierarchy, and bright public-event colour.
- Low-poly game environments, medium: used only for the immersive real-time 3D surface.

## Tokens

All colour is exposed through the Katagami role variables. The three accent colours are the only high-chroma colours in the system.

```css
:root {
  --bg: #ffffff;
  --surface: #f6faf7;
  --surface-strong: #eef6f0;
  --text: #000000;
  --muted: #48524b;
  --border: #dfe9e2;
  --accent: #00a6ff;
  --accent-2: #46f04f;
  --accent-3: #ff3f7a;
  --on-accent: #000000;
  --success: #46f04f;
  --warning: #ff3f7a;
  --error: #ff3f7a;
  --info: #00a6ff;
}
```

### Palette Roles

- `--bg`: pure white air and the default reading surface.
- `--surface`: a cool green-white tone for panels and dashboard bands.
- `--surface-strong`: a stronger tonal separation when elevation is needed.
- `--text`: pure black for crisp contrast.
- `--muted`: cool neutral text for secondary labels.
- `--border`: a role token for focus math and exported themes. It is not used as a visible grey outline in the core language.
- `--accent`: electric sky blue for primary actions, info, links, and route focus.
- `--accent-2`: fresh green for success, open capacity, and active progress.
- `--accent-3`: hot coral for urgency, exceptions, and the smallest attention hits.

## Typography

Nobori uses heavy geometric display type with a strong Japanese sans face for kanji and kana. It avoids delicate editorial italics and generic oversized startup serif headlines.

```css
--font-display: "Arial Black", "Hiragino Kaku Gothic ProN", "Yu Gothic", system-ui, sans-serif;
--font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-jp: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif;

--text-xs: 0.88rem;
--text-sm: 0.94rem;
--text-base: 1rem;
--text-md: 1.12rem;
--text-lg: 1.35rem;
--text-xl: 1.9rem;
--text-2xl: 3rem;
--text-3xl: 5.6rem;
```

Rules:

- Body text is 17px minimum.
- Table rows are 14.5px minimum.
- Display text is heavy, compact, and black.
- Japanese text uses `--font-jp` at matching weight.
- Secondary text keeps high contrast and never sits light-on-light.

## Spacing

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.5rem;
--space-6: 2rem;
--space-7: 3rem;
--space-8: 4.5rem;
--space-9: 6rem;
```

Rules:

- Titles always receive generous space above them.
- Large sections breathe with white bands, not outlines.
- Mobile stacks to one column.
- Ultra-wide content is capped and centered unless it is the full-bleed hero or fixed 3D canvas.

## Radius

Only these radii are allowed:

```css
--radius-0: 0;
--radius-sm: 16px;
--radius-lg: 24px;
--radius-pill: 9999px;
```

Use one coherent geometry. Product panels use `24px`, controls use `9999px`, compact marks use `16px`, and hard editorial blocks may use `0`.

## Control System

All interactive controls use one shared height token.

```css
--control-height: 48px;
--control-pad-x: 20px;
--ring: 0 0 0 4px color-mix(in srgb, var(--accent) 34%, transparent);
```

Controls:

- Buttons, inputs, selects, date fields, search fields, textareas, range tracks, checkboxes, radios, segmented controls, and icon controls are explicitly styled.
- Textarea minimum height is a multiple of `--control-height`.
- Checkbox and radio hit areas are `--control-height` square.
- Labels are centered optically and never crowded.
- One primary button is visually dominant. Secondary controls remain quieter.

## State Matrix

Every control implements these states from the same tokens.

| State | Background | Text | Shape | Motion | Focus |
| --- | --- | --- | --- | --- | --- |
| Default | role surface or accent | role text or on-accent | shared control shape | settled | none |
| Hover | stronger tonal surface or accent-2 | same contrast | same | lift 1px or colour shift | none |
| Focus visible | original state | original contrast | same | none | visible blue ring with offset |
| Active | compressed tonal state | same contrast | same | translate 1px | ring retained if focused |
| Disabled | low contrast surface | muted text | same | none | no pointer events |

## Surfaces

Nobori separates hierarchy with tone, scale, and space instead of borders.

- Page ground: `--bg`
- Quiet band: `--surface`
- Strong band: `--surface-strong`
- Glass panel: white at high opacity with backdrop blur and a black text scrim when placed over bright media
- Data band: alternating tonal rows, never grey rule lines
- Accent mark: short, meaningful bars, blobs, or filled labels using one of the three accent colours

No card receives a single accent edge. If an accent appears, it is part of a complete mechanic: route mark, capacity fill, status label, or moving wind field.

## Components

Components are built once from tokens and reused across landing, dashboard, and immersive overlays.

- Primary action: pill, `--control-height`, sky blue background, black label.
- Secondary action: pill, tonal surface, black label.
- Status label: pill, high-chroma fill only for active status. Neutral statuses use tone and black type.
- Panel: `24px` radius, tonal surface, generous padding, no visible border.
- Metric tile: white or surface tone, large black value, small accent mark as a filled shape.
- Table: tonal rows, strong type, hidden optional columns on mobile.
- Form field: full custom appearance, same control height, visible focus ring.
- Navigation item: quiet text by default, filled tonal or accent state when current.

## Motion

Motion means lift and reveal.

- Default render is the final settled state with no JavaScript.
- JavaScript may add a hidden start state behind a class on `<html>`.
- Reveals move upward a short distance and settle quickly.
- Reduced motion removes transforms and keeps content visible.
- The immersive page uses native scroll as a camera cue, never scroll hijacking.

## Imagery

Landing and dashboard imagery use bright editorial illustration with crisp shapes and subtle print texture. They are not low-poly and do not mimic the immersive page. The immersive page is pure real-time 3D with no generated stills or video blended into the world.

## Accessibility

- Black body text on white or high-opacity white.
- Never place light text over light sky.
- Focus rings are visible and consistent.
- Controls retain shape and height across states.
- Motion respects `prefers-reduced-motion`.
- Dashboard columns collapse before horizontal overflow.
