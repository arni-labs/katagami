# Nobori

> A Katagami design language for Kodomo no Hi — the carp-streamer festival of Japanese
> Children's Day. Wind catches fabric, colour lifts against sky, and every surface carries
> the taut, directional energy of a streamer filling with air.

## POV

Nobori captures the moment when a koinobori streamer snaps full of wind — that instant of
tension, lift, and colour against a bright May sky. It is a language of aspiration: the carp
climbing the waterfall to become a dragon. Surfaces feel like washi paper catching light;
type carries the weight of carved seals and the lightness of wind-blown fabric. The
signature mechanic is **directional lift** — every surface has a subtle upward energy,
expressed through asymmetric spacing (more room above than below), type that sits slightly
high in its containers, and a palette that climbs from grounded neutrals into clear,
celebratory accents.

This is a festival language, not a corporate one. It is warm, bright, and alive with the
specific joy of children running beneath streaming carp on a spring morning.

## Tokens

### Colour

Nobori uses a light ground — the pale warmth of washi paper under a clear May sky. Two
accents, used like highlighters: vermillion from the mother carp streamer, and deep indigo
from the child carp. Neutrals are tuned warm, with a faint golden undertone that recalls
sunlight through paper.

```
:root {
  --bg:        #F7F3EC;
  --surface:   #FFFFFF;
  --text:      #1C1A17;
  --muted:     #7A7368;
  --border:    #E0D9CE;
  --accent:    #D4453E;
  --on-accent: #FFFFFF;
  --accent-2:  #3B5998;
  --on-accent-2: #FFFFFF;
  --success:   #2D7A4F;
  --warning:   #D4943E;
  --error:     #D4453E;
  --info:      #3B7A9E;
}
```

| Role        | Hex       | Use |
|-------------|-----------|-----|
| `--bg`      | `#F7F3EC` | Page ground — warm washi |
| `--surface` | `#FFFFFF` | Cards, elevated panels |
| `--text`    | `#1C1A17` | Primary copy — near-black with warmth |
| `--muted`   | `#7A7368` | Secondary text, captions |
| `--border`  | `#E0D9CE` | Subtle separators — tone, never stroke |
| `--accent`  | `#D4453E` | Primary accent — vermillion, the mother carp |
| `--accent-2`| `#3B5998` | Secondary accent — indigo, the child carp |
| `--success` | `#2D7A4F` | Positive states |
| `--warning` | `#D4943E` | Caution states |
| `--error`   | `#D4453E` | Error states (shares accent for economy) |
| `--info`    | `#3B7A9E` | Informational states |

### Typography

The type system pairs a warm, distinctive display serif with a clean workhorse sans. The
display face carries the festival's character — slightly irregular, hand-finished, with the
weight of a carved seal. The body face is crisp and open, tuned for 17px+ readability.

Japanese text uses a heavy serif face for display kanji and a clean gothic for body —
never a generic system fallback.

**Scale** (1.25 modular ratio):

| Token     | Size      | Use |
|-----------|-----------|-----|
| `--text-xs`  | 0.75rem (12px)  | Legal, overlines |
| `--text-sm`  | 0.875rem (14px) | Labels, captions |
| `--text-base`| 1.0625rem (17px)| Body — the floor |
| `--text-md`  | 1.25rem (20px)  | Lead paragraphs |
| `--text-lg`  | 1.5625rem (25px)| Section heads |
| `--text-xl`  | 1.953rem (31px) | Card titles |
| `--text-2xl` | 2.441rem (39px) | Page titles |
| `--text-3xl` | 3.052rem (49px) | Hero headlines |
| `--text-4xl` | 3.815rem (61px) | Display, mastheads |

**Font stack**:
- Display: `'Fraunces', 'Cormorant Garamond', Georgia, serif`
- Body: `'Source Sans 3', 'Inter', system-ui, sans-serif`
- Japanese display: `'Noto Serif JP', 'Hiragino Mincho Pro', serif`
- Japanese body: `'Noto Sans JP', 'Hiragino Kaku Gothic Pro', sans-serif`
- Mono: `'JetBrains Mono', 'SF Mono', monospace`

**Weight**: Display at 700–900 (bold to black); body at 400 (regular) and 600 (semibold).
Letter-spacing: `-0.02em` on display sizes ≥ `--text-2xl`.

### Spacing

4px base grid. Generous — always pad above titles; never let a heading kiss the container
top.

| Token       | Value |
|-------------|-------|
| `--space-1` | 4px   |
| `--space-2` | 8px   |
| `--space-3` | 12px  |
| `--space-4` | 16px  |
| `--space-5` | 20px  |
| `--space-6` | 24px  |
| `--space-8` | 32px  |
| `--space-10`| 40px  |
| `--space-12`| 48px  |
| `--space-16`| 64px  |
| `--space-20`| 80px  |
| `--space-24`| 96px  |
| `--space-32`| 128px |

### Radius

From the allowed set `{0, 16, 24, 9999}`:

| Token         | Value  | Use |
|---------------|--------|-----|
| `--radius-sm` | 0      | Inputs, buttons, controls |
| `--radius-md` | 16px   | Cards, panels, containers |
| `--radius-lg` | 24px   | Large containers, modals |
| `--radius-full`| 9999px | Pills, badges, tags |

