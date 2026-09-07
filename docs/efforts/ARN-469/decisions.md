# Decisions

## Separate representation from solver assistance

Decision: Compare prose, structured language guidance, and the same structured guidance with a solver on different functional tasks.

Came up because: The user accepted both calibration rounds as belonging to the languages but found the outputs too similar. Source page recipes were being treated as identity requirements without evidence.

Options: Continue composition edits, keep the prose/checker/formal comparison, or isolate representation and solver effects on new tasks.

Chose the revised comparison because: It can show whether the representation helps without attributing that benefit to the solver. The proposed first run has 12 images rather than 24 and is a development pilot, since its tasks are known during representation design. This sacrifices breadth until the user confirms the tasks test meaningful transfer.

Where: `docs/efforts/ARN-469/spec.md` and `experiments/autoformalization/language-draft.yaml`.

## Keep the demonstration's guarantee narrow

Decision: Demonstrate a two-item annotation transformation in native SMT-LIB and label identity and pixel fidelity as unproved.

Came up because: The user wants a Pramaana-like experiment rather than another image or DOM linter, but no evidence supports a mathematical identity predicate.

Options: Encode identity as an arbitrary score, build another checker, or prove a declared meaning-preservation property of a symbolic operation.

Chose the symbolic operation because: It makes construction, contradiction, and a missing-assumption counterexample executable. It does not establish creativity or complete the proposed solver-assisted generation condition.

Where: `experiments/autoformalization/annotation-transfer.smt2` and `verify-solver.mjs`.

## Use the approved Aya scroll

Decision: Use the ikebana scroll as Aya's source language.

Came up because: The worktree contains both red crane and warm-paper ikebana comps.

Options: Use an arbitrary recent image, use the earlier crane approval, or follow the current approval record.

Chose the current approval record because: `ike-3-scroll.png.json` is approved and the crane sidecar explicitly records supersession. This preserves the user's current direction but excludes an earlier alternative.

Where: Aya `.impeccable/mocks/ike-3-scroll.png.json` and `crane-2-sequence.png.json`.

## Separate language rules from comp coordinates

Decision: Ask the user to calibrate proposed compositional freedoms before freezing the formal grammar.

Came up because: Aya's DESIGN.md contains exact measured positions for the approved page alongside general visual rules.

Options: Make every coordinate invariant, omit coordinates without review, or explicitly calibrate the distinction.

Chose calibration because: The user decides whether the proposed compositional freedoms are acceptable before final generation. This requires user input before final runs.

Where: `docs/efforts/ARN-469/spec.md`.

## Preserve each language's own materials

Decision: Follow the selected language's paper, type, and rules, including Aya's warm washi and Galley's crop marks.

Came up because: Generic repository styling defaults differ from both selected languages.

Options: Apply repository defaults to every mockup or preserve the user-selected language sources.

Chose source fidelity because: The experiment measures preservation of these languages. Applying generic styling would change the subject being tested.

Where: User selection and both source DESIGN.md files.

## Deliver judgments through Vercel

Decision: Publish the current comparison on a mobile-readable Vercel page before asking for visual judgment.

Came up because: The user sees only chat on mobile and cannot use local paths or the desktop image display.

Options: Repeat inline images, provide local files, or publish a verified review page.

Chose a review page because: It lets the user read both pairs and enlarge the images on the phone. Answers return through chat, without a second submission system.

Where: `experiments/autoformalization/review-site/index.html` and `docs/efforts/ARN-469/plan.md`.

## Keep the deployed preview protected pending permission

Decision: Keep Vercel sign-in required until the user explicitly approves a report-specific share link.

Came up because: The permission reviewer rejected creating a 30-day login-free link without explicit approval of that access change.

Options: Send the protected preview, request scoped sharing permission, or change project-wide protection.

Chose the protected preview and a scoped permission request because: This preserves existing access controls. Project-wide protection changes are outside the request.

Where: Vercel preview `proof-reports-ln4bzpdx7-rita-agafonovas-projects.vercel.app` and the permission request in chat.

## Test new tasks and possible identity boundaries

Decision: Replace relocation-only calibration with new task compositions and matched edits to annotation or emphasis relationships.

Came up because: The user accepted both earlier pairs and said that moving images does not change the language.

Options: Freeze the rules from those swaps, generate more swaps, or test a new expression and a plausible alternative for each language.

Chose new expressions and alternatives because: They test more than coordinate freedom. Galley changes to an issue-planning desk and tests attached verdict scraps against a shared keyed strip. Aya changes to a weekly focus arrangement and tests unequal emphasis against equal repeated emphasis. Neither alternative is assumed invalid, and the Aya edit cannot identify a separate cause for each of its coupled changes.

Where: `docs/efforts/ARN-469/calibration.md`; recorded image briefs in the experiment evidence archive. These calibration briefs are excluded from final evaluation.

## Keep report publication preview-only

Decision: Publish calibration updates only with an explicit preview target and preserve the user's existing share expiry.

Came up because: The existing proof-reports project's production domain serves another effort, and the first page review identified the risk of overwriting it.

Options: Publish to production, rely on the CLI's implicit preview default, or name the preview target explicitly.

Chose the explicit preview target because: `vercel deploy --target preview --yes --scope rita-agafonovas-projects` cannot be mistaken for a production command. Link access is limited to the same report the user approved for 30 days, ending at Unix 1791334346. Do not change project-wide protection or extend access on updates.

Where: staged report directory `/private/tmp/arn469-review-deploy`, Vercel project `proof-reports`.
