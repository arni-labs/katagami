# Fukinagashi

> A design language for **Kodomo no Hi** — Japanese Children's Day, the fifth of May, when
> koinobori carp-streamers rise on the early-summer wind.

**Fukinagashi** (吹き流し) is the five-tail windsock that crowns every koinobori pole — the
rippling rainbow streamer above the carp. It is the part that *reads the wind*. We took that one
object and made it the whole system: the **streamer band**, a set of flowing ribbons that crown
sections, divide the page, mark live data, and flutter when the air moves. Everything else is
open white sky and a few highlighter-bright colours.

---

## 1. Point of view

Kodomo no Hi is usually drawn as a children's holiday — primary colours, cartoon fish, clip-art.
Fukinagashi refuses that. It is the festival as **confident graphic design**: a clear bright sky,
a strong grotesque headline, vivid accent colour used like a highlighter, and acres of calm white.
A grown adult would proudly hang this poster. The mood is *hopeful early-summer air* — fresh, high,
moving — never childish, never cluttered, never a toy.

- **One ownable idea:** the fukinagashi streamer, abstracted into the *streamer band*.
- **The sky is the page.** White is the dominant material, not a background you forget.
- **Colour is wind-caught.** Three accents, each used sparingly and brightly, never muddied, never
  spread into a wash.

---

## 2. Signature mechanic — the streamer band

The fukinagashi is a stack of long ribbons that stream sideways in the wind. We render it as a
small family of components, all built from the same idea so it never becomes wallpaper:

