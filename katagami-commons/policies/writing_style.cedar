// WritingStyle — open access for local development
permit(principal, action, resource is WritingStyle);

// Contributor boundary (ARN-151): agents submit, humans/pipeline publish.
// AttestConsent and MarkBandsSelfConsistent are verifier-owned gates (RFC-0002)
// — a contributor attesting its own consent claim would hollow out the lane.
forbid(
  principal,
  action in [
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachTasteVector",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes",
    Action::"AttestConsent", Action::"MarkBandsSelfConsistent"
  ],
  resource is WritingStyle
) when { principal has agent_type && principal.agent_type == "contributor" };
