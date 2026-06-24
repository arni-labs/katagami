# Nobori

Nobori is a Katagami design language for Kodomo no Hi products that need to feel hopeful, adult, and launch-ready. Its ownable idea is **the lift-line**: broad white space, vertical flight paths, and vivid highlighter marks that make koinobori feel like civic infrastructure rather than decoration.

The paired palette and art style are one system: clear early-summer light, tuned green-white neutrals, crisp black type, and three high-voltage accents used sparingly like festival signal tape. The language belongs to real product scenes: city culture teams staging riverbank programs, school associations assigning volunteers, and families finding the day’s free workshops.

## Name

**Nobori**

A single concrete noun drawn from the strongest motif: rising banners and koinobori. It is a masthead, not an identifier. It is not an adjective, not a genre stack, and does not use a banned token.

## Point of view

- **Signature mechanic:** lift-lines. Content blocks rise on a shared vertical axis, then get one confident accent hit for priority. The mechanic appears as tall type columns, vertical image crops, raised panel positions, and ribbon-like rules made from filled tone, not borders.
- **Product tone:** grown-up festival operations. Concrete nouns: river permits, carp avenue, school gates, volunteer crews, craft stations, age bands, free admissions, rain plans.
- **Visual contract:** bright, airy, clean, graphic. Open white carries the page. Accent colour is used for focus and hierarchy, never wallpaper.
- **Surface hierarchy:** separate surfaces by tone, elevation, and space. Do not nest cards. Do not give cards a single accent edge.
- **Ornament:** koinobori scale marks, wind bands, and lift-line offsets only. Each ornament must explain motion, scheduling, or procession.

## Role tokens

All landing and dashboard compositions take colour from these role variables and may map them through `injectTheme` overrides:

```css
:root {
  --bg: #ffffff;
  --surface: #f3fff7;
  --text: #06130f;
  --muted: #50645b;
  --border: #d9eee2;
  --accent: #00a7ff;
  --on-accent: #00151f;
  --success: #15f06c;
  --warning: #ff315a;
  --error: #c7153c;
  --info: #00a7ff;
}
```

### Palette

| Role | Token | Value | Use |
|---|---:|---:|---|
| Ground | `--bg` | `#ffffff` | Full page ground and open air. |
| Warm green surface | `--surface` | `#f3fff7` | Panels, quiet dashboard wells, form rows. |
| Text | `--text` | `#06130f` | Primary copy and labels. |
| Muted text | `--muted` | `#50645b` | Secondary notes, timestamps, help text. |
| Quiet separator | `--border` | `#d9eee2` | Internal dividers only when tone alone cannot clarify. |
| Accent 1 | `--accent`, `--info` | `#00a7ff` | Primary action, focus ring, live status. |
| Accent 2 | `--success` | `#15f06c` | Open slots, confirmed crews, fresh-growth highlight. |
| Accent 3 | `--warning` | `#ff315a` | Urgent lift, featured date, attention hot pop. |
| Error | `--error` | `#c7153c` | Error text and destructive state; same family as hot pop. |
| On accent | `--on-accent` | `#00151f` | Text over bright accent fills. |

Accent count: 3 highlighter colours, used consistently as blue, green, and vermilion. Semantic error stays in the vermilion family and must remain visually secondary.

## Type

Nobori uses heavy, compact, product-grade sans type with a Japanese face that can carry kanji without turning ceremonial.

| Token | Stack | Use |
|---|---|---|
| `--font-display` | `"Arial Black", "Avenir Next Condensed", "Helvetica Neue", Arial, sans-serif` | Big launch headlines, section numerals, metric figures. |
| `--font-body` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Body copy, controls, navigation, tables. |
| `--font-jp` | `"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Arial Unicode MS", sans-serif` | こどもの日, 鯉のぼり, place names, labels. |

### Scale

| Token | Size | Line | Tracking | Use |
|---|---:|---:|---:|---|
| `--step-0` | 17px | 1.55 | 0 | Body minimum. |
| `--step-1` | 19px | 1.45 | 0 | Lead copy and controls. |
| `--step-2` | 24px | 1.25 | -0.01em | Section headings. |
| `--step-3` | 34px | 1.08 | -0.02em | Dashboard figures, feature titles. |
| `--step-4` | clamp(46px, 8vw, 112px) | .88 | -0.04em | Landing hero and immersive titles. |
| `--step-jp` | clamp(30px, 6vw, 76px) | 1 | -0.04em | Heavy Japanese display. |

Body text never drops below 17px. Table rows may use 14.5px only for dense dashboard metadata, with primary labels still at 17px+.

## Spacing

| Token | Value | Use |
|---|---:|---|
| `--space-1` | 4px | Fine optical adjustments. |
| `--space-2` | 8px | Compact pairs. |
| `--space-3` | 12px | Inline rhythm. |
| `--space-4` | 16px | Control padding. |
| `--space-5` | 24px | Group spacing. |
| `--space-6` | 32px | Panel padding. |
| `--space-7` | 48px | Section internal rhythm. |
| `--space-8` | 64px | Section gaps. |
| `--space-9` | 96px | Landing blocks. |
| `--space-10` | 128px | Hero and ultra-wide breathing room. |

