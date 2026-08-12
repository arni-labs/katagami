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
// Tenant scope is separate and still applies: `observe_tenant_scope` refuses an
// Agent-kind caller that sends no `X-Tenant-Id` in multi-tenant mode, so
// neither endpoint hands a principal below the cross-tenant view.
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
// spec in its tenant and list them all. Admitted knowingly: the same specs are
// files in the repository these agents work in, so the endpoint discloses
// nothing they do not already hold — but if that stops being true, this is the
// permit to revisit.
//
// # Deliberately NOT admitted
//
//   Agent::"system"                unlike trajectory.cedar, which grants it.
//                                  Both endpoints here go through
//                                  `require_observe_auth`, which returns early
//                                  for a System-kind principal, and platform
//                                  code that legitimately acts as System is
//                                  covered by the kernel's built-in
//                                  `system-platform` permit (ADR-0046). A grant
//                                  here would be dead policy, and dead policy
//                                  in an allowlist reads as a call site that
//                                  exists.
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
