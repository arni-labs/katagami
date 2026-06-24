# Koinobori — A Katagami Design Language

> One language, one name. Built for the Kodomo no Hi celebration — Children's Day, May 5th,
> when carp streamers rise on every pole and the early-summer sky is full of colour.

## 1. Concept

**Koinobori** is a graphic-design language for a public celebration. Its single ownable idea
is **the rising column** — the vertical rhythm of stacked, ascending forms that echoes the
carp streamer pole: *magoi* (the great black carp at the top), *higoi* (the red carp), and the
smaller fish below, each catching the wind and pulling upward.

That signature mechanic is mapped everywhere:

- **Hero composition** is a vertical stack of three rising forms against open sky.
- **Section dividers** are thin vertical rules, never horizontal bars.
- **Dashboard data** uses ascending column charts, never horizontal bars.
- **Type** stacks: a heavy display headline over a tight deck, set in a vertical rhythm.

The aesthetic is **bright, airy, hopeful early-summer, pushed into confident graphic design**.
Open white. Vivid, almost-neon accents used like highlighters. Editorial poster composition.
Strong type. Sleek, clean, grown-up — an event a grown adult would proudly make, not a toy.

## 2. Tokens

### 2.1 Colour

Ground is **paper white**. Neutrals are tuned cool (the May sky is the temperature reference).
Three accents, used like highlighters — never as fills, never as washes.

| Role            | Token            | Value     | Use                                          |
| --------------- | ---------------- | --------- | -------------------------------------------- |
| Page ground     | `--bg`           | `#FFFFFF` | Page background                              |
| Surface         | `--surface`      | `#F7F8FA` | Quiet surface tone (no border needed)        |
| Ink             | `--text`         | `#0B1220` | Body and headings                            |
| Muted           | `--muted`        | `#5A6478` | Secondary copy, captions                     |
| Quiet rule      | `--border`       | `#E6E8EE` | Hairlines only — never a card edge           |
| **Accent A**    | `--accent`       | `#1FA9F0` | Sky — primary highlighter (electric blue)    |
| On accent       | `--on-accent`    | `#FFFFFF` | Text on accent fills                         |
| **Accent B**    | `--success`      | `#19C37D` | Leaf — secondary highlighter (fresh green)   |
| **Accent C**    | `--error`        | `#FF3B5C` | Pop — tertiary highlighter (hot vermilion)   |
| Warning         | `--warning`      | `#F2B400` | Heat scale (used sparingly, never primary)   |
| Info            | `--info`         | `#1FA9F0` | Same as accent A                             |

The three accents (`--accent`, `--success`, `--error`) form the only highlighter set. They are
the language's signature — used as 2–6 px strokes, fills on small badges, and 1-character
markers. They are **never** used as card backgrounds, page washes, or large fills.

### 2.2 Type

Three faces, all system stacks (no network dependency):

- **Display** — heavy grotesque, tight tracking, used at large sizes for headlines.
  Stack: `'Helvetica Neue', 'Inter', 'Arial', sans-serif`, weight 800, letter-spacing −0.02em.
- **Body** — humanist sans, comfortable at 17px+.
  Stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`, weight 400.
- **Editorial** — serif used for one accent role (pull-quotes, festival names).
  Stack: `'Iowan Old Style', 'Palatino Linotype', 'Georgia', serif`.

Type scale (px): **12, 14, 17, 20, 24, 32, 48, 72, 120**. Body minimum is 17px; table rows
14.5px+; display headlines go up to 120px on the hero.

### 2.3 Spacing

Base 8px. Scale: **4, 8, 12, 16, 24, 32, 48, 64, 96, 128**. Section padding is generous
(96–128px top, 64–96px bottom). Titles always have ≥24px above them.

### 2.4 Radius

One coherent geometry. Allowed set: **16** (cards, buttons, inputs) and **9999** (pills,
badges). No 0 — sleek, not severe.

### 2.5 Control height

One token: `--ctrl-h: 44px`. Every form control — input, select, button — sits on this
height. Buttons and inputs share the same shape (radius 16, height 44, label centred).

## 3. Surfaces (separated by tone, not borders)

Surfaces are distinguished by **tone**, never by a card edge:

- **Ground** (`--bg`, pure white) — the default page.
- **Quiet** (`--surface`, cool off-white) — used for the dashboard's data panels and the
  landing's secondary sections. No border; the tone shift is the separator.
- **Accent** (one of the three highlighters, as a fill) — used only on the primary CTA and
  small badges. Never on a card.

There are **no card borders** anywhere. A boxed-in nav or pill bar is forbidden — navigation
breathes as part of the page.

## 4. Components

Built once from tokens, used everywhere.

### 4.1 Button

- **Primary**: `--accent` fill, `--on-accent` label, radius 16, height 44, label centred.
  Hover: 8% darker fill. Active: 12% darker. Focus: 3px ring of `--accent` at 40% alpha,
  2px offset. Disabled: 40% opacity, no pointer.
- **Secondary**: transparent fill, 1.5px `--text` stroke, `--text` label. Same hover/active/
  focus/disabled matrix, with the stroke darkening on hover/active.
- **Quiet**: transparent fill, no stroke, `--text` label. Hover: `--surface` fill.

### 4.2 Input / Select / Textarea

Height 44, radius 16, `--surface` fill, 1.5px `--border` stroke, `--text` ink. Placeholder
in `--muted`. Focus: stroke becomes `--accent`, 3px ring at 40% alpha. Disabled: 50% opacity.
Select carries a custom SVG caret (no ▲ ▼ glyphs).

### 4.3 Badge / Pill

Radius 9999, height 24, 12px label, accent fill or 1px accent stroke on `--bg`.

### 4.4 Nav

Top-of-page, no floating pill bar. Logo left, links right, separated by space and a 1px
hairline at the bottom edge only.

## 5. State matrix (the full set)

| State      | Visible treatment                                          |
| ---------- | ---------------------------------------------------------- |
| Default    | Token values as defined                                    |
| Hover      | Fill darkens 8% (or stroke darkens for secondary)           |
| Focus      | 3px ring of `--accent` at 40% alpha, 2px offset            |
| Active     | Fill darkens 12%                                           |
| Disabled   | Opacity 40%, `cursor: not-allowed`, no pointer events      |

Every form control is explicitly styled — no visible browser defaults.

## 6. Layout

- **Landing**: 100vw × 100svh hero, edge-to-edge. Hero composition is a vertical stack of
  three rising forms (koinobori abstracted) against open sky. Below the hero, full sections
  tell the day: the streamers, the customs, the food, the feeling.
- **Dashboard**: 1280px max-width, centred. Sidebar nav (text-only, no boxed card) + main
  column with schedule, programme guide, festival map, and family album.

## 7. Motion

The settled state is the default — visible with no JavaScript. An inline script gates a
start-state class on `<html>` and drives a one-time reveal: the hero's three rising forms
stagger up (translateY 24px → 0, opacity 0 → 1) over 600ms with a 120ms delay between them.
`prefers-reduced-motion` disables all of it.

## 8. Imagery

Generated with `xai/grok-imagine-image`. The art direction is **editorial poster** — bold
flat colour, confident composition, graphic shapes, no muddy gradients. Koinobori are
abstracted as long vertical forms in the three accent colours, set against open sky.

## 9. Naming

**Koinobori** — one word, the carp streamer itself. The motif is the language's identity;
the name is the motif. No grounding noun needed; one word carries the idea.