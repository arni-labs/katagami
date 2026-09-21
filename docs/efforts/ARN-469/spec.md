# Experiment specification

## Question

Does an explicit design-language description help an agent solve a different design problem while preserving perceived identity? Does solver assistance improve on that description alone?

The current hypothesis is that the representation helps more than the solver. A solver may preserve relationships without improving creative choices. The experiment must permit that result.

## Sources and calibration

Use the frozen Galley DESIGN.md (SHA256 b98da4436f2a6e909342e210a8215138868f148dce89d1504669aa8b70eb23c5) and Aya DESIGN.md (SHA256 e411bd18690edd1c5f551fbae098acd966f143ffbd1786e214181d9ecca9faf6), plus their selected reference images. Aya source revision: d5177d7b1d7b7dcd8940efeb149e62490c0da52a. Preserve the approval sidecar for Aya's ike-3-scroll reference.

The user accepted both images for both languages in both calibration rounds, but found both rounds too similar. These are identity acceptances, not evidence of novelty, preference, or usefulness. Do not generate more rearrangement comparisons.

Galley's attached scraps and Aya's single active arc are written conventions. The user accepted images departing from them. Record the discrepancy; neither convention is a necessary identity condition established by this experiment. Nor does acceptance establish that every possible departure is acceptable.

## Representation

The first draft is authored by the agent from source documents and recorded judgments. It is not a working general autoformalization pipeline. Each entry has a source, scope, interpretation, epistemic status, and enforcement mode.

Separate visual ingredients and their treatments, possible operations using them, page-specific arrangements, and task contracts. Keep source conventions distinct from hypotheses about perceived identity. Palette and font information alone is insufficient: record what each treatment does, such as a proof label versus an editorial title.

`experiments/autoformalization/language-draft.yaml` is the first structured draft. Exact type/colour rules can become predicates. Ownership and transformation relations can become solver constraints. Material qualities and perceived identity remain descriptive guidance or empirical judgments. Encoding a phrase as a field does not make it mathematically precise.

## Executable demonstration

`annotation-transfer.smt2` models Galley verdict colour roles and a transformation from an attached annotation to a keyed index. It asks whether colour constraints allow both declared presentations, whether an explicit colour request conflicts with the selected source profile, and whether reference resolution can change the annotation's owner. The presentation selector has no geometry and establishes no layout feasibility.

With two items and unique integer keys, Z3 finds no ownership counterexample. Without uniqueness, it finds one. This is a result about the defined two-item operation, not arbitrary UI code, image pixels, Galley membership, or creative value. Z3 is trusted here; no separate proof kernel checks a certificate. The conflict core need not be minimal.

This demonstration establishes that the mechanism runs, not that it is worth using for creative work. The final experiment needs task-specific constructive constraints; do not call the annotation example the completed formal condition.

## Proposed transfer briefs

1. Galley exhibition operations: manage installation tasks, dependencies, owners, and release holds. Dense operational information replaces a gallery of artwork plates. Preserve editorial/proofing treatments without requiring hero art, overlapping captions, a 96-pixel rail, or the original arrangement.
2. Aya evidence comparison: compare conflicting sources for a decision, retain provenance, distinguish observation from interpretation, and show unresolved disagreement. It must not be a numbered-goals page with a decorative branch. Retain the paper/type/ink treatments where useful; their necessity for identity remains unproven.

These are proposals for user alignment, not approved generation briefs. Before rendering, specify identical content and functional requirements for all conditions. A dense task does not automatically authorize abandoning a language's whitespace convention: state the tradeoff and keep it identical across conditions.

## Comparison

1. Prose guidance with all selected source information, exceptions, and task requirements.
2. The same information as an explicit structured language description, without solver assistance.
3. The same structured description with solver-assisted construction or repair of the symbolic plan.

Freeze one semantic information inventory and derive both prose and structured packets from it. Retain full packets for inspection. Condition 3 must not receive extra aesthetic instructions or hidden constraints. All conditions can reason and self-review; only condition 3 gets solver results. Give each an initial plan and one revision, the same renderer prompt fields, reference images, dimensions, and image-call budget. Log planning work, solver time, unsupported constraints, and failed plans. A solver-assisted plan must run the solver; formal-looking prose does not count.

Start with one aligned brief per language, three conditions, and two independent plan-and-image attempts per condition: 12 final images. Each attempt starts from the frozen packet without other attempts' plans or images. Give it one initial planning call and one revision call. Freeze and record the same planner model, reasoning setting, call budget, and complete context contents across conditions. Solver execution is extra measured cost. If context isolation cannot be provided, disclose that before the run and weaken independence claims.

This proposed size replaces the earlier 24-image proposal because novelty of the tasks needs confirmation before a larger run. Use built-in image generation. Record exact calls and returned artifacts, retain all outputs, and interleave conditions in randomized order. Do not claim exposed seeds or fixed backend versions unless available. No condition-specific retries or hand-selected winners.

Exclude final outputs from rule inference. These proposed tasks are already known during representation design, so this first run is a development pilot, not an unseen-task generalization test. A later frozen-language run on a new brief would test transfer more strongly. No independent held-out Aya language sample is available to establish inference accuracy.

## Evaluation and interpretation

Present two randomized triads per language, including both replicates. Hide condition labels and retain the mapping separately. Ask for perceived identity, novelty relative to the source, usefulness for the brief, and craft independently; allow ties, neither, and uncertainty. Record reasons. Do not combine them into a beauty score.

Record symbolic plan validity separately from whether the generated image follows it. A correct plan can be rendered incorrectly. Image fidelity remains visual review, not a proved consequence of Z3. Images cannot establish actual interaction usability.

If structure improves identity but not novelty, report preservation only. If it improves novelty but not usefulness, do not call that a creative improvement. If structure beats prose and solver does not beat structure, the evidence favours a representation product without solver complexity. If all conditions are comparable, report no observed benefit. One reviewer, two languages, two replicates, and opaque renderer controls cannot support population-level conclusions.

## Completion

Deliver sources, representation revisions, prompts, solver inputs/results, all images, blinded judgments, and the report. Human alignment and final judgments remain dependencies. This effort does not modify Impeccable or deploy production application code. Proposal delivery is not completion of the experiment.
