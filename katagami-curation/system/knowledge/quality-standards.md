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

### Restraint (Highest Priority)
- **Removal test**: for every visual property (shadows, gradients, decorative borders, secondary colors), ask "does the design survive without this?" If yes, remove it.
- **Color count**: no more than 3 accent/brand colors total (excluding neutrals and semantic status colors). Languages with 5+ accent colors fail.
- **Decorative accumulation**: adding elements to fill space instead of letting restraint create identity = fail.

### Signature Element (Critical)
- Every language must have one nameable visual signature — a distinctive shape, motif, border treatment, or structural pattern.
- The reviewer must be able to state the signature in one sentence.
- If the signature cannot be named, the language lacks structural identity and must be reworked.

### Composition & Asymmetry (Critical)
- **Ban the three-equal-cards pattern.** Three same-sized cards in a row = automatic fail. One must be visually dominant.
- **Vary section weight.** Every section the same visual weight = fail. Must have at least one spacious moment and one dense moment.
- **At least one grid break.** Every embodiment needs one compositional break — a full-bleed element, an asymmetric split, an oversized heading, or an inset panel.

### Spacing Rhythm (Critical)
- **8:1 ratio test.** Tightest gap divided into largest gap must yield at least 8. Uniform 24px/32px everywhere = fail.
- **Grouping test.** Related elements closer than unrelated ones. Card padding equals section margin = fail.

### Structural Identity
- Every `visual_character` trait and `signature_pattern` visible. Surface/border/motion tokens actively used.
- **Swap test**: recognizable without its color palette, or fail.

### Scene-First
- Plausible screen for a **specific fictional product** — not generic dashboard.
- Sections labeled "Controls", "Feedback", "Data" = fail.
- **Banned**: SaaS analytics dashboards, CRM views, generic project management, unnamed "Flowbase"/"Acme" products.
- Fictional product must have a specific name and purpose.

### Typography
- Google Fonts, unique display font across library.
- 2-3 font roles, consistent.
- **Body letter-spacing: `-0.02em`. Display: `-0.03em` to `-0.04em`** — mandatory.
- **Display line-height: `1.1–1.2`. Body: `1.5–1.6`.** Same line-height for both = fail.
- Body text `15–16px`.
- Banned: Poppins, Montserrat, DM Sans, Space Grotesk, Figtree, Outfit, Plus Jakarta Sans.

### Color
- **Desaturation required.** Pure-saturation accents (S > 80% HSL) fail unless philosophy demands vivid with rationale.
- **No synthetic triads.** Evenly-spaced hue-wheel accents (cyan+coral+mint) = fail. Palettes cluster around a temperature.
- **Near-invisible borders.** `rgba(0,0,0,0.06)` not `#D8E0E8`. Solid named-grey borders = SaaS template fingerprint.
- White backgrounds: `#FFFFFF`. Dark: below 10% lightness.
- No pastel backgrounds. Max 2 accent colors.

### Gradients
- No gradients by default. Use `filter: blur(120px)` blobs instead.
- Exception only with philosophy rationale.

### Border Radius
- Scale: `0px`, `16px`, `24px`, `9999px`.
- **Must commit to ONE primary radius.** Never mix `16px` and `24px` in same language.
- No values between 24px and 9999px.

### Responsiveness
- 3 breakpoints, no inline layout styles, proper reflow.

### Polish
- No unstyled browser defaults. Consistent alignment.
- Hover transforms (scale, color shift, border), not just opacity fade.
- Professional designer quality bar.

## Failure Modes (Ranked by Frequency)

1. **Uniform spacing** — same padding/margin everywhere, no grouping contrast, no breathing room
2. **Equal-weight composition** — three equal cards, every section same height, no layout hierarchy
3. **Synthetic color palette** — fully saturated, evenly spaced hues, solid grey borders, 5+ accents
4. **No signature element** — nothing distinctive survives a palette swap
5. **Generic scene** — unnamed SaaS dashboard, CRM, or analytics page
6. **AI-tell typography** — banned fonts, default tracking, same line-height on display and body
7. **Mixed border-radius** — both 16px and 24px, or arbitrary values
8. **Gradient/shadow abuse** — gradient buttons, gradient text, rainbow backgrounds
9. **Catalog layout** — component inventory instead of application scene
10. **Decorative accumulation** — adding elements to fill space instead of letting restraint create identity
