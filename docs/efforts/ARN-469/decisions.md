# Decisions

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
