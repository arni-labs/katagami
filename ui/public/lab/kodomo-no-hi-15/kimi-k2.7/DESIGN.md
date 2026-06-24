# Koinobori

## POV

Koinobori is the upward breath of early summer — a design language that treats every surface like a clear sky with carp rising through it. It is bright, airy, and hopeful, but executed as confident graphic design: open white space, a single electric accent used like a highlighter, strong Japanese typography, and surfaces separated by tinted tone rather than borders. The signature mechanic is **rise**: content stacks in light, breathable cards that lift and reveal themselves as the visitor moves, mirroring the koinobori climbing against the wind.

## Palette

Neutrals are kept pure and cool so the accents read as vivid, never muddy.

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#FFFFFF` | page background |
| `--surface` | `#F3FBFF` | primary tinted surface (cool sky tint) |
| `--surface-warm` | `#F1FFF6` | secondary tinted surface (fresh leaf tint) |
| `--text` | `#001018` | primary ink |
| `--muted` | `#5B7A8A` | secondary/muted text (cool slate derived from ink hue) |
| `--border` | `transparent` | structural borders are not used |
| `--accent` | `#00C2FF` | electric sky-blue — the lead accent |
| `--accent-hover` | `#00AEE6` | accent hover state |
| `--accent-active` | `#009FCC` | accent active state |
| `--accent-2` | `#00E676` | fresh green — second accent |
| `--accent-3` | `#FF4D6D` | hot coral — third accent |
| `--on-accent` | `#001018` | text on accent surfaces |
| `--success` | `#00C853` | positive state |
| `--warning` | `#FFB300` | caution state |
| `--error` | `#FF1744` | error state |
| `--info` | `#00B0FF` | info state |

Only three accents are used as highlighters: electric sky-blue, fresh green, and hot coral. All other separation is achieved through `--bg`, `--surface`, `--surface-warm`, and space.

## Typography

**Display / body:** `Inter` (Google Fonts: `Inter:400,500,600,700,800`).  
**Japanese:** `Noto Sans JP` (Google Fonts: `Noto Sans JP:400,500,700,900`).

| Token | Size | Line | Letter | Use |
|---|---|---|---|---|
| `--text-display` | `clamp(64px, 8vw, 120px)` | `0.95` | `-0.02em` | hero display |
| `--text-kanji` | `clamp(48px, 6vw, 96px)` | `1.0` | `-0.02em` | Japanese display |
| `--text-h1` | `clamp(44px, 5vw, 72px)` | `1.05` | `-0.02em` | page titles |
| `--text-h2` | `clamp(32px, 3.5vw, 48px)` | `1.1` | `-0.02em` | section titles |
| `--text-h3` | `clamp(24px, 2.5vw, 32px)` | `1.2` | `-0.01em` | card titles |
| `--text-h4` | `20px` | `1.3` | `0` | subheads |
| `--text-body` | `18px` | `1.6` | `0` | body copy |
| `--text-small` | `15px` | `1.5` | `0` | captions, metadata |
| `--text-ui` | `15px` | `1` | `0.01em` | buttons, labels |

Body text is never smaller than 17 px. Display type is tight and high contrast.

## Spacing

Base unit: `4px`.

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

Sections use generous vertical padding (`--space-9` to `--space-10`). Titles always have padding above them.

## Radius

Allowed values: `0`, `16px`, `24px`, `9999px`.

| Token | Value | Use |
|---|---|---|
| `--radius-card` | `24px` | cards, panels, large surfaces |
| `--radius-button` | `16px` | buttons, inputs, controls |
| `--radius-pill` | `9999px` | chips, badges, filters |
| `--radius-none` | `0` | full-bleed hero, edge-to-edge media |

## Elevation

No heavy shadows. Elevation is expressed through tinted surfaces and subtle lift:

| Token | Value |
|---|---|
| `--shadow-sm` | `0 2px 8px rgba(0,16,24,0.06)` |
| `--shadow-md` | `0 8px 24px rgba(0,16,24,0.08)` |
| `--shadow-lg` | `0 16px 48px rgba(0,16,24,0.10)` |

## Control height

All controls share one height token:

| Token | Value |
|---|---|
| `--control-height` | `56px` |

Buttons, inputs, selects, and switch tracks all sit on this height. Labels and helper text sit outside it.

## State matrix

All interactive controls use the same five states. Focus rings are visible and use the accent colour at reduced opacity.

