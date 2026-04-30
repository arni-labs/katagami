# Katagami Design Principles

A design language is a complete visual identity. It should feel like it was created by a specific designer with a specific point of view — not generated from a template. These principles guide that work.

## Taste

The difference between good and generic design is intentionality. Every choice — typeface, color, spacing, border treatment, surface texture — should trace back to the language's philosophy. If you can't explain why you chose something, you chose it by default, and defaults produce forgettable work.

Study real design systems, editorial layouts, product interfaces, print design, and architecture before making choices. The best design languages feel like they belong to a tradition — a lineage of visual thinking — not like they emerged from a prompt.

## Uniqueness Across the Library

Each language must be unmistakably itself. Before designing, check what already exists in the library. If your choices overlap with an existing language's typefaces, palette, surface treatment, or structural patterns, change direction.

The **swap test**: if you replaced this language's color palette with another's and it still looked right, the structure is too generic. Identity lives in shapes, spacing rhythm, border treatments, typographic hierarchy, and decorative patterns — not just color.

## Typography

Type is the primary carrier of identity — it does more work than color or layout. Approach it as a typographer would:

- **Hierarchy**: Establish clear roles — display, body, data/mono — and use contrast between them (scale, weight, width, case) to create visual rhythm.
- **Personality**: The typeface should embody the philosophy. A humanist serif says something different from a geometric sans, a slab, or a compressed grotesque. Choose with intention.
- **Craft**: Tight letter-spacing (`-0.02em`) on all text. Considered line-height. Proper optical sizing. These details separate professional typography from defaults.
- **Originality**: No two languages in the library should share a heading or body typeface. Each language's type palette should be its own.
- **Avoid AI tells**: A handful of typefaces appear in virtually all AI-generated design. Using them signals "this was not designed." Avoid Poppins, DM Sans, Roboto, Montserrat, and Space Grotesk.
- Use **Google Fonts** via `<link>` tags with `rel="preconnect"`.

## Color

Color sets mood, establishes hierarchy, and creates emotional resonance. Approach it with the discipline of color theory:

- **Intention over defaults.** Every color should have a reason. Background, surface, text, accent, muted, border, feedback states — each plays a role in the visual system.
- **Palette diversity across the library.** The library should contain languages with light backgrounds, dark backgrounds, warm palettes, cool palettes, high-contrast and low-contrast approaches. Don't converge on one look.
- **Harmony.** A focused palette (1-3 accent colors plus neutrals) reads as intentional. Too many colors reads as chaos.
- **Contrast.** Text must be readable. Meet WCAG AA: 4.5:1 for body text, 3:1 for large text.
- **Temperature.** Warm whites, cool grays, tinted blacks — these micro-decisions carry a lot of emotional weight. Use them.

## Structure & Surface

The physical quality of a design — how elements feel on screen — comes from borders, shadows, radii, surfaces, and spacing.

- **Border radius scale**: `0px` (sharp/editorial), `16px` (standard), `24px` (soft containers), `9999px` (pills/avatars). Pick one primary radius and use it consistently. Don't mix arbitrary values.
- **Surfaces**: flat, glass, paper, noise, textured — choose what fits the philosophy and commit to it.
- **Borders**: weight, style, and character are identity markers. Hairline rules feel different from heavy 4px solids.
- **Shadows**: restraint. One or two levels used consistently beats five levels used randomly.
- **Motion**: snappy, elastic, deliberate, or none — the animation philosophy should match the language's personality.

## Scene-First Embodiment

The embodiment is a plausible application screen, not a component catalog. UI elements appear because the scene's narrative demands them — buttons exist for actions, tables exist for data, forms exist for input.

Vary scene types across the library: editorial workspace, messaging app, media browser, commerce flow, data visualization, developer tools, reading experience, scheduling interface. Different languages should feel like they power different kinds of software.

Each embodiment must include at least 15 UI elements: buttons (primary/secondary/disabled), text input, select, checkbox, radio, toggle, card, modal/dialog, alert/toast, table, tabs, badges, avatar, pagination, accordion, progress bar. More elements are welcome if the scene calls for them.

## Structural Identity

Your spec sections are the structural blueprint. Before writing HTML:

1. **Philosophy → visual_character**: 3-5 concrete visual traits. Every one must manifest in the CSS.
2. **Tokens → surfaces, borders, motion**: The tactile quality. These must be actively used, not just declared.
3. **Rules → signature_patterns**: 3-5 CSS techniques unique to this language. Every one must appear in the embodiment.
4. **Self-check**: Would this embodiment be recognizable with a different color palette? If not, the structure is too generic.

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
