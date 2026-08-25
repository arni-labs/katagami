// WritingStyle — base grant; the boundaries below narrow it.
permit(principal, action, resource is WritingStyle);

// WritingStyle is owner-only intake + curation-service pipeline — there is NO
// ordinary-human authoring flow. So EVERY mutating action (author/attach/set/
// submit/curate) requires owner|curator or a service principal; only reads and
// system events stay open. Deny-by-default for mutations closes the class.
forbid(
  principal,
  action in [
    Action::"AddCuratorNotes",
    Action::"Archive",
    Action::"AttachCorpus",
    Action::"AttachPublishedAssets",
    Action::"SetVoiceLayer",
    Action::"AttachTasteVector",
    Action::"AttestConsent",
    Action::"IncrementFork",
    Action::"IncrementUsage",
    Action::"MarkBandsSelfConsistent",
    Action::"MarkQualityPassed",
    Action::"MarkReplicationVerified",
    Action::"Publish",
    Action::"RecordVerification",
    Action::"Restore",
    Action::"Revise",
    Action::"SetFeatured",
    Action::"SetTaxonomy",
    Action::"UpdateQuality",
    Action::"AttachReplication",
    Action::"AttachThumbnail",
    Action::"AttachVoiceMd",
    Action::"SetCredits",
    Action::"SetCrossModal",
    Action::"SetExemplars",
    Action::"SetLineage",
    Action::"SetMechanicalBands",
    Action::"SetModelProvenance",
    Action::"SetName",
    Action::"SetSources",
    Action::"SetTags",
    Action::"SubmitForReview",
    Action::"SubmitWritingStyle"
  ],
  resource is WritingStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };

// Generic OData writes bypass the action ladder: PATCH and DELETE authorize
// as `update`/`delete` and match no named list above. `create` stays open —
// submissions legitimately create their draft. Reads stay open.
forbid(
  principal,
  action in [
    Action::"update",
    Action::"delete"
  ],
  resource is WritingStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };
