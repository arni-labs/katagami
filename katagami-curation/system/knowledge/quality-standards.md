# Katagami Quality Standards

Measurable thresholds for specs and embodiments. Design philosophy lives in `design-principles.md` — this file is about verification.

## Spec Section Minimums

- **Philosophy** (min 800 chars): `summary`, `values` (5-8), `anti_values` (3-5), `visual_character` (3-5 concrete structural traits, each >= 30 chars).
- **Tokens** (min 1200 chars): 12 named colors with hex values, full typography system, spacing scale (8+ values), radii, shadows with CSS values, surfaces, borders, motion. No placeholders.
- **Rules** (min 800 chars): `composition` (5-8 rules), `hierarchy` (4-6), `density`, `signature_patterns` (3-5 unique CSS techniques, each >= 30 chars).
- **Layout** (min 600 chars): `density` with rationale, `grid` with columns/gutter/max-width, `whitespace`, `responsive` breakpoints.
- **Guidance** (min 800 chars): `dos` (6-10), `donts` (6-10), `usage_context`, `accessibility`.

## DESIGN.md Quality Gate

- Every published language must have a generated DESIGN.md artifact.
- Must pass `npx @google/design.md lint` with zero errors and zero warnings.
- Katagami spec remains the source of truth. Repair source fields, then regenerate.
- The rich Katagami spec must not be flattened to only the DESIGN.md subset.

## Embodiment Quality Checks

**Structural Identity** — Every `visual_character` trait and `signature_pattern` must be visible. Surface/border/motion tokens actively used. Passes the swap test (recognizable without its color palette).

**Scene-First** — A plausible application screen. Sections labeled "Controls", "Feedback", "Data" = failure.

**Typography** — Clear hierarchy across 2-3 font roles. Heading and body typefaces unique across the library. Letter-spacing `-0.02em`. No AI-tell fonts.

**Color** — Intentional palette with clear purpose for each color. WCAG AA contrast. Palette diversity across the library.

**Responsiveness** — 3 breakpoints, no inline layout styles, proper reflow/scroll/stack at each size.

**Polish** — No unstyled browser defaults. Consistent spacing and alignment. Interactive states on all controls. Professional quality bar.

## Failure Modes

1. **AI-slop** — Generic look, default spacing, AI-tell fonts, gratuitous gradients, inconsistent radii
2. **Catalog layout** — Component inventory instead of application scene
3. **No structural identity** — Color swap would make it indistinguishable from another language
4. **Library sameness** — Too similar to existing languages in type, palette, structure, or scene type
5. **Gradient/shadow abuse** — Gradient buttons, gradient text, rainbow backgrounds, excessive shadow levels
6. **Not responsive** — Missing media queries or inline layout styles
7. **Unstyled form elements** — Browser chrome visible
8. **Inconsistent radii** — Mixing arbitrary values. Use the scale: 0/16/24/9999.
9. **Missing tokens in embodiment** — Spec declares surfaces/borders/motion but embodiment ignores them
