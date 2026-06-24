# NOBORI

A design language for Kodomo no Hi — the Japanese Children's Day festival where koinobori carp streamers rise into the May sky.

---

## Philosophy

**The carp rises. The design rises with it.**

NOBORI (昇り, "rising") is built on a single conviction: a festival celebrating children's strength and aspiration deserves a grown-up, editorial point of view. Not childish. Not cluttered. Not nostalgic pastiche. Confident graphic design that treats the carp streamer the way a Swiss typographer treats a column rule — as a structural element, not a decoration.

The aesthetic borrows from three traditions and fuses them:

1. **Japanese poster craft** — Ikko Tanaka's flat color planes, Yusaku Kamekura's bold geometry, the asymmetric weight of Showa-era print.
2. **International typographic style** — Müller-Brockmann grids, Akzidenz-Grotesk confidence, generous white space as compositional material.
3. **Contemporary editorial** — Bloomberg Businessweek's vivid accent-as-highlighter system, Pentagram's restraint, the magazine spread as a product surface.

The result is a language that feels like a product an adult would launch — sleek, clean, hopeful — while honoring the festival's vertical, ascending energy.

**Core principles:**

- **Open white is the sky.** White is not "background." It is the canvas the carp rise into. Use it generously.
- **Accents are highlighters, not paint.** Three vivid colors, used sparingly, to mark and direct — never to fill.
- **Type carries the weight.** Strong display type does the compositional work; imagery supports it.
- **Verticality is rhythm.** Koinobori are vertical. The grid breathes vertically. Sections stack with intention.
- **Restraint is respect.** The festival is joyful. The design is composed. Joy lives in the contrast.

---

## Tokens

### Color

Five tokens. That's it. No greys, no pastels, no muddy midtones.

| Token | Value | Role |
|---|---|---|
| `--sky` | `#FFFFFF` | Canvas. The May sky. Default surface. |
| `--ink` | `#0A0A0A` | Type, borders (rare), high-contrast surfaces. |
| `--blue` | `#0066FF` | Primary accent. The electric sky. Links, primary actions, focus. |
| `--leaf` | `#00B86B` | Secondary accent. Fresh May greenery. Success, growth, progress. |
| `--pop` | `#FF2D55` | Tertiary accent. The red carp. Alerts, celebration, hot marks. |

**Usage rules:**
- Body type: `--ink` on `--sky` (or `--sky` on `--ink` for inverted).
- Accents appear as small marks — a 4px bar, a filled tag, a single character — never as washes.
- Never use two accents adjacent without `--sky` between them.
- `--pop` is rationed. If it appears more than twice on a screen, you've overused it.

### Type

One family, three weights, one mono for data.

