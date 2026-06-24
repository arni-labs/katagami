# Nobori

Nobori is a Katagami design language for Kodomo no Hi products: festival planning tools, family passes, volunteer dashboards, and story-led civic pages around koinobori. Its signature mechanic is the **streamer register**: information moves in hanging lanes, staggered like carp streamers catching wind, while surfaces separate by warm paper tone rather than visible container lines.

## Point of view

Nobori treats a product surface like a prepared festival route. The page should feel crafted, useful, and celebratory without becoming a souvenir shop. Strong black type gives the work authority; vermilion marks the primary action; river blue carries motion and guidance; iris green signals readiness and safe handoff.

The paired art style for landing and dashboard imagery is **washi ledger poster craft**: bright ivory paper, lacquer-black editorial linework, fabric texture, festival logistics objects, and expressive product scenes. The immersive surface uses the same tokens but changes technique to pure real-time low-poly 3D so the visitor can fly through the mythic river world.

## Name

- Language name: **Nobori**
- Form: one distinctive cultural noun drawn from the strongest motif, the raised streamer
- Product scene used in examples: **Nobori Ledger**, a Kodomo no Hi route, pass, and volunteer coordination product

## Credits

- Japanese koinobori folk craft: cultural source for streamer proportion, family symbolism, and fabric movement
- Washi paper craft: material source for warm ground, visible fiber, and ink absorption
- Edo-period woodblock print composition: historical influence for decisive silhouettes, flat color fields, and asymmetric product scenes

## Token contract

All color in landing and dashboard surfaces maps through role variables so a palette swap can preserve semantics.

```css
:root {
  --bg: #fff8ea;
  --surface: #fff1d2;
  --surface-raised: #ffffff;
  --surface-sunk: #f2dfb8;
  --text: #10100e;
  --muted: #5f5547;
  --border: #1c1712;
  --accent: #d9432f;
  --on-accent: #fffaf0;
  --success: #287a52;
  --warning: #d9432f;
  --error: #9b2b22;
  --info: #176f93;

  --accent-vermilion: #d9432f;
  --accent-river: #176f93;
  --accent-iris: #287a52;

  --font-display: "Avenir Next", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Avenir Next", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-jp: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif;

  --step-0: clamp(17px, 0.92rem + 0.18vw, 20px);
  --step-1: clamp(20px, 1rem + 0.5vw, 26px);
  --step-2: clamp(26px, 1.3rem + 1vw, 38px);
  --step-3: clamp(40px, 2.25rem + 2.4vw, 78px);
  --step-4: clamp(58px, 3rem + 5vw, 138px);

  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 40px;
  --space-5: 64px;
  --space-6: 96px;

  --radius-none: 0;
  --radius-sm: 16px;
  --radius-md: 24px;
  --radius-pill: 9999px;

  --control-height: 48px;
  --focus-ring: 0 0 0 4px color-mix(in srgb, var(--info) 35%, transparent);
}
```

### Accent limit

Nobori uses exactly three accent colors:

1. Vermilion `--accent` for primary actions, festival urgency, and key commercial facts such as free admission.
2. River blue `--info` for route, water, navigation, and timing.
3. Iris green `--success` for safety, readiness, volunteer coverage, and completed tasks.

All other colors are warm neutrals or semantic aliases of those three accents.

## Geometry

Use only these radii:

- `0` for full-bleed edges, table bars, image wells, and deliberate ledger cuts
- `16px` for compact controls and tags
- `24px` for primary panels, media blocks, and dashboard modules
- `9999px` for buttons, pills, toggles, radio controls, and range thumbs

Do not mix additional in-between radii.

## Surface model

Surfaces separate by tone and elevation, not borders.

- Page ground: `--bg`, warm ivory
- Working panels: `--surface`, slightly deeper paper
- Raised product moments: `--surface-raised`, clean white paper
- Sunk fields and table bands: `--surface-sunk`, darker kraft paper
- Dark presentation glass: ink with high-opacity light panels or light panels with dark text; never light text directly on bright sky imagery

