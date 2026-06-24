# Koinobori

**One ownable idea:** The wind that lifts the banners. A graphic language of ascent, clarity, and courageous transformation drawn from Kodomo no Hi — the koinobori carp streamers that ripple high on poles in clear early-summer light, the river that carries them to the waterfall where the ordinary becomes legend.

**Signature mechanic:** Rippling flags and rising forms. Elements lift, wave, and reveal in sequenced motion as if caught in an uplifting breeze; composition uses open white, vivid highlighter color as emphasis, and editorial scale to feel like a confident poster or a modern product in flight.

## POV

Koinobori is bright, airy, and hopeful but resolutely grown-up: generous open ground, crisp graphic design, never childish or cluttered. It treats the festival as a serious symbol of growth and courage for families who value intention and beauty. Vivid almost-neon accents (electric sky, fresh green, hot pop) are used like highlighters on white paper — never washes, never muddy. Surfaces are separated by tone shifts only. Motion feels like real fabric in wind: purposeful, not decorative.

## Tokens

### Color (roles + accents)

```css
:root {
  /* Ground */
  --bg: #FFFFFF;
  --surface: #F8FAFC;
  --surface-2: #F1F5F9;
  --surface-3: #E8EDF3;

  /* Text */
  --text: #0F172A;
  --text-strong: #020617;
  --muted: #64748B;
  --muted-2: #94A3B8;

  /* Accents — three highlighter colors, used sparingly and consistently */
  --accent: #00D4FF;      /* electric sky blue */
  --accent-2: #00F38A;    /* fresh vivid green */
  --accent-3: #FF2D92;    /* hot pop */

  /* On colors */
  --on-accent: #0A0A0A;
  --on-dark: #FFFFFF;

  /* Semantic (small, never primary) */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #00D4FF;

  /* Border — used only for the thinnest necessary separation */
  --border: #E2E8F0;
  --border-subtle: #F1F5F9;
}
```

Accents ≤ 3. Core neutrals tuned cool-bright. Everything on white or near-white surfaces.

### Typography

```css
:root {
  --font-sans: system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Helvetica Neue", Arial, sans-serif;
  --font-display: "Hiragino Sans", system-ui, -apple-system, "Noto Sans JP", sans-serif;

  /* Sizes — body 17px+ */
  --fs-xs: 13px;
  --fs-sm: 15px;
  --fs-base: 17px;
  --fs-lg: 19px;
  --fs-xl: 22px;
  --fs-2xl: 28px;
  --fs-3xl: 36px;
  --fs-display: 64px;
  --fs-hero: 84px;

  --lh-tight: 1.05;
  --lh-snug: 1.15;
  --lh-normal: 1.5;
  --lh-relaxed: 1.65;

  --ls-tight: -0.025em;
  --ls-normal: -0.01em;
  --ls-wide: 0.02em;
}
```

Display text uses -0.02em or tighter. Japanese kanji always rendered in the display stack at bold weight.

### Spacing (generous, titles padded above)

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
  --space-10: 128px;
}
```

### Radius (only allowed set)

```css
:root {
  --radius: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}
```

### Control height (ONE shared token)

```css
:root {
  --h-control: 48px;
}
```

All form controls, buttons, selects, inputs use exactly this height.

### Motion

```css
:root {
  --ease-standard: cubic-bezier(0.2, 0.0, 0.0, 1.0);
  --ease-entrance: cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-exit: cubic-bezier(0.4, 0.0, 1.0, 1.0);
}
```

Respect `prefers-reduced-motion`.

## State Matrix (applied uniformly to every interactive element)

All controls and buttons share identical tokens and states. Built once from tokens.

- **default**: base color / surface, full opacity, no transform
- **hover**: subtle lift (translateY(-1px)), background or border shift toward accent or darker, soft shadow if appropriate
- **focus**: visible ring — 3px solid var(--accent) with 2px offset, no outline, never lost
- **active**: pressed (translateY(1px) or scale(0.985)), slight darkening or desaturate
- **disabled**: opacity 0.45, no pointer, no hover lift, muted text

Explicit ring always visible on focus; never rely on browser default.

## Surfaces

Surfaces separated by tone, never borders:
- Page: --bg
- Cards / panels: --surface or --surface-2 (subtle step down)
- Deeper nested or selected: --surface-3
- Glass overlays on bright scenes: rgba(255,255,255,0.82) + backdrop blur

Never add a single accent edge to cards. Ornament only when it has meaning (e.g. a thin flag-like underline accent on a headline).

## Components (built once from tokens)

Buttons, inputs, selects, textareas, checkboxes, radios, toggles, tabs, and links are defined from the tokens above. No component invents its own radius, height, or color.

Primary button: solid near-black or --accent background, high contrast, centered label, exact --h-control, 16px radius.
Secondary / ghost: transparent or surface, thin or no border, accent text on hover.
All share the state matrix.

Form controls:
- Input / textarea / select: --surface or white bg, --text, subtle --border, padding generous, exact height for single line, focus ring accent, placeholder --muted.
- Custom checkbox / radio: square or circle using --radius or full, accent fill on checked, focus ring.
- Range / other: styled track and thumb using accent.

No browser defaults visible anywhere.

## Imagery & Art Direction

Hero and feature imagery are graphic, confident, poster-like: bright clean light, fresh greenery, koinobori rising, generous breathing room, vivid accents used as graphic hits. Never low-poly, never pastel, never toy-like. The immersive page is the only pure low-poly 3D surface; landing and dashboard imagery stay in the graphic editorial register.

## Responsive

Every page: 390px–2560px+.
Mobile: single column, essential only.
Ultra-wide: content capped and centered; full-bleed hero only element that spans 100vw.
Grids use minmax(0,1fr) and min-width:0.

## Landing Rules Applied

- Full-viewport hero (100vw × 100svh), background-image driven by var(--hero-image).
- No scroll cues.
- No tiny uppercase letter-spaced eyebrow stacked on oversized headline.
- Headline unmistakably this language.
- Below hero: rich full sections with real product copy, concrete verbs, invented but believable product moments.

## Immersive Page (pure 3D)

- One persistent live Three.js canvas, never unmounted.
- Complete world: ground/terrain, sky/horizon, flowing river, waterfall, distant hills/scenery, avenue of poles.
- Koinobori + fukinagashi on poles use InstancedMesh + custom GLSL vertex shader (traveling sine waves + wind uniforms).
- Dual-ref camera rig (position target + look-at target) updated every frame; lerp for smoothness.
- Scroll drives GSAP timeline (scrub:true) with native scroll; explicit segments, varied durations, CustomEase where possible.
- Morning-to-dusk progression via layered lighting + fog color.
- THREE.Fog + matched scene.background.
- EffectComposer + bloom approximated in pure Three for self-contained CDN (gentle glow on bright elements).
- Overlays in language typography, glass panels, strong scrims for readability.
- GPU instancing, pixelRatio capped at 2, RAF pauses on hidden tab, prefers-reduced-motion fallback to static composed hero frame.
- No stills, no video, no parallax images — pure real-time camera flight through one living low-poly world.

## Dashboard

Real working product dashboard for Koinobori — the modern family platform for seasonal growth rituals and celebrations. Uses exactly the same tokens, one control height, tonal surfaces, explicit controls, no borders on cards, generous spacing, high contrast type. Believable widgets, data, actions.

## Credits / Lineage

Influences: Japanese graphic poster tradition (especially festival and seasonal design), clean modernist editorial composition, precise low-poly game worlds for the immersive surface only. The name and primary motif come directly from Kodomo no Hi koinobori streamers.
