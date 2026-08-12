// Direction — STANCE: authoring open; opening and closing the brief is gated.
//
// SetDirection is authoring: whoever is shaping the brief writes it. Close and
// Reopen decide whether a creative direction is live, which is the same class
// of act as Archive and Restore on the artifact types — a lifecycle decision
// about somebody's work rather than a contribution to it.
permit(principal, action, resource is Direction);

// Contributor boundary (ARN-303), matching Archive/Restore on the artifacts.
forbid(
  principal,
  action in [Action::"Close", Action::"Reopen"],
  resource is Direction
) when { principal has agent_type && principal.agent_type == "contributor" };

// Same omission fix as ARN-302: an agent that declares no type is refused.
forbid(
  principal is Agent,
  action in [Action::"Close", Action::"Reopen"],
  resource is Direction
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
