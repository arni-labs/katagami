# Ryūmon

> A Katagami design language. 龍門 — the Dragon Gate. The carp that swims the river,
> climbs the waterfall, and passes through the gate becomes a dragon. Kodomo no Hi is the
> wish that a child finds the courage to make that ascent. Ryūmon is that wish, turned into
> a product surface: bright, airy, early-summer light, with vivid accent colour laid like a
> highlighter across generous white.

---

## Point of view

One ownable idea: **the ascent**. Everything in Ryūmon rises. Content is sequenced as a
climb — milestones stack upward, progress climbs a pole, a card lifts on hover. The
signature mechanic is the **streamer pole**: a single vertical accent rail that a surface
climbs, the way a koinobori climbs its bamboo. Surfaces are separated by *tone and
elevation*, never by borders. The page reads like a clear morning in May — open sky, fresh
green, the electric blue of a carp streamer snapping in the wind, and one hot pop of red
where courage lives.

Ryūmon is grown-up and sleek, not childish. It is editorial graphic design first: bold
display type, a heavy Japanese face for kanji, strong flat composition, lots of air. The
festival is the mood, not the costume.

## Credits

- **Koinobori / Kodomo no Hi** — Japanese Children's Day tradition; the carp-streamer
  motif and the "carp climbs the waterfall to become a dragon" legend (鯉躍龍門) are the
  cultural source of the ascent metaphor.
- **Modern Japanese editorial / poster design** — flat bold vector composition, generous
  white space, highlighter-bright accent colour as the visual register.
- **Space Grotesk, Inter, Noto Sans JP** — type families used for display, body, and kanji.

---

## Tokens

All colour is taken from role variables so a palette swap recolours the whole surface.
Defaults are set in `:root`.

### Colour

```css
:root {
  /* neutrals — cool, airy, tuned to the palette temperature */
  --bg:        #FFFFFF;
  --surface:   #F2F6FC;   /* one step off white, cool — surfaces separated by tone */
  --surface-2: #E6EEF8;   /* deeper tone for nested emphasis */
  --text:      #0A1626;   /* deep ink, slightly cool — high contrast on white */
  --muted:     #5A6B82;
  --border:    #DCE6F2;   /* used only for hairline dividers, never to box cards */

  /* accents — three, used like highlighters */
  --accent:    #1BA2FF;   /* electric sky-blue — the koinobori streamer */
  --accent-2:  #16C46C;   /* fresh early-summer green — new leaves */
  --accent-3:  #FF3D5C;   /* hot pop — the carp's red, courage */

  /* semantic roles (mapped from accents) */
  --on-accent: #FFFFFF;
  --success:   #16C46C;
  --warning:   #FF8A1E;
  --error:     #FF3D5C;
  --info:      #1BA2FF;

  /* scrim for legibility over bright imagery */
  --scrim:     rgba(10,22,38,0.42);
}
```

Accents are exactly three (`--accent`, `--accent-2`, `--accent-3`). Semantic colours reuse
those three plus a small `--warning` that never becomes visually primary. Neutrals are
cool-tuned to sit with the blue/green palette. Pure `#FFF` / `#000`-family ink; no muddy
pastels, no washes.

### Typography

```css
--font-display: "Space Grotesk", "Noto Sans JP", system-ui, sans-serif;
--font-body:    "Inter", "Noto Sans JP", system-ui, sans-serif;
--font-kanji:   "Noto Sans JP", "Space Grotesk", sans-serif;

--fs-display: clamp(2.6rem, 6vw, 5.2rem);   /* hero */
--fs-h1:      clamp(2rem, 3.4vw, 3rem);
--fs-h2:      clamp(1.5rem, 2.2vw, 2rem);
--fs-h3:      1.25rem;
--fs-body:    1.0625rem;   /* 17px floor */
--fs-small:   0.9375rem;
--fs-kanji:   clamp(3rem, 9vw, 8rem);       /* heavy kanji display */

--lh-tight: 1.05;
--lh-snug:  1.25;
--lh-body: 1.6;
--ls-display: -0.02em;     /* display letter-spacing */
```

