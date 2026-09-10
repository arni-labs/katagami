// STANCE: Owners and curation-service agents author. System and the exact WASM runtime verify.
permit(principal, action, resource is NarrativeStructure);

forbid(
  principal,
  action in [
    Action::"Revise",
    Action::"Restore",
    Action::"SetEncyclopediaLinks",
    Action::"SetExemplars",
    Action::"SetIdentity",
    Action::"SetInstruction",
    Action::"SetMovements",
    Action::"SetSources",
    Action::"SubmitNarrativeStructure"
  ],
  resource is NarrativeStructure
)
unless { (principal is Agent && principal has agent_type && principal.agent_type == "curation-service") || (principal is Customer && principal has role && principal.role == "owner") };

// Only System and the exact WASM runtime may record successful verification.
forbid(
  principal,
  action == Action::"MarkStructureVerified",
  resource is NarrativeStructure
)
unless { principal is System || principal == Agent::"service:wasm-runtime" };

// Owners and curation-service agents request lifecycle changes. System and the
// exact WASM runtime principal may execute them.
forbid(
  principal,
  action in [
    Action::"Archive",
    Action::"Publish",
    Action::"SubmitForReview"
  ],
  resource is NarrativeStructure
)
unless { principal is System || principal == Agent::"service:wasm-runtime" || (principal is Agent && principal has agent_type && principal.agent_type == "curation-service") || (principal is Customer && principal has role && principal.role == "owner") };

// This rule authorizes generic OData writes separately from named transitions.
forbid(
  principal,
  action in [
    Action::"create",
    Action::"update",
    Action::"delete"
  ],
  resource is NarrativeStructure
)
unless { (principal is Agent && principal has agent_type && principal.agent_type == "curation-service") || (principal is Customer && principal has role && principal.role == "owner") };
