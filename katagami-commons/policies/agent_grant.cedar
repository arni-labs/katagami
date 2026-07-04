// AgentGrant — consent records (ARN-151). Created/rotated/revoked only by the
// katagami.ai authorization server on the human's behalf. A contributor agent
// must never see or touch grants (its own or anyone's) — revocation is the
// human's kill switch over the agent.
permit(principal, action, resource is AgentGrant);
forbid(principal, action, resource is AgentGrant)
when { principal has agent_type && principal.agent_type == "contributor" };
