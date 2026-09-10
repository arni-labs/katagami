// STANCE: NarrativeStructure mutations are owner and curation service only.
permit(principal, action, resource is NarrativeStructure);

forbid(
  principal,
  action in [
    Action::"Archive",
    Action::"MarkStructureVerified",
    Action::"Publish",
    Action::"Restore",
    Action::"Revise",
    Action::"SetEncyclopediaLinks",
    Action::"SetExemplars",
    Action::"SetIdentity",
    Action::"SetInstruction",
    Action::"SetMovements",
    Action::"SetSources",
    Action::"SubmitForReview",
    Action::"SubmitNarrativeStructure"
  ],
  resource is NarrativeStructure
)
unless { principal is System || principal is Admin || (principal is Agent && principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };

// Generic OData writes do not use the named authoring actions.
forbid(
  principal,
  action in [
    Action::"create",
    Action::"update",
    Action::"delete"
  ],
  resource is NarrativeStructure
)
unless { principal is System || principal is Admin || (principal is Agent && principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };
