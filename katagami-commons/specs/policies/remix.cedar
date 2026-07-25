// Remix — open access for local development
permit(principal, action, resource is Remix);

// Contributor boundary (ARN-255): agents build and save their own mixes.
// Destructive and judgment actions belong to the mix's creator — ownership is
// the stable Google subject id on the verified principal. Reads stay open.
forbid(
  principal,
  action in [
    Action::"Archive",
    Action::"Restore",
    Action::"Rate",
    Action::"IncrementUsage"
  ],
  resource is Remix
) when { principal has agent_type && principal.agent_type == "contributor" }
unless { resource has creator_sub && resource.creator_sub == principal.id };

// Ownership is claimed once, never reassigned: a contributor may set the
// creator on a mix that has none, and never on one that belongs to someone else.
forbid(
  principal,
  action == Action::"SetCreator",
  resource is Remix
) when { principal has agent_type && principal.agent_type == "contributor" }
unless { !(resource has creator_sub) || resource.creator_sub == "" || resource.creator_sub == principal.id };

// Generic OData writes bypass the action ladder entirely: PATCH and DELETE are
// authorized as the lowercase `update` / `delete` actions, which no named-action
// forbid above covers. Without this, a contributor could PATCH a published
// entity's fields or DELETE it outright and never touch a governed action.
// `create` stays open — submissions legitimately create their draft.
forbid(
  principal,
  action in [Action::"update", Action::"delete"],
  resource is Remix
) when { principal has agent_type && principal.agent_type == "contributor" };
