// EncyclopediaCell — closed allow-list. Cedar denies by default, so every
// action absent from the permit below is refused, including generic OData
// writes, publication actions this deployment does not carry, and any action
// added to the specification later without a matching policy decision.
//
// This shape is deliberate. A blanket `permit(principal, action, ...)` narrowed
// by forbids leaves the surface open by default, so an action that is not yet
// on any forbid list is allowed. Enumerating the permitted actions instead
// means an unanticipated action fails closed.
permit(
  principal,
  action in [
    Action::"create",
    Action::"read",
    Action::"Define",
    Action::"SubmitForValidation",
    Action::"AbandonValidation",
    Action::"Archive",
    Action::"DocumentValidated",
    Action::"ValidationFailed"
  ],
  resource is EncyclopediaCell
);

// Generic writes must never replace a stored document or its validation gate.
forbid(principal, action in [Action::"update", Action::"delete"], resource is EncyclopediaCell);

// Reject external caller-supplied callbacks. The runtime dispatches its own
// validation results internally; this policy guards the public action endpoint.
forbid(
  principal,
  action in [Action::"DocumentValidated", Action::"ValidationFailed"],
  resource is EncyclopediaCell
)
unless { principal == Agent::"service:wasm-runtime" || principal is System };

// Authoring and recovery are curator-owned, not contributor actions.
forbid(
  principal,
  action in [Action::"create", Action::"Define", Action::"SubmitForValidation", Action::"AbandonValidation", Action::"Archive"],
  resource is EncyclopediaCell
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };

// Cells are private. Raw rows carry unreviewed working material, so reading
// them stays curator-only; public browsing needs a separately authorized
// projection, not raw rows.
forbid(principal, action == Action::"read", resource is EncyclopediaCell)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };
