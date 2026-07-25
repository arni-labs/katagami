// DesignLanguage — base grant; the boundaries below narrow it.
permit(principal, action, resource is DesignLanguage);

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
    Action::"ReturnToDraft",
    Action::"Revise",
    Action::"SetCreator",
    Action::"SetDefaultArtStyle",
    Action::"SetFeatured",
    Action::"SetProvenanceTier",
    Action::"SetTaxonomy",
    Action::"UpdateQuality"
  ],
  resource is DesignLanguage
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
  resource is DesignLanguage
)
when { (principal has agent_type && principal.agent_type == "contributor") || principal is Customer };
