// HumanCurator — the publishing ROLE record (ARN-294). A role, never a person:
// identity lives on Member, and this record points at its current holder
// through an opaque assignee_ref.
//
// Publish is exclusively the human's. This file TIGHTENS that boundary for the
// role record and never relaxes the existing artifact-side one:
// katagami-commons/policies/design_language.cedar and art_style.cedar already
// forbid contributor agents from Publish on DesignLanguage and ArtStyle, and
// art_style.cedar restricts the finalizer actions to Agent::"system". Those
// policies remain the authority for the artifacts.
permit(
  principal,
  action,
  resource is HumanCurator
);

// No agent principal — of any agent_type, present or future — takes the two
// decisions that are the human's: publishing, and returning with critique.
// Written against `principal has agent_type` rather than a specific value so a
// new agent type cannot quietly inherit the human's authority.
forbid(
  principal,
  action in [Action::"Publish", Action::"ReturnWithCritique"],
  resource is HumanCurator
) when { principal has agent_type };

// The assignment is bound to its holder. "Not an agent" is not enough: any
// authenticated human could otherwise publish somebody else's assigned
// submission, and the whole point of assignee_ref is that one named holder
// answers for this decision. Publishing therefore requires the principal to BE
// the holder the record names, and an assignment with no holder is not
// publishable at all.
//
// assignee_ref must carry the holder's principal id for this to bind. That is
// stated on the spec (human_curator.ioa.toml) rather than left to convention:
// a rota handle is resolved to the holder before AssignSubmission is called.
forbid(
  principal,
  action in [Action::"Publish", Action::"ReturnWithCritique"],
  resource is HumanCurator
) unless {
  resource has assignee_ref &&
  resource.assignee_ref != "" &&
  principal.id == resource.assignee_ref
};

// Reassign moves the role to a different holder and so cannot be bound to the
// current one. It stays a non-agent decision (the forbid above covers agents)
// and never publishes anything — Reassign lands in SubmissionAssigned, which
// still has the machine review and the human decision ahead of it.

// Contributor agents never touch the role record at all — not their own
// assignment, not anyone's. Same shape as katagami-commons/policies/member.cedar:
// the human's oversight surface is not an agent-writable object.
forbid(
  principal,
  action,
  resource is HumanCurator
) when { principal has agent_type && principal.agent_type == "contributor" };

// An unauthenticated caller is nobody. `anonymous` is the principal id the
// platform assigns when no identity was presented (temper-authz
// SecurityContext::from_headers), and nobody assigns, publishes, or returns.
forbid(
  principal,
  action,
  resource is HumanCurator
) when { principal.id == "anonymous" };
