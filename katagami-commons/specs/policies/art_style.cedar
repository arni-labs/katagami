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

// Generic OData writes bypass the action ladder entirely: PATCH and DELETE are
// authorized as the lowercase `update` / `delete` actions, which no named-action
// forbid above covers. Without this, a contributor could PATCH a published
// entity's fields or DELETE it outright and never touch a governed action.
// `create` stays open — submissions legitimately create their draft.
forbid(
  principal,
  action in [Action::"update", Action::"delete"],
  resource is ArtStyle
) when { principal has agent_type && principal.agent_type == "contributor" };

// Human curator boundary (ARN-255): a signed-in human reaching the kernel with
// their own token is a Customer principal, which no agent_type forbid above
// ever matches — so without this a signed-in contributor could publish or archive any ArtStyle. Scoped
// to `principal is Customer` so the curation pipeline and the operator key,
// which carry no role, are unaffected.
forbid(
  principal,
  action in [
    Action::"Publish",
    Action::"Revise",
    Action::"Archive",
    Action::"Restore",
    Action::"MarkQualityPassed",
    Action::"UpdateQuality",
    Action::"AttachPublishedAssets",
    Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector",
    Action::"AttachComputedFacets",
    Action::"SetFeatured",
    Action::"SetTaxonomy",
    Action::"AddCuratorNotes",
    Action::"ReturnToDraft"
  ],
  resource is ArtStyle
) when { principal is Customer }
unless { principal has role && ["owner", "curator"].contains(principal.role) };
