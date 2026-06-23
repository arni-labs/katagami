---
version: alpha
name: Nobori
description: A bright, adult Kodomo no Hi product language built from white air, rising koinobori rhythm, and three highlighter accents.
colors:
  bg: "#FFFFFF"
  surface: "#F4FAFE"
  text: "#000000"
  muted: "#546376"
  accent: "#00C8F0"
  success: "#00D070"
  warning: "#FF2A62"
  error: "#FF2A62"
  info: "#00C8F0"
  on_accent: "#000000"
typography:
  heading: "Anton, Arial Narrow, Helvetica Neue, system-ui, sans-serif"
  body: "Inter, Avenir Next, Helvetica Neue, system-ui, sans-serif"
  mono: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
  google_fonts_url: "https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@500;600&display=swap"
rounded:
  none: "0"
  field: "16px"
  card: "24px"
  pill: "9999px"
spacing:
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
components:
  button: ".btn"
  input: ".field"
  card: ".card"
  chip: ".chip"
---

# Nobori

Nobori is a Katagami design language for **Nobori Atlas**, an adult-facing Kodomo no Hi product for museums, city districts, cultural teams, and brands launching koinobori installations with real schedules, edition runs, and site operations. Its ownable idea is **wind-lift composition**: white air is the main material, koinobori rise through staggered vertical lanes, and vivid highlighter color marks only the moments that need force.

## Overview

Nobori is not a children’s craft aesthetic. It borrows the civic scale, wind, textile repetition, and upward carp symbolism of Kodomo no Hi, then pushes them through confident contemporary graphic design. The result is hopeful, early-summer, and precise: bright white fields, cool blue-shadowed surfaces, oversized press-block type, and three almost-neon accents used with restraint.

### Point of view

- **White air first.** Most of the page stays pure white or a very cool blue-white. Color arrives as highlighter marks, not as background wash.
- **Ascent is layout.** Important content climbs through staggered blocks, vertical stacks, offset image crops, and long breathing intervals.
- **The carp becomes structure.** Koinobori are treated as scale, wind, textile rhythm, and civic optimism; never as mascots.
- **Adult product clarity.** Forms, dashboards, tables, and operational copy must feel launch-ready, not decorative.

### Visual character

1. Oversized black press blocks hold masthead copy in tight display type with `-0.02em` tracking.
2. Rising lanes place content in offset vertical steps, with one larger element leading and smaller modules following.
3. Surface separation uses tone, white space, and soft color-mixed shadows only. There are no visible borders.
4. Generated image crops supply the textile and wind layer; SVG is reserved for small UI marks.
5. Every control shares one 48px control-height token and a visible electric focus ring.

## Colors

Nobori uses one neutral temperature: pure black and white plus cool blue-derived slate for muted text and cool blue-white for surfaces. It has exactly three accent values.

| Role token | Value | Usage |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | Page air, landing base, primary open space |
| `--surface` | `#F4FAFE` | Cool lifted panels and dashboard lanes |
| `--text` | `#000000` | Primary ink, press blocks |
| `--muted` | `#546376` | Cool slate captions, metadata, low-priority labels |
| `--border` | `transparent` | Compatibility role only; do not render visible borders |
| `--accent` | `#00C8F0` | Electric sky-blue primary action, focus, info, wind marks |
| `--success` | `#00D070` | Fresh leaf-green readiness, positive status, live signals |
| `--warning` | `#FF2A62` | Uses the hot accent; no fourth accent color |
| `--error` | `#FF2A62` | Hot pop for destructive or urgent emphasis |
| `--info` | `#00C8F0` | Same as electric sky-blue |
| `--on-accent` | `#000000` | Text on bright accents |

### Accent discipline

- Electric sky-blue is the default action and focus color.
- Leaf green marks readiness, growth, and confirmed installation state.
- Hot pop appears once per screen area for the most decisive call or alert.
- No beige, cream, grey border systems, gradients, or pastel washes.

## Typography

| Token | Value |
| --- | --- |
| Heading font | `Anton, Arial Narrow, Helvetica Neue, system-ui, sans-serif` |
| Body font | `Inter, Avenir Next, Helvetica Neue, system-ui, sans-serif` |
| Mono font | `IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace` |
| Google Fonts | `https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@500;600&display=swap` |
| Body size | `17px` |
| Table row size | `15px` minimum |
| Display tracking | `-0.02em` |
| Body line height | `1.55` |

The Anton display face is a tall, condensed poster type that mirrors the vertical lift of a koinobori pole. It is reserved for mastheads and section headlines; Inter carries all body and control text; IBM Plex Mono carries kickers, role tags, and data labels.

### Type scale

| Token | Value | Use |
| --- | --- | --- |
| `--type-xs` | `14px` | Dense labels only |
| `--type-sm` | `15px` | Table rows and captions |
| `--type-md` | `17px` | Body copy and controls |
| `--type-lg` | `21px` | Card leads |
| `--type-xl` | `28px` | Section subheads |
| `--type-2xl` | `42px` | Product headings |
| `--type-3xl` | `64px` | Page mastheads |
| `--type-4xl` | `96px` | Hero press blocks on wide screens |

