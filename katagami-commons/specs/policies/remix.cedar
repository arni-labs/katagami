// Remix — STANCE: authoring, rating and usage open; archiving is gated.
//
// A remix is a user's own composition, so building it stays open —
// SetSelection, SetCreator, SetSlotAssignments, AttachBrief, and Save.
//
// Rate and IncrementUsage stay open ON PURPOSE and not by oversight: they are
// engagement signals that the people using a remix generate, and gating them
// would stop the thing they exist to measure. If rating is ever abused, the
// answer is rate limiting or one-rating-per-principal in the spec, not a Cedar
// forbid — recorded here so the next reader knows it was considered.
//
// Archive and Restore decide whether a remix stays in the library, which is the
// same lifecycle class the artifact policies gate.
permit(principal, action, resource is Remix);

// Contributor boundary (ARN-303), matching Archive/Restore on the artifacts.
forbid(
  principal,
  action in [Action::"Archive", Action::"Restore"],
  resource is Remix
) when { principal has agent_type && principal.agent_type == "contributor" };

// Same omission fix as ARN-302: an agent that declares no type is refused.
forbid(
  principal is Agent,
  action in [Action::"Archive", Action::"Restore"],
  resource is Remix
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
