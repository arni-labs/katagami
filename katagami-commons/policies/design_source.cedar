// DesignSource — open access for local development
permit(principal, action, resource is DesignSource);

// Contributor boundary (ARN-255): source ingestion belongs to the curation pipeline.
// Reads stay open — this closes writes only, so a contributor agent reaching
// the kernel directly gains nothing beyond the tools the MCP adapter exposes
// (search, remix, submit).
forbid(
  principal,
  action in [
    Action::"Submit",
    Action::"Index",
    Action::"IndexFailed"
  ],
  resource is DesignSource
) when { principal has agent_type && principal.agent_type == "contributor" };
