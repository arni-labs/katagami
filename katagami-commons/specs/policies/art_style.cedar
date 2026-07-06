// ArtStyle — open access for local development
permit(principal, action, resource is ArtStyle);

// Contributor boundary (ARN-151): agents submit, humans/pipeline publish.
// Contributor principals may author (create, Set*, Attach* artifacts,
// SetLineage, SetCredits/SetModelProvenance, SubmitForReview) but never
// verify, publish, curate, or mint public assets.
forbid(
  principal,
  action in [
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes"
  ],
  resource is ArtStyle
) when { principal has agent_type && principal.agent_type == "contributor" };
