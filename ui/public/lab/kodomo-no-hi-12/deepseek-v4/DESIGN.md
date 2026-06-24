# Kaze (風)

A design language born from Kodomo no Hi — the festival of wind, carp streamers, and childhood aspiration.

## Philosophy

Kodomo no Hi is a day when the sky fills with koinobori — fabric carp swimming on the wind above every home, every river. The carp fights upstream, against the current, and in legend becomes a dragon. This is a festival about *becoming*: the child becoming strong, the wish becoming real, the ordinary sky becoming a river of color.

Kaze captures that moment of lift — the instant the wind catches the fabric and the carp rises. It is warm but not soft, bold but not loud, rooted in Japanese festival aesthetics but rendered as a modern digital language. Every choice serves three feelings: **aspiration**, **movement**, and **warmth**.

The palette draws from twilight festival skies (deep indigo), koinobori vermillion, the gold of evening sun, and the soft blue of open air. Typography pairs a warm serif display face with a crisp workhorse sans-serif — tradition meeting clarity. Spacing is generous like open sky; radius is deliberate, never arbitrary. Every interactive control shares one height, one rhythm, and one complete state model.

## Tokens

### Color

| Token | Value | Role |
|---|---|---|
| `--kaze-indigo` | `#1a1a3e` | Primary ground, deep sky |
| `--kaze-vermillion` | `#d4453b` | Primary accent, energy, carp red |
| `--kaze-gold` | `#e8a838` | Secondary accent, warmth, sun |
| `--kaze-sky` | `#7eb8da` | Tertiary accent, openness, wind |
| `--kaze-cream` | `#faf7f2` | Surface, page background |
| `--kaze-charcoal` | `#2d2d35` | Primary text, near-black |
| `--kaze-stone` | `#6b6b76` | Secondary text, muted |
| `--kaze-mist` | `#e8e4dd` | Subtle surface alternate |
| `--kaze-white` | `#ffffff` | Card surfaces, contrast ground |
| `--kaze-error` | `#c0392b` | Destructive / error |
| `--kaze-success` | `#2d7d46` | Success / positive |

### Typography

**Display:** DM Serif Display (serif) — headings, hero text, brand moments.
**Body:** Inter (sans-serif) — body, UI, labels, data, forms.

| Token | Font | Size | Weight | Line-height | Letter-spacing | Use |
|---|---|---|---|---|---|---|
| `--text-display-xl` | DM Serif Display | 64px | 400 | 1.1 | -0.02em | Hero title |
| `--text-display-lg` | DM Serif Display | 48px | 400 | 1.15 | -0.015em | Page title |
| `--text-display-md` | DM Serif Display | 36px | 400 | 1.2 | -0.01em | Section heading |
| `--text-heading` | Inter | 24px | 600 | 1.3 | -0.005em | Card heading |
| `--text-subheading` | Inter | 20px | 500 | 1.35 | 0 | Subsection |
| `--text-body` | Inter | 17px | 400 | 1.55 | 0 | Body copy |
| `--text-body-sm` | Inter | 15px | 400 | 1.5 | 0 | Secondary body |
| `--text-label` | Inter | 14px | 500 | 1.4 | 0.01em | Labels, field names |
| `--text-caption` | Inter | 13px | 400 | 1.4 | 0 | Captions, metadata |
| `--text-mono` | JetBrains Mono | 14px | 400 | 1.5 | 0 | Data, code, numbers |

### Spacing

Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120`

| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |
| `--space-3xl` | 64px |
| `--space-4xl` | 80px |
| `--space-5xl` | 120px |

### Radius

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Data tables, code blocks |
| `--radius-md` | 16px | Cards, panels, modals |
| `--radius-lg` | 24px | Large containers, hero sections |
| `--radius-full` | 9999px | Pills, badges, buttons, inputs |

### Control Height

**One shared token:** `--control-height: 44px`

Every interactive control — buttons, inputs, selects, toggles — sits on exactly 44px height. This is the single rhythm of the interface.

### Shadows

| Token | Value |
|---|---|
| `--shadow-card` | `0 2px 16px rgba(26,26,62,0.06)` |
| `--shadow-elevated` | `0 8px 32px rgba(26,26,62,0.10)` |
| `--shadow-focus` | `0 0 0 3px rgba(212,69,59,0.35)` |

### Motion

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--duration-fast` | 150ms |
| `--duration-normal` | 250ms |
| `--duration-slow` | 400ms |

---

## Components

Every component is built from tokens above. All interactive components have five states: **default, hover, focus (visible ring), active, disabled**.

### Button

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-sm);
  height: var(--control-height); padding: 0 var(--space-lg);
  font-family: Inter; font-size: 15px; font-weight: 500;
  border-radius: var(--radius-full); border: none; cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  text-decoration: none; white-space: nowrap;
}
```

**Primary:**
- Default: `background: var(--kaze-vermillion); color: #fff;`
- Hover: `background: #c03a32;` (darken 8%)
- Focus: `outline: none; box-shadow: var(--shadow-focus);`
- Active: `background: #a83029;` (darken 15%)
- Disabled: `background: #e8e4dd; color: #9a9aa4; cursor: not-allowed;`

