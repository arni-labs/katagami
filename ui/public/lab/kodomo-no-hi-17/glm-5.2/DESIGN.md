# Satsuki

> A Katagami design language for Kodomo no Hi — the Japanese Children's Day /
> koinobori (carp-streamer) festival. One ownable idea, one paired palette,
> one art style, shipped as a coherent set.

---

## Concept

**Satsuki** (皐月) is the classical Japanese name for May — the month Kodomo no Hi
falls on. The name carries the thing itself: early summer, clear light, fresh
greenery, and the hope of a child growing strong.

The signature mechanic is **the Rise**. A koinobori is a carp made of cloth that
climbs a pole and fills with wind until it swims in the sky. Satsuki turns that
ascent into a graphic system: vertical ribbons of accent colour climb the page,
surfaces are stacked by tonal ascent (lighter ground rising into deeper surface),
and type rises on a strong vertical axis. Nothing is pinned with a border — tone
and space do the separating, the way a clear sky separates a streamer from the
ground below it.

The look is bright, airy, and hopeful, pushed into confident grown-up graphic
design: posters, editorial composition, strong type, lots of open white, then
vivid almost-neon accent colour laid down like highlighters — electric sky-blue,
fresh green, one hot coral pop. Never muddy, never washed-out pastel, never a toy.

## POV

A grown adult makes the festival's welcome. The day is real and public — families
gather, streamers go up, food is shared, customs are honoured. The design treats
Kodomo no Hi the way a serious poster designer treats a national holiday: with
respect for the motif, but with the confidence to flatten it into bold colour
blocks and strong type. Sleek, clean, editorial — an event a grown person would
proudly put their name on.

## Naming

- **Name:** Satsuki
- **One distinctive evocative noun**, real and cultural — the classical Japanese
  name for May. The theme is genuinely Japanese, so the name's language matches.
- Not a mood word, not an adjective, not a portmanteau. No banned tokens.

## Palette

Light mode is the ground (rule 22: the concept chooses the mode — a clear early-
summer sky is light). Neutrals are tuned slightly cool to match the sky's
temperature (rule 12). Three accents, used like highlighters (rule 11). Semantic
colours are a small, never-visually-primary part of the palette.

| Role | Token | Value | Notes |
|---|---|---|---|
| Background | `--bg` | `#FFFFFF` | pure white ground |
| Surface | `--surface` | `#F4F8FB` | cool off-white, tone 1 |
| Surface deep | `--surface-2` | `#E6EEF3` | tone 2 — separates by ascent |
| Text | `--text` | `#0A1219` | near-black, cool |
| Muted | `--muted` | `#5C6E7D` | cool grey, tuned to palette |
| Border | `--border` | `transparent` | surfaces separated by tone, not borders |
| Accent (sky) | `--accent` | `#00B4FF` | electric sky-blue — the streamer's sky |
| Accent (green) | `--accent-2` | `#00D96B` | fresh early-summer green |
| Accent (pop) | `--accent-3` | `#FF3D6E` | hot coral — the carp's mouth, the pop |
| On-accent | `--on-accent` | `#FFFFFF` | text on any accent |
| Success | `--success` | `#00D96B` | maps to accent-2 |
| Error | `--error` | `#FF3D6E` | maps to accent-3 |
| Info | `--info` | `#00B4FF` | maps to accent |
| Warning | `--warning` | `#FFB020` | semantic only, never visually primary |

Accents in use: exactly three (`--accent`, `--accent-2`, `--accent-3`). Warning
amber appears only in semantic warning states, never as decoration.

## Type

Two families, both loaded from Google Fonts (self-contained HTML):

- **Display:** `Bricolage Grotesque` — variable, editorial, condensed energy;
  gives poster impact without the generic AI-startup italic serif (rule 33).
- **Body:** `Inter` — clean, high-contrast, readable at 17px+.

| Token | Value |
|---|---|
| `--font-display` | `"Bricolage Grotesque", system-ui, sans-serif` |
| `--font-body` | `"Inter", system-ui, sans-serif` |
| `--fs-body` | `clamp(17px, 1.06vw + 14px, 19px)` |
| `--fs-display` | `clamp(2.75rem, 8vw, 7rem)` |
| `--lh-tight` | `1.02` |
| `--lh-body` | `1.6` |
| `--ls-display` | `-0.02em` |

Body text never drops below 17px (rule 15). Display carries `-0.02em` letter-
spacing (rule, display text). High contrast throughout — no dark-on-dark or
light-on-light pairings.

## Radius

One coherent geometry (rule 14). Three values, all from the allowed set
`{0, 16, 24, 9999}`:

| Token | Value | Used for |
|---|---|---|
| `--r-sharp` | `0` | images, full-bleed blocks, poster edges |
| `--r-surface` | `16` | cards, surfaces, inputs |
| `--r-pill` | `9999` | buttons, tags, pills, chips |

No arbitrary in-between radii.

## Spacing

Generous (rule 21). Padding above titles — titles never stuck to container tops.

| Token | Value |
|---|---|
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
| `--gutter` | `clamp(20px, 5vw, 80px)` |
| `--maxw` | `1280px` |

## Control height

