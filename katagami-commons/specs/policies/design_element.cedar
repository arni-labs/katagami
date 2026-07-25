// DesignElement — base grant; the boundaries below narrow it.
permit(principal, action, resource is DesignElement);

// Curator/pipeline-owned actions. Contributor agents never invoke these;
// a human may only if their verified role is owner or curator. Scoped so
// the pipeline and operator key (no role, no agent_type) keep working.
forbid(
  principal,
  action in [
    Action::"Configure",
    Action::"RejectRender",
    Action::"Render",
    Action::"Rerender",
    Action::"Verify"
  ],
  resource is DesignElement
)
when { (principal has agent_type && principal.agent_type == "contributor") || principal is Customer }
unless { principal has role && ["owner", "curator"].contains(principal.role) };

// Generic OData writes bypass the action ladder: PATCH and DELETE authorize
// as `update`/`delete` and match no named list above. `create` stays open —
// submissions legitimately create their draft. Reads stay open.
forbid(
  principal,
  action in [
    Action::"update",
    Action::"delete"
  ],
  resource is DesignElement
)
when { (principal has agent_type && principal.agent_type == "contributor") || principal is Customer };
