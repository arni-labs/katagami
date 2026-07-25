// DesignLanguage — open access for local development
permit(principal, action, resource is DesignLanguage);

// Contributor boundary (ARN-151): agents submit, humans/pipeline publish.
// SetProvenanceTier and SetDefaultArtStyle are curator judgments, not
// contributor inputs.
forbid(
  principal,
  action in [
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes",
    Action::"SetProvenanceTier", Action::"SetDefaultArtStyle"
  ],
  resource is DesignLanguage
) when { principal has agent_type && principal.agent_type == "contributor" };

// Generic OData writes bypass the action ladder entirely: PATCH and DELETE are
// authorized as the lowercase `update` / `delete` actions, which no named-action
// forbid above covers. Without this, a contributor could PATCH a published
// entity's fields or DELETE it outright and never touch a governed action.
// `create` stays open — submissions legitimately create their draft.
forbid(
  principal,
  action in [Action::"update", Action::"delete"],
  resource is DesignLanguage
) when { principal has agent_type && principal.agent_type == "contributor" };
