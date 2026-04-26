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
- Display font must be unique across the library
- 2-3 font roles defined and used consistently
- **`letter-spacing: -0.02em` on ALL text** — headings, body, labels. This is mandatory.
- Approved body fonts: IBM Plex Sans, Satoshi, Inter, General Sans, Instrument Sans
- Reject: Poppins, Montserrat, DM Sans, Space Grotesk (AI tells)

### Responsiveness
- 3 breakpoints minimum (~1024, ~768, ~480)
- No inline layout styles (grid/flex must be in CSS classes)
- Reflow, scroll, and stack behaviors at each breakpoint

### Colors & Backgrounds
- White backgrounds must be `#FFFFFF` — not cream, off-white, or tinted
- Dark mode must be `#000000` or `#121212` — not blue-grey or charcoal-blue
- No pastel backgrounds (cream, lavender, mint, light pink)
- One accent color, used sparingly

### Gradients
- **No gradients by default.** Reject gradient buttons, gradient text, gradient cards.
- For color accent presence: use off-viewport blobs with `filter: blur(120px)` instead
- Exception only if the language philosophy specifically demands gradients

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

1. **AI-slop look** — gradients everywhere, pastel backgrounds, inconsistent border-radius, default letter-spacing. Looks like a crypto landing page or AI demo.
2. **Catalog layout** — component inventory instead of application scene
3. **Missing structural identity** — generic template with color swaps
4. **Generic typography** — Poppins, Montserrat, DM Sans defaults with 0 letter-spacing
5. **Gradient abuse** — gradient buttons, gradient text, gradient backgrounds. Use blobs instead.
6. **Wrong backgrounds** — cream, off-white, light blue instead of pure #FFFFFF
7. **Not responsive** — no media queries or inline layout styles
8. **Unstyled form elements** — raw browser chrome visible
9. **Random border-radius** — mixing 8px, 12px, 20px, 32px. Pick from {0, 16, 24, 9999}.
10. **Missing surface/border/motion** — spec tokens not used in embodiment
