// Taxonomy — STANCE: defining open; publishing, curating and archiving are gated.
//
// Define is authoring: drafting a taxonomy entry. Publish and Archive are the
// literal publish/lifecycle pair this whole boundary exists for.
// UpdateCharacteristics and UpdateRelations edit the taxonomy the commons is
// organised by — a curator act, and the same one the artifact policies gate as
// SetTaxonomy.
//
// IncrementLanguageCount stays open: it is a mechanical counter, not a
// judgement, and the pipeline bumps it as languages land.
permit(principal, action, resource is Taxonomy);

// Contributor boundary (ARN-303), matching Publish/Archive/SetTaxonomy on the
// artifact types.
forbid(
  principal,
  action in [
    Action::"Publish", Action::"Archive",
    Action::"UpdateCharacteristics", Action::"UpdateRelations"
  ],
  resource is Taxonomy
) when { principal has agent_type && principal.agent_type == "contributor" };

// Same omission fix as ARN-302: an agent that declares no type is refused.
forbid(
  principal is Agent,
  action in [
    Action::"Publish", Action::"Archive",
    Action::"UpdateCharacteristics", Action::"UpdateRelations"
  ],
  resource is Taxonomy
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
