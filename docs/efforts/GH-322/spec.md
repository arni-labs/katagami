# Art-style attribution authoring

The ArtStyle state machine accepts SetCredits and SetModelProvenance in Draft and UnderReview and invalidates rights/prompt/portability and quality evidence. Its Cedar policy instead groups both with curator-only operations. A narrow permit cannot override either installed copy's forbid. SubmitArtStyle already accepts these fields; the individual authoring actions must follow the same contributor boundary without adding publication authority.

Move the two attribution actions into their own forbid. Retain the existing service/owner/curator exception and allow ordinary authoring only when context.status is Draft or UnderReview. Existing Customer creator checks and verified contributor actingFor checks remain conjunctive requirements. Missing/unknown status and Published/Archived remain denied for ordinary principals. Publish, SubmitForReview, attestations, job tracking, ownership assignment and generic update/delete remain unchanged.

The policy source and specs/policies mirror must match. Cedar forbid precedence remains unchanged. Do not modify the live policy store or substitute a more privileged identity.

Executable finite contract: test_art_style_attribution_policy.py enumerates action, principal, ownership and status cases through the real Cedar evaluator. It also parses the state machine to verify allowed states and review invalidation. This is a policy-only change with no new state transitions or runtime code.

Delivery requires replacing all stale installed copies via the existing supported app deployment process; additive permits or adding a corrected copy beside an old forbid cannot unblock the live operation. Source tests alone do not prove a live deployment or publication.
