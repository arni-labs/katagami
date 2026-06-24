# Koinobori

**Koinobori** is the design language of ascent and wind for Kodomo no Hi.

## Concept

Koinobori captures the living spirit of Children's Day through the central metaphor of the carp streamer. Families raise tall poles along rivers and in gardens; the fabric fills with wind, climbs, and gathers courage at the waterfall where the koi transforms into a dragon. The signature mechanic is **flow and lift**: vertical rhythm in compositions, subtle rippling motion on interactive surfaces, ascending visual weight from grounded bases to lifted peaks, and a bright open atmosphere that feels both festive and calm. Every element channels the wind that moves the banners and the determination of the climb.

The language is for families celebrating growth. It is bright, clean, and culturally rooted without pastiche. One coherent system: the same tokens, states, and rhythm power the marketing landing, the immersive world journey, and the everyday product dashboard.

## Naming

Koinobori is a single evocative noun drawn directly from the strongest motif — the carp streamer itself. It is concrete, cultural, and ownable. No adjectives, no stacked genres, no banned tokens.

## Palette

Light, warm-grounded, clean spring festival. Neutrals tuned warm. At most three accent colours used like highlighters.

```css
:root {
  /* Surfaces (tone, never borders for separation) */
  --bg: #F7F6F2;
  --surface: #FFFFFF;
  --surface-2: #F0EDE6;
  --surface-3: #E7E2D9;

  /* Text */
  --text: #1F252E;
  --muted: #5E6A78;

  /* Subtle border (used sparingly) */
  --border: #D9D3C9;

  /* Accents — exactly three */
  --accent: #D94A3A;        /* Koi red — primary */
  --accent-2: #3E7FA6;      /* Stream blue */
  --accent-3: #5D8F5E;      /* Growth green / leaf */

  /* On accent */
  --on-accent: #FFFFFF;

  /* Semantic */
  --success: #5D8F5E;
  --warning: #C48A3A;
  --error: #C13F3F;
  --info: #3E7FA6;
}
```

## Typography

Body minimum 17px. High contrast. Generous line heights.

