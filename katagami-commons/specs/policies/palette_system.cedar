// PaletteSystem — open access for local development
permit(principal, action, resource is PaletteSystem);

// Contributor boundary (ARN-151): agents submit, humans/pipeline publish.
forbid(
  principal,
  action in [
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes"
  ],
  resource is PaletteSystem
) when { principal has agent_type && principal.agent_type == "contributor" };
