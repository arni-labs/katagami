# KOGANE — A Design Language for Kodomo no Hi

> *kogane (黄金) — gold; brilliance; the bright inner core of a thing*

KOGANE is a grown-up graphic-design language for **Kodomo no Hi** (May 5), the Japanese
Children's Day festival of rising carp streamers. It treats the festival not as a folkloric
pastel but as a poster: bright, confident, editorial. The carp is a vector; the sky is a
field of white; the celebration is one bold accent.

This file is the system. The two surfaces (`landing.html`, `dashboard.html`) are the proof.

---

## 1. Philosophy / Point of View

**One sentence:** *Bright early-summer light, held in the discipline of a poster.*

Three commitments, applied everywhere:

1. **White is the loudest color.** Backgrounds are pure white. Composition earns its space
   by leaving most of it empty. Never fill a panel to its edges.
2. **Accent is a highlighter, not a paint.** The three accent colors are used in small,
   decisive strokes — a circle, a stripe, a single word — never as washes or gradients.
3. **Type does the work.** Display type is large, tight-tracked, and unhedged. Body type is
   a clean grotesque at 17px+. Hierarchy is built with size and weight, not with rules
   or borders.

The festival reference is real but abstracted: the carp is a single geometric silhouette;
the streamers are vertical bars of color; the sky is the white page itself. Nothing is
cute, nothing is cluttered, nothing is pastel.

---

## 2. Tokens

### 2.1 Color

| Token             | Value      | Role                                            |
|-------------------|------------|-------------------------------------------------|
| `--k-ink`         | `#0A0A0A`  | Primary text, primary buttons, headings         |
| `--k-ink-2`       | `#1F1F1F`  | Secondary text, captions                        |
| `--k-ink-3`       | `#6B6B6B`  | Tertiary text, metadata, helper                 |
| `--k-paper`       | `#FFFFFF`  | Page background, card background                |
| `--k-paper-2`     | `#F5F5F2`  | Subtle warm-white surface (table rows, wells)   |
| `--k-rule`        | `#ECECE8`  | Hairline divider, table grid                    |
| `--k-sky`         | `#0066FF`  | Primary accent — electric cobalt sky            |
| `--k-leaf`        | `#00C853`  | Secondary accent — fresh spring green           |
| `--k-pop`         | `#FF1F6B`  | Hot pop — magenta-red, used sparingly           |
| `--k-sun`         | `#FFD400`  | Optional warm accent (gold, used ≤ 5% of frame) |
| `--k-focus-ring`  | `#0066FF`  | Visible focus ring (always 2px, offset 2px)     |

Contrast rules:
- Body text on white: `--k-ink` only. Never `--k-ink-3` for body.
- Accent colors are used on white only; never on `--k-paper-2`.
- `--k-pop` is never used for body text; only for emphasis marks ≤ 24px.

### 2.2 Type

| Token             | Value                                                                  |
|-------------------|------------------------------------------------------------------------|
| `--k-font-display`| `"Inter Tight", "Helvetica Neue", Arial, sans-serif`                   |
| `--k-font-body`   | `"Inter", "Helvetica Neue", Arial, sans-serif`                         |
| `--k-font-mono`   | `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`          |

| Token              | Size   | Weight | Tracking | Use                          |
|--------------------|--------|--------|----------|------------------------------|
| `--k-type-display` | 96px   | 700    | -0.04em  | Hero only                    |
| `--k-type-h1`      | 64px   | 700    | -0.03em  | Page title                   |
| `--k-type-h2`      | 40px   | 700    | -0.02em  | Section title                |
| `--k-type-h3`      | 24px   | 600    | -0.01em  | Card / panel title           |
| `--k-type-body`    | 17px   | 400    | 0        | Body                         |
| `--k-type-body-s`  | 15px   | 400    | 0        | Dense body, table cells      |
| `--k-type-caption` | 13px   | 500    | 0.02em   | Eyebrow / label / metadata   |
| `--k-type-mono`    | 14px   | 400    | 0        | Data, IDs, code              |

Line-height: 1.15 for display/h1/h2, 1.3 for h3, 1.55 for body.

### 2.3 Spacing

8px base grid. Allowed steps: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

| Token             | Value |
|-------------------|-------|
| `--k-space-1`     | 4px   |
| `--k-space-2`     | 8px   |
| `--k-space-3`     | 12px  |
| `--k-space-4`     | 16px  |
| `--k-space-5`     | 24px  |
| `--k-space-6`     | 32px  |
| `--k-space-7`     | 48px  |
| `--k-space-8`     | 64px  |
| `--k-space-9`     | 96px  |
| `--k-space-10`    | 128px |

Section vertical rhythm: 96px between major sections; 48px inside a section.

### 2.4 Radius

Only four values, ever:

| Token             | Value | Use                                  |
|-------------------|-------|--------------------------------------|
| `--k-radius-0`    | 0     | Editorial blocks, tables, hero       |
| `--k-radius-1`    | 16px  | Cards, inputs, panels                |
| `--k-radius-2`    | 24px  | Feature cards, large surfaces        |
| `--k-radius-pill` | 9999px| Pills, tags, avatar                  |

