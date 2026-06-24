# Koi Current (鯉流)

A design language for documenting family traditions around Kodomo no Hi — Children's Day and the koinobori carp-streamer festival. Koi Current treats celebration as upward motion: dignified, kinetic, editorial. Not kawaii. Not nostalgic pastiche. A living current that carries each generation forward.

**Product context:** Koi Current is a family tradition platform — plan displays, log milestones, coordinate relatives, and preserve the story of how your household marks May 5th.

---

## Philosophy

| Principle | Expression |
|-----------|------------|
| **Upstream** | Layouts rise — vertical rhythm, ascending hierarchy, carp-scale geometry as subtle texture |
| **Dignified joy** | Scarlet and gold as highlighter accents on ink-and-paper neutrals; never muddy pastels |
| **Editorial clarity** | Serif display + sans body; generous whitespace; titles never glued to container tops |
| **Kinetic stillness** | Interfaces feel poised to move — tight control alignment, crisp edges, one shared control height |

---

## Color Tokens

### Neutrals
| Token | Value | Use |
|-------|-------|-----|
| `--color-ink` | `#0A1628` | Primary text, dark surfaces |
| `--color-paper` | `#FAFBF7` | Page background |
| `--color-mist` | `#E8EDF2` | Subtle fills, table stripes |
| `--color-slate` | `#4A5E78` | Secondary text, placeholders |
| `--color-ghost` | `#8A9BB0` | Disabled text, meta labels |

### Accents (≤3 signature colors)
| Token | Value | Use |
|-------|-------|-----|
| `--color-koi` | `#E63B2E` | Primary CTA, active nav, key metrics |
| `--color-current` | `#1B6FD1` | Links, focus rings, secondary actions |
| `--color-scale` | `#F4B942` | Highlights, badges, celebration markers |

### Semantic (small footprint)
| Token | Value | Use |
|-------|-------|-----|
| `--color-success` | `#1A7F4E` | Confirmed, complete |
| `--color-warning` | `#C97A00` | Pending, attention |
| `--color-error` | `#C41E24` | Errors, destructive |

### Contrast pairs (approved)
- Ink on Paper ✓
- Paper on Ink ✓
- Ink on Mist ✓
- Koi on Paper ✓
- Paper on Koi ✓
- Current on Paper ✓
- Scale on Ink ✓

---

## Typography

### Families
| Token | Stack |
|-------|-------|
| `--font-display` | `"Fraunces", Georgia, serif` |
| `--font-body` | `"DM Sans", system-ui, sans-serif` |
| `--font-mono` | `"JetBrains Mono", monospace` |

### Scale
| Token | Size | Line-height | Use |
|-------|------|-------------|-----|
| `--text-xs` | 12px | 1.4 | Captions, table meta |
| `--text-sm` | 14.5px | 1.45 | Table rows, labels |
| `--text-base` | 17px | 1.55 | Body copy |
| `--text-lg` | 20px | 1.45 | Lead paragraphs |
| `--text-xl` | 24px | 1.35 | Section subheads |
| `--text-2xl` | 32px | 1.2 | Card titles |
| `--text-3xl` | 48px | 1.1 | Page titles |
| `--text-4xl` | 64px | 1.05 | Hero display |

Display text uses `letter-spacing: -0.02em`.

---

## Spacing

4px base grid.

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |
| `--space-9` | 96px |

Section padding: `--space-8` top minimum before titles. Content max-width: `1200px` (landing), `1440px` (dashboard).

---

## Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-none` | `0` | Tables, full-bleed media |
| `--radius-md` | `8px` | Inputs, small cards |
| `--radius-lg` | `16px` | Cards, panels |
| `--radius-pill` | `9999px` | Buttons, badges, avatars |

---

## Elevation & Motion

- No drop shadows on cards; separation via `--color-mist` fills and whitespace.
- Organic color blobs (SVG) for hero accents — no gradients on UI chrome.
- Transitions: `150ms ease` on color, `200ms ease` on transform.
- `@media (prefers-reduced-motion: reduce)` — disable transforms, keep color shifts.

---

## Shared Control Height

```
--control-height: 44px
```

All interactive controls — buttons, text inputs, selects, toggles — align to this height. Padding adjusts inside; never change outer height per control type.

---

## Focus Ring (global)

```css
:focus-visible {
  outline: 2px solid var(--color-current);
  outline-offset: 2px;
}
```

Never remove focus rings. Hover and active states are additive.

---

## Components

### Button — Primary

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | `--color-koi` | `--color-paper` | none |
| Hover | `#CC2F24` | `--color-paper` | none |
| Focus | `--color-koi` | `--color-paper` | + focus ring |
| Active | `#B5281F` | `--color-paper` | none |
| Disabled | `--color-mist` | `--color-ghost` | none |

