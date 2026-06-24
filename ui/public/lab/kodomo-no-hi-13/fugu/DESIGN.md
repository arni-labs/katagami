# Nobori

Nobori is a Katagami design language for clear early-summer launches: koinobori climbing through open air, river light, fresh leaves, and one decisive hot mark. The signature mechanic is the **ascent cut**: generous white fields interrupted by crisp rising bands, translucent tone plates, and bright highlighter accents that make information feel lifted rather than boxed.

## Point of view

Nobori is adult, bright, and graphic. It uses Kodomo no Hi as a product-world metaphor for courage, growth, and public launch momentum, not as toy decoration. The system is built from open white space, clean ink typography, vivid sky-blue leadership, fresh-green confirmation, and a coral pop reserved for moments that need heat.

## Language name

- Name: **Nobori**
- Type: one evocative noun, drawn from the carp-streamer motif and festival lift.
- Tone: masthead-like, cultural, concrete, not an adjective and not an identifier.

## Signature mechanic: ascent cut

1. Large white or near-white grounds carry most of the page.
2. Sections are separated by tone, scale, and diagonal/rising composition, never by decorative borders.
3. Accent colour appears as highlighter fields, numeric emphasis, active controls, and small motion cues.
4. Forms and dashboard controls sit on one shared height and one radius family so the product feels engineered.
5. Illustrative surfaces use clean editorial imagery; immersive surfaces use separate flat-shaded low-poly 3D, sharing only the tokens and mood.

## Role tokens

These defaults can be replaced by `injectTheme` through role variables. Every composition reads colour through these roles first.

```css
:root {
  --bg: #fffef8;
  --surface: #f2fbf4;
  --text: #07130f;
  --muted: #53645d;
  --border: #d9eadf;
  --accent: #00a7ff;
  --on-accent: #ffffff;
  --success: #3dff6f;
  --warning: #ff4f7b;
  --error: #d91445;
  --info: #00a7ff;

  --sky: #00a7ff;
  --leaf: #3dff6f;
  --coral: #ff4f7b;
  --ink: #07130f;
  --paper: #fffef8;
  --mist: #eaffef;

  --radius-flat: 0;
  --radius-panel: 24px;
  --radius-control: 9999px;
  --radius-card: 16px;

  --control-height: 52px;
  --space-1: 6px;
  --space-2: 10px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 36px;
  --space-6: 56px;
  --space-7: 84px;
  --space-8: 128px;

  --font-display: "Archivo Black", "Arial Black", system-ui, sans-serif;
  --font-body: Inter, "Hiragino Sans", "Yu Gothic", system-ui, sans-serif;
  --font-kanji: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
}
```

## Accent policy

Nobori uses exactly three accent colours.

| Accent | Token | Use |
|---|---|---|
| Electric sky | `--sky`, `--accent`, `--info` | Primary actions, active navigation, hero marks, selected data |
| Fresh leaf | `--leaf`, `--success` | Growth, positive status, completion, safe confirmations |
| Hot coral | `--coral`, `--warning` | Urgent highlight, campaign heat, sparse contrast punch |

No other accent colour is introduced. Neutral variation comes from paper, ink, and pale green tone surfaces.

## Typography

- Display: Archivo Black, heavy, tight, confident, `letter-spacing: -0.04em` to `-0.02em`.
- Body: Inter, 17px minimum, high contrast.
- Japanese display: Noto Sans JP or platform Japanese gothic, heavy weight, used for `こどもの日` and `鯉のぼり` moments.
- Small utility text stays at 14.5px or larger in tables; UI labels never drop below 13px when purely structural.
- Hero headlines avoid generic italic-serif startup styling.

## Spacing and radius

- Spacing is generous. Titles receive top padding and never touch container edges.
- Mobile stacks to a single column; every grid child uses `min-width: 0`.
- Ultra-wide content is capped and centred except full-bleed heroes.
- Radius values are limited to `0`, `16px`, `24px`, and `9999px`.
- Surfaces are separated by tone, scale, and placement, not nested cards.

## Control system

All controls use `--control-height: 52px`, centred labels, `--radius-control: 9999px`, and optical padding.

### Shared control base

```css
.button,
.input,
.select,
.textarea,
.checkbox-control,
.segmented-control {
  min-height: var(--control-height);
  border-radius: var(--radius-control);
  font: 800 15px/1 var(--font-body);
  color: var(--text);
  background: var(--paper);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 14%, transparent);
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease, opacity .18s ease;
}
```

### State matrix

| State | Primary button | Quiet button | Text input and select | Checkbox and radio | Switch |
|---|---|---|---|---|---|
| Default | `--accent` fill, `--on-accent` text, no border | paper fill, ink text, inset ink at 14% | paper fill, ink text, inset ink at 14% | paper field, ink mark when checked | paper track, ink thumb |
| Hover | fill brightens through `--sky`, lifts 2px | mist fill, inset sky at 36% | mist fill, inset sky at 36% | mist fill, sky ring | mist track |
| Focus with visible ring | outside ring `0 0 0 4px color-mix(in srgb, var(--accent) 30%, transparent)` | same ring | same ring | same ring | same ring |
| Active | translate down 1px, sky deepens | translate down 1px | inset ink at 24% | checked mark compresses | thumb translates with slight compression |
| Disabled | opacity .44, no transform, no pointer events | opacity .44 | opacity .5 | opacity .5 | opacity .5 |

## Form controls that must be styled

- `button`, `a.button`, submit inputs
- text, email, search, number, date, and password inputs
- textarea
- select
- checkbox and radio via custom wrapper
- switch/toggle
- range slider
- segmented controls
- table filters and dashboard search

Browser defaults are never visible. Native affordances are replaced by CSS and SVG primitives where needed.

## Surface rules

### Marketing landing

- Opens with a 100vw by 100svh full-bleed hero.
- Hero imagery is swappable through `background-image: var(--hero-image)`.
- Overlay uses solid/translucent tone plates and ink text; no lazy gradient scrim.
- The page sells a concrete product world called **Nobori Launchroom**, not tokens or specimens.

### Immersive landing

- Pure real-time low-poly 3D, no generated stills or video blended into the canvas.
- The same Nobori typography and accents sit in readable glass panels over the scene.
- The world carries the metaphor: ground, sky, river, waterfall, mountains, koinobori, fukinagashi, petals, and dragon climax.

### Dashboard

- Product surface for operating festival campaigns and family registrations.
- Uses tone blocks, large metrics, shaped highlighter areas, and one-level panels.
- Tables and forms are fully styled with the control matrix.

## Art direction

Landing and dashboard imagery use bright graphic editorial campaign illustration with crisp forms, lots of white, electric sky, fresh leaf, and coral highlight. Immersive uses cohesive flat-shaded low-poly 3D only. The two modes share Nobori's clarity and ascent mechanic but do not borrow each other's rendering technique.

## Credits

- Kodomo no Hi and koinobori festival traditions: cultural source motif for subject matter and metaphor.
- Contemporary Japanese graphic poster practice: influence for confident type, white space, and highlighter colour.
- Low-poly game environment art: influence for the immersive surface technique.
