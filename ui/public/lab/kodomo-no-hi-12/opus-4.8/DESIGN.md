# Aizora — a design language for Kodomo no Hi

> 藍空 · "indigo sky." The festival of Children's Day told through the cloth it is
> printed on. Carp streamers are textiles before they are symbols — lengths of
> cotton dyed in indigo, with the figures *reserved* (left undyed) the way a
> katazome stencil holds back the dye. Aizora builds an interface the same way:
> a deep indigo ground, motifs cut out of it in warm cream, and one persimmon
> carp leading the ascent.

Aizora is one system used across two real surfaces — a marketing landing page
(`landing.html`) and a product dashboard (`dashboard.html`) — for a family
journal app of the same name, where every child swims up their own indigo sky.

---

## 1. Point of view

Three convictions drive every token below.

1. **Indigo is the ground, not an accent.** Most festival work goes bright-sky
   blue. Aizora goes *aizome* — the near-black indigo of dipped cloth. It reads
   as premium and calm and lets the persimmon carp truly sing. Indigo behaves as
   the dark neutral; cream is the light neutral; the page breathes between them.

2. **Figures are reserved, not drawn.** In stencil dyeing you don't paint the
   carp on, you protect the cloth and dye around it. So Aizora favours flat
   shapes cut from negative space — cream scallops (*seigaiha*), cream wind
   lines, cream type sitting in indigo — over outlines and borders. **There are
   no grey borders anywhere.** Edges come from fills, soft indigo-tinted shadows,
   and faint indigo keylines.

3. **One carp leads.** Persimmon vermilion is the single signature, used like a
   highlighter — the lead carp, the primary action, the live data point. Gold is
   the honour colour (celebration, milestones); moss-green is growth. Everything
   else is indigo and cream. Never more than these three accents on a screen.

---

## 2. Color

The ramp is indigo (dark neutral + brand) and cream (light neutral), with three
festival accents. Hex is canonical; every value below is the literal CSS token.

### Indigo — ground & brand
| Token | Hex | Use |
|---|---|---|
| `--indigo-900` | `#0E1E40` | deepest dye; hero floor, footer |
| `--indigo-800` | `#12244C` | brand ground, nav rail |
| `--indigo-700` | `#1C3A72` | raised panels on indigo |
| `--indigo-600` | `#27488C` | hover on indigo surfaces |
| `--indigo-500` | `#3C63A6` | indigo lines / strokes on cream |
| `--indigo-400` | `#6286C0` | muted indigo on dark |
| `--indigo-200` | `#AEC4E6` | faded wash, dividers on indigo |
| `--indigo-100` | `#E5EDF8` | input keyline, chip fills on cream |
| `--indigo-50`  | `#F0F4FB` | row hover, faint tint blocks |

### Cream — light neutral
| Token | Hex | Use |
|---|---|---|
| `--paper`   | `#F7F1E3` | page background (warm undyed cloth) |
| `--paper-2` | `#EFE6D2` | alternating sections, deeper cream |
| `--cloth`   | `#FFFFFF` | card / control surface |

### Accents (≤3 per screen, used like highlighters)
| Token | Hex | Role |
|---|---|---|
| `--carp` | `#E5532A` | **persimmon** — signature, illustration, large fills |
| `--carp-btn` | `#D23F18` | primary button fill (passes AA with white) |
| `--carp-press` | `#B8350F` | pressed/active, persimmon text on cream, focus ring |
| `--carp-tint` | `#FBE7DD` | persimmon chip / soft block |
| `--gold` | `#CFA13C` | **antique gold** — honour, milestones, second data series |
| `--gold-deep` | `#8F6C1F` | gold text on cream (AA) |
| `--gold-tint` | `#F6ECCF` | gold chip / warning block |
| `--moss` | `#3E9466` | **leaf green** — growth, positive delta |
| `--moss-deep` | `#2C7A50` | green text on cream (AA) |
| `--moss-tint` | `#DCEFE2` | success chip |

