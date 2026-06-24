# Satsuki 皐月

> The clear blue May sky — *satsuki-bare* — the moment the koinobori catch the wind.
> A bright, airy, grown-up graphic-design language for Kodomo no Hi, built around one
> signature mechanic: the **fukinagashi ribbon**.

Satsuki is named for 皐月, the old lunar name for May — the month of Kodomo no Hi. The word
carries the whole mood: *satsuki-bare*, the high clean sky after the first rains, when carp
streamers snap taut against the blue. The language turns that feeling into confident editorial
graphic design — vast open white, three highlighter accents, bold type — never childish, never
a toy. It dresses **Koizora** (鯉空, "carp-sky"), a family app for raising a child through their
Children's Days.

---

## 1. Point of view

- **Open sky first.** Negative space is the primary material. Colour arrives like a kite into an
  empty sky — sparse, deliberate, vivid. We never wash the page in pastel; the ground is pure white.
- **Ribbons, not boxes.** Structure is carried by long tapering streamer bands and tone shifts,
  not by borders or nested cards.
- **Highlighter colour.** Three accents, used the way you'd run a highlighter over the one word
  that matters: a date, a price, a name. Everything else stays ink-on-white.
- **Grown-up festival.** The reference is a printed festival poster and an editorial spread, not a
  nursery. Bold, calm, sophisticated.

## 2. Signature mechanics (the ownable ideas)

1. **Fukinagashi ribbon** — the five-tail wind-streamer that tops every koinobori pole, distilled
   to a full-bleed band of stacked tapering ribbons. It is the system's connective tissue: the
   masthead banner, the seam between two tonal surfaces, the footer crown. One accent always
   leads; neutrals trail. Recolours entirely from role vars on palette swap.
2. **Koi-eye dot** — a single filled circle, the carp's eye. It is the one emphasis token: list
   bullet, status indicator, active-tab marker, the dot inside the focus ring. Always pill
   geometry, always one accent.
3. **Wind-wave** — a traveling-sine ripple. In CSS it animates ribbon seams and link underlines on
   hover; in the immersive world it is a hand-written GLSL cloth shader on every flag. Motion that
   *means* wind, never decoration.

Every mechanic maps onto semantic role vars (§4) so it recolours on a palette swap.

## 3. Mode & surfaces (separated by tone, never borders)

Light by default — the concept is a bright sky, so the ground is light. Surfaces are told apart by
**tone**, never by lines.

| Surface      | Token             | Value     | Use                                            |
|--------------|-------------------|-----------|------------------------------------------------|
| Sky (base)   | `--bg`            | `#FFFFFF` | Page ground; the open sky                      |
| Cloud        | `--surface`       | `#F4F7FB` | Cards, panels, inputs — a breath cooler than sky|
| Cloud-2      | `--surface-2`     | `#EAF0F8` | Nested zones (table header strip, code)         |
| Dusk         | `--ink`           | `#0B1A2B` | Inverted sections (footer, CTA, dusk panels)    |

No grey borders. Where a hairline is unavoidable (table rows) it is `--accent` at 12% alpha, never
neutral grey.

## 4. Colour — role vars (`injectTheme` overrides these)

Set as defaults in `:root`; all colour is taken from these roles so a palette swap recolours
everything, signature mechanics included.

```
--bg:        #FFFFFF;   /* sky            */
--surface:   #F4F7FB;   /* cloud          */
--surface-2: #EAF0F8;   /* cloud-2        */
--text:      #0B1A2B;   /* deep cool ink  */
--muted:     #54657A;   /* slate          */
--border:    rgba(22,104,255,.12);  /* accent-tinted hairline, used sparingly */
--accent:    #1668FF;   /* electric sky-blue — PRIMARY highlighter */
--accent-2:  #18C964;   /* fresh leaf-green                        */
--accent-3:  #FF3B2E;   /* vermilion — the koi pop                 */
--on-accent: #FFFFFF;
--success:   #18C964;   /* = accent-2 */
--info:      #1668FF;   /* = accent   */
--error:     #FF3B2E;   /* = accent-3 */
--warning:   #E8930C;   /* amber — semantic only, never a highlighter, small dots only */
--ink:       #0B1A2B;   /* dusk surface */
--on-ink:    #F4F7FB;
```

**Three accents, full stop** (azure / leaf / vermilion). Amber exists only as a tiny warning dot.
Neutrals are tuned cool to match the sky temperature. Vermilion is rationed — it is the *one* carp
in the sky, used on a single focal element per view.

## 5. Type

- **Display & UI & body:** Schibsted Grotesk — a modern editorial grotesk, confident at heavy
  weights, legible at body sizes.
- **Japanese (kanji/kana):** Zen Kaku Gothic New — heavy gothic face for こどもの日 / 鯉のぼり / 皐月.

```
--font-sans: "Schibsted Grotesk", system-ui, sans-serif;
--font-jp:   "Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", sans-serif;
```

Scale (modular, base 17px). Letter-spacing `-0.02em` on display sizes.

