// DesignElement — open access for local development
permit(principal, action, resource is DesignElement);

// Contributor boundary (ARN-255): element rendering and verification belong to the pipeline.
// Reads stay open — this closes writes only, so a contributor agent reaching
// the kernel directly gains nothing beyond the tools the MCP adapter exposes
// (search, remix, submit).
forbid(
  principal,
  action in [
    Action::"Configure",
    Action::"Render",
    Action::"Verify",
    Action::"RejectRender",
    Action::"Rerender"
  ],
  resource is DesignElement
) when { principal has agent_type && principal.agent_type == "contributor" };
