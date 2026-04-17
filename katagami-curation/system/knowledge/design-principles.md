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

- Imagine a real app this design language would power: an editorial dashboard, a project management board, a design tool workspace, an analytics console, a content editor.
- Buttons exist because the scene has actions. Tables exist because the scene shows data. Forms exist because the scene has input.
- Components earn their place through the scene's narrative, not a completeness checklist.

**BAD**: Sections labeled "Buttons", "Inputs", "Cards", "Tables" with components lined up for display.
**GOOD**: A "Library Overview" dashboard where KPIs, a chart, a data table, a form, alerts, and a modal all serve the editorial workflow.

## Typography Is Identity (Mandatory)

Typography defines the language more than color or layout.

- **Use Google Fonts** via `<link>` tags. Include `rel="preconnect"` for performance.
- **Choose fonts that embody the philosophy.** Swiss demands a mechanical neo-grotesk. Art Deco demands a geometric display face + high-contrast serif. Retro Computing demands a pixel/monospace face.
- **No LLM defaults.** Do NOT use Inter, Space Grotesk, Poppins, DM Sans, Roboto, or Montserrat unless genuinely the best choice AND you can justify why.
- **Two languages must never share a primary typeface.** Each language's display font must be unique across the library.
- **Define 2-3 font roles**: display (headlines/poster), body (UI text/paragraphs), data (monospace/tabular).
- **Use variable fonts** when available.

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

Each embodiment must include these 15 elements: buttons (primary, secondary, disabled), text input, select, checkbox, radio, toggle, card, modal/dialog, alert/toast, table, tabs, badges, avatar, pagination, accordion, progress bar.

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
- **typography**: heading_font, body_font, mono_font, base_size, scale_ratio, line_height, letter_spacing, google_fonts_url
- **spacing**: base unit (typically 4 or 8px), scale array
- **radii**: none, sm, md, lg, full
- **shadows**: sm, md, lg (with color, offset, blur)
- **surfaces**: treatment (flat, glass, gradient, noise, paper), card_style, bg_pattern
- **borders**: default_width, accent_width, style, character
- **motion**: duration, easing, philosophy (snappy, elastic, deliberate, none)
- **responsive**: breakpoints array, column_progression
