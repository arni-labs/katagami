// ArtStyle — base grant; the boundaries below narrow it.
permit(principal, action, resource is ArtStyle);

// Curator/pipeline-owned actions. Contributor agents never invoke these;
// a human may only if their verified role is owner or curator. Scoped so
// the pipeline and operator key (no role, no agent_type) keep working.
forbid(
  principal,
  action in [
    Action::"AddCuratorNotes",
    Action::"Archive",
    Action::"AttachComputedFacets",
    Action::"AttachPublishedAssets",
    Action::"AttachTasteVector",
    Action::"AttachVerifiedThumbnail",
    Action::"IncrementFork",
    Action::"IncrementUsage",
    Action::"MarkQualityPassed",
    Action::"Publish",
    Action::"Restore",
    Action::"Revise",
    Action::"SetCreator",
    Action::"SetFeatured",
    Action::"SetTaxonomy",
    Action::"UpdateQuality"
  ],
  resource is ArtStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };

// Generic OData writes bypass the action ladder: PATCH and DELETE authorize
// as `update`/`delete` and match no named list above. `create` stays open —
// submissions legitimately create their draft. Reads stay open.
forbid(
  principal,
  action in [
    Action::"update",
    Action::"delete"
  ],
  resource is ArtStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };

// ReturnToDraft is both a curator REJECT (any submission) and a contributor
// WITHDRAW of their OWN submission. Split from the curator-only bundle above so
// the creator can return their own draft without gaining any other curator
// power. Creator match mirrors remix.cedar (own id, or an agent acting for them).
forbid(
  principal,
  action == Action::"ReturnToDraft",
  resource is ArtStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) || (principal is Customer && resource has creator_sub && resource.creator_sub == principal.id) || (context has actingFor && context.actingFor != "" && resource has creator_sub && resource.creator_sub == context.actingFor) };
