# Katagami Design Principles

A design language is a complete visual identity. It should feel like it was created by a specific designer with a specific point of view — not generated from a template. These principles guide that work.

## Restraint as Identity

The single strongest signal separating authored design from AI output is **what is absent**. Vercel's system is defined by exclusion: no gradients, no illustrations, no decorative color, no shadows, no border-radius on marketing pages. Linear achieves distinction through near-black backgrounds, a single blue accent, and obsessive typography. Every premium design system achieves identity through a deliberately narrow set of decisions applied with absolute consistency.

AI does the opposite: it adds elements to fill space. More colors, more shadows, more rounded corners, more visual variety. The result has everything and says nothing.

**For every visual property, ask: can I remove this entirely?** If the design survives without it, cut it. Identity comes from the specific combination of constraints, not from the accumulation of features.

## Taste

The difference between good and generic design is intentionality. Every choice — typeface, color, spacing, border treatment, surface texture — should trace back to the language's philosophy. If you can't explain why you chose something, you chose it by default, and defaults produce forgettable work.

Study real design systems before making choices. Reference anchors:
- **Linear** — restraint, near-black backgrounds, single accent, branded easing curves
- **Vercel** — pure black/white, Geist typography, `-0.04em` display tracking, surgical blue
- **Stripe** — constrained blue palette, typographic precision, generous whitespace
- **Notion** — warm neutrals, functional simplicity, no decorative elements
- **Arc** — bold color commitment, distinctive shapes, personality through structure

The best design languages feel like they belong to a tradition of visual thinking, not like they emerged from a prompt.

## Uniqueness Across the Library

Each language must be unmistakably itself. Before designing, check what already exists in the library. If your choices overlap with an existing language's typefaces, palette, surface treatment, or structural patterns, change direction.

The **swap test**: if you replaced this language's color palette with another's and it still looked right, the structure is too generic. Identity lives in shapes, spacing rhythm, border treatments, typographic hierarchy, and decorative patterns — not just color.

## Typography

Type is the primary carrier of identity — it does more work than color or layout. Approach it as a typographer would:

- **Hierarchy through contrast**: Not just size steps. Create three distinct "voices" using combinations of weight, case, spacing, color, and width. Display type should feel dramatically different from body text — not just bigger.
- **Personality**: The typeface should embody the philosophy. A humanist serif says something different from a geometric sans, a slab, or a compressed grotesque. The font choice should be arguable — if no one would disagree with it, it's too safe.
- **Tracking**: `-0.02em` on body text. `-0.03em` to `-0.04em` on display headlines. Default tracking is the single biggest "template" tell.
- **Leading**: Display headlines at `line-height: 1.1–1.2`. Body text at `1.5–1.6`. Never use the same line-height for both — that's the AI default.
- **Body size**: `15–16px`, not `14px`. Generous but not wasteful.
- **Originality**: No two languages in the library should share a heading or body typeface.
- **Banned AI-tell fonts**: Poppins, DM Sans, Roboto, Montserrat, Space Grotesk, Figtree, Outfit, Plus Jakarta Sans. These appear in virtually all AI-generated design. Using them signals "this was not designed."
- Use **Google Fonts** via `<link>` tags with `rel="preconnect"`.

## Color

Color sets mood, establishes hierarchy, and creates emotional resonance. Approach it with the discipline of a painter, not a palette generator.

- **Desaturate.** Real palettes mix hues with grey, brown, or blue. Pure-saturation accents (S > 80% in HSL) read as synthetic. Compare: Stripe's muted blue vs. a raw `#0066FF`. The grey-mixed version feels considered; the pure version feels generated.
- **Fewer colors.** One background, one text, one accent used surgically. Two accent colors maximum. If you need a third, something is wrong with your hierarchy.
- **Near-invisible borders.** Borders should be white or black at 6–10% opacity, not solid grey lines like `#D8E0E8`. This alone kills the SaaS template look.
- **Temperature.** Warm whites, cool grays, tinted blacks — these micro-decisions carry emotional weight. `#FAFAF9` feels different from `#F8FAFC`. Choose with intention.
- **No synthetic palettes.** If your accent colors are evenly spaced on the hue wheel (cyan + coral + mint), the palette looks generated. Real palettes cluster around a temperature with one deliberate contrast.
- **Palette diversity across the library.** Light backgrounds, dark backgrounds, warm palettes, cool palettes, high-contrast and low-contrast. Don't converge.
- **Contrast.** Meet WCAG AA: 4.5:1 for body text, 3:1 for large text.

## Spacing & Rhythm

Spacing creates the emotional tone of a design. Uniform spacing feels mechanical. Authored spacing feels musical.

- **Dramatic range.** The ratio between tightest gap and largest gap must be at least 8:1. If your smallest gap is `8px`, your largest must be `64px` or more. AI defaults to medium spacing (24–32px) uniformly — this is the "emotionally cold" pattern.
- **Grouping through proximity.** Related elements at `4–12px`. Unrelated groups at `48–96px`. The contrast between tight clusters and generous separations creates visual hierarchy without borders or dividers.
- **Inner vs. outer.** Padding inside containers must differ from margins between them. `24px` inner padding with `48px` outer gaps creates hierarchy. `32px` everywhere destroys it.
- **Section breathing.** Vary vertical spacing between sections dramatically: `96–128px` for breathing room in key moments, `24–32px` where content is dense. A page where every section has the same vertical weight feels generated.