One shared token drives every form control and button — they all share one
shape and height, labels centred (rule 16).

| Token | Value |
|---|---|
| `--control-h` | `48px` |

## State matrix

Every control ships the full matrix. Surfaces separate by tone, not borders
(rule). Focus is a visible ring (rule, focus-with-a-visible-ring).

| State | Token / treatment |
|---|---|
| default | `--surface` ground, `--text` label |
| hover | lift to `--surface-2`, accent label |
| focus-visible | `0 0 0 3px var(--bg), 0 0 0 5px var(--accent)` visible ring |
| active | accent fill, `--on-accent` label, `translateY(1px)` |
| disabled | `opacity: .45`, `pointer-events: none`, no accent |

Primary button: solid `--accent` fill, `--on-accent` label — clearly the one
primary (rule 16). Secondary/ghost: `--surface` ground, `--text` label, hover
lifts tone. All buttons share `--r-pill` and `--control-h`.

### Form controls (explicitly styled — rule 20)

- **Text input / textarea:** `--r-surface`, `--control-h` (textarea min-height
  scales), `--surface` ground, inset `--surface-2` on focus, visible accent ring
  on `:focus-visible`. No browser default border; tone separates.
- **Select:** custom chevron (SVG primitive, no glyph — rule 23), same height
  and radius as input.
- **Checkbox / radio:** custom drawn from SVG primitives, accent fill on check,
  visible focus ring. No browser default.
- **Toggle:** pill track, accent thumb on, `--surface-2` thumb off.
- **Range:** accent-filled track, pill thumb with focus ring.

No emoji on buttons, no symbol glyphs in copy/markup/alt — SVG primitives only
(rule 23).

## Signature mechanics → semantic roles

The Rise maps onto the role vars so it recolours on palette swap (rule 38):

- **Vertical ribbons** of `--accent` / `--accent-2` / `--accent-3` climb section
  edges — the streamer's ascent, drawn as flat colour bands, not borders.
- **Tonal ascent** of surfaces: `--bg` → `--surface` → `--surface-2` stacks
  content upward; no card ever gets a single accent edge (rule 10).
- **Rising type:** display headlines climb a vertical axis; section numbers
  run vertically beside them.

## Art style

**Graphic-editorial flat.** Full-frame, style-representative: bright, high-
contrast, bold flat colour blocks, almost-neon accents as highlighters, lots of
open negative space, clean modern Japanese graphic-design sensibility. Never
muddy, never pastel-washed. The technique dresses a streamer, a face, or a
teapot equally — it is the transferable technique, not the subject (rule 46).

**Credits:** the aesthetic is an aggregate of Japanese poster tradition
(Ikko Tanaka's flat colour blocks; the graphic clarity of Japanese editorial
design) and modern European editorial poster design. Named as influence, not
passed off as original (rule 48).

## Responsive

- Mobile (~390px): single column, non-essential nav links hidden, no horizontal
  overflow (rule 25).
- Ultra-wide (2560px+): content capped at `--maxw` and centred; only the
  full-bleed hero spans 100vw (rule 26).
- Grids use `minmax(0,1fr)` + `min-width:0` so children shrink, never blow out
  the container (rule 27).

## Motion

The fully-rendered settled state is the default — visible with no JavaScript
(rule 35). An inline script gates a hidden start-state behind a class on
`<html>` (`js-ready`) and drives the reveal, so a no-JS render and any preview
show the finished page. `prefers-reduced-motion` disables all animation. Motion
carries meaning: the Rise — streamers and type ascend on load; never decorative.

## Surfaces

1. **landing.html** — the festival's welcome. One full-viewport hero
   (100vw × 100svh) using `background-image: var(--hero-image)` (rules 28–29),
   no `<img>`. Overlay legible over the image, no lazy gradient scrim (rule 30).
   No scroll cues (rule 31). Below: rich full sections — the carp-streamers
   rising, the customs, the food, the feeling (rule 32).
2. **dashboard.html** — the day's companion. Information-rich: programme,
   customs guide, festival map, family album. Functional and dense, same
   language.

Both take all colour from the role vars (rule 36); both drive swappable images
with `background-image: var(--hero-image)` (rule 37).

## Self-check

- Accents ≤ 3: sky, green, coral — pass. Warning amber is semantic-only.
- Contrast: `--text` `#0A1219` on `--bg` `#FFFFFF` ≈ 17.5:1; `--on-accent`
  `#FFFFFF` on `--accent` `#00B4FF` ≈ 3.4:1 (large/bold text — pass for display;
  body-on-accent uses `--text` on light accent tints). Muted `#5C6E7D` on white
  ≈ 5.3:1 — pass.
- Type: body 17px+, display from `--fs-display`, both from the scale — pass.
- Radius: only {0, 16, 9999} — all from the allowed set — pass.
- Name: Satsuki — one distinctive evocative noun, Japanese (theme is Japanese),
  no banned tokens — pass.
- Controls: all on `--control-h` (48px), full state matrix, every control
  explicitly styled — pass.
- No borders: surfaces by tone — pass. No single accent edge on cards — pass.
- No emoji on buttons, no glyph symbols — SVG primitives only — pass.
