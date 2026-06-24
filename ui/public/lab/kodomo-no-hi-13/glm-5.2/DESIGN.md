# Koinobori

> A design language for early-summer light, rising carp, and the courage to grow.
> One ownable idea: **ascent** — everything rises. Type climbs, accents streak
> upward, surfaces float on white. The carp that climbs the waterfall becomes the
> dragon; growth is the whole product.

---

## POV

Kodomo no Hi (こどもの日) celebrates children's courage and growth. The koinobori —
carp streamers rising on tall poles against a clear May sky — is the single
strongest motif. Koinobori the language takes that upward motion and pushes it
into confident graphic design: bright, airy, hopeful, with vivid highlighter
accents that streak across open white like wind through streamers. It is sleek
and grown-up — a product an adult launches — never childish, never cluttered.

The signature mechanic is **ascent**: vertical rhythm, rising accents, type that
climbs. Surfaces separate by tone, not borders. Colour is used like a
highlighter — three vivid strokes against white, never a wash.

---

## Tokens

### Colour

Role vars (overridable by `injectTheme`):

| Role | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Pure white canvas — the open sky |
| `--surface` | `#F5F7FA` | Tonal surface for cards, panels — separated by tone, never borders |
| `--surface-2` | `#EBF0F5` | Deeper tonal surface for nested areas, table headers |
| `--text` | `#0B1220` | Near-black, high contrast on white |
| `--muted` | `#5B6878` | Secondary text, captions, labels |
| `--border` | `transparent` | No borders by default; surfaces separate by tone |
| `--accent` | `#00A6F0` | Electric sky-blue — the primary highlighter (sky, ascent, primary actions) |
| `--accent-2` | `#00C16B` | Fresh green — early-summer greenery (growth, success, positive) |
| `--accent-3` | `#FF4D3D` | Hot coral-red — the carp's energy (hot pop, milestones, urgency) |
| `--on-accent` | `#FFFFFF` | Text on any accent |
| `--success` | `#00C16B` | Semantic success (= accent-2) |
| `--warning` | `#FFB300` | Festival gold — semantic warning, small part of palette |
| `--error` | `#FF4D3D` | Semantic error (= accent-3) |
| `--info` | `#00A6F0` | Semantic info (= accent) |

Accent count: **3** (`--accent` sky-blue, `--accent-2` green, `--accent-3`
coral). Semantic colours map onto these; they are never visually primary outside
their semantic role.

### Typography

| Token | Value | Use |
|---|---|---|
| `--font-display` | `'Bricolage Grotesque', system-ui, sans-serif` | Headlines, display, hero — expressive variable face, weights 400–800 |
| `--font-body` | `'Inter', system-ui, sans-serif` | Body, UI, labels — clean, readable |
| `--font-jp` | `'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif` | Japanese kanji — こどもの日 / 鯉のぼり — heavy weights for impact |

Type scale (modular, 1.250 major third):

| Token | Size | Line-height | Use |
|---|---|---|---|
| `--text-xs` | 13px | 1.4 | Tags, micro-labels |
| `--text-sm` | 15px | 1.5 | Secondary text, table rows ≥14.5px |
| `--text-base` | 17px | 1.6 | Body — minimum body size |
| `--text-lg` | 21px | 1.5 | Subheadings, card titles |
| `--text-xl` | 27px | 1.3 | Section headings |
| `--text-2xl` | 34px | 1.2 | Large headings |
| `--text-3xl` | 43px | 1.1 | Display headings |
| `--text-4xl` | 54px | 1.05 | Hero display |
| `--text-5xl` | 68px | 1.0 | Kanji display (鯉のぼり) |

Letter-spacing: `-0.02em` on display text (`--text-2xl` and above); `0` on body;
`0.08em` uppercase on micro-labels.