Height: `--control-height`. Radius: `--radius-pill`. Font: `--font-body` 15px semibold. Padding: `0 24px`.

### Button — Secondary

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | transparent | `--color-ink` | 1.5px `--color-ink` |
| Hover | `--color-mist` | `--color-ink` | 1.5px `--color-ink` |
| Focus | transparent | `--color-ink` | + focus ring |
| Active | `#D5DCE6` | `--color-ink` | 1.5px `--color-ink` |
| Disabled | transparent | `--color-ghost` | 1.5px `--color-mist` |

### Button — Ghost

| State | Background | Text |
|-------|------------|------|
| Default | transparent | `--color-current` |
| Hover | `rgba(27,111,209,0.08)` | `--color-current` |
| Focus | transparent | `--color-current` + ring |
| Active | `rgba(27,111,209,0.14)` | `#1559A8` |
| Disabled | transparent | `--color-ghost` |

### Text Input

| State | Background | Border | Text |
|-------|------------|--------|------|
| Default | `--color-paper` | 1.5px `--color-mist` | `--color-ink` |
| Hover | `--color-paper` | 1.5px `--color-slate` | `--color-ink` |
| Focus | `--color-paper` | 1.5px `--color-current` | `--color-ink` + ring |
| Active | `--color-paper` | 1.5px `--color-current` | `--color-ink` |
| Disabled | `--color-mist` | 1.5px `--color-mist` | `--color-ghost` |

Height: `--control-height`. Radius: `--radius-md`. Padding: `0 14px`. Placeholder: `--color-slate`.

### Textarea

Same border/fill states as Text Input. Min-height: `120px`. Padding: `12px 14px`. Resize: vertical only.

### Select

Same states as Text Input. Custom chevron via inline SVG. Height: `--control-height`. Padding: `0 36px 0 14px`.

### Checkbox

18×18px box. Radius: `4px`.

| State | Box | Check |
|-------|-----|-------|
| Default | 1.5px `--color-slate` bg paper | — |
| Hover | 1.5px `--color-current` | — |
| Focus | + focus ring | — |
| Checked | bg `--color-koi` border koi | paper ✓ |
| Disabled | bg mist border mist | ghost |

### Radio

18×18px circle.

| State | Ring | Dot |
|-------|------|-----|
| Default | 1.5px `--color-slate` | — |
| Hover | 1.5px `--color-current` | — |
| Focus | + focus ring | — |
| Selected | border `--color-koi` | 8px koi fill |
| Disabled | border mist | — |

### Toggle

Track: 44×24px pill. Thumb: 20px circle.

| State | Track | Thumb |
|-------|-------|-------|
| Off default | `--color-mist` | paper |
| Off hover | `#D5DCE6` | paper |
| On default | `--color-koi` | paper |
| On hover | `#CC2F24` | paper |
| Disabled | mist | ghost |

### Badge

Height: 28px. Radius: `--radius-pill`. Padding: `0 12px`. Font: `--text-xs` semibold uppercase tracking `0.04em`.

Variants: Koi (koi bg, paper text), Current (current bg, paper text), Scale (scale bg, ink text), Mist (mist bg, slate text).

### Card

Background: `--color-paper`. Radius: `--radius-lg`. Padding: `--space-6`. No border. Optional mist fill for nested panels.

### Navigation Link

| State | Color | Indicator |
|-------|-------|-----------|
| Default | `--color-slate` | none |
| Hover | `--color-ink` | none |
| Active | `--color-ink` | 3px `--color-koi` left bar (dashboard) |
| Focus | + ring | — |

---

## Layout Guidance

### Landing
- Full-bleed hero image, no radius, min-height 85vh.
- Hero copy overlays lower third with paper-to-transparent scrim.
- Sections alternate paper / mist backgrounds.
- Feature blocks: asymmetric 55/45 image-text splits.
- Single primary CTA per viewport.

### Dashboard
- Fixed 260px sidebar (ink background, paper text).
- Main content: paper background, `--space-6` padding.
- Stat row: 4-column grid collapsing to 2 then 1.
- Data table: 14.5px rows, mist zebra striping, no vertical borders.
- Toolbar: controls at `--control-height` in single horizontal row.

---

## Imagery Direction

Editorial photography — cerulean skies, scarlet and cobalt koinobori, golden afternoon light, dignified families, no cartoon filters. Images are full-bleed or large rounded (`--radius-lg`) — never specimen-framed swatches.

---

## Language Name

Use **Koi Current** (鯉流) consistently across all surfaces, metadata, and navigation marks.