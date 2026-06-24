# Kogyo — Design Language

> *子魚 (kogyo) — "child fish." The young carp that swims against the current.*

A design language for **Kodomo no Hi** (Children's Day, May 5th) — the Japanese festival of carp streamers. Built around the carp's courage, the family's vertical hierarchy of streamers, and the warmth of washi paper under spring wind.

---

## 1. Philosophy & Point of View

Kogyo is a language of **vertical celebration**. The carp swims upstream; the streamer rises into wind; the family stands tall together. Five colors. Five roles. One ascent.

- **Verticality is the dominant axis.** Layout, type, and rhythm all breathe upward. Sidebars and content are tall and columnar; spacing rewards scroll; long hero imagery hangs from the top.
- **Five signature colors, not a rainbow.** The five traditional koinobori colors carry meaning: *mago* (grandfather, indigo-black), *chichi* (father, vermilion-red), *haha* (mother, deep teal), *kodomo-midori* (first child, spring green), *kodomo-yellow* (younger child, mustard-gold). They are siblings, not a gradient.
- **Washi warmth.** Off-white surfaces like aged paper. Subtle fiber texture — never glossy, never glass. The product feels printed and held, not projected.
- **Bold display, calm body.** A confident display serif/sans contrast announces meaning; body text is generous, calm, and never competes.
- **The carp's eye is the focus ring.** A vivid indigo dot rings interactive elements — visible, not subtle.

This is **not** a generic pastel festival UI. It is a confident, paper-textured system with five deliberate accent colors and a strong vertical backbone.

---

## 2. Tokens

### 2.1 Color

Five **role colors** (the five koinobori). Use them deliberately, like role tags — never as a gradient.

| Token            | Hex       | Role                                           |
|------------------|-----------|------------------------------------------------|
| `--c-mago`       | `#1B1F3A` | Grandfather / authority / primary text         |
| `--c-chichi`     | `#D63A2F` | Father / primary action / festival energy      |
| `--c-haha`       | `#1F6F7A` | Mother / secondary action / trust              |
| `--c-kodomo-a`   | `#3FA552` | First child / success / growth                 |
| `--c-kodomo-b`   | `#E0A82E` | Younger child / highlight / warmth             |

Five **neutrals** (paper, ink, shadow, fiber, sky).

| Token            | Hex       | Role                                           |
|------------------|-----------|------------------------------------------------|
| `--c-paper`      | `#FAF6EC` | Page background (aged washi)                   |
| `--c-paper-2`    | `#F2EBD9` | Surface / card background                      |
| `--c-fiber`      | `#E5DCC2` | Subtle dividers, table stripes, hairline rules |
| `--c-ink`        | `#16140F` | Body text                                      |
| `--c-ink-soft`   | `#5A5448` | Secondary text                                 |

Two **sky** tones for hero backgrounds and banner gradients.

| Token            | Hex       | Role                                           |
|------------------|-----------|------------------------------------------------|
| `--c-sky-top`    | `#9EC9E0` | Upper sky wash                                 |
| `--c-sky-bot`    | `#F4D6B8` | Lower sunset/warm wash                         |

**Semantic colors** (kept small, never primary):

| Token            | Hex       | Role                                           |
|------------------|-----------|------------------------------------------------|
| `--c-danger`     | `#B73029` | Destructive / error                            |
| `--c-warning`    | `#C8841F` | Caution / pending                              |
| `--c-info`       | `#1F6F7A` | Informational (reuses `--c-haha`)              |

**Contrast discipline.** All body text is `--c-ink` on `--c-paper` (contrast ratio ≈ 16:1) or `--c-ink` on `--c-paper-2` (≈ 13:1). Never put `--c-paper` text on `--c-paper-2` or light-on-light. Never put `--c-ink-soft` smaller than 14px.

### 2.2 Typography

Two type families. **No third.**

- **Display:** *Fraunces* — a contemporary serif with high contrast and warm personality. Used for headlines, hero, and large numerics. Letterspacing `-0.02em` on sizes ≥ 32px.
- **Body / UI:** *Inter* — neutral, screen-tuned sans for body, labels, buttons, inputs. Letterspacing `0` for UI, `-0.01em` on sizes 18–22px.

| Token          | Size  | Line-height | Use                                 |
|----------------|-------|-------------|-------------------------------------|
| `t-display-xl` | 88px  | 1.02        | Hero headline (max 2 lines)         |
| `t-display-lg` | 56px  | 1.05        | Section openers                     |
| `t-display-md` | 40px  | 1.12        | Sub-headlines                       |
| `t-h1`         | 32px  | 1.18        | Page titles                         |
| `t-h2`         | 24px  | 1.28        | Card titles                         |
| `t-h3`         | 20px  | 1.36        | Section labels                      |
| `t-body-lg`    | 18px  | 1.55        | Lead paragraphs                     |
| `t-body`       | 17px  | 1.55        | Standard body                       |
| `t-body-sm`    | 15px  | 1.5         | Helper text, captions               |
| `t-ui`         | 16px  | 1.4         | Buttons, inputs, labels             |
| `t-ui-sm`      | 14.5px| 1.4         | Table rows, dense UI                |
| `t-mono-sm`    | 13px  | 1.4         | Code, IDs (monospace fallback)      |

Body never below 17px on landing. Table rows 14.5px+. Tracking on display headlines: `-0.02em`.

### 2.3 Spacing

A 4px base, with named semantic steps. Vertical rhythm on the page is **8px multiples**; horizontal rhythm inside cards is **8px multiples**.

| Token      | Value  |
|------------|--------|
| `s-1`      | 4px    |
| `s-2`      | 8px    |
| `s-3`      | 12px   |
| `s-4`      | 16px   |
| `s-5`      | 24px   |
| `s-6`      | 32px   |
| `s-7`      | 48px   |
| `s-8`      | 64px   |
| `s-9`      | 96px   |
| `s-10`     | 128px  |

Page section vertical rhythm: `s-9` (96px) top and bottom on landing; `s-8` (64px) on dashboard. Card internal padding: `s-5` (24px). Field gaps: `s-3` (12px). Title-to-content gap: `s-5` (24px) minimum — titles never stick to container tops.

### 2.4 Radius

Only three radii. Sharp or soft, never in between.

| Token      | Value  | Use                                  |
|------------|--------|--------------------------------------|
| `r-0`      | 0px    | Coin-style hard-edged tiles, banners |
| `r-2`      | 16px   | **Default** — cards, buttons, inputs |
| `r-pill`   | 9999px | Pills, tags, round avatars           |

Never `4px`. Never `8px`. Never `12px`. Either sharp, soft-16, or full-pill.

### 2.5 Elevation

Washi paper does not float — it lies. So elevation is small and warm.

| Token      | Value                                       | Use                          |
|------------|---------------------------------------------|------------------------------|
| `e-flat`   | `none`                                      | Default                      |
| `e-paper`  | `0 1px 0 rgba(22,20,15,0.06), 0 6px 24px -16px rgba(22,20,15,0.10)` | Cards, popovers   |
| `e-lift`   | `0 2px 0 rgba(22,20,15,0.08), 0 18px 48px -20px rgba(22,20,15,0.18)` | Modals, menus    |

Shadows are warm-brown tinted, not neutral grey.

### 2.6 Control Height (the one shared token)

**Every interactive control sits on `--h-control: 44px`.** Buttons, inputs, selects, segmented controls, search fields — all 44px tall. Pills and tags can be 32px (`--h-pill`). This is non-negotiable.

### 2.7 Motion

| Token           | Value     | Use                            |
|-----------------|-----------|--------------------------------|
| `m-fast`        | 120ms     | Hover color/border transitions |
| `m-base`        | 200ms     | Press, focus ring appearance   |
| `m-slow`        | 360ms     | Drawer, modal open             |
| `ease-ko`       | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Standard ease (gentle settle)  |

All motion respects `prefers-reduced-motion`. No parallax. No scroll-jacking.

---

## 3. Components

All components are built from the tokens above. All interactive states are mandatory.

### 3.1 Button

```
height: var(--h-control);  /* 44px */
padding: 0 var(--s-5);
radius: var(--r-2);        /* 16px */
font: 600 var(--t-ui)/1 Inter;
letter-spacing: 0;
transition: background var(--m-fast), box-shadow var(--m-base), transform var(--m-fast);
```

| Variant   | Background          | Text          | Border                    | Use                          |
|-----------|---------------------|---------------|---------------------------|------------------------------|
| Primary   | `--c-chichi`        | `--c-paper`   | none                      | Default CTA                   |
| Secondary | `--c-mago`          | `--c-paper`   | none                      | Authority actions             |
| Soft      | `--c-paper-2`       | `--c-ink`     | 1px `--c-fiber`           | Tertiary, less prominent      |
| Ghost     | transparent         | `--c-ink`     | 1px `--c-ink` (16% alpha) | Lowest emphasis               |

**States** (apply to all variants):

- **Default** — base styles above.
- **Hover** — background darkens by 6% (use a `color-mix` or a darker shade), `e-paper` shadow appears. Cursor pointer.
- **Focus** — visible 3px ring: `0 0 0 3px var(--c-mago)` (the carp-eye indigo) at 35% opacity via `color-mix(in srgb, var(--c-mago) 35%, transparent)`. Never remove the ring.
- **Active (pressed)** — translateY(1px), shadow flattens to `e-flat`. Background darkens by 10%.
- **Disabled** — background `--c-fiber`, text `--c-ink-soft`, cursor not-allowed, no hover/focus effects, no shadow.

Icon-only buttons: 44×44, square, icon centered in 20×20 box.

### 3.2 Input (text / email / number / textarea)

```
height: var(--h-control);  /* 44px; textarea grows with min 96px */
padding: 0 var(--s-4);
radius: var(--r-2);
background: var(--c-paper);
border: 1.5px solid var(--c-fiber);
font: 400 var(--t-ui)/1 Inter;
color: var(--c-ink);
```

**States**:

- **Default** — fiber border, paper background.
- **Hover** — border darkens to `color-mix(in srgb, var(--c-mago) 30%, var(--c-fiber))`.
- **Focus** — border becomes `var(--c-mago)`, visible 3px ring (`color-mix(in srgb, var(--c-mago) 35%, transparent)`), no layout shift.
- **Invalid** — border `var(--c-danger)`, ring `color-mix(in srgb, var(--c-danger) 30%, transparent)`. Helper text below in `--c-danger`.
- **Disabled** — background `--c-paper-2`, text `--c-ink-soft`, cursor not-allowed.

Labels: 14px semibold, `--c-ink`, `s-2` below to input. Helper: 13px `--c-ink-soft`, `s-2` below input. Required marker: `--c-chichi` asterisk.

### 3.3 Select (native & custom)

Native select gets the same shell as input (44px, 16px radius, fiber border). A 20×20 chevron sits flush right (`s-4` from edge). Custom select follows the same shell and opens a `e-paper` menu with 44px option rows, hover background `--c-paper-2`, selected option gets a 4px left bar in `--c-mago`.

### 3.4 Checkbox

44×44 hit area around a 20×20 box. Box has 6px inner radius (`r-2` family, scaled down to 6px — exception allowed for small controls to keep crispness). Border 1.5px `--c-fiber`.

- **Default** — empty box, fiber border.
- **Hover** — border darkens toward `--c-mago`.
- **Focus** — 3px ring `color-mix(in srgb, var(--c-mago) 35%, transparent)`.
- **Checked** — box fills `--c-mago`, white check (custom SVG inside the 20×20 box).
- **Disabled** — `--c-fiber` background, `--c-ink-soft` check.

### 3.5 Radio

20×20 outer circle. Inner dot 10×10 in `--c-mago` when checked. Same hover/focus/disabled pattern as checkbox.

### 3.6 Switch

44×24 (slightly wider than tall; sits within the 44px control hit area). Track 24px tall, 16px radius (`r-pill`). Knob 18×18. Off: track `--c-fiber`, knob `--c-paper`. On: track `--c-kodomo-a` (green, "active/growth"), knob `--c-paper`. Same hover/focus/disabled pattern; focus ring on the track.

### 3.7 Pill / Tag

32px tall. Padding `0 s-3`. Radius `r-pill`. Six semantic pills, each tied to one of the five role colors:

- Mago: bg `color-mix(in srgb, var(--c-mago) 12%, var(--c-paper))`, text `--c-mago`.
- Chichi: bg `color-mix(in srgb, var(--c-chichi) 12%, var(--c-paper))`, text `--c-chichi`.
- Haha: bg `color-mix(in srgb, var(--c-haha) 12%, var(--c-paper))`, text `--c-haha`.
- Kodomo-A: bg `color-mix(in srgb, var(--c-kodomo-a) 12%, var(--c-paper))`, text `#1F6F2C` (deeper green for legibility on light).
- Kodomo-B: bg `color-mix(in srgb, var(--c-kodomo-b) 18%, var(--c-paper))`, text `#7E5A0D` (deeper mustard for legibility on light).

### 3.8 Card

Background `--c-paper-2` or `--c-paper`. Radius `r-2` (16px). Padding `s-5` (24px). Shadow `e-paper` only when floating (e.g., popover); flat when on the page. Optional top accent stripe: 4px tall, full width, one of the five role colors — indicates the card's "role" in the family hierarchy.

### 3.9 Table

Header row: `--c-paper-2` background, 14.5px semibold `--c-ink`. Body rows: 14.5px `--c-ink`, alternating `--c-paper` and `--c-paper-2`. Row height 48px. Cell padding `s-3 s-4`. No vertical borders. Optional 1px bottom hairline `--c-fiber` on rows. Hover row: background `color-mix(in srgb, var(--c-mago) 4%, var(--c-paper))`.

### 3.10 Toast / Banner

Inline alert: full-width, `s-5` padding, `r-2` radius. Four tones (info/haha, success/kodomo-a, warning, danger). Left edge: 4px accent bar in tone color. Dismiss button on right.

---

## 4. Layout Guidance

### Landing

- **Single column, max 1200px content width.** Centered.
- **Hero is full-bleed.** Sky-wash background (`--c-sky-top` to `--c-sky-bot` vertical gradient). Hero image extends to viewport edges. Title sits at 88px display size, max-width 12 words, max 2 lines. CTA stack: primary + secondary buttons, 16px gap.
- **Vertical breathing.** Sections separated by `s-9` (96px) top and bottom.
- **Asymmetric feature blocks.** Alternate left-image / right-text and right-image / left-text across three features. Avoids grid monotony.
- **Card grid for "family roles":** 5 cards across desktop, 2 across tablet, 1 across mobile — each card is a role-color stripe + name + description.
- **Testimonial block** uses single quote, photo (circle, 56px), name, role, no decorative quote marks.
- **Final CTA** mirrors hero — same vertical gradient, same button styles, condensed headline.

### Dashboard

- **Left rail navigation.** 240px wide, paper-2 background, full height. Logo at top, role-color dot beside it. Nav items: 44px tall, 16px radius on hover/active, role-color left-bar on active.
- **Top bar.** 64px tall, sits flush right of the rail. Search field (44px), notifications, role pill, avatar.
- **Main column.** 32px padding around, `s-6` between sections.
- **Cards.** `e-paper` shadow, role-color top stripe (4px). 5-column stat row at top, 2-column wide-row below.
- **Tables** in main column. Cards wrap tables; tables fill card width.
- **Forms** (settings, new-event modals) live in a 560px-wide centered column inside a modal. Field stack with `s-4` gap.
- **Mobile.** Rail collapses to a top hamburger. Cards stack to 1 column. Table scrolls horizontally inside its card.

### Surfaces, separated by intent

- **Surface — Paper** (`--c-paper`): the page itself. Always the canvas.
- **Surface — Sheet** (`--c-paper-2`): cards, modals, nav, inputs.
- **Surface — Sky** (the sky-wash gradient): only the landing hero and final CTA.
- **Surface — Ink** (`--c-ink` background, `--c-paper` text): reserved for a single "key ritual" moment on the landing — a quote block or a closing manifesto. Never on the dashboard.

---

## 5. Form Controls — Recap

Every form control below has full default / hover / focus / active / disabled states, sits on `--h-control` (44px), and shows a visible focus ring.

| Control      | Height | Radius  | Accent (when active) |
|--------------|--------|---------|----------------------|
| Button       | 44     | r-2     | role color           |
| Input        | 44     | r-2     | border → `--c-mago`  |
| Select       | 44     | r-2     | border → `--c-mago`  |
| Checkbox     | 20×20 (44 hit) | 6 | fill `--c-mago` |
| Radio        | 20×20 (44 hit) | full | dot `--c-mago` |
| Switch       | 24 (44 hit) | r-pill | track `--c-kodomo-a` |
| Pill / Tag   | 32     | r-pill  | role color           |
| Search       | 44     | r-2     | border → `--c-mago`  |
| Textarea     | ≥ 96   | r-2     | border → `--c-mago`  |

Focus ring across the system: **3px `color-mix(in srgb, var(--c-mago) 35%, transparent)`**, offset 0, drawn around the control. Never removed.

---

## 6. Voice & Naming

- **Product name:** Kogyo (子魚 — child fish).
- **Tone:** warm, confident, family-shaped. No exclamation marks. No emoji.
- **Word choices:** "celebration," "family," "streamer," "ritual," "ascent." Avoid "platform," "solution," "leverage."
- **Buttons say verbs, not nouns.** "Plan the day." "Send the invitation." Not "Submit." Not "Continue."