```css
:root {
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
  --font-display: "Noto Sans JP", system-ui, -apple-system, sans-serif;

  --fs-12: 12px;
  --fs-14: 14px;
  --fs-16: 16px;
  --fs-17: 17px;
  --fs-19: 19px;
  --fs-21: 21px;
  --fs-24: 24px;
  --fs-28: 28px;
  --fs-32: 32px;
  --fs-40: 40px;
  --fs-48: 48px;
  --fs-56: 56px;
  --fs-64: 64px;
  --fs-72: 72px;

  --lh-tight: 1.05;
  --lh-snug: 1.15;
  --lh-normal: 1.5;
  --lh-relaxed: 1.65;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

Display headlines use the JP-capable stack at bold weights with tight leading. Body uses the full stack at regular/medium. Japanese kanji (こどもの日, 鯉のぼり) always use heavier weight for presence.

## Spacing

Generous. Always pad above titles. Use the scale.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

## Radius

One coherent geometry. Only these values:

- 0
- 16px
- 24px
- 9999px (pill)

```css
:root {
  --radius-0: 0;
  --radius-s: 16px;
  --radius-m: 24px;
  --radius-full: 9999px;
}
```

## Control Height (single shared token)

All primary interactive controls share one height. No exceptions for buttons, inputs, selects, custom checkboxes in their hit area.

```css
:root {
  --control-h: 48px;
}
```

Smaller variants (40px) are allowed only for dense dashboard tables or compact actions when space is constrained; the primary family uses 48px.

## Surfaces

Hierarchy is created with tone, space, and type — never single accent edges or heavy borders.

- Base page: `--bg`
- Primary content panels: `--surface`
- Elevated or grouped sections: `--surface-2`
- Deepest nested or footer blocks: `--surface-3`

Cards and sections receive generous internal padding (≥ var(--space-8)) and use radius-m or radius-s. Subtle shadow only for lift on light grounds when needed.

## State Matrix

Every interactive element uses the exact same state definitions built from tokens. Visible focus ring always.

### Buttons (primary, secondary, ghost, accent)

- **Default**: height var(--control-h), padding 0 var(--space-6), radius-s or radius-m, bg accent or surface-2, color appropriate, font-semibold 17px, centered.
- **Hover**: lift 1px or bg shift (accent darkens slightly or surface-2 warms), transition 120ms ease.
- **Focus-visible**: 2px solid ring using --accent (or current accent) with 2px offset. Never outline:0 without ring. Ring remains visible.
- **Active**: 1px downward press, bg deeper tone, transition 60ms.
- **Disabled**: opacity 0.5, no pointer, no hover lift, no ring on focus.

Primary button: solid --accent bg, --on-accent text.
Secondary: surface-2 bg, --text.
Ghost: transparent, --text with subtle hover bg.
Accent variant uses --accent-2 or --accent-3 when appropriate.

### Form Controls (explicitly styled — no browser defaults)

All controls are 48px tall where applicable.

- **Text input, textarea, select**: 
  - height var(--control-h), width 100%, bg var(--surface), color var(--text), border 1px solid var(--border), border-radius var(--radius-s), padding 0 var(--space-4), font 17px.
  - Hover: border-color shifts toward --text.
  - Focus-visible: border-color var(--accent), box-shadow 0 0 0 3px rgba(217,74,58,0.15) or explicit 2px ring using accent. Ring always present.
  - Active: no special beyond focus.
  - Disabled: bg var(--surface-2), color var(--muted), border var(--border), cursor default.
  - Placeholder: var(--muted).

- **Checkbox & Radio**:
  - Custom square/circle 20px using border var(--border), radius-s or full.
  - Checked: bg var(--accent), border var(--accent), inner check or dot in --on-accent.
  - Hover: border stronger.
  - Focus-visible: 2px ring offset around the control.
  - Disabled: muted colors, no interaction.

- **Labels**: 17px medium, --text, always paired with control. Use --space-2 gap.

- **Fieldsets & groups**: no default borders. Use spacing and subtle surface-2 background for sections.

All form elements receive the same ring treatment and token application.

## Components

All built once from the tokens above.

- Buttons (see states)
- Inputs (see states)
- Cards: surface or surface-2, radius-m, generous padding, no single accent edge.
- Section headers: large display type, generous space above (≥ var(--space-10)), --text.
- Badges / tags: small radius-s, 14px, surface-2 or accent with on-accent, tight padding.
- Navigation: clean, 17px, hover uses accent-2 underline or bg tone shift. Active uses --accent.
- Metrics / numbers in dashboard: large bold numerals, muted label below.
- Glass panels (for immersive overlay): rgba white with backdrop blur, strong text contrast via dark scrim where sky is bright.

## Motion

Motion carries meaning — wind, lift, reveal. Subtle cloth-like ripples on banners and hover states. Use 120–200ms for micro, longer cinematic for section reveals. Always respect `prefers-reduced-motion`.

## Responsive

Mobile: single column stacks, 17px body preserved. Ultra-wide: centre contained content (max-width sensible), only hero full-bleed.

## Imagery (landing + dashboard)

Hero and feature imagery use refined, sunlit, natural spring scenes with real koinobori in the world — families, poles, river, wind. Clean compositions, warm daylight, elegant detail. Never low-poly. Never muddy. Always swappable via `--hero-image`.

The immersive page is pure real-time 3D (see separate implementation); its aesthetic does not leak into other surfaces.

## Implementation Notes

- All three surfaces share identical `:root` tokens.
- One HTML file per surface, fully self-contained.
- No token swatches or specimen pages in the visible surfaces.
- Real product copy with concrete nouns and verbs.
- Every form control appears in the dashboard and is explicitly styled per the matrix.

---

**Tokens are the single source.** Change a value here and the whole family of pages follows.