Body text is 17px+. Display carries `-0.02em`. Kanji uses Noto Sans JP at weight 900 for
heavy, poster-grade Japanese (こどもの日 / 鯉のぼり). High contrast everywhere — never
light-on-light.

### Spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;        /* section padding floor */
--pad-title: 24px;      /* always pad above a title */
```

Generous spacing throughout; titles never sit stuck to a container top.

### Radius

One coherent geometry from the allowed set `{0, 16, 24, 9999}`:

```css
--r-sharp: 0;      /* imagery, hairline dividers, editorial blocks */
--r-card:  16px;   /* cards, inputs, menus */
--r-panel: 24px;   /* large surfaces, glass panels, modals */
--r-pill:  9999px; /* buttons, chips, tags, pills */
```

No in-between radii. No arbitrary values.

### Control height (shared)

```css
--control-h: 44px;   /* every button, input, select, chip sits on this one height */
```

All form controls and buttons share `--control-h`. Labels centred, content evenly padded.

### Motion

```css
--ease: cubic-bezier(0.22, 1, 0.36, 1);
--dur:  220ms;
```

Motion carries meaning (a card lifts as it climbs). The settled state is the default —
visible with no JS. `prefers-reduced-motion` honoured.

---

## State matrix

Every interactive control implements the full matrix, built once from tokens. Surfaces
separate by tone, not borders.

| state | treatment |
|---|---|
| **default** | `--surface` ground, `--text` label, `--control-h` height. |
| **hover** | lift: `translateY(-2px)`, ground steps to `--surface-2`, accent rail brightens to `--accent`. |
| **focus-visible** | a visible `3px` ring in `--accent` at `offset 2px` — never the browser default outline. |
| **active** | `translateY(0)`, ground to `--surface-2`, label to `--accent-3` (the courage pop) for a beat. |
| **disabled** | `opacity: 0.45`, `cursor: not-allowed`, no hover/active transforms, no ring. |

Primary button is unmistakable: filled `--accent`, `--on-accent` label, `--r-pill`.
Secondary/quiet buttons share the same shape and height but take `--surface` ground and
`--text` label — clearly quieter.

---

## Components (built once from tokens)

- **Button** — `--r-pill`, `--control-h`, one primary (filled `--accent`) + quiet siblings.
  No emoji, no symbol glyphs.
- **Input / Select / Textarea** — `--r-card`, `--control-h` (textarea grows), `--surface`
  ground, explicit focus ring. No browser defaults visible.
- **Chip / Tag** — `--r-pill`, `--control-h`-derived height, `--surface-2` ground.
- **Card** — `--r-card`, `--surface` ground, **no border**, separated by tone. No single
  accent edge (rule 10): accent appears as the icon tile and the tag colour, never as a
  stripe along one side/top/bottom.
- **Glass panel** — `--r-panel`, `backdrop-filter: blur(16px)`, translucent white, used over
  imagery/3D for readability.
- **Nav** — sits openly across the header; never trapped in a floating rounded pill bar.
  Hierarchy by space, type, surface.
- **Streamer pole** — the signature: a standalone vertical `--accent`→`--accent-2` progress
  rail with a koinobori chip that climbs it to mark growth/season progress. A data component,
  never used as a card's decorative edge.
- **Divider** — 1px `--border` hairline only; never used to box a card.

---

## Composition rules

- Take all colour from the role vars (`--bg --surface --text --muted --border --accent
  --on-accent --success --warning --error --info`); `injectTheme` overrides them.
- Drive swappable imagery with `background-image: var(--hero-image)`.
- Map the streamer-pole / ascent mechanic onto semantic roles so a palette swap recolours it.
- Accents ≤3, used like highlighters. One primary button per group.
- Responsive 390px → 2560px+: single column on mobile, capped+centred on ultra-wide, only
  the full-bleed hero spans 100vw. `minmax(0,1fr)` / `min-width:0` on grid children.
