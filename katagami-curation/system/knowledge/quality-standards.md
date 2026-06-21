# Katagami Quality Standards

This file keeps operational verification gates. Reusable design taste,
anti-slop, and visual judgment checks live in Accepted `TasteRule` records.
Synthesis and quality-review agents must load those records before creating or
judging a language.

Do not duplicate the full taste checklist here. If a design pass/fail rule can
be written as a short prompt directive, it belongs in `TasteRules`.

## Rule Source Of Truth

- Load Accepted `TasteRule` records for reusable visual tests and anti-patterns.
- Treat Proposed, Rejected, and Superseded rules as inert for generation.
- Keep hard artifact validation in skill docs and finalizers.
- Keep this file short enough to orient agents without competing with rules.

## Spec Completeness Gate

- **Philosophy**: `summary`, `values`, `anti_values`, and 3-5 concrete
  `visual_character` traits.
- **Tokens**: 12 named colors with hex values, a full typography system,
  spacing scale, radii, shadows, surfaces, borders, and motion.
- **Rules**: concrete `composition`, `hierarchy`, `density`, and 3-5
  `signature_patterns`.
- **Layout**: grid, breakpoints, whitespace, and density rationale.
- **Guidance**: clear do/don't guidance, usage context, and accessibility.

No section may be placeholder prose. Incomplete but coherent specs are repaired;
deeply empty specs should fail with a concrete error.

## Artifact Gates

- Every publishable language needs a generated `DESIGN.md` artifact.
- `DESIGN.md` must pass the no-network `katagami-design-md-contract` checker
  with zero errors and zero warnings.
- Katagami source fields remain the source of truth; repair source fields, then
  regenerate projections.
- Embodiments must be self-contained HTML and render cleanly at desktop,
  tablet, and mobile viewport sizes.
- Gallery thumbnails must be deterministic `600x400` JPEGs generated from the
  verified desktop embodiment.
- First-class shadcn/ui component recipes and renderable preview shots must be
  authored and verified before publish.

## Review Behavior

- Apply Accepted `TasteRule` records as the reusable visual quality bar.
- Repair fixable Draft and UnderReview languages instead of writing reports.
- For Published languages, revise only when a concrete spec or artifact defect
  requires repair.
- Never archive a language from `quality_review`; archive remains an owner
  signal.
