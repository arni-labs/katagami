# Koinobori

**One language. Kodomo no Hi — Children's Day. Koinobori rising.**

## POV

Clear light. Fresh air. Hopeful ascent.

Early summer in Japan: the sky is wide, the wind is clean, the river runs cold from the mountain. Koinobori — carp streamers — climb the wind on tall poles. Children watch. Families gather. The carp that reaches the waterfall becomes a dragon.

Koinobori is bright, graphic, and precise. Open white space first, then vivid highlighter color used sparingly and with intention. Electric sky blue, fresh green, one hot pop of coral. Everything is confident and grown-up. No mud. No pastels. No clutter. No childishness.

This is a product language for adults who love the festival and want to bring its spirit into the modern world — clean, expressive, editorial, and emotionally direct.

Surfaces are separated by tone, never by borders. Typography is bold, spacious, and highly readable. One control height across every interactive element. Every component is built from a small set of tokens. Radius is restricted. Accent is used like a highlighter pen.

## Tokens

### Color — 3 accents maximum

Core neutrals (bright and clean):
- `--bg`: #FFFFFF
- `--bg-elevated`: #F8FBFF
- `--bg-subtle`: #F0F7FF
- `--text-primary`: #0A1628
- `--text-secondary`: #3F546E
- `--text-on-accent`: #FFFFFF

Accents (used like highlighters, never as full backgrounds):
- `--accent-blue`: #00B8F4 (electric sky)
- `--accent-green`: #00D68F (fresh green)
- `--accent-coral`: #FF2D55 (hot pop)

Semantic (minimal, never dominant):
- `--success`: #00D68F (same as accent-green)
- `--warning`: #FFB020
- `--danger`: #FF2D55 (same as accent-coral)

3D world palette (flat-shaded low-poly):
Grounds use desaturated versions of green and warm earth. River and sky use the accent-blue range cooled or warmed by time-of-day. Fog color always matches scene.background for atmospheric perspective.

### Typography

- `--font`: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif
- Letter-spacing on display: -0.02em to -0.025em

Scale (high contrast, generous leading):
- Display: 72px / 76px weight 800
- H1: 48px / 56px weight 700
- H2: 32px / 40px weight 700
- H3: 24px / 32px weight 600
- Body: 17px / 26px weight 400
- Small: 14px / 20px weight 500
- Label: 13px / 18px weight 600 (uppercase tracking 0.06em)

Japanese kanji and kana (こどもの日, 鯉のぼり, 龍) use the same stack with slightly tighter tracking where needed for impact. Heavy weight for key festival words.

### Spacing

Generous. Titles never stuck to container tops.

- Base unit: 4px
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 24px
- `--space-6`: 32px
- `--space-7`: 40px
- `--space-8`: 48px
- `--space-9`: 64px
- `--space-10`: 80px

Vertical rhythm between major sections on landing: 80–120px. Content blocks breathe.

### Radius (restricted set)

Only these values allowed:
- 0
- 16px
- 24px
- 9999px (pills only)

Cards and large surfaces: 24px  
Buttons and smaller: 9999px or 16px  
Inputs: 16px  
No decorative side lines or heavy borders anywhere.

### Control Height (ONE shared token)

--control-h: 52px

Every button, input, select, toggle, segmented control, search field, and form action uses exactly this height. No exceptions. Text inside is 17px. Horizontal padding 20px minimum on text buttons.

### State Matrix (applied to every interactive)

All states built from tokens. Focus always has a visible ring.

- **default**: accent fill or subtle bg + primary text
- **hover**: darken or intensify accent (or lift subtle surface)
- **focus** (visible ring): 0 0 0 3px rgba(accent, 0.25) + 0 0 0 1px accent on top of default/hover
- **active**: further darken + subtle scale(0.985)
- **disabled**: opacity 0.5, no pointer, desaturated text

Never rely on color alone for state.

### Surfaces (tone, not borders)

- Base page: --bg
- Elevated cards / panels: --bg-elevated
- Subtle containers / sidebars: --bg-subtle
- Glass overlays on immersive: rgba(255,255,255,0.82) + backdrop blur

Separate with 1–2 stops of tone or soft shadow only when needed for depth. No grey borders.

## Components (built once from tokens)

### Buttons
Height: 52px. Radius: 9999px. Font 17px weight 600.
Primary: accent-blue or accent-coral fill, white text.
Secondary: transparent or elevated bg, primary text, subtle hover lift.
All states implemented.

### Inputs, Selects, Textareas
Height 52px. Radius 16px. bg-subtle or white, text-primary. No border or hairline only. Focus ring using one of the three accents. Placeholder text-secondary. Text 17px.

### Checkboxes / Radios / Toggles
Sized to sit comfortably with 52px fields. Accent color on checked. Focus ring.

### Cards
Radius 24px. bg-elevated or bg. No border. Generous internal padding (24–32px). Hover can lift with soft shadow if needed.

### Glass panels (immersive only)
Translucent, backdrop-filter blur, strong contrast scrim when over bright 3D sky. Always use dark text or light text with sufficient scrim.

### Navigation
Clean, minimal. Logo left (bold, 20px). Links 17px. Active uses accent underline or dot. No heavy bars.

## Usage Rules

- Accents ≤3. Never add more.
- Always use the shared control height.
- Separate surfaces by tone.
- Titles have padding above.
- Body 17px minimum.
- High contrast always.
- No emoji on buttons or as decoration.
- In 3D: single cohesive flat-shaded low-poly language. One shader for all cloth. Instancing for repetition.
- Scroll on immersive is a director's tool — camera leads, reveals, and punctuates. Never just follows.

## Surfaces Built on This Language

- landing.html — expressive marketing with full-bleed hero image, editorial voice.
- immersive.html — the pure real-time low-poly 3D experience (no generated media).
- dashboard.html — real product dashboard with every control styled.

All three use exactly these tokens and no deviations.

Koinobori — wishes rise.
