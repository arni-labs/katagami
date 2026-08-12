// Member — identity substrate (ARN-151). Managed by trusted server-side
// principals (the katagami.ai server, curators, the pipeline). Contributor
// agents act THROUGH grants; they never read or write accounts directly.
permit(principal, action, resource is Member);
forbid(principal, action, resource is Member)
when { principal has agent_type && principal.agent_type == "contributor" };

// An agent that will not say what kind of agent it is gets nothing here.
//
// The forbid above can only recognize a contributor by its `agent_type`, and
// that attribute comes from an OPTIONAL header (`x-temper-agent-type`).
// Omitting it was a way to stop looking like a contributor — verified with
// the Cedar evaluator — and this record is the identity substrate every
// other boundary is written against, including the assignee binding that
// decides who may publish.
// The trusted principals that legitimately act here know their own type and
// send it; `Agent::"system"` is exempt because an identity is stronger evidence
// than a self-declared attribute.
//
// Same fix as katagami-curation/policies/human_curator.cedar (ARN-302).
forbid(
  principal is Agent,
  action,
  resource is Member
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
