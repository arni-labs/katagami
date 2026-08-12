// OAuthClient — STANCE: closed to contributors entirely; registrations are the authorization server's alone.
// OAuthClient — DCR registrations (ARN-151). Written only by the katagami.ai
// authorization server; carries zero privilege. Contributor principals have
// no business here — their clients are registered FOR them by the AS.
permit(principal, action, resource is OAuthClient);
forbid(principal, action, resource is OAuthClient)
when { principal has agent_type && principal.agent_type == "contributor" };

// An agent that will not say what kind of agent it is gets nothing here.
//
// The forbid above can only recognize a contributor by its `agent_type`, and
// that attribute comes from an OPTIONAL header (`x-temper-agent-type`).
// Omitting it was a way to stop looking like a contributor — verified with
// the Cedar evaluator — and these registrations are written by the
// authorization server alone: a principal that can forge one can arrange
// its own credentials.
// The trusted principals that legitimately act here know their own type and
// send it; `Agent::"system"` is exempt because an identity is stronger evidence
// than a self-declared attribute.
//
// Same fix as katagami-curation/policies/human_curator.cedar (ARN-302).
forbid(
  principal is Agent,
  action,
  resource is OAuthClient
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