## Composition & Asymmetry

Symmetric, equal-weight layouts are the strongest AI tell after uniform spacing. Real design creates visual tension through deliberate imbalance.

- **Break the equal-cards pattern.** If showing three items, make one dominant — 2x width, featured treatment, or different layout. Three same-sized cards in a row is the universal AI layout.
- **Asymmetric splits.** Text at 60% width with 40% negative space. Full-bleed images next to tight text columns. Not everything needs to be centered or horizontally balanced.
- **Vary visual weight per section.** A dense data table next to a spacious hero card. A compressed navigation rail next to a generous workspace. Contrast in density creates rhythm.
- **At least one compositional break.** Every embodiment needs at least one moment that breaks the dominant grid — a full-bleed element, an oversized heading, an inset panel, a sidebar that shifts width.

## Structure & Surface

The physical quality of a design — how elements feel on screen — comes from borders, shadows, radii, surfaces, and spacing.

- **Border radius commitment.** Pick ONE primary radius and commit. Editorial: all `0px`. Soft product: all `24px`. Pill UI: all `9999px`. **Never mix `16px` and `24px` in the same language** — this reads as indecisive. The allowed scale is `0px`, `16px`, `24px`, `9999px`, but a language should use at most two of these (one for containers, one for pills or none).
- **Surfaces**: flat, glass, paper, noise, textured — choose what fits the philosophy and commit to it.
- **Borders**: weight, style, and character are identity markers. Hairline rules feel different from heavy 4px solids. Consider dashed, dotted, or double borders for distinctiveness.
- **Shadows**: restraint. One or two levels used consistently beats five levels used randomly. Consider no shadows at all — many strong design systems use borders instead.
- **No one-sided accent borders on rounded elements.** A `border-left: 3px solid var(--accent)` on a card or button with `border-radius` creates an ugly crescent that wraps around the corners. This is one of the most common AI design tells. If you need an accent indicator, use a separate inset `::before` pseudo-element with its own sharp geometry, or use a full border, or use a flat-edged (`border-radius: 0`) container. Never combine one-sided colored borders with rounded corners.
- **Motion**: snappy, elastic, deliberate, or none — the animation philosophy should match the language's personality. Hover states should transform, not just fade. Scale, color shift, border appearance — something with intention.

## Signature Element

Every language must have one visual "signature" — a distinctive pattern, shape, motif, or structural treatment that would survive a palette swap and could not have come from a different prompt. Examples:

- A characteristic border treatment (double-line headers, left-accent bars, notched corners)
- A recurring shape motif (diagonal slashes, circle crops, hexagonal badges)
- An unusual grid pattern (overlapping columns, newspaper-style multi-column text, masonry)
- A distinctive surface texture (paper grain, halftone dots, scanline overlay)
- A typographic device (extreme size contrast, rotated labels, letterspaced uppercase micro-text)

If you cannot name the signature in one sentence, the language lacks structural identity.

## Scene-First Embodiment

The embodiment is a plausible application screen for a **specific fictional product**, not a generic dashboard.

**Banned scenes** (too generic): SaaS analytics dashboards, CRM account views, generic project management boards, "Flowbase" / "Acme" / "Dashboard" placeholder products.

**Required**: Name a specific fictional product with a specific purpose. Examples: a vinyl record cataloging app, a legal case timeline tool, a plant watering scheduler, a film festival submission portal, a recipe scaling calculator, a yacht charter booking system. The specificity forces the scene to have real content and real information hierarchy.

Vary scene types across the library: editorial workspace, messaging thread, media browser, commerce flow, data visualization, developer tool, reading experience, scheduling interface.

Each embodiment must include at least 15 UI elements: buttons (primary/secondary/disabled), text input, select, checkbox, radio, toggle, card, modal/dialog, alert/toast, table, tabs, badges, avatar, pagination, accordion, progress bar.

## Structural Identity

Your spec sections are the structural blueprint. Before writing HTML:

1. **Philosophy → visual_character**: 3–5 concrete visual traits. Every one must manifest in the CSS.
2. **Tokens → surfaces, borders, motion**: The tactile quality. These must be actively used, not just declared.
3. **Rules → signature_patterns**: 3–5 CSS techniques unique to this language. Every one must appear in the embodiment.
4. **Self-check**: Would this embodiment be recognizable with a different color palette? If not, the structure is too generic — go back and add structural identity.

## Technical Requirements

**Responsive**: Every embodiment works from 1440px desktop to 375px mobile. Three breakpoints minimum. All layout in CSS classes (never inline styles for grid/flex). Verify all three viewports via Playwright screenshots.

**CSS reset**: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }` plus explicit form element styling. No browser defaults visible.

**File format**: Single self-contained HTML file. CSS in `<style>`, Google Fonts via `<link>`, responsive media queries, CSS pseudo-class interactive states, vanilla JS only for behavior (tabs, modals, accordions).

## Token Structure

Each language's tokens must include:
- **colors**: primary, secondary, accent, background, surface, text, muted, border, error, success, warning, info
- **typography**: heading_font, body_font, mono_font, base_size, scale_ratio, line_height, letter_spacing, google_fonts_url
- **spacing**: base unit, scale array
- **radii**: none, sm, md, lg, full
- **shadows**: sm, md, lg
- **surfaces**: treatment, card_style, bg_pattern
- **borders**: default_width, accent_width, style, character
- **motion**: duration, easing, philosophy
