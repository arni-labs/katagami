# Katagami Quality Standards

Minimum quality thresholds for design language specs and embodiments.

## Spec Section Minimums

- **Philosophy** (min 800 chars): Must include `summary`, `values` (5-8 with explanations), `anti_values` (3-5), `visual_character` (3-5 CONCRETE visual traits). Should read like the opening chapter of a design book.
- **Tokens** (min 1200 chars): Complete color palette (12+ named colors with hex values), full typography system (font stacks, scale ratio, line heights, weights), spacing scale (8+ values), radii (5 sizes), shadows (3 levels with full CSS values), surfaces, borders, motion. Every value must be SPECIFIC — no placeholders.
- **Rules** (min 800 chars): Must include `composition` (5-8 rules), `hierarchy` (4-6), `density`, `signature_patterns` (3-5 unique CSS techniques). Each rule should be a concrete instruction, not a vague principle.
- **Layout** (min 600 chars): Must include `density` with rationale, `grid` with specific column count/gutter/max-width, `whitespace` philosophy, `responsive` breakpoints with pixel values.
- **Guidance** (min 800 chars): Must include `dos` (6-10 specific instructions), `donts` (6-10 prohibitions), `usage_context`, `accessibility`.

## DESIGN.md Quality Gate

- Every published language must have a generated DESIGN.md artifact.
- DESIGN.md must pass `npx @google/design.md lint` with zero errors and zero warnings.
- Katagami remains the source of truth; repair source fields, then regenerate DESIGN.md.
- DESIGN.md warnings are blocking; do not attach or publish a DESIGN.md artifact until every warning is fixed.
- The rich Katagami spec must not be flattened to only the DESIGN.md subset.

## Embodiment Quality Checks

### Structural Identity (Critical)
- Every `visual_character` trait from Philosophy must be visible in the HTML/CSS
- Every `signature_pattern` from Rules must be implemented
- Surface/border/motion tokens must be actively used
- **Swap test**: if you could swap the color palette for another language's and it still looks right, the structure is too generic

### Scene-First (Critical)
- Must be a plausible application screen, NOT a component catalog
- If sections are labeled "Controls", "Feedback", "Data" — that IS a failure

### Typography (50% of quality)
- Must use Google Fonts (not system fonts or LLM defaults)
- Display font AND body font must each be unique across the library
- 2-3 font roles defined and used consistently
- **`letter-spacing: -0.02em` on ALL text** — headings, body, labels. This is mandatory.
- Blocked fonts (AI tells): Poppins, Montserrat, DM Sans, Roboto, Space Grotesk
- Any other Google Font is fair game — choose what embodies the philosophy

### Responsiveness
- 3 breakpoints minimum (~1024, ~768, ~480)
- No inline layout styles (grid/flex must be in CSS classes)
- Reflow, scroll, and stack behaviors at each breakpoint

### Colors & Backgrounds
- Background color is a design choice — white, cream, dark, colored backgrounds are all valid if intentional
- Text contrast must meet WCAG AA (4.5:1 body, 3:1 large text)
- Palette should be focused: 1-2 accent colors plus neutrals, not rainbow
- Every color must have a purpose — avoid muddy or unclear palettes
- The library needs background diversity: if most existing languages use white, lean toward something different

### Gradients
- Bad gradients (buttons, text, rainbow cards) are an instant reject
- Good gradients that serve the philosophy are welcome — subtle depth, atmosphere, warmth
- Off-viewport blobs with `filter: blur(120px)` remain a great alternative for ambient color

### Border Radius
- Only allowed values: `0px`, `16px`, `24px`, `9999px` (fully round)
- NEVER values between 24px and 9999px (no 32px, 48px, 64px)
- Must be consistent — one primary radius used across all containers

### Polish
- No unstyled browser defaults on ANY form element
- All buttons match each other
- Consistent spacing and alignment
- Interactive states (hover, focus, disabled) on all interactive elements
- Professional front-end designer quality bar — NOT "AI template" quality

## Failure Modes (Ranked by Frequency)

1. **AI-slop look** — gratuitous gradients, inconsistent border-radius, default letter-spacing, blocked fonts. Looks like a crypto landing page or AI demo.
2. **Catalog layout** — component inventory instead of application scene
3. **Missing structural identity** — generic template with color swaps
4. **Library sameness** — looks too similar to existing languages. If you could swap two languages' palettes and not tell them apart, the structures are too similar. Check existing fonts, backgrounds, scene types before designing.
5. **Generic typography** — Poppins, Montserrat, DM Sans defaults with 0 letter-spacing, or reusing the same body font as another language
6. **Gradient abuse** — gradient buttons, gradient text, rainbow gradient backgrounds
7. **Not responsive** — no media queries or inline layout styles
8. **Unstyled form elements** — raw browser chrome visible
9. **Random border-radius** — mixing 8px, 12px, 20px, 32px. Pick from {0, 16, 24, 9999}.
10. **Missing surface/border/motion** — spec tokens not used in embodiment