### Spacing

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-24` | 96px |
| `--space-32` | 128px |

Always pad above titles (generous `--space-12`+ above section headings).

### Radius

Only from `{0, 16, 24, 9999}`:

| Token | Value | Use |
|---|---|---|
| `--radius-0` | 0 | Tags, sharp graphic elements, full-bleed images |
| `--radius` | 16px | Default — cards, inputs, panels |
| `--radius-lg` | 24px | Large surfaces, hero panels, modals |
| `--radius-pill` | 9999px | Pills, buttons, badges |

### Control height (shared)

| Token | Value |
|---|---|
| `--control-height` | 48px |

Every interactive control — buttons, inputs, selects, toggles — is exactly
`--control-height` tall. One height, one shape family.

---

## State matrix

Every control implements all five states. No browser defaults.

| State | Treatment |
|---|---|
| **default** | Surface fill `--surface`, text `--text`, no border |
| **hover** | Surface lightens toward `--bg` (brightens), accent text shifts to `--accent` |
| **focus** | Visible 2px ring in `--accent` at 3px offset (outline + outline-offset), never removed |
| **active** | Surface deepens to `--surface-2`, slight scale-down (0.98) on press |
| **disabled** | `opacity: 0.4`, `cursor: not-allowed`, `pointer-events: none` |

Primary button states:

| State | Treatment |
|---|---|
| **default** | Fill `--accent`, text `--on-accent` |
| **hover** | Fill brightens (`#1AB5FF`), subtle lift (`translateY(-1px)`) |
| **focus** | 2px ring `--accent` at 3px offset |
| **active** | Fill deepens (`#0090D8`), scale 0.98 |
| **disabled** | `opacity: 0.4` |

---

## Components (built once from tokens)

### Buttons
- One shape: `--radius-pill`, height `--control-height`, horizontal padding `--space-6`
- Primary: fill `--accent`, text `--on-accent` — clearly the loudest
- Secondary: fill `--surface`, text `--text` — quieter
- Ghost: transparent fill, text `--accent` — quietest
- Label centred, no emoji, no symbol glyphs

### Inputs / selects / textareas
- Height `--control-height` (textarea min-height `calc(--control-height * 2)`)
- Fill `--surface`, no border; focus ring `--accent`
- Placeholder `--muted`; label above input, `--text-sm`, `--muted`
- Selects use a custom SVG chevron (no default arrow)

### Cards / surfaces
- Fill `--surface`, radius `--radius`, no border
- Hierarchy by tone: `--surface` → `--surface-2` for nested areas (never nest cards)
- Never a single accent edge — accent is used on content inside, not on the card frame

### Tags / badges
- Radius `--radius-0` (sharp), fill `--surface-2`, text `--text-sm`
- Accent tags: fill `--accent` at 12% opacity, text `--accent`

### Tables
- Header row: fill `--surface-2`, `--text-sm`, uppercase micro-labels
- Rows: `--text-sm` (≥14.5px), `--surface` fill, tonal separators (`--surface-2` 1px line)
- No outer border; radius on the container

### Toggles / checkboxes / radios
- Toggle: pill `--radius-pill`, `--control-height` / 2, knob slides; off = `--surface-2`, on = `--accent`
- Checkbox/radio: `--radius-0` (sharp), `--control-height` / 2.5, check mark SVG in `--on-accent`
- Focus ring on all

---

## Visual character

1. **Ascent** — vertical rhythm dominates. Section headings climb, accent strokes
   rise upward, hero imagery looks up. The eye always moves up.
2. **Highlighter accents** — three vivid strokes (blue, green, coral) against
   white, used like a marker pen on key words, dates, numbers. Never a wash.
3. **Tonal surfaces** — cards float on white by tone difference alone. No borders,
   no lines around cards.
4. **Bold display + heavy kanji** — Bricolage Grotesque for Latin display, Zen
   Kaku Gothic New at 900 for こどもの日 / 鯉のぼり. Strong type contrast.
5. **Open white** — generous negative space is the canvas. Content breathes.

---

## Credits

- **Kodomo no Hi / こどもの日** — Japanese Children's Day (May 5th), the cultural
  source of the koinobori motif and the carp-to-dragon growth myth.
- **Bricolage Grotesque** — display typeface (Atelier National de Recherche
  Typographique), used for its expressive variable weight range.
- **Inter** — body typeface (Rasmus Andersson), used for clean readability.
- **Zen Kaku Gothic New** — Japanese typeface (Yoshimichi Ohira / Google Fonts),
  used for kanji display at heavy weights.
