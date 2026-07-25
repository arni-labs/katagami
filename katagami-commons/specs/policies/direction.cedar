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

// Generic OData writes bypass the action ladder entirely: PATCH and DELETE are
// authorized as the lowercase `update` / `delete` actions, which no named-action
// forbid above covers. Without this, a contributor could PATCH a published
// entity's fields or DELETE it outright and never touch a governed action.
// `create` stays open — submissions legitimately create their draft.
forbid(
  principal,
  action in [Action::"update", Action::"delete"],
  resource is Direction
) when { principal has agent_type && principal.agent_type == "contributor" };

// Human curator boundary (ARN-255): a signed-in human reaching the kernel with
// their own token is a Customer principal, which no agent_type forbid above
// ever matches — so without this a signed-in contributor could publish or archive any Direction. Scoped
// to `principal is Customer` so the curation pipeline and the operator key,
// which carry no role, are unaffected.
forbid(
  principal,
  action in [
    Action::"SetDirection",
    Action::"Close",
    Action::"Reopen"
  ],
  resource is Direction
) when { principal is Customer }
unless { principal has role && ["owner", "curator"].contains(principal.role) };
