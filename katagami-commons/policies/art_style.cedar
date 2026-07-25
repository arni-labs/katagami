// ArtStyle — open access for local development
permit(principal, action, resource is ArtStyle);

// The finalizer calls these OData actions as Agent::"system". They are input
// actions only because governed WASM dispatches through OData; they are not a
// public attestation surface.
forbid(
  principal,
  action in [
    Action::"SubmitForReview", Action::"Publish",
    Action::"MarkQualityPassed", Action::"AttachArtStyleReview",
    Action::"AttachPublishedAssets", Action::"AttachComputedFacets"
  ],
  resource is ArtStyle
) when { principal != Agent::"system" };

// Contributor boundary (ARN-151): agents submit, humans/pipeline publish.
// Contributor principals may author (create, Set*, Attach* artifacts,
// SetLineage, SetCredits/SetModelProvenance) but never attest, advance the
// review lifecycle, publish, curate, or mint public assets.
forbid(
  principal,
  action in [
    Action::"SubmitForReview", Action::"Publish",
    Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"SetReviewEvidence", Action::"AttachArtStyleReview",
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes"
  ],
  resource is ArtStyle
) when { principal has agent_type && principal.agent_type == "contributor" };
