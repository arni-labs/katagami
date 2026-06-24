# Takinobori

Takinobori is a Katagami language for Kodomo no Hi products: civic, bright, kinetic, and made from the image of a carp streamer climbing from river wind into dragon weather. Its signature mechanic is the **wind rung**: content rises in stacked vertical bands, then opens into cloth-like horizontal movement. The language feels like crisp washi, black festival ink, lacquered event hardware, and clean family logistics.

## Point Of View

Takinobori treats growth as a route. Interfaces do not float as decorative cards; they sit in tonal terraces, like riverbanks, check-in tables, streamer poles, and waterfall ledges. A page should feel ready for real families arriving at a festival: clear wayfinding, generous breathing room, decisive actions, and small ceremonial accents.

Use concrete product copy: family passes, craft sessions, river route, volunteer crews, safety check, wristband batches, parade cadence, pickup window. Do not use lorem, generic startup claims, token galleries, or specimen framing.

## Signature Mechanic

**Wind rungs**

- Primary layouts stack vertical rhythm first: mast columns, route ladders, queue lanes, schedule rungs.
- Motion and decorative structure travel horizontally only after the vertical rhythm is established, like cloth catching wind.
- Important data uses a raised rung: a stronger tonal surface, heavier type, and one accent mark. Do not use highlight edges.
- Section separation is tone, scale, and space. Borders are not part of the visual identity.

## Palette

At most three accents appear in any artifact. Semantic colour roles reuse these accents and stay visually secondary.

```css
:root {
  --bg: #fff;
  --surface: #f5f7f3;
  --surface-strong: #e9efe5;
  --surface-ink: #000;
  --text: #000;
  --muted: #4b5149;
  --border: transparent;
  --accent: #e63b1e;       /* vermilion */
  --accent-blue: #2657d9;  /* iris */
  --accent-green: #23a455; /* young leaf */
  --on-accent: #fff;
  --success: #23a455;
  --warning: #e63b1e;
  --error: #e63b1e;
  --info: #2657d9;
  --ring: #2657d9;
}
```

Neutral temperature is warm white and green-tinted washi. Use pure black for text when the ground is light. Do not place light text over bright sky or pale imagery without a tonal panel behind it.

## Type

Takinobori uses a native stack so every HTML file can open directly.

```css
--font-display: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif CJK JP", Georgia, serif;
--font-body: "Avenir Next", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
--font-kanji: "Yuji Syuku", "Hiragino Mincho ProN", "Yu Mincho", serif;
```

Scale:

- Display 80 / 0.92, 700 weight, letter spacing 0
- H1 64 / 0.95, 700 weight, letter spacing 0
- H2 42 / 1.02, 700 weight, letter spacing 0
- H3 28 / 1.1, 700 weight, letter spacing 0
- Body 18 / 1.65, 500 weight
- Dense 15 / 1.45, 600 weight
- Table 15 / 1.45, 600 weight
- Label 14 / 1.1, 800 weight

Mobile steps reduce display sizes by media query, never by viewport math. Body copy remains at least 17px.

## Spacing

```css
--space-1: 8px;
--space-2: 16px;
--space-3: 24px;
--space-4: 32px;
--space-5: 48px;
--space-6: 72px;
--space-7: 112px;
--space-8: 160px;
```

Titles always receive air above them. Panels use generous internal padding: 24px minimum, 48px where the panel anchors a major section.

## Radius

Only these radii are valid:

```css
--radius-none: 0;
--radius-s: 16px;
--radius-m: 24px;
--radius-pill: 9999px;
```

Use 24px for large tonal panels, 16px for compact controls and repeated items, 9999px for pills and circular handles, and 0 for full-bleed bands or deliberate mast geometry.

## Shared Control Token

Every control uses one height token.

```css
--control-h: 56px;
```

Buttons, inputs, selects, segmented options, toggles, search fields, and compact toolbar controls align to `--control-h`. Textareas use `min-height: calc(var(--control-h) * 2)` while keeping the same padding, radius, type, and state logic.

## State Matrix

All interactive elements share one matrix. The primary button is the only visually dominant command in a set.

| State | Button | Quiet Button | Input / Select / Textarea | Checkbox / Radio / Toggle | Link |
| --- | --- | --- | --- | --- | --- |
| Default | Vermilion fill, white text, no border, 9999 radius | Washed surface fill, black text, no border | Washed surface fill, black text, no border, inset tonal base | Washed surface track, black or accent mark | Black text with vermilion underline block on hover only |
| Hover | Fill deepens by 8%, content lifts 1px | Surface deepens, content lifts 1px | Surface deepens, placeholder remains high contrast | Track deepens, thumb/mark warms | Underline block appears |
| Focus | Visible 3px iris ring outside element, 3px offset | Same iris ring | Same iris ring | Same iris ring | Same iris ring with rounded pill shape |
| Active | Content settles, fill deepens by 12% | Content settles, surface deepens | Inset base grows stronger | Thumb compresses slightly | Underline block deepens |
| Disabled | Surface #e9efe5, text #747a71, no lift, cursor not allowed | Same | Same, placeholder #747a71 | Same, mark removed | #747a71, no underline |

Focus must be visible. Do not rely on colour shift alone.

## Components

Components are built once from tokens:

- **Mast nav**: full-width, no border, white or translucent white ground, one primary action.
- **Hero**: `100vw` by `100svh`; image uses `background-image: var(--hero-image)`. Text sits over a tonal veil or glass panel, not a generic fade.
- **Wind panel**: tonal surface with 24px radius, no border. It can contain one raised rung surface, but cards never nest inside cards.
- **Metric rung**: compact 16px radius tonal block, large number, dense label, one small accent mark from the three allowed accents.
- **Route list**: schedule rows separated by tone shifts and space, never divider lines.
- **Table**: 15px minimum row text, alternating tonal row backgrounds, hidden non-essential columns on mobile.
- **Forms**: every label, input, select, textarea, checkbox, radio, range, and toggle is explicitly styled; browser defaults are hidden or reset.
- **Glass overlay**: for immersive surfaces only; translucent white with blur, black text, and accent callouts.

## Motion

Motion should make the route understandable: first arrival, then lift, then reveal. Use CSS/JS progressive enhancement: the settled layout is visible before scripts run. Respect `prefers-reduced-motion`; reduce transforms and scroll-bound animation to instant state changes.

## Art Direction

Generated landing/dashboard imagery uses tactile washi collage plus premium editorial product photography: real fabric, ink, paper, clean white space, and the three accents. The immersive page is separate: pure real-time flat-shaded low-poly 3D, no still images or video.

## Naming

Use `Takinobori` consistently as the language name. It is a concrete motif, not a mood or technical identifier.
