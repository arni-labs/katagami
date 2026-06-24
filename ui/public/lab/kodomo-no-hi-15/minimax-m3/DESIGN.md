# Nobori

> A bright, graphic editorial design language for Kodomo no Hi — the carp-streamer festival that celebrates children's growth. One distinctive word: *nobori* (幟 / 鯉のぼり), the streamers themselves.

## Concept

**The idea**: Kodomo no Hi is not a children's party — it is a poster. A grown-up, confident graphic-design moment that honors courage and growth with clear light, fresh greenery, and the carp climbing the river to become a dragon. Nobori treats the festival the way a Japanese editorial designer would: lots of open white, vivid accent colour used like highlighters, strong type, and a single recurring motif — the streamer — that ties every surface together.

**Signature mechanic — the streamer**: A bold, slightly tapered graphic ribbon that flows through every surface. On the landing it is a full-bleed hero band. On the dashboard it is a column of color that marks the active nav. On the immersive page it is the literal koinobori windsock rendered in real-time 3D. The streamer is always present, always tapered, always one of the three accent colours — never a border, never a thin line.

**The product**: Nobori is a festival planning platform for modern families who want to honor Japanese cultural traditions. The flagship event is Kodomo no Hi.

## Tokens

### Color

| Role | Token | Value | Use |
|---|---|---|---|
| Background | `--bg` | `#FFFFFF` | Page ground, hero ground |
| Surface | `--surface` | `#F7F7F4` | Cards, panels (tone, not border) |
| Surface raised | `--surface-2` | `#EFEFE9` | Nested panels, hover ground |
| Text | `--text` | `#0A0A0A` | Body, headings |
| Muted | `--muted` | `#6B6B6B` | Secondary text, captions |
| Border | `--border` | `#E5E5E0` | Used sparingly; surfaces separate by tone |
| Accent — sky | `--accent` | `#00A8E8` | Primary accent (electric sky blue) |
| Accent — leaf | `--accent-2` | `#00B86B` | Secondary accent (fresh green) |
| Accent — koi | `--accent-3` | `#FF3366` | Hot pop (coral red, the koi) |
| On accent | `--on-accent` | `#FFFFFF` | Text on accent fills |
| Success | `--success` | `#00B86B` | Same as accent-2 |
| Warning | `--warning` | `#F5A623` | Amber |
| Error | `--error` | `#FF3366` | Same as accent-3 |
| Info | `--info` | `#00A8E8` | Same as accent |

Three accent colours, used like highlighters. Neutrals are tuned warm (the off-white is `#F7F7F4`, not grey).

### Type

| Role | Token | Value |
|---|---|---|
| Display | `--font-display` | `"Inter", system-ui, sans-serif` — weight 800, letter-spacing -0.03em |
| Body | `--font-body` | `"Inter", system-ui, sans-serif` — weight 400 |
| Japanese | `--font-jp` | `"Shippori Mincho", "Noto Serif JP", serif` — weight 700 for kanji display |
| Mono | `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` |

| Step | Token | Size | Use |
|---|---|---|---|
| xs | `--text-xs` | 12px | Captions, legal |
| sm | `--text-sm` | 14.5px | Table rows, meta |
| base | `--text-base` | 17px | Body (rule: 17px+) |
| lg | `--text-lg` | 19px | Lead paragraphs |
| xl | `--text-xl` | 24px | Section subheads |
| 2xl | `--text-2xl` | 32px | Card titles |
| 3xl | `--text-3xl` | 48px | Section heads |
| 4xl | `--text-4xl` | 72px | Hero display |
| 5xl | `--text-5xl` | 96px | Hero kanji display |

Body 17px+, high contrast (near-black on white), display text at -0.03em letter-spacing.

### Spacing

8px base scale:

| Token | Value |
|---|---|
| `--space-1` | 8px |
| `--space-2` | 16px |
| `--space-3` | 24px |
| `--space-4` | 32px |
| `--space-5` | 48px |
| `--space-6` | 64px |
| `--space-7` | 96px |
| `--space-8` | 128px |

Generous. Titles always have padding above (never stuck to container tops).

### Radius

One coherent geometry — only from the allowed set `{0, 16, 24, 9999}`:

| Token | Value | Use |
|---|---|---|
| `--radius-sharp` | `0` | Editorial blocks, hero bands |
| `--radius-md` | `16px` | Cards, buttons |
| `--radius-lg` | `24px` | Hero panels, feature cards |
| `--radius-full` | `9999px` | Pills, tags, avatars |

No arbitrary in-between radii.

### Control height

**One shared token**: `--control-height: 48px`. Every button, input, select, and textarea uses this height. Labels are centred, padding is even.

### State matrix

Every interactive control uses this matrix:

| State | Treatment |
|---|---|
| Default | `background: var(--surface)`, `color: var(--text)`, `border: 1px solid var(--border)` |
| Hover | `background: var(--surface-2)`, no border change |
| Focus | `outline: 2px solid var(--accent)`, `outline-offset: 2px` — visible ring |
| Active | `background: var(--text)`, `color: var(--bg)` (inverted) |
| Disabled | `opacity: 0.5`, `cursor: not-allowed`, no hover effect |

### Surfaces

Surfaces separate by **tone**, not borders. No grey borders on cards. The streamer ribbon is the only repeated graphic motif.

### Form controls

Every form control is explicitly styled — no browser defaults:

- **Input/textarea**: 48px height, 16px radius, surface background, text colour, 1px border (border-soft), focus ring in accent.
- **Select**: custom chevron via SVG, 48px height, surface background.
- **Checkbox/radio**: custom SVG, 20px square/circle, accent fill when checked.
- **Button**: 48px height, 16px radius, label centred, one primary per surface.

## Components

Built once from tokens, used everywhere:

- **Button** — primary (accent fill), secondary (surface fill), ghost (text only). All 48px height.
- **Card** — surface background, 16px radius, no border, generous padding.
- **Streamer** — the signature ribbon: a tapered SVG/CSS shape in one of the three accent colours.
- **Nav** — open across the header, not boxed in. Logo + links + CTA, separated by space.
- **Stat** — large number + label, accent colour for the number.
- **Tag** — pill (9999px radius), surface background, small text.
- **Table** — surface rows, no vertical borders, hover surface-2.

## Layout

- Editorial composition: asymmetric grids, generous whitespace, strong type hierarchy.
- Hero: full-bleed (100vw × 100svh), one large image, bold headline, no scroll cues.
- Sections: full-width bands, content centred and capped at 1280px.
- Responsive: stacks to single column on mobile, hides non-essential nav, never overflows.

## Naming

**Nobori** (幟) — one distinctive Japanese word for the carp streamers. Matches the theme's own culture (Kodomo no Hi is Japanese). Not an adjective, not a portmanteau, not stacked.

## Credits

- **Koinobori tradition** — Japanese folk culture, May 5th Children's Day
- **Editorial poster tradition** — Japanese graphic design (Ikkō Tanaka, Yusaku Kamekura era)
- **Low-poly art direction** — contemporary indie game aesthetic (Monument Valley, Alto's Adventure lineage)