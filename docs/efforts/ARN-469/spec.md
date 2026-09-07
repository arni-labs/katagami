# Experiment specification

## Question

Does autoformalizing a design language help an agent construct materially different compositions that express the language and answer a new brief?

## Inputs

- Galley: https://katagami.ai/language/en-019f2e78-8711-7072-b72d-200b095d9a51/DESIGN.md
- Aya: `DESIGN.md` and approved `.impeccable/mocks/ike-3-scroll.png` in the Aya `claude-product-md` worktree. Its sidecar records approval. Earlier crane comps are superseded.
- Preserve source snapshots and hashes in the experiment archive before inference. Record the Aya git revision and whether the files are uncommitted. Do not infer approval from git alone.
- Use built-in image generation for every image condition. Record tool calls and returned artifacts. Do not claim fixed seeds, identical backend versions, or isolated model context unless the tool exposes those controls.

## Definition

An inferred rule records its source, scope, interpretation, exceptions, and uncertainty. Separate explicit language commitments, page-specific implementation choices, and agent hypotheses. Exact coordinates in an implementation are not automatically language invariants.

The formal subset describes roles, ownership of annotations, grouping, order, and geometric relations in a composition plan. A solver can test consistency, find counterexamples to proposed transformations, and construct plans that satisfy the encoded rules. Perceived identity and artistic quality remain human judgments. A proof about the plan is not a proof about generated pixels.

## Calibration

Present one contrasting pair per language. After the user found relocation-only comparisons too weak, use a new task composition and an edited alternative that changes a proposed annotation or emphasis relationship. Keep other instructions matched. Record incidental differences introduced by image generation. Ask explicitly whether the changed relationship is acceptable, because image preference alone does not approve a rule. If an edit changes coupled properties, do not infer their separate effects. Do not score calibration images as final results. The user can accept, reject, or revise a proposed freedom. Freeze the accepted grammar and evaluation protocol before final generation.

Round 01 outcome: the user accepts both tested group relocations. Round 02 questions: can Galley's verdict scraps become a shared plate-keyed strip without losing identity? Can Aya use equal goal emphasis and repeated arcs without losing identity? Both pairs use new content and compositions. Do not silently remove an explicit source rule to admit a preferred result. If the user accepts a source-rule violation, record that distinction between written conformance and perceived identity.

## Comparison

1. Prose: equivalent source information and brief, expressed as ordinary design guidance.
2. Checked: the same information, plus executable predicates over a proposed composition and one correction attempt.
3. Formal: the same information and predicates, with solver-backed construction or verified transformations of the composition.

Give every condition the same accepted calibration decisions, rule interpretations, exceptions, and brief. Use the same renderer prompt format. Each condition gets an initial plan and one correction attempt before rendering: prose uses self-review, checked uses predicate findings, formal uses solver findings. Stop the attempt after one revised plan, even if it fails. Keep content, references, output dimensions, and image-call count equal. Record agent planning work and solver time separately. Solver-backed construction must run a solver, not merely insert formal vocabulary into an image prompt. Compare these workflows without attributing differences solely to the solver.

Use two new briefs per language and two renders per condition per brief (24 final images). This is a proposed pilot size, to be frozen after calibration. Keep all outputs, including failures. Any retry or replacement follows a condition-independent recorded rule. Interleave conditions in randomized order. Randomize labels for the final comparison and retain the mapping separately.

Exclude final briefs and held-out accepted examples from inference and calibration. Record which materials each stage can access. The inference pass must not inspect final outputs to tune rules. Without independent accepted examples, language-inference accuracy remains unestablished.

## Evaluation

For each brief, present two independently randomized triads, each containing one render from each condition. Include both replicates without choosing a preferred render. Ask for perceived identity, novelty relative to the source, usefulness for the brief, and craft separately. Permit ties, uncertainty, and neither. Ask for a short reason, not just a numeric score. Count failed renders as failures and retain their assigned comparison slots. Report wins, ties, losses, and failures by language and brief without an aggregate beauty score.

Record plan validity separately from rendered relationship fidelity. Inspect whether the image preserves the plan's annotation ownership, grouping, and order. A valid plan with an image that contradicts these relations is a rendering failure. Do not expand this measurement into a generic page linter.

The user is blind to condition labels, not to the project or research question. Results from two languages, one reviewer, and a tool with opaque backend controls are exploratory. More consistency alone does not establish improved creativity. If ordinary checking performs comparably, report no observed advantage from formal construction.

## Completion

Deliver the actual calibration and final images, rule revisions, prompts, solver inputs and results, blinded judgments, and a report of successes and failures. No production application code, Impeccable edits, or deployment is required. Human calibration and final judgments are required dependencies, not assumed approvals.
