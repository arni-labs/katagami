# Nobori

> A design language for Kodomo no Hi — Japanese Children's Day. **Nobori** (のぼり) carries two
> meanings at once: the *koinobori* carp streamer that flies from the pole, and *nobori* — to
> climb, to rise. It is the whole festival in one word: the carp that swims up the river,
> climbs the waterfall at the Dragon Gate, and becomes a dragon. Courage, perseverance, a child
> growing. The product built on Nobori is a family app of the same name where every child's
> milestones rise like a carp up the pole.

---

## 1. Point of view

Kodomo no Hi is a **bright morning festival**: a clear May sky, fresh green leaves (shinryoku),
streamers snapping in the wind. So Nobori is **light by conviction, not by default** — the
ground is sky-white, the ink is warm sumi, and three festival colours act like cut-paper
highlighters. The mood is joyful but disciplined: generous air, rounded forms that echo the
carp's round eye and scalloped scales, never childish-cluttered.

**The one ownable idea — the signature mechanic:** *the koinobori, decomposed into UI.*
Every carp streamer is three parts — a **round eye (medama)**, a field of **overlapping
scalloped scales (uroko)**, and a **forked streaming tail**. Nobori turns those three into
reusable, recolourable primitives:

- **`uroko` scale-field** — a tessellation of overlapping scallops that fills bands, dividers,
  progress meters and data viz. Filled scales read as progress/achievement; it recolours
  entirely from the role vars, so a palette swap reskins it.
- **`medama` eye-dot** — a filled disc inside a ring. Bullets, status dots, avatars, the
  "current milestone" marker, the focus pip.
- **`nobori` ribbon** — a horizontal streamer with a scalloped leading edge and a forked tail,
  used as the brand mark and section motif; it "swims" (ripples) on the landing in motion.

These three appear on every surface, so the family-app, the marketing page, and the 3D world
are unmistakably one system.

---

## 2. Naming

- **Nobori** — one distinctive cultural noun, drawn from the single strongest motif of the
  festival (the carp streamer), doubling as the verb *to rise*. Not an adjective, not a
  portmanteau, no era/genre stack, no ID or date appended. (Rules 5, 9.)
- The in-world product brand is **Nobori** too — one name across DESIGN, landing, immersive and
  dashboard. Product/feature names in copy are invented and concrete (the *Pole*, *Ascents*,
  *Streamers*, *the Gate*), never lorem or placeholder.

---

## 3. Colour tokens

Light mode. Neutrals are tuned warm to the festival's temperature; the page ground stays a clean
white (no pastel wash), and washes are confined to small chips/badges. **Accents are exactly
three, used like highlighters** — vermilion, koi-blue, leaf-green — drawn from the carp colours.
Semantic roles reuse the accent hues where possible; warning/error stay small and never become
visually primary.

```css
:root {
  /* Neutrals — warm-tuned, clean (sky-paper + sumi ink) */
  --bg:           #FFFFFF;   /* page ground — bright sky-paper            */
  --surface:      #F7F2E9;   /* washi — raised cards, by tone not border  */
  --surface-sunk: #EFE7D8;   /* wells, insets, table zebra                */
  --text:         #1A1410;   /* sumi ink (warm near-black) — 15.8:1 on bg */
  --muted:        #6A6052;   /* secondary ink — 6.2:1 on bg               */
  --border:       rgba(26,20,16,.08); /* tonal hairline ONLY where a line is unavoidable */

  /* Accents — 3 highlighters, from the carp (hi / hanada / moegi) */
  --accent:    #D93A22;   /* vermilion 緋  — primary; white text 4.6:1   */
  --accent-2:  #1F6FB2;   /* koi-blue 縹   — secondary; white text 5.3:1 */
  --accent-3:  #2F7D3E;   /* leaf-green 萌黄 — tertiary; white text 5.1:1 */
  --on-accent: #FFFFFF;

  /* Bright variants for illustration/large fills (dark text sits on these) */
  --accent-bright:   #F0512F;
  --accent-2-bright: #2C8AD6;
  --accent-3-bright: #46A957;
  --gold:            #E0A12B; /* the spinning yaguruma ball — rare festive sparkle */

  /* Small washes — chips, badges, highlight blocks only (never full-page) */
  --accent-wash:    #FCEAE6;
  --accent-2-wash:  #E9F1F8;
  --accent-3-wash:  #E8F3EA;
  --gold-wash:      #FBF1DC;

  /* Semantic (documented roles; reuse hues; warning/error kept small) */
  --success: #2F7D3E;  --success-wash: #E8F3EA;
  --info:    #1F6FB2;  --info-wash:    #E9F1F8;
  --warning: #B07A14;  --warning-wash: #FBF1DC;
  --error:   #B3261E;  --error-wash:   #FBE6E4;
}
```