| Token            | Size                              | Role                         |
|------------------|-----------------------------------|------------------------------|
| `--fs-display`   | `clamp(2.75rem, 6.2vw, 5.5rem)`   | Hero headline                |
| `--fs-h1`        | `clamp(2rem, 4vw, 3.25rem)`       | Section titles               |
| `--fs-h2`        | `clamp(1.55rem, 2.8vw, 2.3rem)`   | Sub-sections                 |
| `--fs-h3`        | `1.35rem`                         | Card titles                  |
| `--fs-lead`      | `1.25rem`                         | Lead paragraphs              |
| `--fs-body`      | `1.0625rem` (17px)                | Body — never smaller         |
| `--fs-small`     | `0.9375rem` (15px)                | Captions, table cells        |
| `--fs-micro`     | `0.8125rem` (13px)                | Eyebrows, badge labels       |

High contrast always: ink on sky/cloud, `--on-ink` on dusk. Never light-on-light or dark-on-dark.

## 6. Geometry — radius

One coherent rounded geometry, from the allowed set only:

```
--r-band: 0;       /* full-bleed structural ribbon bands only */
--r-md:   16px;    /* cards, inputs, panels */
--r-lg:   24px;    /* large surfaces, hero panels, media */
--r-pill: 9999px;  /* buttons, tags, koi-eye dots, toggles */
```

No arbitrary in-between radii. Components are rounded; only full-bleed ribbon bands are square.

## 7. Spacing & one control height

4px base scale: `--sp-1..10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Generous; titles always carry
padding above them — never stuck to a container top.

**One shared control height** governs every interactive control — buttons, inputs, selects,
textareas (min), the toggle track:

```
--control-h: 48px;
--control-pad-x: 20px;
```

## 8. State matrix (every control, every state)

Default → Hover → **Focus (visible ring)** → Active → Disabled. The focus ring is universal: a 3px
azure halo offset from the control, echoing the koi-eye.

```
--ring: 0 0 0 3px rgba(22,104,255,.45);   /* focus halo */
--ring-offset: 0 0 0 3px var(--bg), 0 0 0 6px rgba(22,104,255,.55);
```

| Control            | Default                          | Hover                              | Focus-visible                          | Active                       | Disabled                         |
|--------------------|----------------------------------|------------------------------------|----------------------------------------|------------------------------|----------------------------------|
| Primary button     | azure fill, white label          | darken 8%, lift 1px                 | `--ring-offset` halo                   | translateY(1px), darken 12%  | cloud fill, muted label, no lift |
| Secondary button   | cloud fill, ink label            | surface-2 fill                      | `--ring-offset` halo                   | translateY(1px)              | 45% opacity                      |
| Ghost / link       | ink label, wind-wave underline 0 | underline grows L→R                 | `--ring` halo + underline full         | underline full               | 45% opacity                      |
| Text input / select| cloud fill, no border            | surface-2 fill                      | sky fill + azure `--ring`              | —                            | 55% opacity, not-allowed         |
| Checkbox / radio   | cloud box                        | azure tint                          | azure `--ring`                         | azure fill + white check     | 45% opacity                      |
| Toggle             | cloud track, ink knob            | track tint                          | azure `--ring`                         | azure track, knob right      | 45% opacity                      |

Focus styling is `:focus-visible` only (keyboard), so mouse clicks stay clean.

## 9. Components (built once from tokens)

- **Buttons** — one shape (pill), one height (`--control-h`), centred label. Exactly one primary
  per view; the rest are secondary or ghost. No emoji, no glyph arrows in labels.
- **Inputs / selects / textareas / checkbox / radio / toggle** — fully restyled, zero browser
  defaults; select uses an inline SVG chevron (never a `▼` glyph).
- **Cards** — cloud surface, `--r-md`, soft sky shadow. Never nested; never an accent edge-stripe.
- **Tags / pills** — `--r-pill`, accent text on accent-tinted fill, the koi-eye dot as marker.
- **Ribbon band** — full-bleed stacked tapering streamers; the section seam.
- **Streamer bar** — the data-viz primitive: a horizontal progress/usage bar shaped like a
  tapering fukinagashi tail, filled with one accent.
- **Tabs** — koi-eye dot marks the active tab; underline rides the wind-wave.
- **Table** — zebra by tone (cloud / cloud-2), accent-tint hairline rows, status via koi-eye dots.

## 10. Motion

Settled state renders with no JS (rule 36): the finished page is the default; an inline script gates
hidden start-states behind a class on `<html>` and drives reveals. Wind-waves animate ribbon seams
and underlines. Everything respects `prefers-reduced-motion: reduce` (ripples freeze, reveals snap on).

## 11. Surfaces in this language

- **landing.html** — Koizora product landing: full-bleed graphic-poster hero (koinobori in a clear
  sky), then rich tonal sections, a fukinagashi ribbon seam, streamer-bar stats, a dusk CTA.
- **immersive.html** — one continuous real-time low-poly 3D world (ground, river, waterfall, Dragon
  Gate, dusk sky) flown through on scroll; koinobori on GLSL cloth shaders; pure 3D, no stills.
- **dashboard.html** — the Koizora family dashboard: growth timeline, celebration planner, koi
  collection, all in Satsuki tokens.

## 12. Credits

- **Festival source:** Kodomo no Hi / Tango no Sekku (Japanese Children's Day, May 5) — koinobori,
  fukinagashi, the carp-to-dragon legend of the Dragon Gate (登竜門).
- **Type:** *Schibsted Grotesk* (Schibsted / Bakken & Bæck, OFL); *Zen Kaku Gothic New*
  (Yoshimichi Ohira / Zen project, OFL).
- **Graphic lineage:** mid-century Japanese print posters and risograph editorial illustration —
  influences, distilled, not copied.
