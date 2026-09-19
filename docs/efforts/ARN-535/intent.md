# Finalizer gates that check what they claim to check

Rita asked (2026-09-18) to adopt TypeSafe Jev for the finalizer's semantic checks and approved this order: fix the deterministic gates in plain code first, then add Jev as a report-only lane (ARN-536). This effort is the first step.

## What is wrong

- `synthesize-palette/SKILL.md` tells the agent the finalizer enforces WCAG contrast (text on surface and bg at 4.5:1, accent at 3.0:1). The finalizer has no contrast code. `verify_palette_role_map` checks only hex syntax and accepts `neutrals: {}`.
- The shadcn export, shadcn component spec and DESIGN.md front matter are accepted on substrings of the raw text rather than parsed structure.
- Voice `banned_patterns` regexes that fail to compile are dropped silently, leaving the gate empty.
- The repair prompt says the finalizer reports only the first failing gate. It now reports all of them.

## Expected end state

- A palette missing `bg`, `surface` or `text`, or failing the contrast ratios the skill promises, fails finalization with a repairable error that names the pair and the measured ratio.
- The three artifacts are parsed; a required key inside a comment or string value no longer passes.
- An invalid banned pattern fails the voice gate and names the pattern.
- The repair prompt matches finalizer behaviour.
- Blast radius on the live store is measured before the tighter gates ship.

## Out of scope

Semantic checks (hero is a real image, design ban-list, page distinctness) belong to ARN-536. The lint-summary fix stays on ARN-289; Files field casing, verified booleans and the redeploy secret stay on ARN-271.

Linear: ARN-535.
