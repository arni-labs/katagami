# Katagami Quality Standards

Minimum quality thresholds for design language specs and embodiments.

## Spec Section Minimums

- **Philosophy** (min 800 chars): Must include `summary`, `values` (5-8 with explanations), `anti_values` (3-5), `visual_character` (3-5 CONCRETE visual traits). Should read like the opening chapter of a design book.
- **Tokens** (min 1200 chars): Complete color palette (12+ named colors with hex values), full typography system (font stacks, scale ratio, line heights, weights), spacing scale (8+ values), radii (5 sizes), shadows (3 levels with full CSS values), surfaces, borders, motion. Every value must be SPECIFIC — no placeholders.
- **Rules** (min 800 chars): Must include `composition` (5-8 rules), `hierarchy` (4-6), `density`, `signature_patterns` (3-5 unique CSS techniques). Each rule should be a concrete instruction, not a vague principle.
- **Layout** (min 600 chars): Must include `density` with rationale, `grid` with specific column count/gutter/max-width, `whitespace` philosophy, `responsive` breakpoints with pixel values.
- **Guidance** (min 800 chars): Must include `dos` (6-10 specific instructions), `donts` (6-10 prohibitions), `usage_context`, `accessibility`.

## Embodiment Quality Checks

### Structural Identity (Critical)
- Every `visual_character` trait from Philosophy must be visible in the HTML/CSS
- Every `signature_pattern` from Rules must be implemented
- Surface/border/motion tokens must be actively used
- **Swap test**: if you could swap the color palette for another language's and it still looks right, the structure is too generic

### Scene-First (Critical)
- Must be a plausible application screen, NOT a component catalog
- If sections are labeled "Controls", "Feedback", "Data" — that IS a failure

### Typography
- Must use Google Fonts (not system fonts or LLM defaults)
- Display font must be unique across the library
- 2-3 font roles defined and used consistently

### Responsiveness
- 3 breakpoints minimum (~1024, ~768, ~480)
- No inline layout styles (grid/flex must be in CSS classes)
- Reflow, scroll, and stack behaviors at each breakpoint

### Polish
- No unstyled browser defaults on ANY form element
- All buttons match each other
- Consistent spacing and alignment
- Interactive states (hover, focus, disabled) on all interactive elements
- Professional front-end designer quality bar

## Failure Modes (Ranked by Frequency)

1. **Catalog layout** — component inventory instead of application scene
2. **Missing structural identity** — generic template with color swaps
3. **Generic typography** — Inter, Poppins, Roboto defaults
4. **Not responsive** — no media queries or inline layout styles
5. **Unstyled form elements** — raw browser chrome visible
6. **Missing surface/border/motion** — spec tokens not used in embodiment
7. **Inconsistent styling** — mix of styled and unstyled components
8. **Alignment issues** — off-grid, uneven spacing
