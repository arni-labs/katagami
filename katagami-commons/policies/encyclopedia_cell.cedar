permit(principal, action, resource is EncyclopediaCell);

// Generic writes must never replace the reviewed document or its gate fields.
forbid(principal, action in [Action::"update", Action::"delete"], resource is EncyclopediaCell);

// Reject external caller-supplied callbacks. The runtime dispatches its own
// validation results internally; this policy guards the public action endpoint.
forbid(
  principal,
  action in [Action::"DocumentValidated", Action::"ReviewValidated", Action::"ValidationFailed"],
  resource is EncyclopediaCell
)
unless { principal == Agent::"service:wasm-runtime" || principal is System };

// Source review and publication are curator-owned, not contributor actions.
forbid(
  principal,
  action in [Action::"create", Action::"Define", Action::"SubmitForValidation", Action::"RecordReview", Action::"RequestChanges", Action::"Publish", Action::"Revise", Action::"Archive"],
  resource is EncyclopediaCell
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };

// Raw rows include private review evidence, even after publication.
// Public browsing must use a separately authorized projection, not raw rows.
forbid(principal, action == Action::"read", resource is EncyclopediaCell)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };
