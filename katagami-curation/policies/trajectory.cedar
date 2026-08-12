// Trajectory — one run's recorded content, read back through the kernel
// (ARN-295).
//
// Not one of this app's entity types. `Trajectory` is the kernel's own
// resource and `read_trajectories` its own action. THREE endpoints ask Cedar
// for that pair, and this file is what answers for all three:
//
//   POST /api/conformance/check           layer 1 — replays a session against
//                                         the actor spec that governed it
//   GET  /api/ots/trajectories/<id>/atif  the run itself, as ATIF
//   GET  /observe/trajectories            the tenant-wide aggregate view:
//                                         counts, per-action stats, and the
//                                         most recent failed entries
//
// The first two are the judge's, and they return a named run verbatim — its
// prompts, its decisions, its tool results, its request bodies. Neither
// carries the principal-kind bypass the observe views keep, so an Admin-kind
// caller is refused exactly like anyone else no policy names
// (temper-server authz::helpers::require_trajectory_content_auth). The kernel
// ships no built-in permit for the pair, so until this file existed both
// answered 403 to every principal and layer 1 could not run at all outside a
// policy rule posted by hand at runtime.
//
// The third is NOT the judge's, and it is admitted as a consequence rather
// than a goal. `GET /observe/trajectories` goes through `require_observe_auth`,
// which still returns early for an Admin- or System-kind principal
// (temper-server authz::helpers.rs) — and principal kind is a request header
// nothing authenticates, so that endpoint is open today to anyone who claims
// `x-temper-principal-kind: admin`, with or without this file. What changes
// when ARN-255 lands and that bypass goes is that this permit becomes the only
// thing holding the aggregate view open for the two principals below. Written
// down here so that is a decision on the record rather than a discovery later.
// Scope stays tenant-local either way: `observe_tenant_scope` refuses an
// Agent-kind caller that sends no `X-Tenant-Id` in multi-tenant mode, so
// neither principal below reaches the cross-tenant view through it.
//
// This is an ALLOWLIST of principal ids; Cedar's default denies everything it
// does not name. Ids rather than a described class because there is nothing
// else to decide on: the request carries no resource attributes at all (the
// resource is built as `Trajectory::"unknown"`), so the only fact available is
// who is asking. An attribute test would also be strictly weaker — several
// pipeline principals declare `agent_type = "system"`, so a rule written
// against that attribute would admit `Agent::"katagami-finalizer"` and
// anything else that declares it.
//
//   Agent::"katagami-judge"  the judge role's own credential
//                            (mcp/skills/katagami-judge/SKILL.md). It reads
//                            the trajectory for its layer 2 reading and runs
//                            layer 1 against the same run — the first two
//                            endpoints are what that skill does.
//   Agent::"system"          the platform. PRECAUTIONARY: nothing in this repo
//                            calls any of the three endpoints as `system`
//                            today. It is granted by analogy with
//                            policies/trajectory_verdict.cedar, which admits
//                            the same principal on `Record` "when it records a
//                            replay directly" — a verdict the platform writes
//                            from a replay implies the platform read the run.
//                            Drop it if that path is ruled out rather than
//                            built.
//
// Deliberately NOT admitted. These surfaces return another agent's recorded
// content, and the principal is a claimed id rather than an authenticated one
// (ARN-255), so the set stays as small as the work allows:
//
//   Agent::"katagami-contributor"  the judged party. Reading the corpus is not
//                                  part of authoring, and an actor that can
//                                  read what a passing run looked like is
//                                  being shown the answer sheet.
//   Agent::"katagami-reviewer"     reviews a submission's artifacts
//                                  (policies/review_agent.cedar). Its verdict
//                                  is on the work, not on the run that
//                                  produced it, and nothing it does reads a
//                                  trajectory.
//   Agent::"katagami-finalizer"    declares `agent_type = "system"` but is not
//                                  the platform; it backfills exports.
//   Agent::"e2e-driver"            a test credential. An end-to-end that needs
//                                  the judge path runs as the judge.
//
// An agent that declares no type, an Admin-kind caller and the `anonymous`
// principal the platform assigns when no identity was presented are denied
// here by default, because this file names ids and none of them is one. Those
// decisions are pinned by evaluation rather than left implied —
// katagami-curation/tests/test_actor_policy_evaluation.py runs each of them
// through Cedar, so broadening this permit fails the suite rather than
// quietly widening who may read the corpus.
permit(
  principal,
  action == Action::"read_trajectories",
  resource is Trajectory
) when {
  principal == Agent::"katagami-judge" ||
  principal == Agent::"system"
};
