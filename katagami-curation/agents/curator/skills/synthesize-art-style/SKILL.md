# Synthesize an art style

Role adapter for the `synthesize_art_style` CurationJob lane.

Follow the installed Stack `katagami-contributor` skill as the sole contribution
procedure. The canonical source is
https://github.com/arni-labs/stack/blob/main/skills/katagami-contributor/SKILL.md.
The repository-owned data contract is
https://github.com/arni-labs/katagami/blob/master/docs/art-style-contribution-contract.md.
Use current native tool schemas for the actual operation and preserve the
existing draft and accepted definition during iteration.

Read the design principles and quality standards provided to this session and
obey the taste rulebook inlined in this prompt. Do not load obsolete TasteRule entities.
Author the prompt, gallery, genuine harness/provider evidence, source/rights evidence,
and review reports required by the data contract. Do not invent model IDs,
provider request IDs, generated images, capture records, or successful reviews.
A missing provider capability remains a disclosed limitation.

This is a terminal synthesis lane. Return the real ArtStyle IDs through the
job's supported completion contract. Its finalizer independently reads fields
and immutable file bytes and owns all quality attestations and publication.
Never call `SubmitForReview`, `AttachArtStyleReview`, `MarkQualityPassed`,
`AttachPublishedAssets`, or `Publish` to attest your own contribution.

In the curator runtime, use the preloaded `json.dumps` helper without importing
it when a declared string field carries structured JSON. Preserve native types
for fields whose live schema accepts them directly.
