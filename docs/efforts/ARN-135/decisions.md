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

## Use supported publication namespaces

Decision: Use single-segment publication namespaces for design languages, palettes,
and art styles.
Came up because: The live local finalizer accepted valid proofs but publication
failed with HTTP 400 because the artifact API rejects slashes in namespaces.
Options: Change the application namespace values; weaken the artifact API validation.
Chose application values because the API intentionally validates object-key segments
and all three application callers shared the invalid format. Existing public URLs
remain immutable; this affects newly published artifacts.
Where: katagami-curation/wasm/finalize_spawned_session/src/lib.rs.

## Restore the finalizer-owned review boundary

Decision: Include AttachArtStyleReview and SubmitForReview in the existing
curator/pipeline-only ArtStyle action list.
Came up because: A real registered contributor credential could attach forged
review attestations in the local runtime with the production policy snapshot.
The contribution contract already reserves these actions to finalization.
Options: Accept the failing security check; restore the two missing restrictions.
Chose the restrictions because accepting contributor-supplied attestations as
verified contradicts the existing publication contract. The existing trusted
principal definitions and the remaining application policies are unchanged.
Where: katagami-commons/policies/art_style.cedar.
