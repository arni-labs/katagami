// PaletteSystem — STANCE: authoring open; publishing, advancing and curating are gated.
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

// An agent that will not say what kind of agent it is gets no benefit of the
// doubt on the actions above.
//
// The contributor boundary can only recognize a contributor by its
// `agent_type`, and that attribute comes from an OPTIONAL header
// (`x-temper-agent-type`). Omitting it was therefore a way to stop looking like
// a contributor: verified with the Cedar evaluator, an Agent principal that
// sent no agent type was ALLOWED to publish a palette system. Every agent that legitimately
// acts here — the pipeline, the finalizer — knows its own type and sends it,
// so requiring the declaration costs them nothing and closes the gap for
// everyone else. `Agent::"system"` is exempt because an identity is stronger
// evidence than a self-declared attribute.
//
// Same fix as katagami-curation/policies/human_curator.cedar (ARN-302).
forbid(
  principal is Agent,
  action in [
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes"
  ],
  resource is PaletteSystem
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