### Text
| Token | Hex | On |
|---|---|---|
| `--ink` | `#16213C` | primary text, on cream (≈11:1) |
| `--ink-2` | `#46557A` | secondary text, on cream (≈6.6:1) |
| `--ink-3` | `#5E6B8A` | placeholder / tertiary, on cream (≈4.7:1) |
| `--on-indigo` | `#F4EEE0` | text on indigo (≈12:1) |
| `--on-indigo-2` | `#B7C7E4` | muted text on indigo (≈7:1) |

Semantic colours (`--danger #C23C18`, `--warn`→gold, `--ok`→moss) stay a small
part of the palette and never become visually primary.

---

## 3. Type

Three families, each with one job.

- **Fraunces** — display serif. Soft, slightly old-style, the voice of the brand.
  Headlines and big numbers-as-statement only. Weight 600, `letter-spacing:-0.02em`.
- **Hanken Grotesk** — UI & body. Warm humanist grotesque; everything you read
  and operate. Weights 400/500/600/700.
- **Spline Sans Mono** — data. Tabular figures for stats, tables, timestamps.

### Scale (base body = 17px)
| Token | Size | Family / weight | Line |
|---|---|---|---|
| `--fs-display` | `clamp(2.75rem, 6vw, 5rem)` | Fraunces 600 | 1.04 |
| `--fs-h1` | `clamp(2rem, 4vw, 3.05rem)` | Fraunces 600 | 1.08 |
| `--fs-h2` | `1.9rem` (30px) | Fraunces 600 | 1.14 |
| `--fs-h3` | `1.375rem` (22px) | Hanken 700 | 1.25 |
| `--fs-body-lg` | `1.1875rem` (19px) | Hanken 400 | 1.6 |
| `--fs-body` | `1.0625rem` (17px) | Hanken 400 | 1.6 |
| `--fs-sm` | `0.9375rem` (15px) | Hanken 500 | 1.5 |
| `--fs-eyebrow` | `0.8125rem` (13px) | Hanken 700, `0.14em`, UPPER | 1.2 |
| `--fs-table` | `0.95rem` (15.2px) | Hanken 500 | 1.45 |

Body copy never below 17px; table rows never below 15px. Display text carries
`-0.02em`. High contrast always — no light-on-light, no dark-on-dark.

---

## 4. Spacing, radius, elevation

**Spacing** — a 4px base on an 8px rhythm. Titles always carry space above; they
never sit flush to a container top.
`--sp-1:4 · --sp-2:8 · --sp-3:12 · --sp-4:16 · --sp-5:24 · --sp-6:32 · --sp-7:48 · --sp-8:64 · --sp-9:96 · --sp-10:128` (px)

**Radius** — the streamer mouth is round, the tail tapers; the system reads soft
but deliberate.
`--r-0:0 · --r-xs:8 · --r-sm:12 · --r-md:16 · --r-lg:24 · --r-xl:32 · --r-pill:9999`
Buttons, chips and badges use `--r-pill` (the streamer tube). Cards use `--r-lg`.
Inputs use `--r-md`.

**Elevation** — indigo-tinted, soft, never a hard black drop shadow.
- `--shadow-sm` — resting chips, inputs.
- `--shadow-md` — cards.
- `--shadow-lg` — hero cards, popovers.

---

## 5. The one control height

**`--control-h: 48px`.** Every interactive control — buttons, text inputs,
selects, the search field, the toggle track's row — is built on this single
height token. Touch-comfortable, consistent line across any toolbar or form.

---

## 6. Components (built once from the tokens, with full states)

Every interactive component defines the full set:
**default · hover · focus-visible (visible ring) · active · disabled.**

