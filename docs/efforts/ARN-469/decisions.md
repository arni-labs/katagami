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