**Secondary:**
- Default: `background: transparent; color: var(--kaze-indigo); box-shadow: inset 0 0 0 1.5px var(--kaze-indigo);`
- Hover: `background: var(--kaze-indigo); color: #fff;`
- Focus: `outline: none; box-shadow: var(--shadow-focus);`
- Active: `background: #141430; color: #fff;`
- Disabled: `color: #9a9aa4; box-shadow: inset 0 0 0 1.5px #d0ccc6; cursor: not-allowed;`

**Ghost:**
- Default: `background: transparent; color: var(--kaze-indigo);`
- Hover: `background: rgba(26,26,62,0.06);`
- Focus: `outline: none; box-shadow: var(--shadow-focus);`
- Active: `background: rgba(26,26,62,0.10);`
- Disabled: `color: #9a9aa4; cursor: not-allowed;`

### Text Input

```css
.input {
  height: var(--control-height); padding: 0 var(--space-md);
  font-family: Inter; font-size: 15px; color: var(--kaze-charcoal);
  background: var(--kaze-white); border-radius: var(--radius-full);
  border: 1.5px solid var(--kaze-mist);
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  outline: none; width: 100%; box-sizing: border-box;
}
```

- Default: `border-color: var(--kaze-mist);`
- Hover: `border-color: #c5bfb5;`
- Focus: `border-color: var(--kaze-vermillion); box-shadow: var(--shadow-focus);`
- Disabled: `background: #f5f3ef; color: #9a9aa4; cursor: not-allowed; border-color: #e8e4dd;`
- Placeholder: `color: #b0aca5;`

### Select

Same base as Text Input, with custom chevron via `appearance: none` and a background SVG arrow in `--kaze-stone`.

### Textarea

Same border/state model as Text Input. Min-height: `calc(var(--control-height) * 2.5)`. Padding: `var(--space-md)`. Border-radius: `var(--radius-md)`.

### Checkbox / Radio

Hidden native input. Custom control: `20×20px`, border-radius `0` (checkbox) or `var(--radius-full)` (radio). Border `1.5px solid var(--kaze-mist)`. Checked fill: `var(--kaze-vermillion)`. Focus ring on the label wrapper.

### Toggle (Switch)

Track: `44×24px`, border-radius `var(--radius-full)`. Thumb: `18×18px` circle, border-radius `50%`.
- Default off: track `var(--kaze-mist)`, thumb `#fff`
- Default on: track `var(--kaze-vermillion)`, thumb `#fff`
- Focus: `box-shadow: var(--shadow-focus)` on track
- Disabled: opacity 0.4

### Card

```css
.card {
  background: var(--kaze-white); border-radius: var(--radius-md);
  padding: var(--space-lg); box-shadow: var(--shadow-card);
}
```

### Badge / Pill

```css
.badge {
  display: inline-flex; align-items: center; height: 28px;
  padding: 0 var(--space-md); font-family: Inter; font-size: 13px; font-weight: 500;
  border-radius: var(--radius-full); white-space: nowrap;
}
```

### Table

Headers: `--text-label`, uppercase, `--kaze-stone`. Rows: `--text-body-sm`. Row height: `48px`. Row hover: `background: rgba(26,26,62,0.03)`. No vertical borders. Horizontal dividers: `1px solid var(--kaze-mist)`.

---

## Layout

### Page Structure

Pages use a single centered content column with generous side padding:
- Max content width: `1120px`
- Side padding: `var(--space-xl)` (32px), collapsing to `var(--space-md)` (16px) on mobile
- Section vertical spacing: `var(--space-5xl)` (120px) between major sections

### Grid

12-column CSS Grid. Gap: `var(--space-lg)` (24px). Columns auto-fit with min 280px.

### Stack

Vertical rhythm uses the spacing scale. Section titles get `margin-bottom: var(--space-lg)`. Cards within a section get `gap: var(--space-lg)`.

---

## Form Layout

- Labels above inputs, `margin-bottom: var(--space-sm)`
- Form fields in a single column, `gap: var(--space-lg)`
- Inline field groups (side-by-side) use `gap: var(--space-md)`
- Error messages below the field, `--text-caption` in `--kaze-error`, `margin-top: var(--space-xs)`
- Required indicator: a vermillion asterisk after the label

---

## Accessibility Requirements

- All interactive elements must show a visible focus ring (`--shadow-focus`) on `:focus-visible`
- Text contrast ratio minimum 4.5:1 for body, 3:1 for large display text
- Never light-on-light or dark-on-dark text/background combinations
- Respect `prefers-reduced-motion`: disable transitions when set
- Form controls must have associated `<label>` elements