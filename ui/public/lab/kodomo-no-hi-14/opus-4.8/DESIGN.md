# HATAMEKI — はためき

**The flutter.** A design language for the moment a carp-streamer snaps taut in a fresh
early-summer wind. Kodomo no Hi (Children's Day) pushed into confident, grown-up graphic
design: vast clean light, koinobori rising, and vivid colour used like a highlighter on a
white page. One language, two surfaces — a marketing landing and a product dashboard.

---

## 1. Point of view

Most "festival" design reaches for cute. Hatameki refuses it. The koinobori is not a toy —
it is a banner: taut fabric, snapping in the wind, climbing. That is the feeling we build
for adults launching a serious product.

Three convictions drive every decision:

1. **White is the sky.** The page is open, bright, airy. Negative space is the loudest
   element. We never wash the page in pastel — the ground is pure `#FFFFFF`, and colour
   only earns its place by contrast against it.
2. **Colour is a highlighter, not a coat of paint.** Three electric accents — azure, fresh
   green, hot rose — are used the way you'd run a marker across one word in a sentence.
   Saturated, confident, and *rationed*. Most of the interface is ink on white.
3. **Type is the poster.** Headlines are big, tight, and editorial. The composition does
   the talking; ornament is removed. Motion lives in the layout (things caught mid-gust),
   not in decoration.

The product these surfaces belong to is **Hatameki**, a momentum platform for teams: every
goal is a *stream* (a koinobori) that rises as it catches *wind* (momentum). The metaphor is
load-bearing in the UI but never literal or childish.

---

## 2. Colour

### Neutrals — the sky and the ink
| Token | Value | Use |
|---|---|---|
| `--paper` | `#FFFFFF` | Page ground. Pure white, always. |
| `--ink` | `#0B1020` | Primary text, headlines. ~17:1 on paper. |
| `--ink-2` | `#3A4256` | Secondary text, labels. ~8.5:1 on paper. |
| `--ink-3` | `#697184` | Muted text, placeholders, captions. ~4.7:1 on paper. |
| `--mist` | `#F4F7FB` | Filled surfaces: inputs, quiet buttons, panels. A whisper of sky. |
| `--mist-2` | `#EAF0F8` | Hover state of mist surfaces; table zebra. |
| `--hairline` | `#E6ECF4` | The *only* sanctioned line — sparingly, for table rows. No box borders. |

### Accents — the three carp (used like highlighters, ≤3)
| Token | Value | Role |
|---|---|---|
| `--azure` | `#1466FF` | **Signature.** Primary actions, links, focus, the lead carp. White text passes AA (4.8:1). |
| `--azure-strong` | `#0B4ED6` | Hover/active for azure fills. |
| `--azure-soft` | `#E7F0FF` | Azure surface tint (selected rows, info chips). |
| `--green` | `#16C66A` | Fresh green. Positive momentum, "rising", success. |
| `--green-ink` | `#0A7A41` | Readable green for text/icons on white. |
| `--green-soft` | `#E4FAEF` | Success surface tint. |
| `--rose` | `#FF2E63` | The **one hot pop**. Used rarely: the spark, the alert, the single rose carp. |
| `--rose-ink` | `#D80F45` | Readable rose for text on white. |
| `--rose-soft` | `#FFE7EE` | Rose surface tint. |

### Minor semantic (kept small, never visually primary)
| Token | Value | Role |
|---|---|---|
| `--amber` | `#F4A024` | Warning fills/dots. |
| `--amber-ink` | `#8A5200` | Readable amber on white. |
| `--amber-soft` | `#FFF1DC` | Warning surface tint. |

**Discipline:** success uses green, danger uses rose, warning uses amber — but on any single
view at most three accents appear with weight. Semantic colour is a dot or a soft tint, never
a full saturated panel.

### The "marker" (signature mechanic)
Key words get a highlighter sweep: a flat accent band sitting *behind* the baseline, like a
felt-tip run. Implemented as a layered `background` on the text run, ~0.42em tall, accent at
full saturation for rose/azure or `--green` for green. Used once or twice per headline — never
on body copy.

### The "wind ribbon"
A 4px horizontal bar, `linear-gradient(90deg, azure, green, rose)`, used as a top hairline on
hero and as a section divider. It is the streamer reduced to its essence: motion, three carp,
one gust.

---

## 3. Typography

| Role | Family | Weight | Notes |
|---|---|---|---|
| Display / posters | **Bricolage Grotesque** | 700–800 | Tight, editorial, characterful. The voice of the brand. |
| UI / body | **Inter** | 400 / 500 / 600 | Workhorse. `tabular-nums` on all data. |
| Japanese accent | **Zen Kaku Gothic New** | 500 / 700 | はためき / 鯉のぼり only — sparing, never for Latin body. |

### Scale (`--fs-*`)
| Token | Size | Line | Tracking | Use |
|---|---|---|---|---|
| `display-xl` | `clamp(2.75rem, 6vw, 5rem)` | 0.98 | -0.03em | Hero headline |
| `display-l` | `clamp(2rem, 4.2vw, 3.25rem)` | 1.02 | -0.025em | Section headlines |
| `h1` | `2rem` | 1.1 | -0.02em | Dashboard page title |
| `h2` | `1.5rem` | 1.15 | -0.02em | Card / block titles |
| `h3` | `1.1875rem` | 1.25 | -0.01em | Sub-titles |
| `body-l` | `1.1875rem` (19px) | 1.6 | 0 | Lead paragraphs |
| `body` | `1.0625rem` (17px) | 1.6 | 0 | Default body (floor) |
| `small` | `0.9375rem` (15px) | 1.5 | 0 | Secondary UI text |
| `table` | `0.90625rem` (14.5px) | 1.45 | 0 | Table rows (floor) |
| `eyebrow` | `0.8125rem` (13px) | 1 | 0.10em | Uppercase labels/eyebrows |

Body never drops below 17px; table rows never below 14.5px; uppercase eyebrows are tracked
`+0.10em`. Display text is set tight (`-0.02em` to `-0.03em`) for poster density.

---

## 4. Space, radius, elevation

**Spacing** — 4px base: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`. Titles always
carry breathing room above them (min 24px); they never stick to a container top. Sections use
`clamp(64px, 9vw, 128px)` vertical rhythm.

**Radius** — only `{0, 16, 24, 9999}`:
- `--r-md: 16px` — inputs, selects, textareas, small cards, the marker.
- `--r-lg: 24px` — cards, panels, hero glass, modals.
- `--r-pill: 9999px` — buttons, chips, tags, toggles, avatars, progress tracks.
- `0` — full-bleed poster bands and the wind ribbon.

**Elevation** — soft, airy, never muddy:
- `--shadow-sm: 0 1px 2px rgba(11,16,32,.06), 0 1px 3px rgba(11,16,32,.05)`
- `--shadow-md: 0 12px 32px -14px rgba(11,16,32,.20)`
- `--shadow-pop: 0 20px 54px -18px rgba(20,102,255,.30)` (azure-tinted hover lift)

No borders carry structure. Separation comes from white space, fill, and shadow.

---

## 5. The one control height

```
--control-h: 44px;
```

**Every** interactive control sits on this single height: buttons, text inputs, selects,
textareas (min), the switch hit-area, icon buttons (44×44). It is the spine that keeps forms
aligned across both surfaces. Chips, tags and badges are *labels*, not controls — they size to
their content.

---

## 6. Components (built once, from tokens)

Each component is defined a single time and reused. All carry the full state set:
**default · hover · focus-visible (visible ring) · active · disabled.**

### Focus ring (universal)
```
:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--azure) 55%, white);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(20,102,255,.22);
}
```
Always visible, always azure, never removed. Keyboard and mouse both reach it via
`:focus-visible`.

### Button `.btn` (44px, pill)
- **primary** — `--azure` fill, white text. hover → `--azure-strong` + 1px lift + `--shadow-pop`.
  active → translateY(1px), `--azure-strong`. disabled → opacity .45, no lift, `not-allowed`.
- **secondary** — `--mist` fill, `--ink` text, no border. hover → `--mist-2`. active → press.
- **ghost** — transparent, `--ink` text. hover → `--mist`. for low-emphasis actions.
- **pop** — `--rose-ink` fill (deepened so white text clears AA), white text. reserved for a
  single hot call-to-action per view. The brighter `--rose` stays for marks, dots and chips.
- **icon-btn** — 44×44, pill, ghost behaviour.

### Text field `.field`, `.select`, `.textarea`
Filled (`--mist`), **no border**, radius 16, 44px tall (textarea min). Placeholder `--ink-3`.
- hover → `--mist-2`. focus → background `--paper` + focus ring. active/typing → paper.
- invalid → `--rose-soft` fill + `--rose-ink` helper text. disabled → opacity .5, `not-allowed`.
- `.select` carries a custom chevron (inline SVG mark); native menu retained.

### Checkbox `.check`, Radio `.radio`, Switch `.switch`
Custom-painted from tokens, accent `--azure`, all on the focus ring.
- checkbox: 22px, radius 0 (crisp square — deliberately distinct from the circular radio),
  checked → azure fill + white tick.
- radio: 22px circle (radius pill), checked → azure fill + white dot.
- switch: 44px hit area, pill track (`--mist` off / `--azure` on), 1px-lift knob, animated
  120ms. focus → ring on the track.

### Chip / Tag `.chip` and Badge `.badge`
Pill, soft accent tint + readable accent-ink text (`azure-soft/azure-ink`,
`green-soft/green-ink`, `rose-soft/rose-ink`, `amber-soft/amber-ink`, `mist/ink-2`). Badges
optionally lead with a 6px status dot.

### Card `.card`
White, radius 24, `--shadow-sm`, generous padding (24–32px), no border. Interactive cards
lift to `--shadow-md` on hover.

### Progress `.rise` (the streamer)
Pill track (`--mist`), accent fill (azure default / green for "rising" / amber for "stalled"),
with a small carp-eye knob at the leading edge. Represents a stream climbing its pole.

### Nav link & Tabs
Nav link: `--ink-2`, hover `--ink`, current → `--ink` + 3px azure underline grown from center.
Tabs: same underline indicator; focus ring on the tab control.

### Data viz
Charts are inline SVG built from accent tokens (azure line + azure-soft area fill, green/rose
markers). They are UI, not imagery. Sparklines on KPI cards use the same palette.

---

## 7. Imagery

Photographic, editorial, high-key — never illustration or clip-art (small UI marks are inline
SVG only). The cohesive look: **koinobori and fresh greenery shot like a premium magazine** —
vast bright sky, abundant negative space, the three accent colours appearing naturally in the
streamers. Generated with `xai/grok-imagine-image`. Hero is one full-bleed frame; feature
images are calm, single-subject, lots of air. Files live in `./media/`.

---

## 8. Layout

- **Grid:** 12 columns, max content width 1200px (landing) / 1320px (dashboard shell), gutters
  24–32px. Generous outer margins.
- **Landing:** sticky transparent header that solidifies on scroll; one full-bleed hero;
  editorial feature rows that alternate image/text; a poster stats band; a product peek; a
  CTA band with a real signup form; footer with newsletter + language select.
- **Dashboard:** fixed 248px left sidebar (rail), top bar with search + actions, a main column
  of KPIs → momentum chart → streams board, and a right rail (season note, leaderboard,
  activity). A "quick add stream" panel exercises every form control with all states.
- **Responsive:** single strong aesthetic at every width. Sidebar collapses to a top strip on
  mobile; feature rows stack; hero headline scales via `clamp`. `prefers-reduced-motion` is
  honoured — all flutter/lift transitions collapse to none.

---

## 9. Voice

Down to earth, confident, a little buoyant. "Catch the wind." "Goals that rise." "Let the
team fly." Never twee, never exclamation-heavy. The festival is the metaphor; the product is
the point.
