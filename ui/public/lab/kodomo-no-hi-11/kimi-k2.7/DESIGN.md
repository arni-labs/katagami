# Nobori

> A design language for Kodomo no Hi — the Japanese Children's Day of koinobori carp streamers, iris, and the wish that a child grows brave enough to swim upstream and become a dragon.

## POV

Nobori treats the screen as a sheet of warm washi paper hung in a May breeze. Information is arranged like festival banners on a pole: vertical rhythm, clear layers, and one decisive accent colour drawing the eye upward. The signature mechanic is **upward emphasis** — every section leads the gaze from ground to sky through type scale, stacked space, and a single ascending accent (Koi Red). Surfaces are separated by tone, never by borders. Forms are explicit and calm. Motion follows the wind: slow drifts, gentle reveals, and scroll-driven ascent.

## Signature traits

- One accent used as a highlighter: Koi Red (`#E63946`).
- Two supporting accents used sparingly: Stream Teal (`#2A9D8F`) and May Gold (`#F4A261`).
- Warm paper ground (`#FDF8F3`) and pure white surfaces; ink text (`#1A1614`).
- Generous vertical spacing; titles always have padding above them.
- Display type is bold, slightly condensed, with tight tracking; Japanese kanji use a heavy sans face.
- Border radius from the allowed set: `0`, `16px`, `24px`, `9999px`.
- Surfaces read by tone shift, not card borders.

## Tokens

### Colour

| Role | Default | Dark mode override |
|------|---------|-------------------|
| `--bg` | `#FDF8F3` | `#12100F` |
| `--surface` | `#FFFFFF` | `#1D1A18` |
| `--surface-raised` | `#FFFFFF` | `#282421` |
| `--surface-sunk` | `#F5EDE6` | `#161311` |
| `--text` | `#1A1614` | `#F7F2EC` |
| `--muted` | `#6B6560` | `#A39A91` |
| `--border` | `#E8E0D8` | `#332E2A` |
| `--accent` | `#E63946` | `#FF4D5A` |
| `--accent-2` | `#2A9D8F` | `#3EC7B7` |
| `--accent-3` | `#F4A261` | `#FFC078` |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` |
| `--success` | `#2A9D8F` | `#3EC7B7` |
| `--warning` | `#F4A261` | `#FFC078` |
| `--error` | `#E63946` | `#FF4D5A` |
| `--info` | `#457B9D` | `#5DA8D1` |
| `--focus-ring` | `#E63946` | `#FF4D5A` |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | `"Inter", "Noto Sans JP", system-ui, sans-serif` | Headlines, display |
| `--font-body` | `"Inter", "Noto Sans JP", system-ui, sans-serif` | Body, UI, labels |
| `--font-jp` | `"Noto Sans JP", sans-serif` | Japanese display kanji |
| `--text-xs` | `14px` | Captions, metadata |
| `--text-sm` | `15px` | Small UI, table rows |
| `--text-base` | `17px` | Body minimum |
| `--text-lg` | `19px` | Lead paragraphs |
| `--text-xl` | `24px` | Subheadings |
| `--text-2xl` | `32px` | Section headlines |
| `--text-3xl` | `44px` | Major headlines |
| `--text-4xl` | `64px` | Hero headline (capped with clamp) |
| `--text-5xl` | `88px` | Maximum display |
| `--leading-tight` | `1.05` | Display |
| `--leading-snug` | `1.25` | Headings |
| `--leading-normal` | `1.55` | Body |
| `--tracking-tight` | `-0.03em` | Display |
| `--tracking-normal` | `-0.01em` | Body |

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

### Radius

