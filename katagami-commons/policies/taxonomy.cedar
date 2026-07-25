// Taxonomy — open access for local development
permit(principal, action, resource is Taxonomy);

// Contributor boundary (ARN-255): the taxonomy is curator and pipeline structure; contributors never write it.
// Reads stay open — this closes writes only, so a contributor agent reaching
// the kernel directly gains nothing beyond the tools the MCP adapter exposes
// (search, remix, submit).
forbid(
  principal,
  action in [
    Action::"Define",
    Action::"Publish",
    Action::"UpdateCharacteristics",
    Action::"UpdateRelations",
    Action::"IncrementLanguageCount",
    Action::"Archive"
  ],
  resource is Taxonomy
) when { principal has agent_type && principal.agent_type == "contributor" };
