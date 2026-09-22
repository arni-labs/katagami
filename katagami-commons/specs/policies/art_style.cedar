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
    Action::"AttachArtStyleReview",
    Action::"AttachComputedFacets",
    Action::"AttachPublishedAssets",
    Action::"AttachAtlasPlace",
    Action::"AttachStyleDna",
    Action::"AttachTasteVector",
    Action::"AttachVerifiedThumbnail",
    Action::"IncrementFork",
    Action::"IncrementUsage",
    Action::"MarkQualityPassed",
    Action::"Publish",
    Action::"Restore",
    Action::"RecordVerificationJob",
    Action::"Revise",
    Action::"SetCreator",
    Action::"SetFeatured",
    Action::"SetTaxonomy",
    Action::"SetVisitorVisibility",
    Action::"SubmitForReview",
    Action::"UpdateQuality"
  ],
  resource is ArtStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };

// Attribution is contributor-authored before publication. The state machine
// invalidates the affected reviews on these edits. Keep unknown/missing status
// and published records closed; creator/actingFor checks below still apply.
forbid(
  principal,
  action in [Action::"SetCredits", Action::"SetModelProvenance"],
  resource is ArtStyle
)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) || (context has status && ["Draft", "UnderReview"].contains(context.status)) };

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
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) || (principal is Customer && action != Action::"create" && context has creator_sub && context.creator_sub == principal.id) || (context has actingFor && context.actingFor != "" && context has creator_sub && context.creator_sub == context.actingFor) };

// ARN-315: authoring actions (SetName, SetTokens, SubmitForReview, …) sat on
// the base grant with no scoping, so any signed-in human (a Customer) could
// edit or submit ANOTHER contributor's draft — and, via SetCredits/
// SetModelProvenance above, rewrite a PUBLISHED record's attribution. This
// forbid applies ONLY to Customers: a human may author their own record (their
// id is the creator_sub) and owner/curator may author any; every other Customer
// is denied. Agents are untouched — the contribution pipeline authors exactly
// as before — and reads plus the system-emitted lifecycle events stay open.
forbid(principal, action, resource is ArtStyle)
unless { action in [Action::"read", Action::"list"] || action == Action::"ArtStylePublishedEvent" || action == Action::"ArtStyleArchivedEvent" || !(principal is Customer) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) || (principal is Customer && action != Action::"create" && context has creator_sub && context.creator_sub == principal.id) };

// Contributor ownership is bound to the verified JWT at creation and retained
// for every authoring action. SetCreator stays curator-only above.
forbid(principal, action, resource is ArtStyle)
unless { !(principal has agent_type && principal.agent_type == "contributor") || action in [Action::"read", Action::"list"] || (context has actingFor && context.actingFor != "" && context has creator_sub && context.creator_sub == context.actingFor) };