All composition colour comes from these role vars (`injectTheme` overrides them), so the uroko
scales, eye-dots and ribbon recolour on a palette swap. (Rules 35–37.)

---

## 4. Type

Two harmonising faces from the same foundry superfamily, so Latin and Japanese set as one voice.
Body never below 17px; display gets `-0.02em`. The hero headline is **rounded gothic, not the
generic oversized italic serif.**

```css
--font-display: "Zen Maru Gothic", "Hiragino Maru Gothic ProN", system-ui, sans-serif; /* rounded — headlines, brand, kanji こどもの日 / 鯉のぼり */
--font-body:    "Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", system-ui, sans-serif; /* clean gothic — body & UI */

--fs-display: clamp(2.7rem, 6.2vw, 5.25rem); /* hero            */
--fs-h1:      clamp(2.0rem, 3.6vw, 3.0rem);
--fs-h2:      clamp(1.5rem, 2.4vw, 2.1rem);
--fs-h3:      1.3125rem;   /* 21px */
--fs-body:    1.0625rem;   /* 17px — floor for reading copy */
--fs-lead:    1.1875rem;   /* 19px lead paragraphs */
--fs-ui:      1rem;        /* 16px control labels (bold) */
--fs-small:   0.9375rem;   /* 15px captions, table cells (≥14.5) */
--lh-tight: 1.08;  --lh-body: 1.62;
--ls-display: -0.02em;
```

Display weights 700/900 (Zen Maru Gothic), body 400/500/700.

---

## 5. Geometry, spacing, elevation

```css
/* Radius — one coherent rounded geometry, no in-between values */
--r-0: 0;  --r-sm: 16px;  --r-lg: 24px;  --r-full: 9999px;

/* Spacing — generous; titles always padded from container tops */
--s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px;
--s-6:32px; --s-7:48px; --s-8:64px; --s-9:96px; --s-10:128px;

/* Elevation by tone + shadow, never by border */
--shadow-1: 0 1px 2px rgba(26,20,16,.05), 0 2px 10px rgba(26,20,16,.045);
--shadow-2: 0 10px 30px rgba(26,20,16,.09);
--shadow-pop: 0 22px 60px rgba(26,20,16,.14);

--container: 1200px;     /* contained content cap; only the hero is full-bleed */
--container-wide: 1440px;
```

Surfaces are separated **by tone** (`--bg` → `--surface` → `--surface-sunk`) and shadow, never
by a drawn border. No card carries an accent edge. Cards are never nested — hierarchy comes from
space, type and surface tone. (Rules 10, 14, 17, 19, 24.)

---

## 6. The one control-height token + full state matrix

**Every interactive control is `--control-h: 48px`** — buttons, inputs, selects, the switch
track, segmented controls. One token, no exceptions.

```css
--control-h: 48px;
--control-pad-x: 20px;
--ring: 0 0 0 3px var(--bg), 0 0 0 6px rgba(217,58,34,.5); /* white gap + vermilion ring */
```

State matrix (applies to every control; focus is **always a visible 3px ring**):

| State | Primary button | Secondary button | Input / Select / Textarea |
|---|---|---|---|
| **default** | `--accent` fill, white, `--shadow-1`, radius full | `--surface` fill, `--text`, `--shadow-1`, radius full | `#FBF8F2` fill, inset shadow (no border), 17px ink, radius 16 |
| **hover** | darken to `#BF3019`, lift `-1px`, `--shadow-2` | `--surface-sunk` fill | fill → `#FFFFFF` |
| **focus-visible** | `--ring` (keeps fill) | `--ring` | `--ring` + white fill |
| **active** | darken `#A52914`, settle to `0`, inset press | `#E7DECF` fill, settle | inset press, white fill |
| **disabled** | `#EAE3D6` fill, `#A89E8E` text, no shadow, `not-allowed` | same muted recipe | `#F0EADF` fill, `--muted` text, `not-allowed` |

Buttons share **one pill shape (`--r-full`) and the 48px height**, label centred and bold; the
primary is the only vermilion fill on a screen, every other button is quieter (secondary surface
or ghost). (Rules 16, 18.)

**Form controls are all custom — no browser defaults survive:**

- **Text/email/number/textarea/search** — `--surface`-light fill, inset shadow for depth instead
  of a border, 17px ink, `--muted` placeholder, ringed focus.
- **Select** — same chassis with a hand-drawn SVG chevron (never the `▼` glyph). (Rule 21.)
- **Checkbox** — rounded-square squircle (`--r-sm` on a 24px box); checked = `--accent` fill +
  white SVG check. **Radio** — circle (`--r-full`), checked = `medama` eye-dot (accent disc in a
  ring). **Switch** — pill track (`--r-full`), 48px-wide, knob slides; on = `--accent-3`.
- **Range** — a thin track that fills as a tiny `uroko` scale-row; thumb is a `medama` disc.

