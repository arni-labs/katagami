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

// An agent that will not say what kind of agent it is gets no benefit of the
// doubt on the actions above.
//
// The contributor boundary can only recognize a contributor by its
// `agent_type`, and that attribute comes from an OPTIONAL header
// (`x-temper-agent-type`). Omitting it was therefore a way to stop looking like
// a contributor: verified with the Cedar evaluator, an Agent principal that
// sent no agent type was ALLOWED to publish an art style. Every agent that
// legitimately acts here — the pipeline, the finalizer — knows its own type and
// sends it, so requiring the declaration costs them nothing and closes the gap
// for everyone else. `Agent::"system"` is exempt because an identity is
// stronger evidence than a self-declared attribute, and the finalizer forbid
// above already names it.
//
// Same fix as katagami-curation/policies/human_curator.cedar (ARN-302).
forbid(
  principal is Agent,
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
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
