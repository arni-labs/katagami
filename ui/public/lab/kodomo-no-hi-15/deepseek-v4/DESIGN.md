# Koinobori

> A Katagami design language — Kodomo no Hi, the carp-streamer festival, pushed into confident graphic-design editorial. Bright, airy, electric; open white with vivid accents used like highlighters.

## Palette

| Role | Token | Value |
|------|-------|-------|
| Page background | `--bg` | `#F4F6FA` |
| Surface | `--surface` | `#FFFFFF` |
| Text / ink | `--text` | `#1A1D24` |
| Muted text | `--muted` | `#636E82` |
| Border | `--border` | transparent |
| Accent 1 — Sky | `--accent` | `#00B4F0` |
| On-accent | `--on-accent` | `#FFFFFF` |
| Accent 2 — Green | `--accent-green` | `#00D68F` |
| Accent 3 — Hot Pop | `--accent-hot` | `#FF3B73` |
| Success | `--success` | `#00D68F` |
| Warning | `--warning` | `#FFB800` |
| Error | `--error` | `#FF3B73` |
| Info | `--info` | `#00B4F0` |

Neutral temperature is cool-slate — `#636E82` derives from the sky-blue primary hue. Pure white and near-white surfaces, never warm cream.

## Typography

| Token | Font | Style |
|-------|------|-------|
| Display | Inter Tight | 700, -0.02em |
| Body | Inter | 400, 17px, 1.5 line-height |
| Japanese display | Noto Serif JP | 700 |

**Type scale:** 12, 14, 17, 20, 24, 32, 40, 56, 72 (px)

High contrast: text `#1A1D24` on `#FFF` surface, never dark-on-dark or light-on-light.

## Spacing

**Scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96 (px)

Pad above all titles; generous whitespace throughout. Grid gap 24px default.

## Radius

**Allowed values:** 0, 16, 24, 9999

Cards and interactive surfaces use 24px. Buttons use 9999 (pill). Form inputs use 16px. No arbitrary interim values.

## Control height

**Single shared token:** `--control-height: 44px`

### Button states

| State | Style |
|-------|-------|
| Default | Accent fill + white text, 9999 radius, 44px height |
| Hover | Brightness 1.08, scale 1.02 |
| Focus-visible | 2px accent ring, 4px offset |
| Active | Brightness 0.94, scale 0.98 |
| Disabled | 40% opacity, cursor not-allowed |

**Primary button:** accent fill (`#00B4F0`), white text, 9999 radius.
**Secondary button:** surface fill, `--muted` text, 9999 radius.
**Destructive:** `--error` fill, white text.

### Input / select / textarea

| State | Style |
|-------|-------|
| Default | `--surface` bg, `--muted` placeholder, 16px radius, 44px height, 17px body |
| Hover | `--muted` placeholder darkens 15% |
| Focus-visible | 2px `--accent` ring, 4px offset |
| Active | Same as focus |
| Disabled | 40% opacity, cursor not-allowed |

### Checkbox / radio

| State | Style |
|-------|-------|
| Default | 20×20px, surface bg, 0 radius, `--muted` checkmark |
| Checked | `--accent` bg, white checkmark |
| Focus-visible | 2px `--accent` ring, 4px offset |
| Disabled | 40% opacity |

### Toggle / switch

| State | Style |
|-------|-------|
| Off | `--muted` track (44×24px, 9999), white thumb (20px circle) |
| On | `--accent` track, white thumb shifted right |
| Focus-visible | 2px accent ring around track |
| Disabled | 40% opacity |

## Signature mechanic

**Highlighted accents on white** — vivid, almost-neon accent colours deployed like highlighters on open white surfaces. No borders; surfaces separate by tone alone. One strong graphic idea per section; the accent draws the eye to the one thing that matters.

## Surfaces

- **Landing:** Expressive, editorial — bold display type, full-bleed hero, staggered scroll-reveals, accent-highlighted CTAs.
- **Immersive:** Low-poly 3D flight through a Kodomo no Hi world — real-time Three.js scene, camera driven by native scroll via GSAP.
- **Dashboard:** Clean product UI — card-free data layouts, accent-highlighted key metrics, fully styled form controls.

## Composition variables (`injectTheme`)

```css
:root {
  --bg: #F4F6FA;
  --surface: #FFFFFF;
  --text: #1A1D24;
  --muted: #636E82;
  --border: transparent;
  --accent: #00B4F0;
  --on-accent: #FFFFFF;
  --accent-green: #00D68F;
  --accent-hot: #FF3B73;
  --success: #00D68F;
  --warning: #FFB800;
  --error: #FF3B73;
  --info: #00B4F0;
  --control-height: 44px;
  --radius-card: 24px;
  --radius-btn: 9999px;
  --radius-input: 16px;
}
```

## Motion

Staggered scroll-reveals per section (IntersectionObserver). Hover: cards lift 4px with subtle scale; buttons brighten; rows highlight. Parallax hero + slow ken-burns. Respects `prefers-reduced-motion` (bail entirely).

## Art style

**Treatment:** Flat-shaded low-poly 3D (immersive surface); clean graphic-design poster aesthetic with bold flat colour, confident type, and negative-space composition (landing, dashboard imagery). No gradients, no grain, no texture — bright, digital-native, vector-crisp.

## Credits

- Kodomo no Hi festival tradition — Japanese cultural heritage.
