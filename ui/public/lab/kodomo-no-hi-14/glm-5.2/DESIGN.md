# SORYU — Design Language

> **SORYU** (蒼流, "blue current") — a design language inspired by Kodomo no Hi and the koinobori (carp streamer) tradition. Carp rise against the current; so do children growing into adults. SORYU captures that upward motion in a sleek, grown-up, graphic-design system: bright, airy, hopeful — with vivid almost-neon accents used like highlighters across generous open white space.

---

## 1. Philosophy / Point of View

SORYU is built on three convictions:

1. **Openness is confidence.** White space is not emptiness — it is the sky the carp rises into. SORYU pages breathe: large margins, generous padding, content that floats in open space. Clutter is the enemy of clarity.

2. **Accent color is a highlighter, not a wash.** SORYU uses pure white (`#FFFFFF`) and near-black (`#0A0E14`) as its structural neutrals. Vivid, almost-neon accents — electric sky-blue, fresh green, hot coral — appear in small, intentional bursts: a button, a status dot, a chart line. They direct the eye; they never flood the page.

3. **Grown-up, not childish.** Kodomo no Hi is a children's festival, but SORYU is a product language an adult would launch. Strong typographic hierarchy, editorial composition, tight geometry. No rounded cartoon shapes, no decorative borders, no pastel washes. The koinobori motif is abstracted into flowing lines and rising motion — referenced, not illustrated.

---

## 2. Color Tokens

### Neutrals

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Page background, card surfaces |
| `--color-surface` | `#F7F8FA` | Secondary surfaces, input backgrounds |
| `--color-ink` | `#0A0E14` | Primary text, headings |
| `--color-ink-secondary` | `#4A5568` | Body text, labels |
| `--color-ink-muted` | `#8A94A6` | Placeholder, captions, disabled text |
| `--color-line` | `#E8ECF1` | Hairlines (used sparingly) |

### Accents (highlighter palette — ≤3 used as primary accents)

| Token | Value | Role |
|---|---|---|
| `--color-sky` | `#0066FF` | Primary accent — links, primary buttons, focus rings |
| `--color-sky-bright` | `#00B4FF` | Bright variant — hover states, active highlights |
| `--color-green` | `#00C853` | Success, growth metrics, positive states |
| `--color-coral` | `#FF3D6E` | Hot pop — alerts, destructive actions, emphasis |

### Semantic

| Token | Value | Usage |
|---|---|---|
| `--color-success` | `#00C853` | Success states |
| `--color-warning` | `#FF9500` | Warning states |
| `--color-danger` | `#FF3D6E` | Error / destructive |
| `--color-info` | `#00B4FF` | Informational |

### Accent surface tints (very light, for backgrounds — never muddy)

| Token | Value | Usage |
|---|---|---|
| `--color-sky-tint` | `#EBF5FF` | Light accent background |
| `--color-green-tint` | `#E8FBF0` | Light success background |
| `--color-coral-tint` | `#FFF0F4` | Light danger background |
| `--color-warning-tint` | `#FFF6E9` | Light warning background |

---

## 3. Typography

**Type families:**
- **Display / Headings:** `"Inter", system-ui, -apple-system, sans-serif` — tight tracking, heavy weight
- **Body / UI:** `"Inter", system-ui, -apple-system, sans-serif`
- **Monospace:** `"SF Mono", "JetBrains Mono", monospace` — for data, metrics, code

**Type scale (rem-based, 1rem = 16px):**

| Token | Size | Weight | Line-height | Letter-spacing | Usage |
|---|---|---|---|---|---|
| `--text-display` | `3.5rem` | 800 | 1.05 | `-0.03em` | Hero headline |
| `--text-h1` | `2.5rem` | 700 | 1.1 | `-0.02em` | Page title |
| `--text-h2` | `2rem` | 700 | 1.15 | `-0.02em` | Section title |
| `--text-h3` | `1.5rem` | 600 | 1.25 | `-0.01em` | Card title |
| `--text-h4` | `1.25rem` | 600 | 1.3 | `-0.01em` | Subsection |
| `--text-body` | `1.0625rem` (17px) | 400 | 1.6 | `0` | Body text |
| `--text-body-sm` | `0.9375rem` (15px) | 400 | 1.5 | `0` | Secondary body |
| `--text-label` | `0.875rem` (14px) | 600 | 1.4 | `0.02em` | Labels, buttons |
| `--text-caption` | `0.8125rem` (13px) | 500 | 1.4 | `0.01em` | Captions, table rows |
| `--text-micro` | `0.6875rem` (11px) | 700 | 1.2 | `0.05em` | Eyebrow, overlines — UPPERCASE |

---

## 4. Spacing

Based on an 8px base unit:

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
| `--space-9` | `80px` |
| `--space-10` | `120px` |

---

## 5. Radius

Only from the set `{0, 8, 16, 24, 9999}`:

| Token | Value | Usage |
|---|---|---|
| `--radius-none` | `0px` | Images, hairline dividers |
| `--radius-sm` | `8px` | Small controls, inputs, tags |
| `--radius-md` | `16px` | Cards, buttons |
| `--radius-lg` | `24px` | Large cards, modal surfaces |
| `--radius-pill` | `9999px` | Pills, status dots, toggle |

---

## 6. Control Height (shared token)

**Every interactive control sits on ONE height token:**

```
--control-height: 44px;
```

This applies to: buttons, inputs, selects, toggles, segmented controls, search bars, and chip selectors. Consistent height is the backbone of visual rhythm across SORYU surfaces.

**Control padding:** `0 20px` (horizontal), except icon-only buttons which are `44px × 44px` square.

---

## 7. Shadows

SORYU avoids heavy shadows. Only two levels:

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(10,14,20,0.06)` | Cards at rest |
| `--shadow-md` | `0 4px 16px rgba(10,14,20,0.08)` | Hovered cards, dropdowns, modals |

No shadow on buttons — they use color and weight instead.

---

## 8. Motion

| Token | Value | Usage |
|---|---|---|
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Standard easing |
| `--duration-fast` | `150ms` | Hover, focus |
| `--duration-normal` | `250ms` | Transitions, toggles |
| `--duration-slow` | `400ms` | Page-level reveals |

All motion respects `prefers-reduced-motion: reduce` — transitions collapse to `0ms`.

---

## 9. Components

### Button

Built from `--control-height: 44px`, `--radius-md: 16px`, `--text-label`.

**Variants:** Primary (sky fill), Secondary (surface fill, ink text), Ghost (transparent), Danger (coral fill).

**States:**
- **Default:** Base fill
- **Hover:** Darken fill 8% / brighten for sky
- **Focus:** `2px` solid `--color-sky` ring offset `2px` from button edge (visible focus ring)
- **Active:** Darken fill 12%, scale `0.98`
- **Disabled:** `opacity: 0.4`, `cursor: not-allowed`, no hover/active transitions

### Input / Text Field

`--control-height: 44px`, `--radius-sm: 8px`, `--color-surface` background, no border (uses background contrast). Focus: `--color-sky` 2px ring + `--color-sky-tint` background. Disabled: `--color-ink-muted` text, `opacity: 0.5`.

### Select

Same dimensions as input. Custom chevron (SVG). Focus ring matches input. Dropdown panel: white, `--shadow-md`, `--radius-md`.

### Toggle

`44px` width × `24px` height track, `18px` thumb. Off: `--color-line` track. On: `--color-sky` track. Focus ring on the thumb. Disabled: `opacity: 0.4`.

### Checkbox

`20px` square, `--radius-sm`. Checked: `--color-sky` fill, white check. Focus ring on the box. Disabled: `opacity: 0.4`.

### Radio

`20px` circle. Selected: `--color-sky` outer ring, `--color-sky` dot. Focus ring. Disabled: `opacity: 0.4`.

### Segmented Control

Container: `--color-surface`, `--radius-sm`, `--control-height`. Active segment: white fill, `--shadow-sm`. Hover: `--color-ink` at 5% opacity. Focus ring on active segment.

### Card

`--radius-md`, `--shadow-sm` at rest, `--shadow-md` on hover. `--space-5` internal padding (24px). No border.

### Tag / Badge

`--radius-pill`, `--text-caption`, `--control-height` not enforced (auto height, `4px 12px` padding). Tinted backgrounds from accent tints.

### Status Dot

`8px` circle, `--radius-pill`. Color from semantic tokens.

### Table

Row height `44px` (matches control height). `--text-caption` for cell text. Header: `--text-micro` uppercase, `--color-ink-muted`. No vertical borders; horizontal hairline `--color-line` between rows.

### Navigation

Top nav: `64px` height, white background, `--shadow-sm`. Logo left, links center/right, CTA button right. Links: `--text-label`, `--color-ink-secondary`, hover `--color-ink`.

---

## 10. Layout Guidance

- **Max content width:** `1200px` centered, with `--space-7` (48px) side padding minimum
- **Section vertical spacing:** `--space-10` (120px) between major sections
- **Grid:** 12-column with `--space-5` (24px) gutters
- **Card grids:** `repeat(auto-fill, minmax(320px, 1fr))` with `--space-5` gap
- **Hero:** Full-bleed image, `min-height: 560px`, content overlaid or below
- **Responsive:** Breakpoints at 768px (tablet) and 1024px (desktop). Mobile: single column, `--space-5` side padding, sections collapse to `--space-8` (64px)

---

## 11. Surfaces

SORYU separates surfaces by intent:

- **Marketing surfaces** (landing pages): Editorial, expressive, large type, full-bleed imagery, generous spacing. The koinobori rising motion is expressed through vertical composition and upward-flowing accents.
- **Product surfaces** (dashboards): Dense but airy. Data-forward, using the same tokens. Tables, cards, charts, and controls all share `--control-height` for rhythm. Accent colors used as data highlights, not decoration.

Both surfaces use identical tokens, type, radius, and component states — one language, two registers.
