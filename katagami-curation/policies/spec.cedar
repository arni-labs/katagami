// Spec — the registered IOA contract, read back through the kernel (ARN-296).
//
// Not one of this app's entity types. `Spec` is the kernel's own resource and
// `read_specs` its own action. TWO endpoints ask Cedar for that pair, and this
// file is what answers for both:
//
//   GET /observe/specs            every spec loaded in the tenants this caller
//                                 is scoped to — entity type, state count,
//                                 action count, verification status
//   GET /observe/specs/{entity}   one entity type's whole contract: states,
//                                 initial state, every action with its kind,
//                                 from/to, guards, effects and params,
//                                 invariants, state variables — and
//                                 `spec_version`, the content hash of the
//                                 registered IOA source
//
// Agent code reaches both of them without naming a URL: `temper.specs()` and
// `temper.spec_detail(entity)` in the sandbox forward to exactly these two
// paths carrying the calling agent's own identity
// (temper-sandbox dispatch.rs). So this file also decides whether an agent's
// spec probe works — before it existed, every katagami agent's `temper.specs()`
// answered 403 along with everything else.
//
// The second is the one this permit is for. That digest is what a conformance
// check compares a run's recorded `metadata.spec_version` against, so a capture
// that can read it stamps the version the kernel will recognise instead of one
// computed from a checkout that may not be what the deploy registered
// (scripts/trajectory/spec_version.py, `registered_version`). Without the
// permit the read answers 403, capture falls back to the local hash and every
// trajectory carries `spec-version-source: local` — provenance the judge skill
// tells the reader to discount, on every verdict, forever.
//
// # What this permit is not
//
// It is NOT what protects spec text today. Both handlers go through
// `require_observe_auth` (temper-server authz::helpers.rs), which returns
// early for an Admin- or System-kind principal before Cedar is consulted at
// all — and principal kind is a request header nothing authenticates
// (ARN-255). So anyone who sends `x-temper-principal-kind: admin` reads these
// endpoints with or without this file. What this file decides is whether the
// AGENT-kind principals below can, which is the only question the pipeline
// actually asks: `spec_version.py` sends `x-temper-principal-kind: agent` and
// its configured id, deliberately, rather than claiming a kind it is not.
//
// When ARN-255 removes that bypass this permit becomes load-bearing for the
// three ids named here and for nothing else. Written down so that is a
// decision on the record rather than a discovery later.
//
// Tenant scope is separate and conditional, so it is stated as the condition it
// is: in MULTI-tenant mode `observe_tenant_scope` refuses an Agent-kind caller
// that sends no `X-Tenant-Id`, which keeps the principals below inside one
// tenant. In single-tenant mode a header-less caller gets the unscoped view and
// `require_observe_auth` evaluates against tenant `system`, which falls back to
// the global policy set. A single-tenant deployment that loads these policies
// globally therefore does hand a principal below the whole registry listing.
// That is a deployment shape this repo's own `temper serve` e2e path uses, so
// it is a real configuration rather than a hypothetical one.
//
// # Why an allowlist of ids
//
// This is an ALLOWLIST of principal ids; Cedar's default denies everything it
// does not name. Ids rather than a described class because there is nothing
// else to decide on: the request carries no resource attributes at all (the
// resource is built as `Spec::"unknown"`), so the only fact available is who is
// asking. An attribute test would also be strictly weaker — several pipeline
// principals declare `agent_type = "system"`, so a rule written against that
// attribute would admit `Agent::"katagami-finalizer"` and anything else that
// declares it.
//
//   Agent::"katagami-judge"        the judge role's own credential. It reads
//                                  the deployed copy of the actor's contract —
//                                  states, actions with their guards and
//                                  effects, invariants — as the ground for a
//                                  finding (mcp/skills/katagami-judge/SKILL.md
//                                  §"Only the actor's own slice").
//   Agent::"katagami-contributor"  the capture pipeline, which runs under the
//                                  identity of the session it is capturing —
//                                  not under an identity of its own. This is
//                                  the id the shipped hook configuration sets
//                                  (hooks/trajectory-capture/settings.snippet.json),
//                                  so it is the principal whose 403 is the bug
//                                  described above.
//   Agent::"katagami-reviewer"     the same pipeline for a captured ReviewAgent
//                                  run (`ACTOR_SPEC_BY_AGENT_ID` in
//                                  scripts/trajectory/spec_version.py maps this
//                                  id to the ReviewAgent contract).
//
// # Why the contributor, when trajectory.cedar refuses it
//
// policies/trajectory.cedar admits neither the contributor nor the reviewer,
// on the ground that an actor which can read what a passing run looked like is
// being shown the answer sheet. That reasoning does not carry over, and the
// difference is the point: a trajectory is somebody else's recorded run, while
// a spec is the actor's OWN operating contract. An actor cannot conform to a
// contract it may not read, it already ships with that contract in the
// checkout (katagami-curation/specs/*.ioa.toml), and what it reads here is the
// digest of those same bytes as the kernel registered them.
//
// The reach is wider than that goal and the difference is not expressible in
// Cedar here: the pair carries no resource attributes, so a permit cannot be
// narrowed to "the caller's own actor", to the detail endpoint, or to the
// `spec_version` field. A principal below can therefore read any registered
// spec in its tenant and list them all.
//
// Do not read that as harmless on the ground that these specs are files in this
// repository. The shipped capture configuration runs in tenant `default` on the
// shared TemperPaw server, and that tenant carries the platform's own entity
// types and any other app installed beside this one — contracts that are NOT
// files here. So `GET /observe/specs` under this grant enumerates the states,
// actions, guards and invariants of every app registered on that tenant, which
// is reconnaissance surface, not a restatement of the checkout.
//
// Admitted anyway, with the reason stated as it actually is: nothing is
// exposed today that a request header does not already expose to anyone
// (`require_observe_auth` still lets an Admin-kind caller past Cedar), and the
// capture pipeline cannot stamp an attested spec version without it. What
// closes the gap properly is not narrowing this permit — Cedar has nothing to
// narrow on — but giving the capture pipeline a tenant of its own, or giving
// the `Spec` resource attributes a policy could test. Whoever removes the
// Admin-kind bypass (ARN-255) inherits this decision and should revisit it in
// the same change, because that is the moment this permit starts being the
// thing that holds the listing open.
//
// # Deliberately NOT admitted
//
//   Agent::"system"                unlike trajectory.cedar, which grants it.
//                                  Not because a grant would be unreachable —
//                                  it would not be. The early return in
//                                  `require_observe_auth` keys on principal
//                                  KIND, and the kernel's built-in permit is
//                                  written `principal is System` (ADR-0046);
//                                  neither covers a caller that sends
//                                  `kind: agent, id: system`, which is the
//                                  shape the commons finalizer uses and which
//                                  reaches Cedar as exactly this principal.
//                                  Such a caller is DENIED here, and that is
//                                  the whole reason to say so: an operator
//                                  debugging that 403 should find it named in
//                                  this file rather than conclude the policy
//                                  layer is not involved. It is left out
//                                  because nothing in this repo reads a spec
//                                  under that identity — add it when a call
//                                  site exists, not by analogy.
//   Agent::"katagami-finalizer"    declares `agent_type = "system"` but is not
//                                  the platform; it backfills exports and reads
//                                  no spec.
//   Agent::"katagami-curation-escalation"
//                                  escalates a stuck job to a human. It moves
//                                  work between states through this app's own
//                                  entity actions; it never asks the kernel
//                                  what a contract says.
//   Agent::"e2e-driver"            a test credential. An end-to-end that needs
//                                  the capture path runs as the identity whose
//                                  run it is capturing.
//
// The four ids `ACTOR_SPEC_BY_AGENT_ID` also maps — `katagami-curator`,
// `katagami-iterate`, `katagami-review-agent`, `katagami-human-curator` — are
// converter-side aliases that name no principal in this app's policy set, so
// there is no credential to grant. A capture configured under one of them
// still stamps `local`; the fix is to configure it under an id this app knows,
// not to widen the allowlist to names nothing issues.
//
// An agent that declares no type and the `anonymous` principal the platform
// assigns when no identity was presented are denied here by default, because
// this file names ids and neither is one. Those decisions are pinned by
// evaluation rather than left implied —
// katagami-curation/tests/test_actor_policy_evaluation.py runs each of them
// through Cedar, so broadening this permit fails the suite rather than quietly
// widening who may read the contracts.
permit(
  principal,
  action == Action::"read_specs",
  resource is Spec
) when {
  principal == Agent::"katagami-judge" ||
  principal == Agent::"katagami-contributor" ||
  principal == Agent::"katagami-reviewer"
};
