# Katagami — UI design system (katagami.ai)

The house style of the Katagami **site itself** (not the generated design languages — those
have their own DESIGN.md each). Extracted from `ui/src/app/globals.css` and the canonical
components (`components/language-card.tsx`, `components/page-hero.tsx`, `app/(site)/page.tsx`).
When you build any katagami.ai surface — gallery, studio, lab, bake-off — follow this.

## The aesthetic

A **riso-print specimen catalog**. Katagami were dye stencils; risograph is stencil
duplication. The site reads as riso-printed on warm uncoated paper: a fixed drum of spot inks,
**misregistered second passes and soft shadows instead of borders, grain instead of gloss**.
Light mode is the default; the riso lives in the accents and effects, never in the paper.

## Non-negotiables

- **Sharp rectangles — do not round cards.** `.sticker-card` is `border-radius: 0`. Rounding is
  reserved for pills, dots and avatars (`rounded-full` = 9999) and the ≤3px corner of a stamp.
  Never put a `rounded-[16px]` / `rounded-xl` on a content card. This is the most common mistake.
- **No borders.** Separation comes from soft shadows (`--shadow-card`), paper tint, overprint,
  washi-tape and stamps — never a grey 1px border. (Only the status *stamp* carries a hairline,
  and it is ink-toned, never grey.)
- **≤3 accents, used like highlighters.** The **signature trio** carries all chrome:
  `--sakura` (fluor pink) · `--yuzu` (riso yellow) · `--ramune` (riso blue). Support inks
  (`--salad --matcha --shiso --teal --sumire`) stay quiet and data-driven; `--beni` (red) is
  destructive-only. Bright and clean, never muddy — no pastel washes, no gradients (use flat ink
  fields / overprint discs for organic color).
- **Pure paper + ink.** Background is pure white `--washi` (#fff); text is warm near-black
  `--sumi`. Cards are `--card` (#fff) tinted faintly by the subject's own color.

## Tokens (globals.css)

| Role | Token |
|---|---|
| Paper / card | `--washi` (#fff), `--card` (#fff) |
| Ink / text | `--sumi` (text), `--graphite` / `--muted-foreground` (secondary) |
| Signature trio | `--sakura`, `--yuzu`, `--ramune` |
| Support inks | `--salad`, `--matcha`, `--shiso`, `--teal`, `--sumire` |
| Destructive | `--beni` (red — only) |
| Shadows | `--shadow-card`, `--shadow-card-hover`, `--shadow-sticker`, `--shadow-sticker-lift` |
| Print | `--ink-blend` (multiply ☀ / screen ☾), `--grain-*`, `--marker-opacity` |

`--radius` (6px) exists for shadcn-preview chrome; **katagami cards are radius 0.**

## Type

- **Display** (`font-display`; h1/h2/h3): heavy/black, `tracking-[-0.02em]…-0.03em` — titles and
  big numbers.
- **Mono** (`font-mono`): the caption/label voice — small (8.5–11px), `uppercase`, wide tracking
  `[0.14–0.2em]`, muted. Eyebrows (`KATAGAMI · THE LAB`), meta, stamps.
- **Body** (`font-sans`): prose ≥16–17px, generous leading, `text-muted-foreground` for secondary.

## Components

- **sticker-card** — the card. `class="sticker-card"`: sharp, borderless, paper-tint bg,
  `--shadow-card`; hover lifts `translateY(-3px) rotate(-0.4deg)`. Tint by a subject color with
  `--card-ink` + `background: color-mix(in srgb, <tint> 5%, var(--paper-tint-base))`.
- **palette ink strip** — a 5px row of the subject's palette colors across the top of its preview
  (the signature card detail; see `language-card.tsx`).
- **marker** — highlighter behind text:
  `<span class="marker"><span class="marker-fill" style="background:var(--yuzu)"/><span class="marker-text">word</span></span>`.
  Use on ONE word of a title.
- **status stamp** — status (Under review / Draft / Archived) as a rotated rubber-stamp with a
  tape tab (`StatusStamp` in `language-card.tsx`), `rotate(-0.7deg)`, ink-toned — not a plain badge.
- **sticker button** — sharp, borderless, hard offset shadow, lifts on hover; mono uppercase
  label, **no emoji** (the `STICKER` constant in `lab-comparison.tsx`).
- **mono eyebrow** — section kicker above a display title.

## Spacing

Generous. Padding/margin above titles (a title is never stuck to a container top). Page gutters
`px-4`, sections `py-10…14`, card padding `p-6`+, card footer `px-3.5 py-3`.
