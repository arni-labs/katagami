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

### Restraint (New — Highest Priority)
- **Removal test**: for every visual property (shadows, gradients, decorative borders, secondary colors), ask "does the design survive without this?" If yes, remove it.
- **Color count**: no more than 3 accent/brand colors total (excluding neutrals and semantic status colors). Languages with 5+ accent colors fail.
- **Element count is not a virtue**: 15 elements is the minimum, not a target. If a scene naturally has 12 strong elements, don't add 3 weak filler elements.

### Signature Element (Critical — New)
- Every language must have one nameable visual signature — a distinctive shape, motif, border treatment, or structural pattern.
- The reviewer must be able to state the signature in one sentence: "This language uses [specific technique]."
- If the signature cannot be named, the language lacks structural identity and must be reworked.

### Composition & Asymmetry (Critical — New)
- **Ban the three-equal-cards pattern.** If three items are shown, one must be visually dominant (2x width, featured treatment, different layout). Three same-sized cards in a row = automatic fail.
- **Vary section weight.** A page where every section has roughly the same visual weight fails. There must be at least one spacious moment and one dense moment.
- **At least one grid break.** Every embodiment needs one compositional break — a full-bleed element, an asymmetric split, an oversized heading, or an inset panel that disrupts the dominant grid.

### Spacing Rhythm (Critical — New)
- **8:1 ratio test.** The tightest gap in the embodiment divided into the largest gap must yield at least 8. Example: if smallest gap is 8px, largest must be 64px+. Uniform 24px/32px everywhere = fail.
- **Grouping test.** Related elements must be closer together than unrelated ones. If card padding equals section margin, the spacing has no hierarchy.

### Structural Identity (Critical)
- Every `visual_character` trait from Philosophy must be visible in the HTML/CSS
- Every `signature_pattern` from Rules must be implemented
- Surface/border/motion tokens must be actively used
- **Swap test**: if you could swap the color palette for another language's and it still looks right, the structure is too generic — fail.

### Scene-First (Critical)
- Must be a plausible application screen for a **specific fictional product**, NOT a generic dashboard
- Sections labeled "Controls", "Feedback", "Data" = failure
- **Banned generic scenes**: SaaS analytics dashboards, CRM account views, generic project management boards, unnamed "Flowbase" / "Acme" placeholder products
- The fictional product must have a specific name and specific purpose

### Typography (50% of quality)
- Must use Google Fonts (not system fonts or LLM defaults)
- Display font must be unique across the library
- 2-3 font roles defined and used consistently
- **`letter-spacing: -0.02em` on body text, `-0.03em` to `-0.04em` on display headlines** — mandatory
- **Display line-height: `1.1–1.2`.** Body line-height: `1.5–1.6`.** Using the same line-height for both = fail
- Body text at `15–16px`, not `14px`
- Approved body fonts: IBM Plex Sans, Satoshi, Inter, General Sans, Instrument Sans, Atkinson Hyperlegible
- **Banned AI-tell fonts**: Poppins, Montserrat, DM Sans, Space Grotesk, Figtree, Outfit, Plus Jakarta Sans

### Color (New — Stricter)
- **Desaturation required.** Accent colors should be mixed with grey/brown. Pure-saturation accents (S > 80% in HSL) fail unless the philosophy specifically demands vivid color with rationale.
- **No synthetic triads.** If accent colors are evenly spaced on the hue wheel (cyan + coral + mint, or purple + green + orange), the palette looks generated. Real palettes cluster around a temperature.
- **Near-invisible borders.** Structural borders should be white or black at 6–10% opacity (e.g., `rgba(0,0,0,0.06)`), not solid named greys like `#D8E0E8`. Solid-grey borders are the SaaS template fingerprint.
- White backgrounds: `#FFFFFF` — not cream, off-white, or tinted
- Dark mode: `#000000` or near-black below 10% lightness — not blue-grey or charcoal-blue
- No pastel backgrounds (cream, lavender, mint, light pink)
- One accent color, used sparingly. Two maximum.

### Gradients
- **No gradients by default.** Reject gradient buttons, gradient text, gradient cards.
- For color accent presence: use off-viewport blobs with `filter: blur(120px)` instead
- Exception only if the language philosophy specifically demands gradients with rationale

### Border Radius (Stricter)
- Allowed values: `0px`, `16px`, `24px`, `9999px`
- NEVER values between 24px and 9999px (no 32px, 48px, 64px)
- **Must commit to ONE primary radius.** Editorial = all `0px`. Soft product = all `24px`. **Never mix `16px` and `24px` in the same language** — this reads as indecisive.
- Must be consistent across all containers of the same type

### Responsiveness
- 3 breakpoints minimum (~1024, ~768, ~480)
- No inline layout styles (grid/flex must be in CSS classes)
- Reflow, scroll, and stack behaviors at each breakpoint

### Polish
- No unstyled browser defaults on ANY form element
- All buttons match each other
- Consistent spacing and alignment
- Interactive states (hover, focus, disabled) on all interactive elements — hover should transform, not just fade (scale, color shift, border appearance)
- Professional front-end designer quality bar — NOT "AI template" quality

## Failure Modes (Ranked by Frequency)

1. **Uniform spacing** — same padding/margin everywhere, no grouping contrast, no breathing room. The #1 AI tell.
2. **Equal-weight composition** — three equal cards, every section the same height, no visual hierarchy through layout
3. **Synthetic color palette** — fully saturated, evenly spaced hues, solid grey borders, 5+ accent colors
4. **No signature element** — nothing distinctive survives a palette swap
5. **Generic scene** — unnamed SaaS dashboard, CRM view, or analytics page
6. **AI-tell typography** — banned fonts, default tracking, same line-height on display and body
7. **Mixed border-radius** — using both 16px and 24px, or arbitrary values like 8px, 12px, 20px
8. **Gradient/shadow abuse** — gradient buttons, gradient text, rainbow backgrounds
9. **Catalog layout** — component inventory instead of application scene
10. **Decorative accumulation** — adding visual elements to fill space instead of letting restraint create identity
