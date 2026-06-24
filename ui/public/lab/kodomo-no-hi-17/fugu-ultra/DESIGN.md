# Fukinagashi

Fukinagashi is a Katagami design language for Kodomo no Hi, the public day when carp streamers climb into early-summer wind. The language is made for a grown civic celebration: open white air, sharp daylight, fresh leaves, and three vivid highlighter accents that cut through the page like streamers crossing the sky.

## Point of view

Fukinagashi treats the festival as a clear public ritual, not a toy scene. The page should feel like a city poster, a riverside programme, and a family field guide sharing one voice. The signature is wind-lifted order: diagonal streamer bands, large confident type, wide quiet space, and small hot marks that make activity feel alive without clutter.

## Name

Fukinagashi is the concrete streamer attached above koinobori. It is one noun, culturally matched to the subject, and it names the day by its strongest object rather than by a mood.

## Signature mechanic

**Wind bands** are the reusable mechanic. Content sits in calm white fields while colour appears as long diagonal bands, compact chips, circular stamps, and short programme marks. The bands always imply lift and direction. They never become decorative wallpaper and never sit as a single highlighted edge on a card.

## Palette

All compositions take colour from the role variables below. The three accent colours are Sky, Leaf, and Vermilion. Everything else is a neutral or a semantic alias of those accents.

| Role variable | Token name | Value | Use |
|---|---|---:|---|
| `--bg` | Rice white | `#FFFDF7` | Main open ground |
| `--surface` | Leaf paper | `#F2FAEA` | Quiet raised tone, section shifts, table cells |
| `--text` | Ink black | `#07111A` | Headlines, body, control labels |
| `--muted` | River slate | `#53646C` | Secondary copy, timestamps, helper text |
| `--border` | Pale reed | `#DDEFE4` | Rare structural hairlines and focus support only |
| `--accent` | Sky | `#00A7FF` | Primary action, main highlighter, map water |
| `--on-accent` | Night ink | `#001018` | Text placed on Sky or Leaf |
| `--success` | Leaf | `#18D66B` | Open status, greenery, confirmed moments |
| `--warning` | Vermilion | `#FF315F` | Urgent highlighter and heat marks |
| `--error` | Vermilion | `#FF315F` | Error state, same highlighter as Vermilion |
| `--info` | Sky | `#00A7FF` | Informational marks, sky notes |

Rules for colour use:

- Use at most Sky, Leaf, and Vermilion as accents.
- Accent colour is a highlighter, not a fill for every card.
- Body text never appears in Sky, Leaf, or Vermilion on a light ground. Accent text uses Ink or a filled chip with `--on-accent`.
- Surfaces separate by tone and space, not by boxed borders.

## Type

Fukinagashi uses installed, self-contained stacks only.

| Token | Value | Use |
|---|---|---|
| `--font-display` | `Arial Black`, `Arial Narrow`, `Helvetica Neue`, Arial, sans-serif | Mastheads, section numerals, poster labels |
| `--font-body` | `Inter`, `Avenir Next`, `Helvetica Neue`, Arial, sans-serif | Body, controls, dashboard data |
| `--font-mono` | `SFMono-Regular`, Consolas, monospace | Times, route codes, compact labels |

Type scale:

| Token | Size | Line height | Use |
|---|---:|---:|---|
| `--type-hero` | `clamp(4.8rem, 13vw, 13.5rem)` | `0.78` | Landing masthead |
| `--type-display` | `clamp(3.2rem, 8vw, 8.4rem)` | `0.84` | Major section titles |
| `--type-title` | `clamp(2rem, 4vw, 4rem)` | `0.95` | Dashboard and section headings |
| `--type-subtitle` | `clamp(1.35rem, 2vw, 2.2rem)` | `1.1` | Lead text |
| `--type-body` | `1.0625rem` | `1.65` | Default copy, never smaller than 17px |
| `--type-small` | `1rem` | `1.45` | Table rows, chips, helper text |

Display text uses tight tracking, `letter-spacing: -0.04em`. Body text uses normal tracking. Labels use uppercase only when short and optically spaced.

## Spacing

Spacing is generous. Titles always receive air above them.