### Control height

One shared token: `--control-height: 44px`. Every button, input, select, and form control
uses this exact height. No exceptions.

### Shadows

Nobori uses minimal shadow — surfaces separate by tone, not elevation. When shadow is
needed (modals, popovers), use a single soft shadow at low opacity:

```
--shadow-surface: 0 2px 16px rgba(28, 26, 23, 0.08);
--shadow-modal:   0 8px 40px rgba(28, 26, 23, 0.14);
```

## Components

Every component is built once from tokens. Surfaces separate by tone (`--bg` vs
`--surface`), never by borders.

### Button

```
.btn {
  height: var(--control-height);
  padding: 0 var(--space-6);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: background 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
  border: none;
  line-height: 1;
}

/* Primary */
.btn-primary {
  background: var(--accent);
  color: var(--on-accent);
}
.btn-primary:hover   { background: #C03D37; }
.btn-primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-primary:active  { background: #A83530; }
.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Secondary */
.btn-secondary {
  background: var(--surface);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--border);
}
.btn-secondary:hover   { background: var(--bg); }
.btn-secondary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-secondary:active  { background: var(--border); }
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text);
}
.btn-ghost:hover   { background: var(--bg); }
.btn-ghost:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-ghost:active  { background: var(--border); }
.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Input

```
.input {
  height: var(--control-height);
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--border);
  border: none;
  outline: none;
  transition: box-shadow 150ms ease;
  width: 100%;
  box-sizing: border-box;
}
.input::placeholder { color: var(--muted); }
.input:hover   { box-shadow: inset 0 0 0 1px var(--muted); }
.input:focus-visible {
  box-shadow: inset 0 0 0 2px var(--accent);
}
.input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--bg);
}
```

### Select

Same base as `.input`, with a custom chevron rendered as an inline SVG background-image —
no browser default arrow.

```
.select {
  height: var(--control-height);
  padding: 0 var(--space-10) 0 var(--space-4);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--border);
  border: none;
  outline: none;
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,...");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  background-size: 16px;
  width: 100%;
  box-sizing: border-box;
}
/* States mirror .input */
```

### Textarea

```
.textarea {
  min-height: calc(var(--control-height) * 2.5);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--border);
  border: none;
  outline: none;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
}
/* States mirror .input */
```

### Checkbox / Radio

```
.checkbox, .radio {
  width: 20px;
  height: 20px;
  appearance: none;
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--border);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 150ms ease, box-shadow 150ms ease;
}
.checkbox:hover, .radio:hover { box-shadow: inset 0 0 0 1px var(--muted); }
.checkbox:focus-visible, .radio:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.checkbox:checked, .radio:checked {
  background: var(--accent);
  box-shadow: none;
}
.checkbox:disabled, .radio:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.radio { border-radius: var(--radius-full); }
```

### Toggle / Switch

```
.switch {
  width: 44px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--border);
  position: relative;
  cursor: pointer;
  transition: background 150ms ease;
  appearance: none;
  border: none;
}
.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--surface);
  transition: transform 150ms ease;
}
.switch:hover   { background: var(--muted); }
.switch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.switch:checked { background: var(--accent); }
.switch:checked::after { transform: translateX(20px); }
.switch:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Card

```
.card {
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: var(--space-8);
}
```

### Badge / Tag

```
.badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
  background: var(--bg);
  color: var(--muted);
}
.badge-accent {
  background: var(--accent);
  color: var(--on-accent);
}
```

### Table

```
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-base);
}
.table th {
  text-align: left;
  font-weight: 600;
  color: var(--muted);
  font-size: var(--text-sm);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}
.table td {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.table tr:hover td { background: var(--bg); }
```

### Divider

```
.divider {
  height: 1px;
  background: var(--border);
  border: none;
  margin: 0;
}
```

## Surfaces

Surfaces separate by **tone**, never by borders:

- **Ground** (`--bg`): the page itself — warm washi
- **Surface** (`--surface`): cards, panels, elevated containers — pure white
- **Raised** (`--bg` with `--shadow-surface`): modals, popovers — subtle lift

No card gets a border. No section gets a decorative sideline. Space and tone do the work.

## Motion

Motion carries meaning. The signature is **directional lift** — elements enter from below,
settling upward with a gentle deceleration. Scroll-driven reveals use a 400ms ease-out with
a 60px translateY offset. Respect `prefers-reduced-motion`: all motion collapses to
instant.

## Responsive

- Mobile (390px+): single column; hide non-essential nav links and table columns; no
  horizontal overflow
- Desktop (1024px+): multi-column layouts with `minmax(0, 1fr)` grid columns
- Ultra-wide (2560px+): cap and centre contained content; only the hero spans 100vw

## Credits

- **Koinobori tradition** — the carp streamers of Kodomo no Hi, flown across Japan each
  May 5th to celebrate children's health, happiness, and growth
- **Washi paper** — traditional Japanese handmade paper; informs the warm, textured ground
  tone and the language's material feel
- **Japanese seal script (hanko)** — the weight and irregularity of carved seals informs
  the display type's character