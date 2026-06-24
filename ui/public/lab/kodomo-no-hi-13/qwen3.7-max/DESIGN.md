# Nobori

> One distinctive evocative noun: *nobori* (登) — rising, ascending. The upward motion of koinobori carp streamers climbing the early-summer sky, the courage of the carp that leaps the waterfall to become a dragon. Kodomo no Hi distilled to its essence: ascent.

## POV

Nobori is the design language of upward motion. Every surface breathes with vertical rhythm — elements rise, stack, and float as if carried by a warm updraft. The palette is the festival sky: clean white air, electric blue, vivid green, a hot coral-pink flash of the carp. Typography is geometric and confident, paired with a heavy Japanese face for kanji moments. Ornament is wind-driven — flowing curves, gentle arcs, the suggestion of fabric rippling in a breeze.

This is a grown-up festival language. Not childish, not cluttered — sleek, editorial, confident. The joy is in the restraint: one vivid accent placed like a highlighter on white paper hits harder than a rainbow.

## Signature Mechanic

**Vertical ascent** — elements rise from below, stack in ascending rhythm, and carry a subtle upward drift in their motion. Scroll reveals move upward. Cards stagger vertically. The hero opens to the sky.

## Tokens

### Color

```css
:root {
  /* Accents — 3, used like highlighters */
  --accent-sora: #00B4FF;       /* electric sky blue */
  --accent-shinboku: #00C853;   /* vivid fresh green */
  --accent-koi: #FF2D55;        /* hot coral-pink */

  /* Semantic roles */
  --bg: #FFFFFF;
  --surface: #F4F6F9;
  --surface-raised: #FFFFFF;
  --text: #0D1117;
  --muted: #6B7280;
  --border: #E5E7EB;
  --accent: var(--accent-sora);
  --on-accent: #FFFFFF;
  --success: #00C853;
  --warning: #FFB300;
  --error: #FF2D55;
  --info: #00B4FF;

  /* Accent tints for backgrounds */
  --accent-sora-tint: #E6F7FF;
  --accent-shinboku-tint: #E6FAF0;
  --accent-koi-tint: #FFF0F3;
}
```

### Typography

```css
:root {
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Outfit', sans-serif;
  --font-jp: 'Noto Sans JP', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Scale */
  --text-xs: 0.875rem;    /* 14px */
  --text-sm: 1rem;        /* 16px */
  --text-base: 1.0625rem; /* 17px */
  --text-lg: 1.25rem;     /* 20px */
  --text-xl: 1.75rem;     /* 28px */
  --text-2xl: 2.5rem;     /* 40px */
  --text-3xl: 3.5rem;     /* 56px */
  --text-4xl: 5rem;       /* 80px */

  /* Weights */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-extrabold: 800;

  /* Letter spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;

  /* Line heights */
  --leading-tight: 1.1;
  --leading-snug: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;
}
```

### Spacing

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-24: 6rem;     /* 96px */
  --space-32: 8rem;     /* 128px */
}
```

### Radius

```css
:root {
  --radius-none: 0;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}
```

### Control Height (shared)

```css
:root {
  --control-h: 48px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 3px rgba(13, 17, 23, 0.06);
  --shadow-md: 0 4px 16px rgba(13, 17, 23, 0.08);
  --shadow-lg: 0 8px 32px rgba(13, 17, 23, 0.10);
}
```

## State Matrix

Every interactive element implements all five states:

| State | Visual Treatment |
|-------|-----------------|
| Default | Base token values, no extra styling |
| Hover | Subtle lift (translateY -1px), shadow-md increase, accent tint background on cards |
| Focus | Visible 3px ring: `outline: 3px solid var(--accent-sora); outline-offset: 2px` |
| Active | Press down (translateY 1px), shadow-sm, slight scale(0.98) |
| Disabled | opacity: 0.4, pointer-events: none, desaturated |

## Components

### Button

```css
.btn {
  height: var(--control-h);
  padding: 0 var(--space-6);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-tight);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--accent-sora);
  color: var(--on-accent);
}
.btn-primary:hover {
  background: #009FE0;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
}
.btn-secondary:hover {
  background: var(--accent-sora-tint);
  color: var(--accent-sora);
}

.btn-ghost {
  background: transparent;
  color: var(--muted);
}
.btn-ghost:hover {
  color: var(--text);
  background: var(--surface);
}
```

### Input

```css
.input {
  height: var(--control-h);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--bg);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
}
.input:hover {
  border-color: var(--muted);
}
.input:focus {
  outline: none;
  border-color: var(--accent-sora);
  box-shadow: 0 0 0 3px var(--accent-sora-tint);
}
.input:disabled {
  opacity: 0.4;
  background: var(--surface);
}
```

### Select

```css
.select {
  height: var(--control-h);
  padding: 0 var(--space-8) 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--bg);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text);
  appearance: none;
  background-image: url("data:image/svg+xml,...");
  cursor: pointer;
}
```

### Checkbox / Radio

```css
.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid var(--border);
  accent-color: var(--accent-sora);
  cursor: pointer;
}
.checkbox:focus {
  outline: 3px solid var(--accent-sora);
  outline-offset: 2px;
}
```

### Card

Surfaces separated by tone, not borders. Cards use `--surface` or `--surface-raised` against `--bg`.

```css
.card {
  background: var(--surface-raised);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

## Form Controls — All Styled

Every form control is explicitly styled — no browser defaults visible. Inputs, selects, textareas, checkboxes, radios, range sliders, toggles, and file inputs all receive the full state matrix treatment with the shared `--control-h` height token.

## Surfaces

Surfaces are separated by tone shift, never by borders:
- `--bg` (#FFFFFF) — the canvas
- `--surface` (#F4F6F9) — recessed sections, sidebars
- `--surface-raised` (#FFFFFF with shadow) — cards, panels floating above the canvas

## Art Direction

**Imagery style**: Editorial photography and bold graphic illustration. Bright, saturated accents against clean white. Strong geometric compositions. No muddy pastels, no soft watercolors — this is confident graphic design.

**Ornament system**: Wind curves — flowing arcs derived from koinobori fabric in motion. Used as section dividers, background patterns, and decorative strokes. Always in accent colors at low opacity. One system, coherent throughout.

## Credits

- **Kodomo no Hi** (こどもの日) — Japanese Children's Day tradition, centuries-old cultural celebration of children's courage and growth
- **Koinobori** (鯉のぼり) — carp streamer tradition, Edo period origin
- **Ryumon** (竜門) — the dragon gate legend, the carp that climbs the waterfall