| Token | Value |
|---|---:|
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--space-5` | `1.5rem` |
| `--space-6` | `2rem` |
| `--space-7` | `3rem` |
| `--space-8` | `4rem` |
| `--space-9` | `6rem` |
| `--space-10` | `8rem` |

Contained content caps at `1180px` and centres on ultra-wide displays. Full-bleed heroes are the only elements that span the viewport.

## Radius and geometry

The allowed radii are `0`, `16px`, `24px`, and `9999px`.

- Large fields use `24px`.
- Controls use `16px`.
- Chips and stamps use `9999px`.
- Poster bands and image planes can use `0` with diagonal clipping.
- No arbitrary intermediate radii.

## Shared control token

Every interactive control derives from one height token:

```css
--control-height: 48px;
```

Buttons, text inputs, selects, checkbox rows, radio rows, and compact filter controls use `height` or `min-height: var(--control-height)`. Textareas use `min-height: calc(var(--control-height) * 2.5)` while keeping the same padding and state rules.

## State matrix

| Component | Default | Hover | Focus with visible ring | Active | Disabled |
|---|---|---|---|---|---|
| Primary button | Sky fill, Ink label, `16px` radius, centred label, `48px` height | Leaf underlay appears through a short diagonal band; label stays Ink | `3px` Vermilion ring with `3px` offset | Sky darkens through `color-mix`, button compresses `1px` | Muted surface, muted label, no pointer |
| Secondary button | Leaf paper fill, Ink label, same shape and height as primary | Sky chip mark appears inside right padding | Vermilion ring with offset | Surface deepens, compresses `1px` | Muted surface, muted label |
| Text input | Rice white fill, Ink text, Leaf paper control field, no browser border | Surface tone brightens | Parent field uses Vermilion outline and helper text remains visible | Inset tone deepens | Surface flattens, muted label, no pointer |
| Select | Same as text input, custom SVG primitive mark, no default arrow | Same as input | Same as input | Same as input | Same as input |
| Textarea | Same as text input, taller from control token | Same as input | Same as input | Same as input | Same as input |
| Checkbox row | `48px` row, custom square mark, Leaf paper field | Sky highlighter wash inside row | Row receives Vermilion ring; mark remains visible | Row compresses `1px` | Muted row, muted label |
| Radio row | `48px` row, custom round mark, Leaf paper field | Sky highlighter wash inside row | Row receives Vermilion ring | Row compresses `1px` | Muted row, muted label |
| Text link | Ink text with Sky underline slab | Vermilion underline slab | Vermilion ring around link text | Text shifts to Ink on Leaf | Muted text, no action |

## Components

Build components once from tokens and reuse them across landing and dashboard.

- **Hero field**: `100vw` by `100svh`, `background-image: var(--hero-image)`, solid tone panel for legibility, no gradient scrim.
- **Wind band**: flat accent rectangle clipped on a diagonal; used for motion, map paths, and image captions.
- **Surface block**: uses `--surface` or a role-variable colour mix, no nested card stacks.
- **Programme row**: time in mono, activity in body type, status chip in accent alias.
- **Field group**: explicit label, helper text, and custom control styling; never exposes browser defaults.
- **Stamp chip**: pill with one accent fill and `--on-accent` text.

## Imagery and art direction

The paired imagery is crisp civic festival art: bright daylight, koinobori lifted by wind, fresh green public space, precise graphic composition, and generous white air. It can combine photographic realism and poster-like simplification, but it must not become cute, childish, muddy, or nostalgic. Images carry the same three accents and no readable text.

Credits and sources:

- Kodomo no Hi koinobori craft tradition, cultural source, for the streamer subject and festival rituals.
- Japanese public festival poster practice, visual source, for civic clarity and large graphic spacing.
- Contemporary editorial event wayfinding, visual source, for dense information handled with calm hierarchy.

## Responsive behavior

- From `390px` upward, content stays inside the viewport with no horizontal overflow.
- Mobile stacks to one column and hides non-essential navigation and table columns.
- Grids use `minmax(0, 1fr)` and children use `min-width: 0`.
- At ultra-wide sizes, contained sections cap and centre; only hero imagery remains full-bleed.

## Motion

The settled state is the default. Motion is added only when a small inline script adds a class to `<html>`, and it respects `prefers-reduced-motion`. Motion should describe wind rising: a short lift, a diagonal drift, or a staggered programme reveal. No-JavaScript render remains fully visible.
