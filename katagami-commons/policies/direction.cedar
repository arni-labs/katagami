// Direction — open access for local development
permit(principal, action, resource is Direction);

// Contributor boundary (ARN-255): directions are curator briefs; contributors never write them.
// Reads stay open — this closes writes only, so a contributor agent reaching
// the kernel directly gains nothing beyond the tools the MCP adapter exposes
// (search, remix, submit).
forbid(
  principal,
  action in [
    Action::"SetDirection",
    Action::"Close",
    Action::"Reopen"
  ],
  resource is Direction
) when { principal has agent_type && principal.agent_type == "contributor" };