No card gets a single accent edge. Accent appears as filled controls, text highlights, small in-panel marks, or whole semantic fills.

## Type

- Display: heavy sans, tight tracking, `letter-spacing: -0.04em`
- Body: 17px or larger, high contrast, relaxed line height
- Japanese display: heavy Japanese face from `--font-jp`; use it for `こどもの日` and `鯉のぼり`
- Labels: sentence case, never tiny uppercase letter-spaced eyebrows above large hero heads
- Tables: 15px minimum for dense operational rows

## Component construction

Build components once from tokens and use them across landing, immersive overlay, and dashboard.

### Buttons

All buttons use `--control-height`, centered labels, pill radius, and one shared shape.

| State | Primary | Quiet |
|---|---|---|
| Default | `background: var(--accent); color: var(--on-accent)` | `background: var(--surface-raised); color: var(--text)` |
| Hover | darker vermilion tone, slight lift | warmer paper tone, slight lift |
| Focus | visible `--focus-ring` plus dark inner outline | visible `--focus-ring` plus dark inner outline |
| Active | pressed down, deeper tone | pressed down, sunk tone |
| Disabled | muted paper, muted text, no lift | muted paper, muted text, no lift |

Only one action group has a visually dominant primary button.

### Form controls

Every text input, search input, email input, number input, date input, select, textarea, checkbox, radio, switch, and range is explicitly styled. All controls align to `--control-height` except textarea, which uses the same padding and a minimum of three control heights.

| State | Rule |
|---|---|
| Default | warm raised paper, dark text, no browser-native appearance |
| Hover | tone warms by one step, placeholder remains muted |
| Focus | visible ring using `--focus-ring`, high-contrast text, no layout shift |
| Active | sunk paper tone |
| Disabled | reduced opacity, not interactive, muted text |
| Invalid | error tone in shadow or outline, readable helper text |

Checkboxes and radios use `appearance: none`; the checked state is a filled accent or iris dot created with CSS, not a symbol glyph. Select controls use a CSS-drawn chevron made from border lines, not a text glyph. Range tracks use `--surface-sunk`; thumbs use `--accent` and `--control-height`-derived sizing.

### Tables

Use broad row tone changes, not gridlines. Hide secondary columns on mobile. Status words are plain text with colored tonal pills.

### Glass overlays

Immersive panels use translucent light paper with blur and dark copy. They are readable over bright sky and river scenes. During camera-only transitions they fade to `opacity: 0` and `pointer-events: none`.

## Motion

Motion carries festival operations meaning:

- Streamer rise: large headlines and panels enter with a small vertical lift, as if catching wind
- Route reveal: dashboard and landing section content appears as lanes instead of generic fades
- Immersive journey: native scroll drives a persistent real-time camera through one world; the render loop updates camera position, look target, cloth uniforms, particles, fog, and light
- Reduced motion: content remains available; immersive switches to an inline static low-poly fallback

## Responsive behavior

- Mobile stacks to one column from 390px upward with no horizontal overflow
- Navigation hides secondary links on mobile
- Tables hide non-essential columns on mobile
- Contained sections cap at 1180px and center
- Only the landing hero spans the full viewport width and height
- Use `minmax(0, 1fr)` and `min-width: 0` on grids and flex children

## Surface requirements

### Landing

Open with a full-viewport, edge-to-edge hero using `background-image: var(--hero-image)`. The hero is a product world for Nobori Ledger, not a token specimen. Legibility comes from tonal paper panels and ink scrims, not a lazy gradient overlay.

### Immersive

Use pure real-time low-poly 3D: ground, sky, river, waterfall, mountains, scenery, koinobori avenue, fukinagashi cloth shader, instanced poles, petals, and particles. No generated still or video is blended into the world. Content overlays use Nobori type, glass panels, and segment-based reveals.

### Dashboard

Show a believable operating surface for a Kodomo no Hi team: route safety, family pass issue, volunteer coverage, weather, inventory, schedule, and form controls. It uses the same `Nobori` tokens and product nouns as the landing page.
