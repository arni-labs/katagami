// Member — identity substrate (ARN-151). Managed by trusted server-side
// principals (the katagami.ai server, curators, the pipeline). Contributor
// agents act THROUGH grants; they never read or write accounts directly.
permit(principal, action, resource is Member);
forbid(principal, action, resource is Member)
when { principal has agent_type && principal.agent_type == "contributor" };
