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
// The permit ENUMERATES the alphabet rather than granting `action`, so an
// action added to human_curator.ioa.toml later arrives denied rather than open
// — on the one record where "open by default" means "publishable by default".
// The three *Event actions are absent on purpose: they are output actions,
// emitted by the platform, never invoked by a caller.
permit(
  principal,
  action in [
    Action::"AssignSubmission",
    Action::"RecordReviewVerdict",
    Action::"BeginReview",
    Action::"Publish",
    Action::"ReturnWithCritique",
    Action::"ReviewOverdue",
    Action::"Reassign"
  ],
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

// --- Escalation is not a way around the binding above ---
//
// Publish requires `principal.id == resource.assignee_ref`. Reassign is what
// SETS assignee_ref. Left open to any authenticated non-agent, the pair is a
// two-step bypass of the whole publish boundary: escalate the assignment,
// reassign it to yourself, publish. So escalation is held by an explicit
// allowlist rather than by "anyone who is not a contributor".
//
//   Agent::"system"                       the platform. HumanCurator declares
//                                         state_timeouts that fire
//                                         ReviewOverdue on their own, and the
//                                         pipeline is what dispatches them.
//   Agent::"katagami-curation-escalation" the escalation role's own
//                                         credential, for a re-route done by
//                                         hand.
//
// Same shape as the reviewer allowlist in review_agent.cedar: adding a
// principal means adding it here, in review, rather than it arriving by
// default.

// ReviewOverdue only says "this sat too long". It publishes nothing and lands
// in Escalated, which is visible and countable — so the assignment's own
// holder may also raise it, which is a person saying they cannot get to it.
forbid(
  principal,
  action == Action::"ReviewOverdue",
  resource is HumanCurator
) unless {
  principal == Agent::"system" ||
  principal == Agent::"katagami-curation-escalation" ||
  (resource has assignee_ref &&
   resource.assignee_ref != "" &&
   principal.id == resource.assignee_ref)
};

// Reassign moves the role to a different holder, so it cannot be bound to the
// current one — the holder is absent, which is why it escalated. It is
// deliberately NOT open to the outgoing assignee either: a holder who could
// hand the assignment to themselves has re-granted themselves the publish
// right the binding above took away.
//
// Reassign never publishes anything: it lands in SubmissionAssigned, which
// still has the machine review and the human decision ahead of it.
forbid(
  principal,
  action == Action::"Reassign",
  resource is HumanCurator
) unless {
  principal == Agent::"system" ||
  principal == Agent::"katagami-curation-escalation"
};

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
