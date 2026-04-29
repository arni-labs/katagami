# Katagami Design Principles

These principles govern how design language embodiments are created and evaluated. Every embodiment must follow all of these.

## Structural Identity — The Spec-to-Embodiment Bridge

Your spec sections ARE the structural blueprint. Before writing any HTML, review what you defined:

1. **Philosophy -> visual_character**: You listed 3-5 concrete visual traits. EVERY ONE must manifest in the CSS. If you wrote "thick 4px solid borders on all containers," then every card, panel, dialog gets `border: 4px solid`. If you wrote "oversized negative space," your padding/gap values must be dramatically larger than a typical UI.

2. **Tokens -> surfaces, borders, motion**: These define the tactile quality. Glass treatment -> use `backdrop-filter: blur()` and semi-transparent backgrounds. Paper texture -> use subtle `background-image` patterns. Heavy borders -> make them a dominant visual element, not an afterthought.

3. **Rules -> signature_patterns**: These are your CSS fingerprint — the 3-5 techniques that ONLY this language uses. Every single signature_pattern MUST appear in the embodiment. If you wrote "angled corners via clip-path," apply `clip-path` to cards and panels. If you wrote "decorative double-underline on section headers," every `h2`/`h3` gets that treatment.

4. **Self-check before finishing**: If you could swap this embodiment's color palette for another language's palette and it would still look like the other language, your structure is too generic. The SHAPES, BORDER TREATMENTS, SPACING RHYTHM, DECORATIVE PATTERNS, and TYPOGRAPHIC HIERARCHY must be unmistakably this language.

## Scene-First Design (Mandatory)

Design a plausible application screen where all required UI elements appear NATURALLY within the scene. Do NOT create a component catalog or inventory organized by section labels.

- Imagine a real app this design language would power. **Vary the scene type across the library** — don't make every embodiment an editorial dashboard. Consider:
  - Editorial/publishing workspace
  - Project management or task board
  - Chat or messaging interface
  - Media browser or gallery
  - Commerce/checkout flow
  - Data visualization or analytics console
  - Reading or writing tool
  - Calendar or scheduling app
  - Music/audio player interface
  - Developer tools or terminal
- Buttons exist because the scene has actions. Tables exist because the scene shows data. Forms exist because the scene has input.
- Components earn their place through the scene's narrative, not a completeness checklist.

**BAD**: Sections labeled "Buttons", "Inputs", "Cards", "Tables" with components lined up for display.
**GOOD**: A "Library Overview" dashboard where KPIs, a chart, a data table, a form, alerts, and a modal all serve the editorial workflow.
**ALSO GOOD**: A music streaming interface where cards show albums, a player bar has controls, tabs switch genres, and a modal shows track details.

## Typography Is Identity (Mandatory — 50% of the Design)

Typography defines the language more than color or layout. **A good font choice does 50% of the work.**

- **Letter-spacing: `-0.02em` on ALL text.** This is mandatory. Negative letter-spacing is the single biggest anti-slop fix. Apply to headings, body, UI labels — everything.
- **Use Google Fonts** via `<link>` tags. Include `rel="preconnect"` for performance.
- **Choose fonts that embody the philosophy.** You have full freedom to pick ANY Google Font that fits the design direction. Swiss demands a mechanical neo-grotesk. Art Deco demands a geometric display face + high-contrast serif. Japanese-inspired might use Noto Sans JP or Zen Kaku Gothic. Retro Computing demands a pixel/monospace face. Editorial might use a humanist sans or a transitional serif.
- **Blocked fonts (LLM defaults).** Do NOT use Poppins, DM Sans, Roboto, Montserrat, or Space Grotesk — these are AI-generated-design tells that make everything look the same.
- **Two languages must never share a heading OR body typeface.** Each language's display font AND body font must be unique across the library. Before choosing, check what existing languages already use.
- **Define 2-3 font roles**: display (headlines/poster), body (UI text/paragraphs), data (monospace/tabular).
- **Mono fonts need variety too.** Don't default to IBM Plex Mono for everything. Consider JetBrains Mono, Fira Code, Source Code Pro, Space Mono, Inconsolata, DM Mono, or any other monospace font that fits the language's personality.
- **Use variable fonts** when available.

## Color Discipline (Mandatory)

Color choices define the mood. You have full freedom to choose backgrounds, surfaces, and palettes — but they must be intentional, not accidental.

- **Background diversity is encouraged.** Pure white, off-white, warm cream, deep navy, charcoal, kraft brown, midnight black — choose what fits the language's philosophy. A Japanese wabi-sabi language might use warm paper tones. A terminal aesthetic might use dark backgrounds. An editorial language might use pure white. Don't default to the same background for every language.
- **Text contrast must meet WCAG AA** (4.5:1 for body text, 3:1 for large text). Whatever palette you choose, readability is non-negotiable.
- **Avoid muddy, unclear palettes.** Every color should have a purpose: primary action, secondary action, accent/highlight, text, muted, borders, feedback states (error/success/warning/info).
- **Don't go rainbow.** Restrain yourself to a coherent palette — typically 1-2 accent colors plus neutrals. A focused palette reads as intentional; too many colors reads as chaos.
- **No default grey-on-white blandness.** If your design looks like an unstyled template with a grey border, you haven't made enough color decisions.

