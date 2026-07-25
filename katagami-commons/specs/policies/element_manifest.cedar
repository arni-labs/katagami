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

// Generic OData writes bypass the action ladder entirely: PATCH and DELETE are
// authorized as the lowercase `update` / `delete` actions, which no named-action
// forbid above covers. Without this, a contributor could PATCH a published
// entity's fields or DELETE it outright and never touch a governed action.
// `create` stays open — submissions legitimately create their draft.
forbid(
  principal,
  action in [Action::"update", Action::"delete"],
  resource is ElementManifest
) when { principal has agent_type && principal.agent_type == "contributor" };
