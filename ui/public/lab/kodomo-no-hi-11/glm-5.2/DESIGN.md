# Ryūmon

> A Katagami design language. One ownable idea: **ascent** — the carp climbs the
> waterfall (龍門, Ryūmon, the Dragon Gate) and becomes a dragon. Courage, growth,
> transformation. Surfaces rise; content ascends into view; accents climb from
> river-indigo to dragon-gold on a warm washi-paper ground.

---

## POV

Kodomo no Hi is the day a family wishes its children courage — the courage of the
carp that swims upstream, climbs the falls, and becomes a dragon. Ryūmon makes that
climbing the design's spine. Every surface is a step up the river: content rises
into place on scroll, the primary accent is the river's indigo, the secondary is
the gold of the dragon at the gate, the tertiary is the crimson of the higoi carp
streamer rippling overhead. Nothing is decorative-for-its-own-sake; motion means
*going up*. The ground is washi paper — warm, bright, never muddy. Three accents
are used like highlighters, never as washes. The mood is a clear spring morning:
airy, high-contrast, optimistic.

## Tokens

### Colour

Role vars (the only colours compositions may take):

```css
:root {
  /* Ground — washi paper, warm */
  --bg:        #F6F3EC;
  --surface:   #FFFFFF;
  --surface-2: #EFE9DD;   /* tone-separated surface, never a border */
  --surface-3: #E6DFD0;   /* deeper tone for inset / active fills */

  /* Ink */
  --text:      #1B1B26;
  --muted:     #6A6A76;

  /* Accents — three, used like highlighters */
  --accent:    #1769AA;   /* indigo — the river / sky (primary) */
  --accent-2:  #D4A017;   /* gold — the dragon at the gate */
  --accent-3:  #C44536;   /* crimson — the higoi carp streamer */
  --on-accent: #FFFFFF;

  /* Semantic roles (mapped onto the palette; never visually primary) */
  --success:   #2E7D5B;   /* growth green */
  --warning:   #D4A017;   /* = accent-2 */
  --error:     #C44536;   /* = accent-3 */
  --info:      #1769AA;   /* = accent */

  /* Focus ring */
  --ring:      #1769AA;
}
```

Dark mode (the concept chooses; Ryūmon is light-first, but carries a night-festival dark):

```css
:root[data-mode="dark"] {
  --bg:        #14141C;
  --surface:   #1E1E2A;
  --surface-2: #262636;
  --surface-3: #2E2E42;
  --text:      #F2EFE8;
  --muted:     #9A9AA8;
  --accent:    #4A9FD4;   /* lifted indigo for dark ground */
  --accent-2:  #E8B82E;
  --accent-3:  #E0564A;
  --on-accent: #14141C;
  --success:   #4EAF82;
  --warning:   #E8B82E;
  --error:     #E0564A;
  --info:      #4A9FD4;
  --ring:      #4A9FD4;
}
```

### Type

| Role        | Family                          | Weight | Size (desktop) | Tracking  |
|-------------|---------------------------------|--------|-----------------|-----------|
| Display     | Bricolage Grotesque + Zen Kaku Gothic New (kanji) | 700–800 | 56–88px | -0.02em |
| Headline    | Bricolage Grotesque + Zen Kaku Gothic New | 700 | 32–44px | -0.02em |
| Body        | Inter + Zen Kaku Gothic New | 400–500 | 17px+ | 0 |
| Small/label | Inter | 500 | 13–14px | 0.04em uppercase for labels only |
| Table row   | Inter | 400 | 14.5px+ | 0 |