## Layout

### Spacing scale

| Token | Value |
| --- | --- |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |
| `--space-8` | `64px` |
| `--space-9` | `96px` |
| `--space-10` | `128px` |

### Radius set

Only these four values are allowed.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-none` | `0` | Full-bleed hero, flush image edges, press blocks |
| `--radius-field` | `16px` | Fields, small panels, custom selects |
| `--radius-card` | `24px` | Product cards, image modules, dashboard sheets |
| `--radius-pill` | `9999px` | Buttons, nav pills, chips, progress bars |

### Grid and responsive rules

- Contained pages use `minmax(24px, 1fr) minmax(0, 1180px) minmax(24px, 1fr)`.
- Desktop layouts alternate between asymmetric editorial pairs, rising two-column stacks, dense operational rows, and full-width poster statements.
- Every grid column uses `minmax(0, 1fr)` and every flex/grid child sets `min-width: 0`.
- Mobile stacks to a single column near 760px. Non-essential nav links and secondary table columns are hidden.
- Ultra-wide pages cap and center contained content. Only the landing hero spans `100vw`.
- Major titles get at least `--space-7` of air above them unless they sit inside the full-bleed hero press block.

## Components

All primitives are built once from shared tokens and reused. Product pages may compose them, but must not restyle local one-offs.

### Shared control tokens

| Token | Value |
| --- | --- |
| `--control-height` | `48px` |
| `--control-pad-x` | `20px` |
| `--control-gap` | `8px` |
| `--control-min` | `120px` |
| `--focus-ring` | `0 0 0 2px var(--bg), 0 0 0 6px var(--accent)` |

Every `button`, `input`, `select`, and `textarea` uses `font: inherit`, `appearance: none`, no native visible chrome, `min-height: var(--control-height)`, and padding derived from the scale. Taller controls such as textareas multiply the same height token rather than inventing another control size.

### Full state matrix

| Primitive | Default | Hover | Focus with visible ring | Active | Disabled |
| --- | --- | --- | --- | --- | --- |
| Primary button | `--accent` fill, black text, pill radius, color-mixed shadow | Lift `2px`, stronger accent shadow | `--focus-ring`, no color change required | Press down, shadow reduced | Opacity `0.42`, no pointer events, no lift |
| Hot button | `--error` fill, black text, pill radius | Lift with hot shadow | Same ring using `--accent` | Press down | Same disabled treatment |
| Secondary button | `--bg` fill, cool surface shadow, black text | Surface shifts to `--surface` | Same ring | Press down | Same disabled treatment |
| Ghost button | Transparent fill, black text | Cool surface fill | Same ring | Compact surface fill | Same disabled treatment |
| Input field | White fill, 16px radius, cool inset tone | Soft accent shadow | `.field:focus-within` receives `--focus-ring` | Slight surface compression | Opacity `0.5`, muted text, no pointer events |
| Select | Same as input, with inline SVG chevron | Same as input | Same wrapper ring | Same as input | Same as input |
| Textarea | Same as input, min-height `calc(var(--control-height) * 2)` | Same as input | Same wrapper ring | Same as input | Same as input |
| Card | White or cool surface, 24px radius, tone shadow | Interactive cards lift `2px` | Interactive cards receive `--focus-ring` | Press down | Opacity `0.5` |
| Chip | Pill radius, tinted role fill | Lift only if interactive | Same ring if interactive | No scale tricks | Opacity `0.5` |
| Switch | 48px high control row, pill track, white thumb | Track brightens | Whole switch receives ring | Thumb compresses | Opacity `0.5` |

### Button recipe

- `.btn` is the only button base.
- Variants: `.btn-primary`, `.btn-hot`, `.btn-secondary`, `.btn-ghost`.
- Use one primary button per view or module. Secondary and destructive actions must stay visually quieter unless they are the singular screen action.
- SVG icons are allowed only as small UI marks with authored paths. Do not use symbol glyphs in button text.

### Field recipe

- `.field` wraps `input`, `select`, or `textarea`.
- The wrapper owns radius, height, shadow, background, hover, and focus state.
- Labels are always visible; placeholders are examples only.
- Select chevrons are inline SVG, never text glyphs.
- Search, text, number, date, select, and textarea controls share the same token set.

### Card recipe

- `.card` is the only product surface primitive.
- Never nest `.card` inside `.card`.
- Use tone and spacing to express hierarchy, not internal borders.
- Image cards use real generated imagery with simple 0 or 24px geometry.

### Table and data row recipe

- Rows use `min-height: var(--control-height)` and at least 15px text.
- Separation uses alternating cool surface tone or spacing, not grid lines.
- Hide non-essential columns on mobile.
- Status is a pill chip using one of the three accent values.

### Form-control coverage

Explicitly style: text input, search input, number input, select, textarea, switch, checkbox-like toggles, buttons, disabled fields, and focus-within states. No visible browser defaults may remain.

## Signature patterns

1. **Wind-lift lane.** A layout utility offsets neighboring modules vertically with large white gaps so the page appears to rise with the streamers.
2. **Ink press block.** Hero and section headlines sit in solid black rectangles with white text, no rounded corners, and no gradient scrims.
3. **Highlighter bars.** Operational progress uses rounded solid bars in the three accents, never chart gradients or outlines.
4. **Koinobori crop.** Generated imagery appears in large directional crops with white or cool surfaces around it, never as small decorative stickers.
5. **Air sheet.** A cool near-white sheet can sit on white to separate content by tone without borders.

## Motion

- Motion is a progressive enhancement. Static settled state is the default.
- Landing pages add `.anim` only when `prefers-reduced-motion` is not set.
- Landing motion must include hero parallax or Ken Burns, staggered section reveals, count-up stats, demand bars growing to their level, and hover micro-interactions.
- Control motion uses `140ms`; section and image motion uses `380ms` to `700ms`.
- Motion always clarifies lift, readiness, or progress; it is never decorative noise.

## Imagery

The paired art style is generated imagery, not hand-drawn SVG. It shows bright early-summer light, crisp koinobori fabric, open sky, fresh greenery, and a graphic poster sensibility. Use no baked-in text, no logos, and no childish illustration. SVG is permitted only for small UI marks such as select chevrons and product icons.

Required assets for this language live in `./media/`:

- `hero.jpg` — full-bleed landing hero, also used as the main atmospheric proof.
- `wind-detail.jpg` — koinobori textile and streamer detail for editorial product sections.
- `kit-still-life.jpg` — product kit still life for dashboard and embodiment surfaces.

## Do's and Don'ts

### Do

- Lead with one strong graphic statement and let white space carry the rest.
- Use concrete product nouns: launch window, edition, pole kit, venue, wind review, install crew, family set, proof date.
- Keep every accent hit traceable to action, status, or directional lift.
- Make forms and tables look as designed as posters.
- Let images do the cultural work while UI stays clean and adult.

### Don’t

- Do not use childish mascots, toy packaging, cluttered craft framing, or pastel festival wash.
- Do not render token swatches, control labels, state grids, or specimen framing in product pages.
- Do not use grey borders, gradients, decorative side rails, symbol glyphs, or emoji.
- Do not introduce radii outside `0`, `16px`, `24px`, or `9999px`.
- Do not hand-draw hero or feature imagery as SVG.

## shadcn/ui Usage

When using Nobori with shadcn/ui, import local primitives from `@/components/ui/*` and project the language through the generated artifacts at `/language/{language_id}/DESIGN.with-shadcn.md`, `/shadcn.json`, `/shadcn-components.md`, and `/shadcn-shots.json`. The preview must preserve the Nobori visual profile: no visible borders, 24px cards, 16px fields, 9999px buttons and chips, 48px shared control height, cool tone separation, white-air spacing, press-block headlines, and exactly three accent values.

The companion `components.md` and `preview-shots.json` in this folder provide component recipes and renderable product scenes for shadcn projections.

## Sources & lineage

- [Japan House London, “Create Your Own Koinobori”](https://www.japanhouselondon.uk/read-and-watch/create-your-own-koinobori/) — source for the Kodomo no Hi koinobori craft lineage, Edo-period washi origin, family color ordering, and the idea that patterns on the carp can be authored while the object remains culturally legible.
- [Museum of Fine Arts Boston, “Japanese Carp Streamer”](https://www.mfa.org/programs/community-programs/art-making-at-home/japanese-carp-streamer) — source for the contemporary museum education framing, the family hierarchy of black, red or pink, and smaller colored carp, and the association of koi with strength, courage, and determination. The page also cites Louis Dumoulin’s *Carp Banners in Kyoto* from 1888 as a visual precedent.
- [Art Institute of Chicago, Utagawa Hiroshige, *Suido Bridge and Surugadai*, 1857](https://www.artic.edu/artworks/34252/suido-bridge-and-surugadai-suidobashi-surugadai-from-the-series-one-hundred-famous-views-of-edo-meisho-edo-hyakkei) — source for the dramatic vertical cropping of carp streamers against open sky and city structure in a mature graphic composition.
- [Metropolitan Museum of Art, Kawanabe Kyōsai, *Boy’s Day Carp Streamer and Shōki Banner*, before 1870](https://www.metmuseum.org/art/collection/search/754547) — source for the Boys’ Day combination of carp streamer, protective banner imagery, and tall hanging-scroll proportions.

Nobori translates those precedents into a present-day product language by keeping the wind, upward lift, fabric scale, and white-sky composition while removing nostalgic clutter and juvenile illustration.
