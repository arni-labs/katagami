// WritingStyle — base grant; the boundaries below narrow it.
permit(principal, action, resource is WritingStyle);

// Curator/pipeline-owned actions. Contributor agents never invoke these;
// a human may only if their verified role is owner or curator. Scoped so
// the pipeline and operator key (no role, no agent_type) keep working.
forbid(
  principal,
  action in [
    Action::"AddCuratorNotes",
    Action::"Archive",
    Action::"AttachPublishedAssets",
    Action::"AttachTasteVector",
    Action::"AttestConsent",
    Action::"IncrementFork",
    Action::"IncrementUsage",
    Action::"MarkBandsSelfConsistent",
    Action::"MarkQualityPassed",
    Action::"MarkReplicationVerified",
    Action::"Publish",
    Action::"RecordVerification",
    Action::"Restore",
    Action::"Revise",
    Action::"SetFeatured",
    Action::"SetTaxonomy",
    Action::"UpdateQuality"
  ],
  resource is WritingStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal has role && ["owner", "curator"].contains(principal.role)) };

// Generic OData writes bypass the action ladder: PATCH and DELETE authorize
// as `update`/`delete` and match no named list above. `create` stays open —
// submissions legitimately create their draft. Reads stay open.
forbid(
  principal,
  action in [
    Action::"update",
    Action::"delete"
  ],
  resource is WritingStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal has role && ["owner", "curator"].contains(principal.role)) };