| Token | Value |
|-------|-------|
| `--radius-none` | `0` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-full` | `9999px` |

### Shared control height

| Token | Value |
|-------|-------|
| `--control-height` | `48px` |

All buttons, inputs, selects, and toggles share this height. Labels and helper text sit outside the control box.

## State matrix

All interactive controls use the same state model. Transitions are `150ms cubic-bezier(0.4, 0, 0.2, 1)` for colour and shadow, `200ms` for transform.

| State | Background | Border | Text | Shadow / ring |
|-------|------------|--------|------|---------------|
| Default | token default | `--border` | `--text` | none |
| Hover | 4% darker/lighter overlay | `--muted` | `--text` | `0 2px 8px rgba(26,22,20,0.06)` |
| Focus | unchanged | `--focus-ring` | `--text` | `0 0 0 3px rgba(230,57,70,0.25)` |
| Focus-visible | unchanged | `--focus-ring` | `--text` | `0 0 0 3px rgba(230,57,70,0.35)` |
| Active | 8% darker/lighter overlay | `--focus-ring` | `--text` | inset `0 1px 2px rgba(26,22,20,0.08)` |
| Disabled | `--surface-sunk` | `--border` | `--muted` | none; `opacity: 0.6`; cursor `not-allowed` |

Primary buttons invert the accent: default `--accent` background, `--on-accent` text. Hover darkens the accent 8%. Active darkens 12%. Focus ring uses `--focus-ring` at 35% alpha.

Ghost buttons have transparent background and `--text` text; hover fills `--surface-sunk`.

## Components

### Button

- Height: `--control-height` (48px).
- Padding: `0 24px`.
- Border radius: `--radius-full`.
- Font: `--text-base`, weight 600, letter-spacing `--tracking-normal`.
- Primary: `--accent` bg, `--on-accent` text.
- Secondary: `--surface` bg, `--border` 1px, `--text` text.
- Ghost: transparent bg, `--text` text.
- Label centred. One primary per button set.

### Input / Textarea

- Height: `--control-height` (48px); textarea min-height `120px`.
- Padding: `0 16px` (textarea `16px`).
- Border: 1px solid `--border`.
- Border radius: `--radius-md` (16px).
- Background: `--surface`.
- Placeholder: `--muted`.
- Focus: border `--focus-ring`, ring `0 0 0 3px rgba(230,57,70,0.25)`.
- Disabled: `--surface-sunk` bg, `--muted` text.

### Select

- Same base as input.
- Custom chevron via inline SVG, never a native glyph.
- Chevron colour: `--muted`.

### Checkbox / Radio

- Size: `20px × 20px`.
- Border: 2px solid `--border`.
- Border radius: `4px` checkbox, `9999px` radio.
- Checked: `--accent` fill, `--on-accent` checkmark via SVG.
- Focus: ring `0 0 0 3px rgba(230,57,70,0.25)`.

### Toggle (switch)

- Track: `48px × 26px`, radius `9999px`, bg `--border`.
- Thumb: `22px` circle, bg `--surface`, shadow `0 1px 3px rgba(0,0,0,0.15)`.
- Checked track: `--accent`.
- Focus: ring around the track.

### Card

- Background: `--surface`.
- Border radius: `--radius-lg` (24px).
- Padding: `--space-6` (32px).
- No border. No nested cards.
- Optional subtle shadow: `0 4px 24px rgba(26,22,20,0.05)`.

### Tag / Pill

- Height: `32px`.
- Padding: `0 14px`.
- Radius: `--radius-full`.
- Background: `--surface-sunk`.
- Text: `--muted`, weight 500.
- Accent variant: `--accent` bg, `--on-accent` text.

### Navigation

- Background: `--bg` at 90% opacity with `backdrop-filter: blur(12px)`.
- Links: `--text`, weight 500.
- Active link: `--accent` underline 2px.
- Mobile: hamburger icon (SVG), sheet slides from right.

### Table

- Header: `--surface-sunk`.
- Rows: `--surface`, separated by 1px `--border` (the only allowed border use).
- Cell padding: `16px`.
- Row hover: `--surface-sunk`.

### Modal / Sheet

- Backdrop: `rgba(26,22,20,0.45)`.
- Surface: `--surface`.
- Radius: `--radius-lg`.
- Shadow: `0 24px 80px rgba(26,22,20,0.18)`.

## Surfaces

### Landing

- Full-bleed hero (`100vw × 100svh`) with `background-image: var(--hero-image)`.
- Hero overlay uses a solid scrim layer (never a lazy gradient) to guarantee legibility.
- Headline: heavy display type, Japanese kanji in `--font-jp`, accent word highlighted.
- Sections below the hero return to rich, full-width compositions with generous spacing.
- No scroll cues.

### Immersive

- A single persistent WebGL canvas showing a flat-shaded low-poly world.
- Art direction: crisp polygons, limited palette matching the language tokens, soft fog, gentle bloom.
- Scroll drives a GSAP timeline that moves a dual-ref camera rig through the scene.
- Content overlays use glass panels with strong scrims; type follows the language scale.
- Reduced-motion fallback: a static low-poly hero still.

### Dashboard

- Sidebar + main layout; sidebar uses `--surface-sunk`, main uses `--bg`.
- Cards for stats, charts, and lists; all cards follow the card component.
- Tables, buttons, inputs, and tags all use the shared control height and state matrix.
- Data visualizations use the three accent colours only.

## Art style

The paired art style for generated imagery is **paper-festival realism**: crisp contemporary photography with the warmth of washi paper, morning light, and the saturated reds and teals of koinobori. Subjects are real products, children, and festival scenes; the treatment is clean, bright, and slightly elevated — never muddy, never generic stock.

### Credits

- **Kodomo no Hi / Tango no Sekku** — Japanese cultural festival tradition (annual 5 May). The motif of carp streamers, iris, and kabuto is drawn from this public tradition.
- **Japanese graphic design** — mid-century poster tradition for vertical composition and bold flat colour blocks.
- **Contemporary editorial photography** — warm natural light and shallow depth of field as seen in modern family-lifestyle editorial work.

## Responsive

- Mobile: single column, hide non-essential nav links, no horizontal overflow.
- Ultra-wide: cap contained content at `1320px` and centre; only full-bleed heroes span `100vw`.
- Grid children use `min-width: 0` and `minmax(0, 1fr)` to prevent blowout.