### 2.5 The one control height

```css
--k-control-h: 48px;
```

Every interactive control — button, input, select, checkbox row, toggle — sits on this
height. No exceptions. Vertical padding inside cards is always a multiple of 8.

### 2.6 Motion

| Token             | Value      | Use                              |
|-------------------|------------|----------------------------------|
| `--k-ease`        | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Default easing     |
| `--k-dur-fast`    | 120ms      | Hover color, focus ring          |
| `--k-dur-base`    | 200ms      | Press, expand                    |
| `--k-dur-slow`    | 400ms      | Page enter, hero                 |

Always respect `prefers-reduced-motion`.

---

## 3. Components

Every component is built once from tokens. Every interactive element has all five states.

### 3.1 Button

Height: `--k-control-h` (48px). Horizontal padding: 24px. Radius: `--k-radius-pill`.

| Variant    | Background       | Text           | Border                  |
|------------|------------------|----------------|-------------------------|
| Primary    | `--k-ink`        | `--k-paper`    | none                    |
| Secondary  | `--k-paper`      | `--k-ink`      | 1.5px `--k-ink`         |
| Accent     | `--k-sky`        | `--k-paper`    | none                    |
| Ghost      | transparent      | `--k-ink`      | none                    |

States (applied to all variants):

| State      | Treatment                                                                 |
|------------|---------------------------------------------------------------------------|
| default    | as above                                                                  |
| hover      | background shifts +6% lightness toward white/black; transform: translateY(-1px); transition 120ms |
| focus      | outline: 2px solid `--k-focus-ring`; outline-offset: 2px                  |
| active     | transform: translateY(0); background shifts -4% lightness                 |
| disabled   | opacity 0.4; cursor not-allowed; no hover/active transforms               |

### 3.2 Input (text, email, number, search)

Height: `--k-control-h`. Radius: `--k-radius-1`. Padding: 0 16px. Font: `--k-font-body`, 17px.

| State      | Treatment                                                                |
|------------|--------------------------------------------------------------------------|
| default    | background `--k-paper`; border 1.5px `--k-ink`                           |
| hover      | border-color `--k-sky`                                                   |
| focus      | border-color `--k-sky`; outline 2px `--k-focus-ring`; outline-offset 2px |
| active     | (same as focus while typing)                                             |
| disabled   | background `--k-paper-2`; border `--k-rule`; color `--k-ink-3`           |
| error      | border-color `--k-pop`; helper text in `--k-pop`                         |

### 3.3 Select

Same dimensions as input. Custom chevron via inline SVG (no border).

### 3.4 Checkbox / Radio

24px box. 1.5px `--k-ink` border. Checked: filled `--k-sky`, white checkmark.

States: default → hover (border `--k-sky`) → focus (2px ring) → checked → disabled (opacity 0.4).

### 3.5 Toggle

48px × 28px. Radius `--k-radius-pill`. Off: `--k-paper-2` track, `--k-ink` knob.
On: `--k-sky` track, white knob. Transition 200ms.

### 3.6 Card

Radius `--k-radius-1` (or `--k-radius-2` for feature cards). Background `--k-paper`.
Padding `--k-space-5` (24px). No border. Hover (interactive cards): translateY(-2px),
shadow `--k-shadow-1`.

### 3.7 Pill / Tag

Height 28px. Radius `--k-radius-pill`. Padding 0 12px. Font `--k-type-caption`, weight 600.

Variants: ink (default), sky, leaf, pop — each with white text on solid color.

### 3.8 Table

Header row: `--k-type-caption`, weight 600, uppercase, tracking 0.04em, color `--k-ink-3`.
Row height: 56px. Zebra: even rows `--k-paper-2`. No vertical borders; one 1px `--k-rule`
under the header only.

### 3.9 Nav link

Underline 2px transparent. Hover: underline `--k-sky`. Active page: underline `--k-ink`,
weight 600.

---

## 4. Layout guidance

- **Page max width:** 1280px, with 32px gutter. Hero sections break out to full bleed.
- **Vertical rhythm:** section spacing 96px; subsection 48px; component 24px.
- **Hero:** full-bleed image at top, 100vh on desktop, 70vh on mobile. Headline overlays
  the image at the bottom-left, never centered.
- **Dashboard grid:** 12 columns, 24px gutter. Sidebar 240px fixed. Top bar 64px.
- **Cards on a row:** 3 across desktop, 2 tablet, 1 mobile. Never 4 across.
- **Never** use a border where a background contrast would do. The only acceptable borders
  are 1.5px input borders and 1px table hairlines.

---

## 5. Voice

- Headlines are short, declarative, present tense. ("Raise the standard.")
- Body is plain, confident, adult. No exclamation marks. No emoji.
- Numbers are real. Dates use the festival's calendar (May 5).
- The product is real: a platform for celebrating Children's Day — schools, families,
  communities — and the dashboard is its operational view.

---

## 6. What KOGANE is not

- Not pastel. Not watercolor. Not folkloric.
- Not a children's toy. Not a sticker pack.
- Not cluttered. Every element earns its place.
- Not bordered. Borders are rare and meaningful.
- Not centered for the sake of centering. Composition is editorial.