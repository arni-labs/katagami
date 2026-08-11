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

// Contributor agents never touch the role record at all — not their own
// assignment, not anyone's. Same shape as katagami-commons/policies/member.cedar:
// the human's oversight surface is not an agent-writable object.
forbid(
  principal,
  action,
  resource is HumanCurator
) when { principal has agent_type && principal.agent_type == "contributor" };
