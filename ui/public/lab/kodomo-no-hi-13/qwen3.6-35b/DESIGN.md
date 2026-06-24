# Taketori

**A Katagami design language for Kodomo no Hi — bright, graphic, confident.**

One idea: the carp climbs the bamboo pole, each scale a step upward. The language borrows from that ascent — vertical rhythm, clean lines, the tension between water and sky.

## Concept

The signature mechanic is **ascent lines**: thin vertical rules that segment content and guide the eye upward, like the bamboo stalks koinobori climb. They appear as section dividers, form-field underlines, and decorative accents — always vertical, never horizontal.

## Tokens

### Color

| Role | Default | Hover | Focus Ring | Active | Disabled |
|---|---|---|---|---|---|
| `--bg` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| `--surface` | `#F8F9FA` | `#F0F2F4` | `#F0F2F4` | `#E9ECEF` | `#F1F3F4` |
| `--text` | `#0A0A0A` | `#0A0A0A` | `#0A0A0A` | `#0A0A0A` | `#868E96` |
| `--muted` | `#6B7785` | `#495057` | `#495057` | `#495057` | `#ADB5BD` |
| `--border` | `#E3E8ED` | `#D0D7DE` | `#D0D7DE` | `#D0D7DE` | `#E9ECEF` |
| `--accent` | `#00B4D8` | `#0096C7` | `#00B4D8` | `#0077B6` | `#90E0EF` |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#E8F4F8` |
| `--success` | `#2DC653` | `#25A847` | `#2DC653` | `#1F8C3B` | `#8CE99A` |
| `--warning` | `#FFA62A` | `#E89625` | `#FFA62A` | `#D4871F` | `#FFD6A5` |
| `--error` | `#FF3366` | `#E62E5C` | `#FF3366` | `#CC264E` | `#FF8FA3` |
| `--info` | `#00B4D8` | `#0096C7` | `#00B4D8` | `#0077B6` | `#90E0EF` |

Accent colours: **electric sky-blue** (`#00B4D8`), **fresh green** (`#2DC653`), **hot coral** (`#FF3366`). Three accents, used like highlighters — never more than one visible in any single composition.

### Typography

| Token | Value | Notes |
|---|---|---|
| `--font-display` | `"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif` | Heavy weight for headlines |
| `--font-body` | `"Inter", "Noto Sans JP", sans-serif` | Clean, legible |
| `--font-mono` | `"SF Mono", "Fira Code", monospace` | Code and data |
| `--text-xs` | `0.75rem` (12px) | Micro labels |
| `--text-sm` | `0.875rem` (14.5px) | Table rows, captions |
| `--text-base` | `1rem` (17px) | Body text minimum |
| `--text-lg` | `1.25rem` (21px) | Subheads |
| `--text-xl` | `1.75rem` (29px) | Section titles |
| `--text-2xl` | `2.5rem` (42px) | Headlines |
| `--text-3xl` | `3.5rem` (58px) | Hero headlines |
| `--letter-display` | `-0.02em` | Display text |
| `--letter-body` | `0em` | Body text |

Display text gets `-0.02em` letter-spacing. Body text at 17px minimum.

### Spacing

| Token | Value |
|---|---|
| `--space-2xs` | `0.25rem` (4px) |
| `--space-xs` | `0.5rem` (8px) |
| `--space-s` | `0.75rem` (12px) |
| `--space-m` | `1rem` (16px) |
| `--space-l` | `1.5rem` (24px) |
| `--space-xl` | `2rem` (32px) |
| `--space-2xl` | `3rem` (48px) |
| `--space-3xl` | `4rem` (64px) |
| `--space-4xl` | `6rem` (96px) |

### Radius

Only these values: `0`, `16`, `24`, `9999`.

| Token | Value |
|---|---|
| `--radius-none` | `0` |
| `--radius-card` | `16` |
| `--radius-pill` | `24` |
| `--radius-full` | `9999` |

### Control Height

**One shared token for all form controls and buttons:**

| Token | Value |
|---|---|
| `--control-height` | `40px` |

Every `<input>`, `<select>`, `<textarea>`, `<button>` uses `height: var(--control-height)` (or `min-height` for textareas). Labels sit above controls, never beside them.

## Surfaces

Surfaces are separated by **tone** (background colour shifts between `--bg` and `--surface`), never by borders. Alternating sections use `--bg` / `--surface` / `--bg`.

## Components

### Buttons

All buttons share `height: var(--control-height)`, `border-radius: var(--radius-pill)`, label centred.

- **Primary**: `background: var(--accent)`, `color: var(--on-accent)`, no border. Hover darkens accent one step. Focus ring: `2px solid var(--accent)` offset `2px` outward.
- **Secondary**: `background: transparent`, `color: var(--text)`, `border: 1.5px solid var(--border)`. Hover: `border-color: var(--muted)`.
- **Ghost**: `background: transparent`, `color: var(--muted)`. Hover: `color: var(--text)`, `background: var(--surface)`.

### Cards

`background: var(--surface)`, `border-radius: var(--radius-card)`, padding `var(--space-xl)`. No borders. Shadow: none — cards are separated by tone against `--bg` sections.

### Form Controls

Every control explicitly styled:

```css
input, select, textarea {
  height: var(--control-height);
  padding: 0 var(--space-m);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--bg);
  color: var(--text);
  font: var(--text-base) var(--font-body);
  outline: none;
  transition: border-color 0.15s ease;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}
input::placeholder, textarea::placeholder {
  color: var(--muted);
  opacity: 0.7;
}
input:disabled, select:disabled, textarea:disabled {
  background: var(--surface);
  color: var(--text);
  opacity: 0.5;
  cursor: not-allowed;
}
textarea {
  height: auto;
  min-height: var(--control-height);
  resize: vertical;
}
```

### Ascent Line

A vertical rule: `width: 2px`, `background: var(--accent)`, `border-radius: 1px`. Used as section dividers, form-field underlines, and decorative accents. Height varies by context.

### Navigation

Minimal: logo left, links right. No borders — links separated by spacing. Active link uses `color: var(--accent)` with a 2px accent ascent-line beneath.

### Tables

Header row: `font-weight: 600`, `color: var(--text)`. Body rows: `14.5px`, `color: var(--text)`. Row hover: `background: var(--surface)`. No vertical borders. Bottom border on header: `1.5px solid var(--border)`.

## State Matrix

| State | Visual |
|---|---|
| **Default** | Token values as defined |
| **Hover** | Darken accent one step; lighten surface |
| **Focus** | `2px solid` accent ring, `3px` offset; visible on all controls |
| **Active** | Darken accent two steps; press-down shadow on buttons |
| **Disabled** | Opacity `0.5`; `cursor: not-allowed`; surface background |

## Notes

- No emoji on buttons. No symbol glyphs in copy.
- All imagery uses the language's aesthetic: bright, graphic, editorial — not low-poly, not childish.
- The immersive 3D page is a separate experience: real-time low-poly, atmospheric, with the same typography overlaid.