All carry the same disabled and focus-ring recipe.

---

## 7. Components, built once from tokens

- **Button** — one component, variants primary / secondary / ghost; one shape + height.
- **Card** — `--surface` + `--shadow-1` + `--r-lg`, padded `--s-6`, title padded from the top.
  Never nested, never edge-accented.
- **Stat / metric tile** — big display number, `--muted` label, a small `medama` trend dot.
- **Nobori ribbon** — inline-SVG carp streamer (eye + uroko + forked tail) recoloured by role
  var; brand mark and section motif; ripples on the landing.
- **Uroko band** — a row of overlapping scallops as a divider, a progress meter (a child's
  "ascent"), and the chart fill.
- **Medama dot** — bullets, statuses, the avatar frame, the timeline node.
- **Chip / Tag / Badge** — small wash + matching ink (e.g. `--accent-3-wash` + `--accent-3`).
- **Tab / Segmented control** — pill track, active segment is a `--surface` pill with shadow.
- **Table** — borderless; zebra by `--surface-sunk` tone; rows ≥14.5px; numerics tabular.
- **Toast / Banner** — semantic wash + ink + a `medama` status dot.

---

## 8. The three surfaces (one language)

1. **landing.html** — marketing page for the Nobori family app. One full-bleed hero
   (`background-image: var(--hero-image)`, the paper-cut koinobori scene), rounded-gothic
   headline folded with its context (no tiny eyebrow stacked above), then rich sections: the
   ascent story, features as uroko/medama components, a milestone timeline, pricing, footer.
   Motion progressively enhanced (`.anim`), `prefers-reduced-motion` respected. Imagery is
   **paper-cut kirie editorial illustration** — the language's free aesthetic, deliberately
   *not* low-poly.

2. **immersive.html** — the showpiece: one continuous real-time **low-poly 3D world** flown
   through on scroll (Three.js + GSAP). Terrain, sky/horizon, a river rising to the waterfall at
   the **Dragon Gate** where the carp becomes a dragon; koinobori on tall poles and fukinagashi
   windsocks rippling via a custom GLSL cloth shader; instanced petals; morning→dusk light;
   fog matched to `scene.background`; UnrealBloom glow. A dual-ref camera rig (separate position
   + look-at) is driven by a scrubbed GSAP timeline of segments with CustomEase. Copy composes
   *over* the world in Nobori's type with glass panels and readability scrims. Pure 3D — **no
   stills or video are blended in.** No-WebGL and reduced-motion fall back to a static low-poly
   hero still.

3. **dashboard.html** — the real family app: each child is a carp climbing the **Pole**; their
   milestones are an **uroko ascent meter**; a timeline of "ascents", a roster, an activity feed,
   growth stats, and a fully-styled "log a milestone" form. Same tokens, same components.

---

## 9. Responsive

- Renders ~390px → 2560px+. Mobile collapses to one column; non-essential nav and table columns
  hide; never overflows horizontally. (Rules 22–25.)
- Grid children use `minmax(0,1fr)` + `min-width:0`. Contained content caps at `--container`
  and centres; only the hero spans `100vw`. Diagrams/illustrations stay legible at every width.

## 10. Motion

- The landing animates with intent (`.anim` settle-in on scroll, ribbons swimming, uroko filling
  to value). Settled state is the default so the page is never stuck hidden. All motion respects
  `prefers-reduced-motion`. The immersive page's motion is the scroll-driven camera itself.

---

## 11. Art style & credits

**Surface imagery (landing + dashboard):** *modern flat paper-cut (kirie) editorial
illustration* — layered cut-paper shapes, soft drop shadows, fine washi grain, the three festival
accents as crisp highlighters over warm off-white, generous negative space. A transferable
technique (it would dress any subject), here applied to the festival. **The immersive page uses
no illustration — it is pure real-time low-poly 3D** in one cohesive flat-shaded direction.

Credits — Nobori is an aggregate of influences, named honestly:
- **Koinobori / Kodomo no Hi folk tradition** (*tradition*) — the carp-streamer custom and the
  Dragon-Gate (ryūmon) legend that give the language its meaning.
- **Kirie 切り絵, Japanese cut-paper craft** (*craft tradition*) — the layered paper-cut imagery.
- **Seigaiha & uroko traditional textile patterns** (*motif tradition*) — the overlapping
  scallop/scale tessellation behind the signature mechanic.
- **Ukiyo-e colour woodblock sensibility** (*movement*) — flat planes of saturated colour with
  clean outlines, informing the palette and flat shading.
- Typefaces **Zen Maru Gothic** and **Zen Kaku Gothic New** by **Yoshimichi Ohira / Zen
  Foundry** (*typeface*), served via Google Fonts.

Image model for surface media: **xAI Grok Imagine** (text-to-image).