| State | Button (primary) | Button (secondary) | Input / Select | Checkbox / Radio / Switch |
|---|---|---|---|---|
| Default | `bg: --accent; color: --on-accent; radius: --radius-button; height: --control-height; padding: 0 28px; font: --text-ui; font-weight: 700` | `bg: --surface; color: --text; radius: --radius-button; height: --control-height; padding: 0 28px` | `bg: --surface; color: --text; radius: --radius-button; height: --control-height; padding: 0 20px; border: 2px solid transparent` | `bg: --surface; border: 2px solid --muted` |
| Hover | `transform: translateY(-2px); bg: --accent-hover; shadow: --shadow-md` | `bg: --surface-warm; transform: translateY(-2px)` | `bg: --bg; shadow: --shadow-sm` | `border-color: --accent` |
| Focus-visible | `outline: none; box-shadow: 0 0 0 3px rgba(0,194,255,0.35), 0 0 0 6px rgba(0,194,255,0.15)` | same ring | same ring | same ring |
| Active | `transform: translateY(0) scale(0.98); bg: --accent-active` | `transform: translateY(0) scale(0.98)` | `bg: --bg` | `transform: scale(0.96)` |
| Disabled | `opacity: 0.4; cursor: not-allowed; transform: none; shadow: none` | same | `opacity: 0.4; cursor: not-allowed` | same |

Focus rings are the only permitted outline-like treatment and are never used as a decorative border.

## Components

### Button

- One clearly primary button per action set (`bg: --accent`).
- Secondary button uses `--surface` and `--text`.
- Height `--control-height`, radius `--radius-button`, centred label.
- No borders.

### Input / Select / Textarea

- Background `--surface`, radius `--radius-button`, height `--control-height`.
- Transparent border that becomes visible only on focus via ring.
- Placeholder colour `--muted`.
- Textarea height is auto but uses the same radius and padding.

### Checkbox / Radio

- Box size `24px`, radius `8px` (checkbox) or `9999px` (radio).
- Unchecked: `--surface` background, `2px solid --muted`.
- Checked: `--accent` background, `--on-accent` checkmark/dot.
- Focus ring matches the global matrix.

### Switch

- Track `48px × 28px`, radius `9999px`.
- Off: `--surface`, thumb `--bg`, border `2px solid --muted`.
- On: `--accent`, thumb `--bg`.
- Focus ring matches the global matrix.

### Chip / Badge

- Height `36px`, radius `--radius-pill`, padding `0 16px`.
- Default: `--surface`, `--text`.
- Active / highlighted: `--accent`, `--on-accent`.
- No borders.

### Card

- Radius `--radius-card`.
- Background `--surface` or `--surface-warm`.
- Padding `--space-6` to `--space-7`.
- No borders, no nested cards.
- Hover: `translateY(-4px)` + `--shadow-md`.

### Nav

- Transparent over hero; becomes `--bg` with `--shadow-sm` on scroll.
- Links use `--text`, hover uses `--accent` underline (2 px, offset 4 px).
- One primary CTA button.

### Hero

- Full-bleed `100vw × 100svh`, `background-image: var(--hero-image)`.
- No baked-in text in the image.
- Title lives in a solid ink press block (`bg: --text; color: --bg`).
- No gradient scrim, no scroll cue.

### Press block

- Solid `--text` background with `--bg` or `--accent` text.
- Used for hero title, key stat, and any text that must remain legible over imagery.
- Radius `--radius-button` or `--radius-card` depending on scale.

### Section

- Contained width `min(1280px, 100vw - 48px)` centred.
- Alternating tinted backgrounds (`--bg`, `--surface`, `--surface-warm`).
- Generous vertical padding (`--space-9` / `--space-10`).

## Surfaces

All three surfaces share the same role variables so `injectTheme` can recolour them:

```css
:root {
  --bg: #FFFFFF;
  --surface: #F3FBFF;
  --surface-warm: #F1FFF6;
  --text: #001018;
  --muted: #5B7A8A;
  --border: transparent;
  --accent: #00C2FF;
  --accent-hover: #00AEE6;
  --accent-active: #009FCC;
  --accent-2: #00E676;
  --accent-3: #FF4D6D;
  --on-accent: #001018;
  --success: #00C853;
  --warning: #FFB300;
  --error: #FF1744;
  --info: #00B0FF;
}
```

## Imagery / art direction

Imagery for landing and dashboard is bright, graphic editorial photography: clear light, fresh greenery, koinobori rising, generous white space, electric sky-blue and hot coral used as real-world accents. It is never low-poly (that look belongs to the immersive surface only) and never muddy or pastel-washed.

## Motion

- Scroll reveals use IntersectionObserver; elements start `opacity: 0; transform: translateY(24px)` and settle to visible.
- Hero image uses a slow ken-burns zoom/pan.
- Cards lift on hover.
- Stats count up once when revealed.
- Demand bars grow from `scaleX(0)` to their value.
- Respect `prefers-reduced-motion`: all motion is disabled and settled states are shown immediately.

## Responsive

- Mobile: single column, reduced nav, no horizontal overflow.
- Ultra-wide: content capped and centred at `1280px`; only the hero spans `100vw`.
- Grid children use `minmax(0, 1fr)` and `min-width: 0`.

## Naming

The masthead is **Koinobori** — one concrete cultural noun, no adjectives, no banned tokens.