Type scale (fluid clamp):
- `--fs-display: clamp(2.75rem, 6vw, 5.5rem)`
- `--fs-h1: clamp(2rem, 4vw, 2.75rem)`
- `--fs-h2: clamp(1.5rem, 2.5vw, 2rem)`
- `--fs-body: 1.0625rem` (17px)
- `--fs-small: 0.8125rem` (13px)

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
--space-9: 96px;
--space-10: 128px;
```

Section vertical padding: `clamp(64px, 10vw, 128px)`. Titles always have
`padding-block-start` of at least `--space-6` above them — never stuck to a
container top.

### Radius

Only from {0, 16, 24, 9999}:
- `--radius-0: 0` — sharp edges (dividers, image crops)
- `--radius-card: 24px` — cards, panels
- `--radius-control: 16px` — inputs, buttons
- `--radius-pill: 9999px` — pills, tags, toggles

### Control height (the one shared token)

```css
--control-h: 44px;
```

Every form control — buttons, inputs, selects, toggles, segmented controls —
is exactly `--control-h` tall. No exceptions.

## State matrix

Every interactive control has all five states. Surfaces are separated by tone
(`--surface` / `--surface-2` / `--surface-3`), never by borders.

| State    | Surface change              | Text change      | Ring | Shadow / transform |
|----------|-----------------------------|------------------|------|---------------------|
| default  | `--surface-2` fill          | `--text`         | —    | none |
| hover    | `--surface-3` fill          | `--text`         | —    | `translateY(-1px)` (ascent) |
| focus    | `--surface-2` fill          | `--text`         | 2px solid `--ring` + 2px offset `--bg` halo | none |
| active   | `--accent` fill             | `--on-accent`    | —    | `translateY(0)` (settled) |
| disabled | `--surface-2` at 50% opacity | `--muted`       | —    | none, `cursor: not-allowed` |

Primary button swaps surface to `--accent` / `--accent-2` on default and keeps
`--on-accent` text; its hover lifts to a slightly brighter accent and
`translateY(-1px)`.

Focus ring is always visible: `box-shadow: 0 0 0 2px var(--ring), 0 0 0 4px var(--bg)`
so the ring reads on any surface.

## Components (built once from tokens)

- **Button** — `--control-h` tall, `--radius-control`, one shape for all sizes;
  label centred. Primary = `--accent` fill + `--on-accent`; secondary = `--surface-2`
  fill + `--text`; ghost = transparent + `--text`. No emoji, no glyph symbols.
- **Input / Textarea / Select** — `--control-h`, `--radius-control`, `--surface-2`
  fill, no border. Focus shows the ring. Select uses a custom SVG chevron.
- **Toggle** — `--radius-pill`, `--control-h` tall (track), knob slides right on
  active (accent fill).
- **Segmented control** — `--radius-control` container, active segment fills with
  `--accent` + `--on-accent`.
- **Card** — `--radius-card`, `--surface` fill, tone-separated from `--bg` by
  fill not border. Never nested.
- **Tag / pill** — `--radius-pill`, `--surface-2` or accent-tinted fill.
- **Table** — rows `14.5px+`, tone-separated by `--surface` / `--surface-2`
  alternating, no horizontal rules.

## Signature patterns

1. **Ascent reveal** — content rises into view on scroll (`translateY(28px) → 0`
   + opacity). The signature motion; used on every section entrance.
2. **Current divider** — a thin accent line that flows upward (a 2px gradient-free
   solid `--accent` bar, full-width, between sections) marking a step up the river.
3. **Carp-to-dragon accent climb** — where a progression is shown, the accent
   steps indigo → gold, signalling the transformation.
4. **Washi ground** — the warm `--bg` is always visible behind content; cards
   float on it, never touching edge to edge.

## Credits

- **Kodomo no Hi / Koinobori** — Japanese Children's Day (5 May); the carp
  streamer festival. The legend of the carp at the Dragon Gate (龍門) is a
  Chinese-Japanese myth (koi no taki-nobori) adopted as the festival's courage
  metaphor.
- **Bricolage Grotesque** — display face (Google Fonts).
- **Zen Kaku Gothic New** — Japanese gothic face (Google Fonts).
- **Inter** — body face (Google Fonts).
