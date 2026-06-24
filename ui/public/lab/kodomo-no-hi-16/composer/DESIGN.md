# Kazeiro

**Design language for wind-aware Kodomo no Hi celebration planning.**

---

## Philosophy

Kazeiro treats Children's Day not as decoration, but as **infrastructure for hope** — the moment koinobori catch wind and rise. The visual system borrows from Japanese graphic posters and Swiss editorial layout: enormous white fields, then three electric accents applied like highlighters over black type. Nothing muddy, nothing pastel-washed, nothing toy-like. Adults launch this product; children benefit from what it coordinates.

**POV:** Bright early-summer air. Clear light. Fresh greenery at the edge of frame. Streamers lifting — always upward motion implied in composition, never downward weight.

**Principles:**
1. White is the primary surface — accents are deliberate marks, not backgrounds.
2. Type carries authority; color carries energy.
3. Components are flat, confident, and touchable — no faux depth, no grey borders.
4. Motion respects `prefers-reduced-motion`; default is light mode only.

---

## Tokens

### Color

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#FFFFFF` | Primary surface |
| `--color-ink` | `#0A0A0A` | Primary text |
| `--color-ink-muted` | `#5C5C5C` | Secondary text (7.1:1 on white) |
| `--color-ink-faint` | `#8A8A8A` | Tertiary / placeholders (4.6:1 on white) |
| `--color-sky` | `#00C4FF` | Accent 1 — electric sky, links, primary actions |
| `--color-grove` | `#00E07A` | Accent 2 — fresh green, success, positive states |
| `--color-pop` | `#FF2260` | Accent 3 — hot pop, alerts, emphasis marks |
| `--color-sky-soft` | `#E6F9FF` | Sky tint for hover fills (ink on this: 12.4:1) |
| `--color-grove-soft` | `#E6FFF2` | Grove tint for secondary fills |
| `--color-pop-soft` | `#FFE6EE` | Pop tint for warning backgrounds |
| `--color-focus-ring` | `#00C4FF` | Focus ring (2px offset, 2px width) |
| `--color-disabled-bg` | `#F2F2F2` | Disabled control fill |
| `--color-disabled-ink` | `#B0B0B0` | Disabled text |

Semantic mapping: error → `--color-pop`, success → `--color-grove`, info → `--color-sky`. Never more than three accent hues visible in one viewport.

### Typography

| Token | Value |
|-------|-------|
| `--font-display` | `'Syne', system-ui, sans-serif` |
| `--font-body` | `'DM Sans', system-ui, sans-serif` |
| `--text-display-xl` | `clamp(3rem, 8vw, 5.5rem) / 1.0 / -0.03em / 800` |
| `--text-display-lg` | `clamp(2.25rem, 5vw, 3.5rem) / 1.05 / -0.02em / 700` |
| `--text-display-md` | `1.75rem / 1.15 / -0.02em / 700` |
| `--text-body` | `1.0625rem (17px) / 1.6 / 0 / 400` |
| `--text-body-sm` | `0.90625rem (14.5px) / 1.5 / 0 / 400` |
| `--text-label` | `0.8125rem / 1.3 / 0.04em / 600` uppercase |
| `--text-mono` | `'IBM Plex Mono', monospace` at 0.875rem |

Display text always uses negative letter-spacing. Body minimum 17px. Table rows minimum 14.5px.

### Spacing

| Token | Value |
|-------|-------|
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

Section vertical rhythm: `--space-9` between major blocks. Titles always have `--space-6` margin above within containers.

### Radius

Only: `0` (sharp), `16px` (card), `24px` (panel), `9999px` (pill).

| Token | Value |
|-------|-------|
| `--radius-sharp` | `0` |
| `--radius-card` | `16px` |
| `--radius-panel` | `24px` |
| `--radius-pill` | `9999px` |

### Layout

| Token | Value |
|-------|-------|
| `--content-max` | `1200px` |
| `--content-wide` | `1440px` |
| `--sidebar-width` | `260px` |
| `--control-height` | `44px` |

---

## Components

All interactive controls share `--control-height: 44px`. Focus ring: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. No borders on containers; separation via whitespace and accent blobs.

### Button — Primary (Sky)

