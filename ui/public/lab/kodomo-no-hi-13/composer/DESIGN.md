# Nobori

> A design language for Kodomo no Hi — bright, airy, hopeful early-summer festival energy pushed into confident graphic design. Koinobori rise against open white sky; electric accents strike like highlighters across a grown-up product surface.

## Point of view

Nobori treats Children's Day not as decoration but as **vertical ambition** — carp climbing, windsocks streaming, families coordinating upward. The signature mechanic is **Rise Highlight**: vast white ground, then three vivid accent strokes (sky-volt, kashiwa green, hinode pop) applied sparingly like editorial highlighters on headlines, CTAs, and key metrics. Typography is poster-bold; kanji carry cultural weight beside Latin display. Surfaces separate by tone, never borders. Sleek, clean, adult — a product someone launches, not a toy.

## Naming

- **Language**: Nobori
- **Product**: Nobori — family festival coordination for Kodomo no Hi
- **Motif**: Koinobori carp streamers rising on tall poles

## Credits

| Name | Kind | Note |
|------|------|------|
| Kodomo no Hi tradition | cultural | Koinobori, fukinagashi windsocks, kashiwa mochi |
| Japanese graphic poster tradition | tradition | Bold flat colour blocking, confident type |
| Tadanori Yokoo | artist | Electric colour juxtaposition on white ground |

## Palette

### Neutrals (cool-tuned to early-summer sky)

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#FFFFFF` | Page ground |
| `--surface` | `#F4F8FB` | Elevated panels |
| `--surface-raised` | `#E8F2F8` | Secondary elevation |
| `--text` | `#0A1628` | Primary copy |
| `--muted` | `#5A6B7D` | Secondary copy |
| `--border` | `transparent` | Surfaces separate by tone only |

### Accents (≤3 highlighter colours)

| Token | Value | Role |
|-------|-------|------|
| `--accent` | `#00AEEF` | Sky Volt — primary CTA, key highlights |
| `--accent-2` | `#00D68F` | Kashiwa — growth, success, secondary highlight |
| `--accent-3` | `#FF3D5A` | Hinode — urgency, dates, pop emphasis |
| `--on-accent` | `#FFFFFF` | Text on accent fills |

### Semantic

| Token | Value | Role |
|-------|-------|------|
| `--success` | `#00D68F` | Maps to Kashiwa |
| `--warning` | `#FFB020` | Amber alert (non-accent semantic) |
| `--error` | `#E8193B` | Error state |
| `--info` | `#00AEEF` | Maps to Sky Volt |

## Typography

| Token | Value |
|-------|-------|
| `--font-display` | `'Outfit', system-ui, sans-serif` |
| `--font-body` | `'Outfit', system-ui, sans-serif` |
| `--font-jp` | `'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif` |
| `--text-display-xl` | `clamp(3rem, 8vw, 6.5rem)` |
| `--text-display-lg` | `clamp(2.25rem, 5vw, 4rem)` |
| `--text-display-md` | `clamp(1.75rem, 3vw, 2.5rem)` |
| `--text-body` | `1.0625rem` (17px) |
| `--text-small` | `0.90625rem` (14.5px) |
| `--text-table` | `0.90625rem` (14.5px) |
| `--letter-display` | `-0.02em` |
| `--line-body` | `1.55` |

## Spacing

| Token | Value |
|-------|-------|
| `--space-xs` | `0.5rem` |
| `--space-sm` | `0.75rem` |
| `--space-md` | `1.25rem` |
| `--space-lg` | `2rem` |
| `--space-xl` | `3.5rem` |
| `--space-2xl` | `6rem` |
| `--space-3xl` | `10rem` |
| `--title-pad-top` | `var(--space-xl)` |

## Radius

Allowed set only: `{0, 16, 24, 9999}`

| Token | Value |
|-------|-------|
| `--radius-none` | `0` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-pill` | `9999px` |

## Layout

| Token | Value |
|-------|-------|
| `--content-max` | `1200px` |
| `--control-height` | `48px` |

## Elevation / surfaces

Surfaces use tone steps (`--bg` → `--surface` → `--surface-raised`), never borders. Glass panels on immersive use `backdrop-filter: blur(16px)` with `rgba(255,255,255,0.82)` over dark scrims for legibility.

## Component state matrix

All interactive controls share `--control-height: 48px`.

### Primary button

| State | Background | Text | Other |
|-------|------------|------|-------|
| default | `--accent` | `--on-accent` | `border-radius: var(--radius-pill)` |
| hover | `#0098D4` | `--on-accent` | `transform: translateY(-1px)` |
| focus-visible | `--accent` | `--on-accent` | `outline: 3px solid #00AEEF40; outline-offset: 2px` |
| active | `#0088BE` | `--on-accent` | `transform: translateY(0)` |
| disabled | `#B8D4E8` | `#FFFFFF` | `pointer-events: none; opacity: 0.7` |

### Secondary button

| State | Background | Text | Other |
|-------|------------|------|-------|
| default | `--surface-raised` | `--text` | `border-radius: var(--radius-pill)` |
| hover | `#D8EAF4` | `--text` | — |
| focus-visible | `--surface-raised` | `--text` | `outline: 3px solid #00AEEF40; outline-offset: 2px` |
| active | `#C8DEE8` | `--text` | — |
| disabled | `--surface` | `--muted` | `pointer-events: none` |

### Text input / select / textarea

| State | Background | Border | Other |
|-------|------------|--------|-------|
| default | `--surface` | none | `border-radius: var(--radius-md); height: var(--control-height)` |
| hover | `--surface-raised` | none | — |
| focus-visible | `#FFFFFF` | none | `outline: 3px solid #00AEEF40; outline-offset: 0` |
| active | `#FFFFFF` | none | — |
| disabled | `--surface` | none | `color: var(--muted)` |

### Checkbox / radio

| State | Mark | Background |
|-------|------|------------|
| default | — | `--surface-raised` |
| hover | — | `#D8EAF4` |
| focus-visible | — | `outline: 3px solid #00AEEF40` |
| checked | `--accent` fill + white check | `--surface-raised` |
| disabled | — | `--surface`; `opacity: 0.5` |

## Signature patterns

1. **Rise Highlight** — accent colour as editorial highlighter stroke behind key words or metrics
2. **Vertical Stream** — tall narrow columns and ascending layout rhythm echoing poles
3. **Kanji Anchor** — heavy Japanese display (こどもの日, 鯉のぼり) paired with Outfit Latin
4. **Open Sky Ground** — dominant white with accents only where meaning demands

## Visual character

- Bright, never muddy or pastel-washed
- Graphic poster composition with generous negative space
- High contrast: dark text on white; white text only over scrims or accent fills
- No borders; no nested cards
- No emoji on buttons; SVG icons only
- Motion respects `prefers-reduced-motion`

## Art style (landing + dashboard imagery)

**Technique**: Editorial Graphic Block — bold flat colour planes, high-contrast photographic elements cropped into poster layouts, electric accent overlays. Transferable across subjects; not low-poly.

**Prompt cues**: bright airy white ground, electric sky-blue and fresh green accents, hot coral pop, sleek grown-up product, confident typography zones, hopeful early-summer light.

## Immersive art direction

Separate transferable technique: **Flat-Shade Low-Poly** — cohesive game-grade environment, flat Lambert materials, atmospheric fog, morning-to-dusk lighting journey. Pure real-time 3D; no blended stills.