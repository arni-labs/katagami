# Nobori

Nobori is a Katagami design language for Kodomo no Hi products. Its ownable idea is **wind-lift**: large fields of clear white are cut by vivid highlighter strokes that feel like koinobori rising in early-summer air. It is bright, grown-up, graphic, and launch-ready, with tradition treated as civic confidence rather than nostalgia.

## Point of view

Nobori turns Kodomo no Hi into a modern product world: clear morning light, fresh greenery, carp-streamer motion, and the upstream myth of courage. The signature mechanic is a **lift band**: a broad, clean diagonal or vertical span of electric colour that carries priority information, never a decorative edge on a card. Surfaces separate by tone, scale, and air, not by boxed borders.

## Naming

- Language name: **Nobori**
- Source: the concrete festival object and cultural motif of rising banners and carp streamers.
- Rule fit: one evocative noun, culturally matched to the subject, not an adjective, not a banned token.

## Palette

Nobori uses three accent colours maximum. They act like highlighters over clean neutral grounds.

```css
:root {
  --bg: #fffefa;
  --surface: #f4fbf6;
  --text: #07140f;
  --muted: #5d6b64;
  --border: #dce9e1;
  --accent: #00a8ff;
  --on-accent: #ffffff;
  --success: #2fe56b;
  --warning: #ff4f7b;
  --error: #ff4f7b;
  --info: #00a8ff;

  --accent-blue: var(--accent);
  --accent-green: var(--success);
  --accent-hot: var(--warning);
}
```

### Colour roles

- `--bg`: clean white-warm daylight.
- `--surface`: very pale green-white for alternate panels and quiet controls.
- `--text`: green-black, high contrast on all light surfaces.
- `--muted`: readable secondary copy.
- `--border`: available only for functional separators where tone and spacing are insufficient; never used as a visible grey card outline.
- `--accent`: electric sky blue for primary actions, active state, data focus, and the leading lift band.
- `--success`: fresh green for growth, progress, positive deltas, and secondary lift bands.
- `--warning`, `--error`: hot coral for urgent attention and limited focal punctuation.

## Type

No external font is required. The system favours heavy, compressed display and readable geometric body text.

```css
:root {
  --font-display: "Arial Black", "Avenir Next Condensed", "Helvetica Neue", system-ui, sans-serif;
  --font-body: "Inter", "Avenir Next", "Helvetica Neue", Arial, system-ui, sans-serif;
  --font-jp: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif;

  --text-xs: 0.86rem;
  --text-sm: 0.95rem;
  --text-base: 1.0625rem;
  --text-lg: 1.24rem;
  --text-xl: 1.55rem;
  --text-2xl: clamp(2.1rem, 5vw, 5.6rem);
  --text-3xl: clamp(3rem, 10vw, 9.6rem);
  --tracking-display: -0.045em;
  --tracking-tight: -0.02em;
}
```

Rules:

- Body copy is never below 17px.
- Display text is black-green, heavy, tightly tracked, and editorial.
- Japanese display text uses `--font-jp` at heavy weight.
- Tiny uppercase eyebrow plus giant headline is not a Nobori pattern. Metadata is folded into the composition as labels, bands, or sentence fragments.

## Spacing, radius, and shape

```css
:root {
  --space-1: 0.5rem;
  --space-2: 0.75rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;
  --space-6: 3rem;
  --space-7: 5rem;
  --space-8: 8rem;

  --radius-0: 0;
  --radius-1: 16px;
  --radius-2: 24px;
  --radius-pill: 9999px;

  --control-height: 3.25rem;
  --focus-ring: 0 0 0 4px color-mix(in srgb, var(--accent) 26%, transparent);
}
```

Rules:

- Allowed radii: 0, 16px, 24px, 9999px.
- All interactive controls use `--control-height` for their default height.
- Titles always get generous air above them.
- Mobile stacks to one column and never overflows horizontally.
- Ultra-wide contained content caps and centres; only full-bleed hero spans the viewport.

## Surface model

Nobori separates surfaces by tone and depth-free layering:

- **Daylight**: `--bg`, large open white fields.
- **Leaf paper**: `--surface`, soft green-white blocks with no outline.
- **Glass air**: translucent white panels over imagery or 3D scenes with blur and a dark text scrim where needed.
- **Lift band**: broad accent colour slabs or typographic highlights, never single card edges.

Cards are not nested. Navigation sits open across the header, never inside a floating pill or rounded widget.

## State matrix

All controls share the same shape family, height, centred label, and visible focus state.

| State | Primary button | Secondary button | Text input and select | Checkbox and radio | Toggle | Link |
|---|---|---|---|---|---|---|
| Default | `--accent` fill, `--on-accent` text, 9999px radius | `--surface` fill, `--text` text, 9999px radius | `--surface` fill, no browser outline, 9999px or 16px radius | custom square or circle, `--surface` fill | 9999px track, thumb left | text colour with accent underline block |
| Hover | blue deepens with subtle lift | surface shifts toward white | surface brightens | fill brightens | track brightens | underline block thickens |
| Focus | visible `--focus-ring` outside control | visible `--focus-ring` outside control | visible `--focus-ring` plus accent caret | visible `--focus-ring` | visible `--focus-ring` | visible `--focus-ring` with 16px radius |
| Active | pressed down 1px, blue darkens | pressed down 1px | inset shadow-free press tone | checked mark remains centred | thumb compresses slightly | underline block contracts |
| Disabled | 45 percent opacity, no motion | 45 percent opacity, no motion | 55 percent opacity, muted text | 55 percent opacity | 55 percent opacity | muted, no underline growth |

## Component recipes

### Buttons

- Height: `--control-height`.
- Radius: `--radius-pill`.
- Primary fill: `--accent`.
- Secondary fill: `--surface`.
- Labels: centred, 700 weight, no icons unless they are deliberate SVG primitives.
- One primary button per set.

### Inputs, selects, textareas

- Explicitly styled with no visible browser defaults.
- Background from `--surface`; text from `--text`; placeholder from `--muted`.
- Focus uses `--focus-ring` and accent caret.
- Select uses a custom SVG background indicator, not a text glyph.
- Textarea uses 16px radius and a minimum height of three control rows.

### Tables

- Table rows use at least 14.5px text.
- Row separation comes from alternating tone and spacing, not heavy outlines.
- Nonessential columns hide on mobile.

### Data visualization

- Blue: active or forecast path.
- Green: growth or completed path.
- Coral: attention or capacity risk.
- Neutrals: axes, quiet labels, empty states.
- Never add a fourth accent for charts.

## Motion

- Default rendered state is complete and visible with no JavaScript.
- JavaScript may add `is-motion-ready` to gate entry motion.
- Motion suggests wind-lift: small vertical rise, lateral drift, staged reveal.
- Respect `prefers-reduced-motion`.

## Imagery direction

Landing and dashboard imagery uses bright editorial product photography mixed with crisp graphic poster composition: white air, fresh green, electric blue, and one hot coral pop. It is not low-poly and not childish. The immersive surface alone uses the low-poly real-time 3D world.

## Credits

- Kodomo no Hi festival traditions: koinobori, fukinagashi, kabuto, kashiwa-mochi, iris leaves, and the carp climbing the waterfall to become a dragon.
- Japanese modern graphic design as a broad influence: strong flat colour, disciplined asymmetry, and confident negative space.
- Low-poly game environment craft for the immersive surface: flat-shaded terrain, atmospheric fog, and camera-directed spatial reveal.
