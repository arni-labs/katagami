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

// Generic OData writes bypass the action ladder entirely: PATCH and DELETE are
// authorized as the lowercase `update` / `delete` actions, which no named-action
// forbid above covers. Without this, a contributor could PATCH a published
// entity's fields or DELETE it outright and never touch a governed action.
// `create` stays open — submissions legitimately create their draft.
forbid(
  principal,
  action in [Action::"update", Action::"delete"],
  resource is Taxonomy
) when { principal has agent_type && principal.agent_type == "contributor" };
