# Katagami Quality Standards

This file keeps operational verification gates. Reusable design taste,
anti-slop, and visual judgment checks live in
`knowledge/rules/design-language.md`. Synthesis and quality-review agents
read that file before creating or judging a language. They do not list
Accepted `TasteRule` entities.

Do not duplicate the full taste checklist here. Taste distillation still
authors proposed `TasteRules` for the human to accept; that is a different
job.

## Rule Source Of Truth

- Read `knowledge/rules/design-language.md` for reusable visual tests and anti-patterns.
- Do not list Accepted `TasteRule` entities when synthesizing or reviewing a language.
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

## ArtStyle Publication Gates

- Store one paste-ready, reference-independent aesthetic prompt. Subject and
  palette are consumer facts; no model receives different aesthetic facts.
- Independent LLM review must quote prompt evidence for all seven observable
  dimensions and resolve contradictions in at most one revision.
- `source_basis` must qualify every credit. A living person requires explicit
  license/permission; attribution alone never passes.
- Behavioral proof uses the exact prompt and exact same four governed sources on
  both edit models: human portrait, another living subject,
  still-life/product/object, and landscape/environment, rotated across four
  neutral source media. Concrete subjects and compositions are style-specific,
  never a recurring house fixture set. The generator accepts no user/external
  image URL and signs the full source/prompt/model/output chain.
- Score models separately: subject/content remains recognizable, source medium
  is fully replaced, medium/material = 2/2, every other dimension ≥1/2, and
  every case/model average ≥1.5/2. Missing provider access is a visible failure,
  not an exemption.
- Optional reference images remain gallery examples and never satisfy proof.
