// Remix — base grant; the boundaries below narrow it.
permit(principal, action, resource is Remix);

// Generic OData writes bypass the action ladder: PATCH and DELETE authorize
// as `update`/`delete` and match no named list above. `create` stays open —
// submissions legitimately create their draft. Reads stay open.
forbid(
  principal,
  action in [
    Action::"update",
    Action::"delete"
  ],
  resource is Remix
)
when { (principal has agent_type && principal.agent_type == "contributor") || principal is Customer };

// Contributor boundary (ARN-255): agents build and save their own mixes.
// Ownership matches either the human acting directly (principal.id) or an
// agent acting for that human (context.actingFor) — an agent's own id is
// its client id, so comparing only principal.id would deny an agent every
// action on the very mixes its owner created.
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
unless { (resource has creator_sub && resource.creator_sub == principal.id) || (context has actingFor && resource has creator_sub && resource.creator_sub == context.actingFor) };
// Ownership is claimed once, never reassigned: a contributor may set the
// creator on a mix that has none, and never on one that belongs to someone else.
forbid(
  principal,
  action == Action::"SetCreator",
  resource is Remix
) when { principal has agent_type && principal.agent_type == "contributor" }
unless { !(resource has creator_sub) || resource.creator_sub == "" || (resource has creator_sub && resource.creator_sub == principal.id) || (context has actingFor && resource has creator_sub && resource.creator_sub == context.actingFor) };
// Human ownership (ARN-255): the contributor forbid above never matches a
// Customer principal, so a signed-in human could otherwise archive or rate any
// mix. Same rule, expressed for humans acting with their own token.
forbid(
  principal,
  action in [
    Action::"Archive",
    Action::"Restore",
    Action::"Rate",
    Action::"IncrementUsage",
    Action::"SetCreator"
  ],
  resource is Remix
) when { principal is Customer }
unless { resource has creator_sub && resource.creator_sub == principal.id };