**Focus ring (global).** `box-shadow: 0 0 0 3px #FFFFFF, 0 0 0 6px #B8350F` — a
white halo inside a dark-persimmon ring. The white pops on indigo and on the
persimmon button; the persimmon pops on cream and white. At least one ring is
always high-contrast against its surface. Applied on `:focus-visible` only.

- **Button** · `.btn` at `--control-h`, `--r-pill`, weight 600.
  - `--primary` persimmon fill `--carp-btn`, white text; hover → `--carp` +
    lift; active → `--carp-press` + 1px press; disabled → 0.45 opacity, no lift.
  - `--secondary` `--indigo-100` fill, `--indigo-800` text; hover darkens fill.
  - `--ghost` transparent, `--indigo-800` text; hover → `--indigo-50`.
  - `--on-indigo` cream fill on indigo surfaces; hover → pure white.
- **Text input / textarea / select** · `--control-h` (textarea auto-grows),
  `--r-md`, white fill, 1.5px `--indigo-100` keyline (a tinted line, never grey).
  Hover → `--indigo-200` keyline. Focus → `--carp` keyline + ring. Disabled →
  `--paper-2` fill, `--ink-3` text. Placeholder `--ink-3`. Select carries a
  custom cream chevron; date/number inherit the same shell.
- **Checkbox / radio** · 22px box (`--r-xs` / circle), `--indigo-100` keyline,
  white fill; checked → `--carp` fill + white mark; focus ring; disabled muted.
- **Switch** · 48×28 pill track, knob 22px white. Off → `--indigo-200`; on →
  `--carp` (or `--moss` for "good" toggles). Focus ring on track.
- **Range** · 6px `--indigo-100` track, persimmon fill, 22px white thumb with
  persimmon center; focus ring on thumb.
- **Badge / streamer pill** · `--r-pill`, small caps label, tinted by meaning
  (`--carp-tint` / `--gold-tint` / `--moss-tint` / `--indigo-100`).
- **Card** · `--cloth`, `--r-lg`, `--shadow-md`, padding `--sp-6`. No border.
- **Stat card** · eyebrow label + big Spline-Mono figure + delta pill (moss up /
  carp down).
- **Table** · white card; header row eyebrow caps; rows `--fs-table`; row hover
  `--indigo-50`; separators are faint `--indigo-100` lines, horizontal only.
- **Nav rail** · `--indigo-800` ground, cream items; active item a persimmon-
  tinted pill with a cream label and a 3px persimmon edge.
- **Progress (the current)** · pill track `--indigo-100`, fill persimmon→gold,
  a small carp mark riding the fill tip.
- **Tabs** · text items, active carries a 3px persimmon underline.

---

## 7. Layout

- **Landing.** Single column of full-width bands alternating `--paper` /
  `--paper-2`, bookended by indigo hero and footer. One full-bleed hero image
  with an indigo scrim for text contrast. Content max-width 1180px, generous
  `--sp-9` vertical rhythm. Seigaiha wave dividers (inline SVG) separate bands.
  Organic colour comes from soft blobs, never gradients-as-fill.
- **Dashboard.** Fixed 248px indigo nav rail + fluid content. Sticky cream top
  bar at `--control-h` rhythm. A 12-column content grid; cards span 12/8/6/4.
  Same tokens, same control height, same focus ring as the landing page.

## 8. Imagery

All photographic/illustrative media is generated in one cohesive style: **flat
modern katazome stencil-dye / woodblock illustration**, strictly limited to
indigo, cream, persimmon and gold, with reserved (negative-space) figures and a
faint hand-printed grain. Hero and feature art live in `./media/`. SVG is used
only for small UI marks (carp glyph, wind lines, icons, seigaiha dividers,
charts) — never for hero or feature imagery.

## 9. Motion & accessibility

Motion is gentle and optional: carp sway, soft fade-rise on scroll. All of it
sits behind `prefers-reduced-motion: reduce`. Light mode is the default. Targets
meet 44px+, text contrast meets WCAG AA, and every control shows the focus ring.