| Use | What it is |
| --- | --- |
| **Hero crown** | A stack of three ribbons (sky / leaf / vermilion + one ink) with a soft wave on the trailing edge, drifting horizontally on the wind. |
| **Streamer rule** | A slim three-ribbon divider that crowns each section instead of a grey line. |
| **Ribbon tag** | The eyebrow label — a pill led by a single ribbon dash in an accent. |
| **Streamer bar** | Dashboard KPI / progress bars *are* ribbons; they pull their colour from the semantic role var, so a palette swap recolours every one. |
| **Carp-eye dot** | A small concentric dot (the carp's eye) used as the list marker and live indicator. |

The ribbons always take colour from the role vars `--accent`, `--accent-2`, `--accent-3` — never
hard-coded — so the mechanic recolours on any palette swap (rule 38). Motion means *wind*: ribbons
drift only while the air moves, and stop entirely under `prefers-reduced-motion`.

---

## 3. Naming

**Fukinagashi** — one distinctive evocative noun, drawn from the language's single strongest motif
(the streamer that crowns the koinobori pole). The theme genuinely *is* Japanese (Kodomo no Hi), so
a Japanese masthead is honest, not a default. No adjective, no era, no portmanteau, no ID. It is a
masthead; the slug `fukinagashi` carries identity.

---

## 4. Colour

Cool-tuned neutrals (the palette runs sky-blue, so the whites lean faintly cool), then **three**
accents used like highlighters. Semantic colours are derived and kept visually small.

### Role tokens (`:root` defaults; `injectTheme` overrides these)

| Role | Value | Note |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | the open sky; the dominant surface |
| `--surface` | `#EEF4FC` | raised surface, a faint cool sky-tint — separation by **tone**, no border |
| `--surface-ink` | `#0B1A2E` | deep navy-ink panel for dark sections (tonal contrast) |
| `--text` | `#0B1A2E` | near-black cool ink |
| `--muted` | `#56697E` | secondary text |
| `--border` | `#DEE8F3` | faint cool hairline — used only for table row separation, never to box a card |
| `--accent` | `#1257FF` | **electric sky-blue** — primary |
| `--accent-2` | `#00C46B` | **fresh spring-green** |
| `--accent-3` | `#FF4326` | **hot vermilion** — the carp pop |
| `--on-accent` | `#FFFFFF` | label colour on the blue primary |
| `--success` | `#00A85C` · `--warning` `#E8930B` · `--error` `#E5392B` · `--info` `#1257FF` | small, never primary |

### Contrast & usage rules baked into the system
- **Blue** carries white labels (≈ 5.8:1) — it is the only accent used as a filled button with a
  white label.
- **Green** never carries white text (fails contrast); it appears as ribbons, dots, live states,
  and as a chip fill behind **dark ink** text (≈ 7:1).
- **Vermilion** is the highlighter pop: the carp, big display numerals, a marker behind dark text,
  the third ribbon — never a white-on-red button.
- Body ink on white ≈ 16:1; ink on `--surface` ≈ 14:1.

≤ 3 accents (rule 11) ✓. Clean, never muddy (rule 13) ✓. Cards never get a single accent edge
(rule 10) — accent appears as ribbons, fills, and marks, never as one lonely border stripe.

---

## 5. Typography

| Role | Font | Use |
| --- | --- | --- |
| Display (Latin) | **Space Grotesk** 500/700 | headlines, wordmark, big numerals — graphic, confident, modern |
| Japanese display | **Shippori Mincho B1** 700/800 | こどもの日 / 端午の節句 — an elegant mincho serif for editorial gravity |
| Body / UI | **Inter** | everything readable; 17px base |

### Scale (modular ≈ 1.25, fluid)
```
--fs-display: clamp(3rem, 8.5vw, 7rem)    /* hero, line-height .94, -0.04em */
--fs-h1:      clamp(2.2rem, 5vw, 3.8rem)  /* -0.03em */
--fs-h2:      clamp(1.7rem, 3.2vw, 2.6rem)
--fs-h3:      1.4rem
--fs-lead:    1.25rem                      /* lead paragraphs */
--fs-body:    1.0625rem  (17px)            /* line-height 1.65 */
--fs-sm:      0.95rem    (15.2px)          /* table rows ≥ 14.5 ✓ */
--fs-eyebrow: 0.78rem    uppercase, +0.16em
```
Body text 17px+, high contrast (rule 15) ✓. Display headline is a heavy grotesk, never the generic
oversized-italic-serif AI default (rule 33) ✓.

---

## 6. Geometry, spacing, elevation

- **Radius — allowed set only `{0, 16, 24, 9999}`** (rule 14):
  `--r-0: 0` full-bleed poster bands · `--r-control: 16` buttons/inputs/selects/chips ·
  `--r-card: 24` cards, images, panels · `--r-pill: 9999` tags, dots, avatars. One coherent
  geometry — crisp poster edges or softly rounded components, nothing in between.
- **Spacing** — 8-based scale `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`. Section blocks
  pad `clamp(88px, 12vw, 160px)`. Titles always carry padding above them (rule 21) ✓.
- **Elevation** — soft cool shadow `0 18px 50px -24px rgba(11,26,46,.28)`. Surfaces separate by
  **tone + space + shadow**, never by a border (rule 19, no nested cards, no boxed nav).

---

## 7. One control height

```
--control-h: 52px
```
**Every** interactive control — primary/secondary/ghost button, text input, email input, select,
search field, icon button — is exactly 52px tall. Selects and inputs share the radius (16) and the
surface fill. No exceptions.

---

## 8. State matrix (every control)

| State | Treatment |
| --- | --- |
| **default** | token fill + ink/white label, label optically centred |
| **hover** | accent deepens (`#1257FF → #0E45CC`), `translateY(-1px)`, soft shadow lifts |
| **focus-visible** | **visible ring** — `box-shadow: 0 0 0 3px rgba(18,87,255,.32)` + 2px offset; outline never silently removed |
| **active** | returns to `translateY(0)`, fill one step darker |
| **disabled** | `opacity:.5`, `cursor:not-allowed`, hover suppressed |

On the ink panel, controls invert (light fill / ink label) and the focus ring uses a light
translucent so it stays visible. Every form control is explicitly styled — custom select caret
(inline SVG), custom checkbox, radio, switch, and range thumb; **no browser defaults** (rule 20) ✓.

---

## 9. Components (built once, from tokens)

- **Buttons** — one shape, one height, label centred. `.btn-primary` blue/white (the one clear
  primary, rule 16), `.btn-secondary` tonal pale-blue with blue label, `.btn-ghost` transparent ink.
- **Fields** — input / email / textarea / select / search, all 52px, radius 16, `--surface` fill,
  custom caret, full state matrix.
- **Toggles** — checkbox, radio, and switch drawn from primitives; range slider with a custom thumb.
- **Card** — `--surface` (or ink) fill, radius 24, soft shadow, **no border**.
- **Tag / chip** — pill, ribbon-led; live/soon/done status pills use semantic colour.
- **Streamer band / rule / bar** — the signature mechanic (§2).
- **Nav** — lives as part of the page, transparent over the hero then settling to a tonal bar; it
  is never trapped in a floating rounded pill (rule 19) ✓.

---

## 10. Layout & responsive

- **Landing** opens on a full-viewport hero — `100vw × 100svh`, edge to edge — driven by
  `background-image: var(--hero-image)` (rule 29), with a solid translucent ink **panel** behind the
  headline for legibility (no lazy gradient scrim, rule 30). No scroll cues (rule 31). Below the
  hero, rich full sections.
- **Layout families** across the page: full-bleed hero · asymmetric image-beside-text ·
  three-up card grid · big-type ink quote panel · two-column editorial · form band — four-plus
  distinct families (rule TR-029 spirit) ✓.
- **Responsive** (rule 24–27): renders ~390px → 2560px+. Mobile collapses to one column, hides
  non-essential nav links and secondary table columns, never overflows horizontally. Ultra-wide caps
  and centres content at `--maxw: 1280px`; only the hero spans 100vw. Grids use `minmax(0,1fr)` +
  `min-width:0` so children shrink instead of blowing out.

---

## 11. Motion

The **settled, fully-rendered page is the default** — visible with no JavaScript. An inline script
adds `.anim` to `<html>` to gate hidden start-states, then reveals on load and on scroll
(IntersectionObserver). The streamer ribbons drift sideways — *the wind* — and KPI bars grow once.
All motion stops under `prefers-reduced-motion`, and the no-JS / preview render shows the finished
page, never a blank one (rule 34–35) ✓.

---

## 12. Surfaces in this language

- **landing.html** — the festival's welcome. A full-bleed koinobori-sky hero drops you into the
  day, then sections tell it: the carp rising, the customs (kabuto, shōbu iris, warrior dolls), the
  food (kashiwa-mochi, chimaki), the feeling, and how to join.
- **dashboard.html** — the day's companion. A live programme, a map of the grounds with a zone
  legend, a family album, a guide, and a styled check-in form — functional and dense, same language.

---

## 13. Art style (paired)

**Medium:** screenprint. A bold flat-graphic risograph/screenprint poster illustration —
limited-ink layers, crisp geometric shapes, a subtle paper grain, generous white. The technique is
transferable (it would dress a face, a city, or a teapot equally); here it dresses koinobori, food,
and customs.

**Credits** — influences this style and language draw on, named honestly:
- *Japanese mingei & ukiyo-e flat colour* (tradition) — flat planes, confident outline, limited ink.
- *Risograph / screenprint poster illustration* (technique) — layered spot inks, registration feel,
  paper grain.
- *Mid-century Swiss-influenced graphic posters* (movement) — strong grotesk type, bold negative
  space, highlighter accent colour.

Imagery in `./media/` was generated from text prompts in this style (hero koinobori sky, riverbank
streamers, festival food, kabuto + shōbu customs, festival-grounds map).
