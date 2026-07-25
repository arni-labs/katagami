// ElementManifest — open access for local development
permit(principal, action, resource is ElementManifest);

// Contributor boundary (ARN-255): manifests are pipeline output, not contributor input.
// Reads stay open — this closes writes only, so a contributor agent reaching
// the kernel directly gains nothing beyond the tools the MCP adapter exposes
// (search, remix, submit).
forbid(
  principal,
  action in [
    Action::"SetElements",
    Action::"SetCompositions",
    Action::"Activate",
    Action::"Supersede"
  ],
  resource is ElementManifest
) when { principal has agent_type && principal.agent_type == "contributor" };
