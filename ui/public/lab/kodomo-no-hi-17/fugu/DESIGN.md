# Nobori

Nobori is a Katagami design language for Kodomo no Hi as a real early-summer public celebration. Its signature mechanic is **rising wind bands**: confident vertical and diagonal fields that lift content like koinobori in clear air. The language keeps most surfaces white and luminous, then uses three vivid highlighter accents with discipline.

## Point of view

Nobori treats Children's Day as civic, hopeful, and grown-up. It is not toy-like. It is a polished festival identity for a riverside gathering with carp-streamers, iris leaves, mochi tables, workshops, performances, and families arriving under bright May light.

The visual character is:

- airy white ground with warm green-tinted neutrals
- oversized condensed display type with compact, editorial rhythm
- electric sky, fresh leaf, and hot coral accents used as highlighter fields
- surfaces separated by tone and scale, not by grey borders
- one coherent geometry: square editorial blocks, 24px feature panels, and fully round controls
- ornaments that belong to the festival: wind bands, carp scale dots, pole grids, and route fields

## Name

**Nobori**

The name comes from the strongest motif: things rising in the festival wind. It is a concrete cultural noun, short enough to work as a masthead, and specific to the day without becoming cute.

## Role tokens

All compositions take colour through these role variables and may be recoloured by `injectTheme`.

```css
:root {
  --bg: #fbfff7;
  --surface: #ffffff;
  --text: #07140f;
  --muted: #476057;
  --border: #d7eadf;
  --accent: #13a8ff;
  --on-accent: #ffffff;
  --success: #35ee72;
  --warning: #ff4f7b;
  --error: #ff4f7b;
  --info: #13a8ff;
}
```

## Palette

Neutrals are tuned toward early-summer foliage rather than cold grey.

| Role | Token | Value | Use |
|---|---:|---|---|
| Page ground | `--bg` | `#fbfff7` | clear, warm white with a green lift |
| Raised surface | `--surface` | `#ffffff` | panels, forms, content blocks |
| Main text | `--text` | `#07140f` | high-contrast body and display |
| Secondary text | `--muted` | `#476057` | notes, metadata, captions |
| Quiet line role | `--border` | `#d7eadf` | only for data separators when tone cannot carry structure |
| Accent 1 | `--accent` | `#13a8ff` | electric sky highlighter, primary action |
| Accent 2 | `--success` | `#35ee72` | fresh leaf highlighter, positive state, route zones |
| Accent 3 | `--warning`, `--error` | `#ff4f7b` | hot coral pop, urgency, limited emphasis |
| Information | `--info` | `#13a8ff` | same as accent 1 |
| On accent | `--on-accent` | `#ffffff` | text on strong blue or coral |

Accent count: exactly three vivid accents: electric sky, fresh leaf, hot coral. Semantic roles reuse those accents; no fourth highlight colour is introduced.

## Typography

Nobori uses system fonts so artifacts are self-contained and reliable.

```css
--font-display: "Arial Narrow", "Avenir Next Condensed", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif;
--font-body: "Avenir Next", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "SFMono-Regular", "Roboto Mono", Consolas, monospace;
```

Type scale:

| Token | Size | Line height | Letter spacing | Use |
|---|---:|---:|---:|---|
| `--step-0` | 17px | 1.65 | 0 | body minimum |
| `--step-1` | 19px | 1.55 | 0 | lead body, card copy |
| `--step-2` | 24px | 1.25 | -0.01em | section intros |
| `--step-3` | 34px | 1.05 | -0.02em | card heads |
| `--step-4` | clamp(44px, 8vw, 112px) | 0.9 | -0.045em | hero and festival mastheads |
| `--step-label` | 13px | 1 | 0.12em | labels and status text |

Rules:

- Body text is never below 17px.
- Display text is condensed, confident, and tightly spaced.
- Labels are uppercase only when they behave like festival signage.
- Copy uses real nouns from the day: koinobori, iris leaves, chimaki, kashiwa mochi, taiko, riverbank, wish table.

## Spacing

```css
--space-1: 8px;
--space-2: 12px;
--space-3: 18px;
--space-4: 28px;
--space-5: 44px;
--space-6: 72px;
--space-7: 112px;
--section-pad: clamp(72px, 10vw, 148px);
```

Rules:

- Titles always receive generous padding above.
- Section interiors breathe; content can be dense, but never cramped.
- Cards are not nested inside cards.
- On mobile, grids collapse to one column and non-essential dense columns are hidden.

## Radius and geometry

Allowed radii:

```css
--radius-none: 0;
--radius-sm: 16px;
--radius-lg: 24px;
--radius-pill: 9999px;
```

Usage:

- Square editorial blocks: `0`.
- Feature panels and media blocks: `24px`.
- Compact content chips: `16px`.
- Controls and buttons: `9999px`.
- No arbitrary intermediate radius.

## Surface model

Nobori separates surfaces by tone, density, and shadow, not by borders.

