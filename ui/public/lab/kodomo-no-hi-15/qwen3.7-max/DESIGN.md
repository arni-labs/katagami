# Koinobori

> A Katagami design language for Kodomo no Hi — the Japanese carp-streamer festival celebrating children's courage and growth.

## POV

Koinobori rises. The language takes its name from the iconic carp streamers that fly above Japanese homes each May — fabric carp climbing invisible currents toward the sky. Every surface carries that upward momentum: type that ascends, color that lifts, space that breathes like a clear early-summer morning. The aesthetic is confident graphic design — bright, clean, grown-up — never childish, never cluttered. Vivid accents snap against open white like streamers snapping in the wind.

## Signature Mechanic

**Wind-snap** — accent color arrives in sharp, confident strokes against white ground, the way a koinobori's painted scales flash when the wind catches them. Accents never wash or fade; they land with impact. Transitions between surfaces use tonal shifts (white to cool grey to sky tint) rather than borders, creating the feeling of looking across open sky at different atmospheric layers.

## Palette

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FFFFFF` | Ground — pure white, the open sky |
| `--surface` | `#F4F7FB` | Elevated surfaces — cool atmospheric grey |
| `--surface-alt` | `#EAF1FA` | Alternate surface — deeper sky layer |
| `--text` | `#0B1120` | Primary text — near-black, high contrast |
| `--muted` | `#5F6B80` | Secondary text — cool slate |
| `--border` | `#DDE3ED` | Structural lines — used sparingly |
| `--accent` | `#0077FF` | Primary accent — electric sky blue |
| `--accent-2` | `#10B981` | Secondary accent — fresh spring green |
| `--accent-3` | `#FF2D55` | Tertiary accent — hot coral pop |
| `--on-accent` | `#FFFFFF` | Text on accent backgrounds |
| `--success` | `#10B981` | Positive states |
| `--warning` | `#F59E0B` | Caution states |
| `--error` | `#EF4444` | Error states |
| `--info` | `#0077FF` | Informational states |

Accent count: 3 (sky blue, spring green, hot coral). Used like highlighters — sharp, vivid, never muddy.

Neutrals are cool-toned to match the palette's early-summer morning temperature.

## Type

| Role | Family | Weight | Size | Line-height |
|---|---|---|---|---|
| Display XL | Inter | 900 (Black) | 80px / 5rem | 1.05 |
| Display L | Inter | 800 (ExtraBold) | 56px / 3.5rem | 1.1 |
| Display M | Inter | 700 (Bold) | 40px / 2.5rem | 1.15 |
| Heading | Inter | 700 (Bold) | 28px / 1.75rem | 1.25 |
| Subheading | Inter | 600 (SemiBold) | 22px / 1.375rem | 1.35 |
| Body | Inter | 400 (Regular) | 17px / 1.0625rem | 1.6 |
| Body Strong | Inter | 600 (SemiBold) | 17px / 1.0625rem | 1.6 |
| Small | Inter | 500 (Medium) | 14px / 0.875rem | 1.5 |
| Kanji Display | Noto Sans JP | 900 (Black) | 80px / 5rem | 1.1 |
| Kanji Heading | Noto Sans JP | 700 (Bold) | 40px / 2.5rem | 1.2 |
| Kanji Body | Noto Sans JP | 400 (Regular) | 17px / 1.0625rem | 1.7 |

Letter-spacing: `-0.02em` on display sizes (40px+), `0` on body and below.

## Spacing

Base unit: 4px. Scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128`.

Section padding: 96px vertical, 64px horizontal (desktop). 48px vertical, 24px horizontal (mobile).

Generous spacing above all titles — titles never stuck to container tops.

## Radius

Allowed set: `0 / 16 / 24 / 9999` (pill).

- Cards and panels: `24px`
- Buttons and controls: `9999px` (pill)
- Badges and tags: `9999px`
- Sharp accents and decorative elements: `0`
- Image containers: `16px`

No arbitrary in-between radii.

## Control Height

One shared token: `--control-h: 48px`.

All interactive controls — buttons, inputs, selects, dropdowns — share this height. Labels and internal text are optically centered within it.

## State Matrix

Every interactive element implements all five states:

| State | Visual treatment |
|---|---|
| Default | Base tokens — accent bg, on-accent text, no shadow |
| Hover | Accent darkens 8% (`color-mix(in srgb, var(--accent), #000 8%)`), subtle lift (`translateY(-1px)`) |
| Focus | Visible ring: `outline: 3px solid var(--accent)`, `outline-offset: 3px` |
| Active | Accent darkens 15%, press down (`translateY(1px)`) |
| Disabled | `opacity: 0.4`, `pointer-events: none`, no hover/focus effects |

Secondary buttons: transparent bg, accent text, accent border. Hover fills with accent at 8% opacity.

Ghost buttons: transparent bg, text color, no border. Hover fills surface-alt.

## Surfaces

Surfaces are separated by **tone, not borders**:
- Ground level: `--bg` (white)
- Raised: `--surface` (cool grey)
- Sunken / alternate: `--surface-alt` (deeper sky)

No grey borders on cards. No single accent edge on cards. Depth comes from tonal contrast and generous spacing.

## Components

### Button (Primary)
```
height: var(--control-h);
padding: 0 32px;
background: var(--accent);
color: var(--on-accent);
border-radius: 9999px;
font-weight: 600;
font-size: 17px;
border: none;
```

### Button (Secondary)
```
height: var(--control-h);
padding: 0 32px;
background: transparent;
color: var(--accent);
border: 2px solid var(--accent);
border-radius: 9999px;
```

### Input
```
height: var(--control-h);
padding: 0 16px;
background: var(--bg);
color: var(--text);
border: 2px solid var(--border);
border-radius: 9999px;
font-size: 17px;
```
Focus: border-color switches to `var(--accent)`, visible ring.

### Select / Dropdown
Same dimensions as Input. Custom chevron (SVG, no symbol glyphs). Same radius, same focus treatment.

### Checkbox / Radio
Custom-styled, 20px box, accent fill on checked, visible focus ring. No browser defaults visible.

### Badge
```
padding: 4px 12px;
background: var(--surface-alt);
color: var(--accent);
border-radius: 9999px;
font-size: 14px;
font-weight: 600;
```

### Card
```
background: var(--surface);
border-radius: 24px;
padding: 32px;
```
No border. No accent edge. Separated from ground by tonal contrast.

## Art Style

**Flat-vector editorial** — clean shapes, confident linework, vivid flat color with no gradients or skeuomorphism. The transferable technique is bold graphic reduction: any subject (a face, a city, a teapot) rendered as clean geometric planes of vivid color against white. Inspired by Japanese graphic design traditions (Tadanori Yokoo's bold color, Kenya Hara's structural clarity) pushed into contemporary digital product design.

### Credits

| Name | Kind | Note |
|---|---|---|
| Tadanori Yokoo | Artist | Bold flat color, graphic confidence |
| Kenya Hara | Designer | Structural clarity, white space mastery |
| Japanese woodblock prints | Tradition | Clean linework, limited palette, atmospheric depth |

## Responsive

- Mobile (390px+): single column, stacked sections, condensed nav
- Tablet (768px+): two-column grids
- Desktop (1280px+): full layout, content capped at 1280px centered
- Ultra-wide (2560px+): content capped, hero spans full viewport

All grids use `minmax(0, 1fr)` columns with `min-width: 0` on children.