| Token | Value | Use |
|---|---|---|
| `--font-display` | `'Inter', system-ui, sans-serif` | All text. Inter is the default; system-ui is the fallback. |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` | Numbers, codes, timestamps. |

**Scale (rem-based, 17px base):**

| Token | Size | Line-height | Letter-spacing | Weight | Use |
|---|---|---|---|---|---|
| `--type-display-xl` | 96px | 0.95 | -0.04em | 700 | Hero headlines |
| `--type-display-lg` | 64px | 1.0 | -0.03em | 700 | Section openers |
| `--type-display-md` | 40px | 1.1 | -0.02em | 600 | Card titles |
| `--type-heading` | 24px | 1.2 | -0.01em | 600 | Subheads |
| `--type-body-lg` | 19px | 1.5 | 0 | 400 | Lead paragraphs |
| `--type-body` | 17px | 1.55 | 0 | 400 | Body text (base) |
| `--type-body-sm` | 15px | 1.5 | 0 | 400 | Secondary text |
| `--type-caption` | 13px | 1.4 | 0.02em | 500 | Labels, captions (uppercase optional) |
| `--type-mono` | 14px | 1.4 | 0 | 400 | Data, codes |

**Type rules:**
- Display sizes use uppercase for editorial impact (`NOBORI`, `MAY 5`).
- Body text is sentence case. Never uppercase body.
- Numbers in data contexts use `--font-mono` for column alignment.
- Line-length capped at 68ch for body, 24ch for display.

### Spacing

8px base unit. The scale is opinionated — not every step is used.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |
| `--space-9` | 96px |
| `--space-10` | 128px |
| `--space-11` | 192px |

**Vertical rhythm:** Sections are separated by `--space-9` (96px) minimum. Hero blocks use `--space-10` or `--space-11`.

### Radius

Four values. Sharp by default; rounded only where it serves a function.

| Token | Value | Use |
|---|---|---|
| `--radius-0` | 0px | Editorial blocks, images, dividers |
| `--radius-sm` | 8px | Inputs, small buttons |
| `--radius-md` | 16px | Cards, modals |
| `--radius-pill` | 9999px | Tags, pills, avatars |

### Control height

**One shared token. Every interactive control sits on it.**

| Token | Value |
|---|---|
| `--control-height` | 48px |

Buttons, inputs, selects, toggles — all 48px tall. No exceptions. This is the single most important consistency rule in the system.

### Elevation

No drop shadows. The language uses **color contrast and weight** for hierarchy, not blur.

For modals and popovers, use a 1px `--ink` border at 8% opacity — never a shadow.

### Motion

Two tokens. Respect `prefers-reduced-motion`.

| Token | Value | Use |
|---|---|---|
| `--motion-quick` | 120ms cubic-bezier(0.2, 0, 0, 1) | Hover, focus, active |
| `--motion-deliberate` | 240ms cubic-bezier(0.2, 0, 0, 1) | Enter, exit, layout shift |

---

## Components

Every component is built from tokens. Every state is explicit. Every control sits on `--control-height`.

### Button

Three variants. All 48px tall. All have visible focus rings.

**Primary** — `--ink` background, `--sky` text. The default action.
- Default: bg `--ink`, text `--sky`
- Hover: bg `--ink`, text `--blue` (the accent activates)
- Focus: 3px `--blue` ring, 2px offset
- Active: bg `--ink`, translateY(1px)
- Disabled: bg `--ink` at 30% opacity, cursor not-allowed

**Secondary** — `--sky` background, `--ink` text, 1px `--ink` border.
- Default: bg `--sky`, text `--ink`, border 1px `--ink`
- Hover: bg `--ink`, text `--sky` (inverts)
- Focus: 3px `--blue` ring, 2px offset
- Active: translateY(1px)
- Disabled: opacity 30%, cursor not-allowed

**Ghost** — transparent background, `--ink` text.
- Default: bg transparent, text `--ink`
- Hover: bg `--ink` at 6% (a subtle tint)
- Focus: 3px `--blue` ring, 2px offset
- Active: bg `--ink` at 10%
- Disabled: opacity 30%

**Accent variants** — Primary buttons can use `--blue`, `--leaf`, or `--pop` as the background instead of `--ink`. The text becomes `--sky`. Hover inverts to text-only with the accent border.

### Input

48px tall. Single border. Focus ring is always visible.

- Default: bg `--sky`, border 1px `--ink` at 20%, text `--ink`, placeholder `--ink` at 40%
- Hover: border 1px `--ink` at 40%
- Focus: border 1px `--blue`, 3px `--blue` ring at 20% (visible)
- Disabled: bg `--ink` at 4%, border `--ink` at 10%, cursor not-allowed
- Error: border 1px `--pop`, 3px `--pop` ring at 20%

### Select

Same dimensions as input. Custom chevron in `--ink`.

- Default, hover, focus, disabled, error: same as input
- Open: border `--blue`, ring visible, chevron rotates 180°

### Checkbox

20px square. Sits inline with 48px controls (vertically centered).

- Default: bg `--sky`, border 1px `--ink` at 40%
- Hover: border 1px `--ink`
- Focus: 3px `--blue` ring at 20%
- Checked: bg `--ink`, checkmark in `--sky`
- Disabled: opacity 30%

### Radio

20px circle. Same states as checkbox, with inner dot when checked.

- Default: bg `--sky`, border 1px `--ink` at 40%, 10px inner dot on check
- Hover, focus, disabled: same pattern as checkbox

### Toggle

48px × 28px. Thumb is 22px circle.

- Off: bg `--ink` at 15%, thumb `--sky` with `--ink` border
- On: bg `--ink`, thumb `--sky`
- Hover: thumb scales to 24px
- Focus: 3px `--blue` ring at 20%
- Disabled: opacity 30%

### Card

`--radius-md` (16px). 1px `--ink` border at 8% (subtle, not grey). White background.

- Default: bg `--sky`, border 1px `--ink` at 8%
- Hover: border 1px `--ink` at 20%, translateY(-2px)
- Active: translateY(0)

### Tag / Pill

`--radius-pill`. 32px tall (smaller than controls). Inline label.

- Default: bg `--ink` at 8%, text `--ink`
- Accent variants: bg `--blue` / `--leaf` / `--pop` at 12%, text in matching accent
- Solid variants: bg accent, text `--sky`

### Avatar

40px or 56px. `--radius-pill`. Image or initial.

- Default: bg `--ink` at 8%, text `--ink`
- With image: object-fit cover

### Progress bar

8px tall. `--radius-pill`. Horizontal.

- Track: bg `--ink` at 8%
- Fill: bg `--ink` (or `--blue` / `--leaf` for semantic progress)
- Animated fill on mount (240ms)

### Tab

48px tall. Bottom border indicates active.

- Default: text `--ink` at 60%, no border
- Hover: text `--ink`
- Active: text `--ink`, 2px `--ink` bottom border
- Focus: 3px `--blue` ring at 20%

---

## Layout

### Grid

12-column grid. 1280px max content width. 24px gutters. 96px page padding on desktop, 24px on mobile.

### Vertical rhythm

Sections are separated by `--space-9` (96px) on desktop, `--space-7` (48px) on mobile. Hero blocks use `--space-10` or `--space-11`.

### Breakpoints

| Name | Width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### Composition

- **Asymmetric grids.** Two-column layouts favor 5/7 or 7/5 splits, never 6/6.
- **Generous margins.** Content never touches the viewport edge.
- **Vertical anchors.** Headlines align to a consistent left edge; body text wraps beneath.
- **Imagery bleeds.** Hero images are full-bleed. Feature images sit in 4:3 or 3:2 frames.

---

## Voice

NOBORI's voice is composed, confident, and direct. It speaks like an editorial magazine, not a children's app.

- **Headlines:** Short, declarative, present tense. ("The carp rises." "Mark the season.")
- **Body:** Clear, warm, specific. No marketing fluff. No emoji.
- **CTAs:** Verb-first. ("Plan the festival." "Read the story.")
- **Numbers:** Specific. ("May 5, 2026" not "soon.")

---

## What NOBORI is not

- Not pastel. Not washed-out. Not "soft."
- Not childish. Not toy-like. Not cluttered with illustrations.
- Not nostalgic pastiche. Not faux-vintage. Not distressed.
- Not muddy. Every color is vivid or pure white.

---

## The carp rises.

That's the whole language. One vertical line, one open sky, three vivid accents, strong type, and the confidence to leave most of the canvas empty.