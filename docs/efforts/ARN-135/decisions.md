# Decisions

## Keep matched sources within a style

Decision: Both image models receive the same one or two new sources for a style.
Came up because: Rita requested fewer proofs and variation between art styles.
Options: Different subjects for each model; matched subjects within each style.
Chose matched subjects because it isolates differences in style transfer while
fresh subjects per style avoid the repetitive gallery.
Where: ArtStyle portability verifier and contributor instructions in this effort.

## Preserve provenance and scoring

Decision: Change proof cardinality and role coverage, retaining the existing
file-hash, prompt, source-identity and independent score checks.
Came up because: The eight-proof count is hard-coded across the submission path.
Options: Bypass finalization for this draft; update the shared contract.
Chose the shared contract because every new contributor needs the approved behavior.
Where: ArtStyle finalizer, MCP schema, specs and skills.