## Gradients — Use with Care

- **Bad gradients look dated and crypto.** Gradient buttons, gradient text, and rainbow gradient backgrounds are almost always wrong.
- **Good gradients serve the philosophy.** A warm editorial glow, a subtle depth effect, a dramatic dark-mode atmosphere — these can work when executed with restraint (subtle angle, close hues).
- **Off-viewport blobs are a great alternative** for ambient color presence:
  ```css
  .accent-blob {
    position: absolute;
    top: -50%;
    right: -30%;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: var(--accent);
    filter: blur(120px);
    opacity: 0.15;
    pointer-events: none;
    z-index: 0;
  }
  ```
- **The test:** Does the gradient add atmosphere and depth, or does it look like a Figma tutorial? If the latter, remove it.

## Border Radius — Strict Scale (Mandatory)

- `0px` — serious, editorial, brutalist
- `16px` — standard cards and boxes
- `24px` — maximum for large containers
- `9999px` — fully rounded for pills, avatars, tags, small buttons
- **NEVER use values between 24px and 9999px** (no 32px, 48px, 64px)
- **NEVER mix random values** within one language (no 8px here, 12px there, 20px elsewhere)
- Pick ONE radius from {0, 16, 24} as your primary and use it consistently across all containers

## Responsive Design (Mandatory)

Every embodiment must work from desktop (1440px) down to phone (375px). **Agents MUST visually verify all three viewports using Playwright screenshots in the sandbox.**

- **Three breakpoints minimum**: ~1024px (tablet landscape), ~768px (tablet portrait), ~480px (phone).
- **NEVER use inline `style` attributes for grid or flex layouts.** Inline styles override media queries and break responsiveness. ALL layout declarations must be in CSS classes.
- Inline styles are ONLY acceptable for non-layout properties: colors, small margins, padding.
- Grid columns must reduce: 12->8->4->1 or similar progression.
- Section layouts must reflow: side-by-side on desktop -> stacked on mobile.
- Tables must scroll horizontally on small viewports (wrap in `overflow-x:auto`).
- Buttons must stack full-width on phone.
- Typography must scale via `clamp()`.

### Visual Verification Viewports

| Viewport | Width | Height | Key checks |
|----------|-------|--------|------------|
| Desktop  | 1440px | 900px | Full layout, all elements visible, design identity |
| Tablet   | 768px  | 1024px | Reflow, touch targets, readability |
| Mobile   | 375px  | 812px | Single column, no overflow, stacked buttons |

## CSS Reset Requirements

Every embodiment MUST include:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
select, input, textarea, button { appearance: none; -webkit-appearance: none; font: inherit; color: inherit; border: none; background: none; outline: none; }
```

Then style every form element explicitly. No browser defaults should be visible.

## Required UI Elements

Each embodiment must include AT LEAST these 15 elements: buttons (primary, secondary, disabled), text input, select, checkbox, radio, toggle, card, modal/dialog, alert/toast, table, tabs, badges, avatar, pagination, accordion, progress bar.

You may include MORE elements beyond the 15 if the scene calls for them — charts, sliders, breadcrumbs, tooltips, steppers, color pickers, calendars, etc. The 15 are the minimum, not the ceiling.

## File Format

Each embodiment is a single, self-contained HTML file:
- All CSS embedded in a `<style>` block within the `<head>`.
- CSS class names prefixed per language (e.g., `.nk-*`, `.kp-*`) to avoid collisions.
- Google Fonts loaded via `<link>` tags in the `<head>` with `rel="preconnect"`.
- Responsive media queries for desktop, tablet, and mobile breakpoints.
- Interactive states via CSS pseudo-classes (`:hover`, `:focus`, `:disabled`, `:checked`).
- Vanilla JavaScript only — for interactive behaviors like tabs, modals, accordions, toggles. No frameworks.
- Must be visually validated via Playwright screenshots at 3 viewports (desktop 1440px, tablet 768px, mobile 375px) in the sandbox before publishing.

## Token Structure Reference

Each design language's tokens must include:
- **colors**: primary, secondary, accent, background, surface, text, muted, border, error, success, warning, info
- **typography**: heading_font, body_font, mono_font, base_size, scale_ratio, line_height, letter_spacing (`-0.02em` default), google_fonts_url
- **spacing**: base unit (typically 4 or 8px), scale array
- **radii**: none (0px), md (16px), lg (24px), full (9999px) — NO values between 24px and 9999px
- **shadows**: sm, md, lg (with color, offset, blur)
- **surfaces**: treatment (flat, glass, gradient, noise, paper), card_style, bg_pattern
- **borders**: default_width, accent_width, style, character
- **motion**: duration, easing, philosophy (snappy, elastic, deliberate, none)
- **responsive**: breakpoints array, column_progression
