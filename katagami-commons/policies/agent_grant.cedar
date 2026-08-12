// AgentGrant — STANCE: closed to contributors entirely; a grant is the human's kill switch over the agent.
// AgentGrant — consent records (ARN-151). Created/rotated/revoked only by the
// katagami.ai authorization server on the human's behalf. A contributor agent
// must never see or touch grants (its own or anyone's) — revocation is the
// human's kill switch over the agent.
permit(principal, action, resource is AgentGrant);
forbid(principal, action, resource is AgentGrant)
when { principal has agent_type && principal.agent_type == "contributor" };

// An agent that will not say what kind of agent it is gets nothing here.
//
// The forbid above can only recognize a contributor by its `agent_type`, and
// that attribute comes from an OPTIONAL header (`x-temper-agent-type`).
// Omitting it was a way to stop looking like a contributor — verified with
// the Cedar evaluator — and this record is the human's kill switch over the
// agent: an agent able to read or revoke grants can disarm its own
// oversight.
// The trusted principals that legitimately act here know their own type and
// send it; `Agent::"system"` is exempt because an identity is stronger evidence
// than a self-declared attribute.
//
// Same fix as katagami-curation/policies/human_curator.cedar (ARN-302).
forbid(
  principal is Agent,
  action,
  resource is AgentGrant
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