- Page ground: warm white.
- Primary panel: pure white with soft green shadow.
- Sky field: electric blue at low opacity with black text only when contrast remains safe.
- Leaf field: fresh green at low opacity with black text.
- Coral field: hot coral with white text, reserved for urgency or celebration markers.
- Data rows: alternating tone bands rather than boxed borders.

Never place a single accent edge on a card. If a panel uses accent, the whole field or an internal highlighter shape carries it.

## Signature mechanics

### Rising wind bands

Large skewed or vertical fields cross behind headings and programme blocks. They imply carp-streamers lifting without becoming literal decoration everywhere.

Implementation:

```css
.wind-band {
  background: var(--accent);
  transform: skewY(-6deg);
  border-radius: var(--radius-lg);
}
```

### Scale constellations

Small dot clusters appear near maps and hero marks. They are sparse and tied to festival routes, never wallpaper.

### Tone blocks

Every major section owns a tone: white, sky, leaf, coral, or warm ground. This replaces boxed chrome.

### Koinobori lanes

Dashboard maps and timelines use long rounded tracks with segmented tone fields, echoing suspended streamers and visitor flow.

## Control architecture

One shared control height governs buttons, inputs, selects, and composed choice rows.

```css
--control-height: 52px;
--control-pad-x: 22px;
--focus-ring: 0 0 0 4px color-mix(in srgb, var(--accent) 34%, transparent);
```

Controls share pill geometry and centered labels. The primary button is unmistakably blue; secondary buttons are quieter tonal fields. Text remains optically centered and padded to fit.

## State matrix

| Component | Default | Hover | Focus | Active | Disabled |
|---|---|---|---|---|---|
| Primary button | blue field, white text, pill, `52px` height | blue deepens through shadow and lift | visible blue ring, no layout shift | returns to surface with compressed shadow | muted surface, muted text, no pointer |
| Secondary button | white field with tonal shadow, black text | sky wash background | visible blue ring | slight inset tone | muted surface, muted text |
| Input | white pill, tonal inset shadow, black text | sky-tinted inset | `:focus-visible` and `:focus-within` ring | text cursor only, no jump | muted wash, muted placeholder |
| Select | white pill, custom SVG chevrons, no browser default chrome | sky wash | visible blue ring | same height, no jump | muted wash, no pointer |
| Textarea | white 24px panel, same padding rhythm | sky wash | visible blue ring | no jump | muted wash |
| Checkbox row | full `52px` choice row, custom square mark | leaf wash | row receives visible ring | mark compresses | muted wash |
| Radio row | full `52px` choice row, custom round mark | leaf wash | row receives visible ring | mark compresses | muted wash |
| Table row | alternating tone bands | sky wash | focused interactive row receives ring | no movement | muted text |

No visible browser default form chrome ships.

## Components

### Masthead

Page mastheads use a breathable nav integrated into the page, never a floating pill bar. Links sit in open space with strong type hierarchy.

### Hero

Landing heroes are full viewport, edge to edge, and driven by `background-image: var(--hero-image)`. Legibility comes from solid matte panels and high-contrast type, never a gradient scrim.

### Festival section

A section uses a large title, one real-world lead sentence, then a grid or editorial split. Every section should make the day more concrete.

### Programme table

Dense information uses tone-banded rows, hidden mobile columns, and large line-height. No cramped gridlines.

### Map lanes

Location information uses rounded tracks and zones in the three accents. The map is schematic, not generic charting.

### Album wall

Images are large, cropped, and editorial. Captions are real and sparse.

## Motion

Motion is additive. The settled state is visible without JavaScript. If JavaScript runs, the page sets a class on `html`, reveals `.reveal` elements with small upward motion, and disables that reveal when `prefers-reduced-motion` is active.

Motion meaning:

- hero words lift like streamers catching wind
- section cards rise in short staggered groups
- buttons compress on active state
- map lanes fill gently when visible

## Responsive behavior

- From 390px up, every page is one-column first.
- At tablet width, two-column editorial splits appear.
- At desktop, dense dashboard grids use `minmax(0, 1fr)` so content shrinks inside its container.
- At ultra-wide sizes, contained sections cap at 1440px and center. Only the landing hero spans full viewport width.
- Tables hide helper columns on mobile but preserve the essential time, event, and place.

## Imagery direction

Generated media should look like refined editorial festival graphics: clear early-summer light, koinobori rising, fresh green trees, white tents, civic riverbank, and confident highlighter colour. It should be bright and clean, never washed-out pastel or muddy.

Required prompt guardrails:

- no text in images
- no logos
- no emoji
- grown-up public festival mood
- open white space
- electric sky blue, fresh green, hot coral only as highlights

## Credits

- Japanese Kodomo no Hi public customs: koinobori streamers, iris leaves, chimaki, kashiwa mochi, and family festival rituals.
- Contemporary civic festival wayfinding: clear programme hierarchy, route lanes, and information density.
- Modern editorial poster practice: bold crop, condensed mastheads, and open white composition.

No named artist style is imitated.