Titles always have padding or margin above them. Grids use `minmax(0, 1fr)` and children use `min-width: 0`.

## Radius and geometry

Allowed radii only:

| Token | Value | Use |
|---|---:|---|
| `--radius-none` | 0 | Full-bleed image cuts, hero masks. |
| `--radius-panel` | 24px | Large panels and dashboard surfaces. |
| `--radius-control` | 16px | Inputs, selects, buttons, small product surfaces. |
| `--radius-pill` | 9999px | Pills, toggles, segmented controls. |

No arbitrary in-between radii.

## Control height

One shared control-height token:

```css
--control-height: 52px;
```

All buttons, inputs, selects, comboboxes, search fields, segmented controls, date fields, and compact toggles use `min-height: var(--control-height)`. Textareas use the same padding and radius with `min-height: calc(var(--control-height) * 2.4)`.

## State matrix

| Component | Default | Hover | Focus visible | Active | Disabled |
|---|---|---|---|---|---|
| Primary button | `background: var(--accent); color: var(--on-accent); min-height: var(--control-height); border: 0; border-radius: var(--radius-control); font-weight: 900;` | Shift up 1px, brighter blue shadow tone; no border appears. | `outline: 3px solid var(--accent); outline-offset: 4px;` plus white halo on dark/image surfaces. | Translate down 1px, shadow removed. | `opacity: .44; cursor: not-allowed; transform: none;` |
| Secondary button | `background: var(--surface); color: var(--text); min-height: var(--control-height); border: 0; border-radius: var(--radius-control);` | Surface deepens to a green-white tone. | Same visible ring. | Inset tonal press. | Same disabled treatment. |
| Text input/search/date | `background: #fff; color: var(--text); min-height: var(--control-height); border: 0; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 70%, transparent);` | Surface warms to `--surface`. | `outline: 3px solid var(--accent); outline-offset: 3px; box-shadow: none;` | Surface compresses with inset tone. | Muted text, low opacity, no pointer. |
| Select | Same as input, with a custom CSS chevron built from borders or SVG primitive, never text glyphs. | Same as input. | Same as input. | Same as input. | Same as input. |
| Textarea | Same as input with larger min-height and top-aligned text. | Same as input. | Same as input. | Same as input. | Same as input. |
| Checkbox/radio | Custom 22px control, no browser default visible, accent fill when checked. | Tone lift around control. | Visible ring around the custom control. | Scale `.96`. | Low opacity, no pointer. |
| Switch | Pill track, circular thumb, accent fill when checked. | Track tone deepens. | Visible ring around track. | Thumb compresses. | Low opacity, no pointer. |
| Tab/segmented item | Same shared height, pill or 16px radius, selected by filled tone. | Quiet tone lift. | Visible ring. | Pressed tone. | Low opacity. |

## Components

### Buttons

Buttons are built once from control tokens. One primary button per action set. Other buttons use quiet surface tone. Labels are centred with even inline padding and never use emoji or decorative symbol glyphs.

### Forms

Every form control is authored: text, email, number, search, date, select, textarea, checkbox, radio, switch, and segmented tabs. Browser defaults must not be visible. Labels sit above controls or are optically centred inside compact filter rows. Help text uses muted colour and remains at 17px when paragraph-like.

### Surfaces

Use tone and spacing before separators. A surface can be white on green-white, green-white on white, or dark text over translucent white glass on imagery. Do not nest cards. Do not add a lone accent edge. If a surface needs priority, use a filled highlighter element inside the layout.

### Metrics

Metrics are display-weight figures with short concrete labels. Use accent highlighter fills behind the number or small status dot primitives, not ornamental badges.

### Tables

Rows breathe. Dense metadata may be 14.5px. Hide non-essential columns on mobile. Use tone bands or row spacing, not ruled grids.

### Imagery

Landing and dashboard imagery is high-key editorial graphic design: white architectural space, fresh greenery, fabric scale rhythm, vivid blue/green/vermilion highlighters. Immersive imagery is not generated; it is a real-time 3D low-poly world.

## Motion

The settled page is visible without JavaScript. An inline script may add a class to gate reveal start-states and animate them. Motion expresses lift: panels rise into alignment, koinobori bands drift across the axis, and key data snaps into place. Respect `prefers-reduced-motion`.

## Responsive rules

- Render from 390px mobile to 2560px+ ultra-wide.
- Mobile stacks to one column, hides non-essential nav and table columns, and never overflows horizontally.
- Contained content caps and centres on ultra-wide; only full-bleed hero spans 100vw.
- Every grid uses `minmax(0, 1fr)` and every flex/grid child that can shrink gets `min-width: 0`.
