// DesignLanguage — STANCE: authoring open; publishing, advancing and curating are gated.
permit(principal, action, resource is DesignLanguage);

// Contributor boundary (ARN-151, ARN-319): contributors author, the pipeline
// and the human curator advance and publish.
//
// `SubmitForReview` is on this list because of ARN-319. The contributor
// rulebook says plainly that a contributor never advances a submission —
// "Contributors never call finalizer-owned verification, quality, review,
// published-asset, or publish actions" — but that sentence was convention, not
// enforcement: a `katagami-contributor` calling `SubmitForReview` on a
// DesignLanguage got 409 `ActionFailed` from the state-machine guard and never
// 403 `AuthorizationDenied`, so a boundary-violating run and a clean one were
// indistinguishable. Cedar now objects to the caller.
//
// This does NOT lock `SubmitForReview` to the finalizer the way art_style.cedar
// does (see test_only_art_styles_reserve_submit_for_review_to_the_finalizer).
// The synthesize agent still drives its own draft to review in-session
// (katagami-curation/APP.md), and it is a declared `worker`, not a contributor.
// What changed is that the OUTSIDE contributor lane can no longer do it.
//
// SetProvenanceTier and SetDefaultArtStyle are curator judgments, not
// contributor inputs.
//
// Written against an unconstrained `principal` on purpose. `PrincipalKind`
// defaults to `Customer` both when `x-temper-principal-kind` is absent and when
// its value is unrecognized (temper-authz `context.rs`
// `SecurityContext::from_headers`), so a rule targeting `principal is Agent`
// would be shed by a caller that simply declines to declare a kind.
forbid(
  principal,
  action in [
    Action::"SubmitForReview",
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes",
    Action::"SetProvenanceTier", Action::"SetDefaultArtStyle"
  ],
  resource is DesignLanguage
) when { principal has agent_type && principal.agent_type == "contributor" };

// A caller that will not say what it is gets no benefit of the doubt on the
// actions above.
//
// The contributor boundary can only recognize a contributor by its
// `agent_type`, and that attribute comes from an OPTIONAL header
// (`x-temper-agent-type`). Omitting it was therefore a way to stop looking like
// a contributor: verified with the Cedar evaluator, an Agent principal that
// sent no agent type was ALLOWED to publish a design language. Every agent that
// legitimately acts here — the pipeline, the finalizer — knows its own type and
// sends it, so requiring the declaration costs them nothing and closes the gap
// for everyone else.
//
// ARN-319 widened this from `principal is Agent` to every principal, because
// `principal is Agent` left the DEFAULT header shape open: a caller that sends
// no `x-temper-principal-kind` is a `Customer`, matched neither this rule nor
// the contributor rule above, and the blanket permit on line 2 carried it. The
// three exemptions are each load-bearing:
//
//   principal == Agent::"system"   the WASM finalizer. It presents as
//                                  `Agent::"system"` with `agent_type` "system"
//                                  (katagami-curation/wasm/finalize_spawned_session
//                                  sends x-temper-principal-kind: agent,
//                                  x-temper-principal-id: system,
//                                  x-temper-agent-type: system — the strings are
//                                  in the committed .wasm), so it is already
//                                  exempt by declaration. Named by identity as
//                                  well because an id is stronger evidence than
//                                  a self-declared attribute, and because
//                                  denying it takes the whole curation pipeline
//                                  down: it drives SubmitForReview,
//                                  MarkQualityPassed and Publish.
//
//   principal is System            the PLATFORM. A Cedar `forbid` beats every
//                                  `permit`, including the built-in
//                                  `permit(principal is System, action, resource)`
//                                  the kernel merges into every policy set
//                                  (temper-authz `SYSTEM_PLATFORM_POLICY`,
//                                  ADR-0046). Widening the principal above from
//                                  `Agent` to unconstrained brought System into
//                                  scope; without this clause the platform's own
//                                  dispatches — state timeouts, router paths
//                                  that fall back to `SecurityContext::system()`
//                                  — would be denied. Note `Agent::"system"` and
//                                  `principal is System` are different
//                                  principals: the first is an Agent-kind
//                                  principal whose id is the string "system".
//
//   principal is Admin             the platform API-key holder. A caller that
//                                  presents the global API key without principal
//                                  headers is rewritten to
//                                  `Admin::"api-key-holder"` by the kernel's
//                                  bearer-auth layer, and that is the credential
//                                  behind the owner gallery controls
//                                  (ui/src/app/actions.ts), the ops backfills
//                                  (ui/scripts/backfill-*.mjs) and the local seed
//                                  (scripts/seed-local-remix.mjs) — all of which
//                                  send no `x-temper-agent-type`. This clause
//                                  preserves exactly today's decision for them;
//                                  it opens nothing that was not already open.
//                                  It is not a safe rule to rely on: Admin kind
//                                  is caller-supplied and unvalidated, so the
//                                  durable fix is for those callers to declare
//                                  an agent type and for this clause to go away.
//
// Same fix as katagami-curation/policies/human_curator.cedar (ARN-302).
forbid(
  principal,
  action in [
    Action::"SubmitForReview",
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachVerifiedThumbnail",
    Action::"AttachTasteVector", Action::"AttachComputedFacets",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes",
    Action::"SetProvenanceTier", Action::"SetDefaultArtStyle"
  ],
  resource is DesignLanguage
) unless {
  principal has agent_type ||
  principal == Agent::"system" ||
  principal is System ||
  principal is Admin
};