| State | Background | Text | Other |
|-------|------------|------|-------|
| Default | `--color-sky` | `--color-ink` | font-weight 600 |
| Hover | `#00B0E6` | `--color-ink` | |
| Focus-visible | `--color-sky` | `--color-ink` | focus ring |
| Active | `#009ACC` | `--color-ink` | scale 0.98 |
| Disabled | `--color-disabled-bg` | `--color-disabled-ink` | pointer-events none |

### Button — Secondary (Ink outline-free)

| State | Background | Text |
|-------|------------|------|
| Default | transparent | `--color-ink` |
| Hover | `--color-sky-soft` | `--color-ink` |
| Focus-visible | transparent | `--color-ink` + ring |
| Active | `#CCEFFB` | `--color-ink` |
| Disabled | transparent | `--color-disabled-ink` |

### Button — Accent (Grove)

| State | Background | Text |
|-------|------------|------|
| Default | `--color-grove` | `--color-ink` |
| Hover | `#00C96E` | `--color-ink` |
| Focus-visible | `--color-grove` + ring | `--color-ink` |
| Active | `#00B060` | `--color-ink` |
| Disabled | `--color-disabled-bg` | `--color-disabled-ink` |

### Text Input

Height `--control-height`. Padding `0 var(--space-4)`. Radius `--radius-card`. Background `--color-bg`. No border; default state uses `box-shadow: inset 0 0 0 1.5px #E0E0E0`.

| State | Shadow / bg |
|-------|-------------|
| Default | inset 1.5px `#E0E0E0` |
| Hover | inset 1.5px `#C8C8C8` |
| Focus-visible | inset 2px `--color-sky` + outer ring |
| Disabled | bg `--color-disabled-bg`, text `--color-disabled-ink` |
| Error | inset 2px `--color-pop` |

### Select

Same dimensions as text input. Custom chevron via inline SVG. All states mirror text input.

### Checkbox (24×24)

| State | Box |
|-------|-----|
| Default | 1.5px `#D0D0D0` border, white fill |
| Hover | 1.5px `--color-sky` |
| Checked | fill `--color-sky`, white checkmark |
| Focus-visible | ring |
| Disabled | `--color-disabled-bg` |

### Toggle (44×24 track, 20px thumb)

| State | Track |
|-------|-------|
| Off | `#E0E0E0` |
| On | `--color-grove` |
| Focus-visible | ring on track |
| Disabled | `#F2F2F2` track, muted thumb |

### Badge

Pill radius. Padding `var(--space-1) var(--space-3)`. Label size `--text-label` but sentence case.

| Variant | Background | Text |
|---------|------------|------|
| Sky | `--color-sky-soft` | `--color-ink` |
| Grove | `--color-grove-soft` | `--color-ink` |
| Pop | `--color-pop-soft` | `--color-ink` |

### Card

Background `--color-bg`. Radius `--radius-panel`. Padding `--space-6`. No border. Optional accent blob pseudo-element in corner at 8% opacity.

### Navigation Link

| State | Style |
|-------|-------|
| Default | `--color-ink-muted`, 600 weight |
| Hover | `--color-ink`, underline offset 4px |
| Active | `--color-ink` + 3px `--color-sky` bottom bar |
| Focus-visible | ring |

### Table Row

Font `--text-body-sm`. Padding `var(--space-4) var(--space-5)`. Hover: `--color-sky-soft` background. No row borders; column gap via padding.

---

## Surfaces

### Landing

- One full-bleed hero image at top, minimum 70vh.
- Editorial asymmetric sections below — text blocks offset against image panels.
- Accent blobs (sky, grove, pop) as absolute-positioned circles behind headlines, never as page backgrounds.
- CTA pair: primary sky + secondary ghost.

### Dashboard

- Fixed left sidebar (260px), white, no border — separated by content whitespace.
- Top bar with search input and profile; main canvas with stat cards, data table, wind chart.
- Stat numbers in display font; labels in muted body.
- Sidebar nav uses active sky bar indicator.

---

## Motion

```css
@media (prefers-reduced-motion: no-preference) {
  transition: color 150ms, background 150ms, transform 100ms, box-shadow 150ms;
}
```

Hero parallax and streamer drift animations disabled under `prefers-reduced-motion: reduce`.

---

## Product

**Kazeiro** — wind-aware planning for Kodomo no Hi. Coordinate koinobori displays, read live wind corridors, and preserve family celebration rituals across seasons.