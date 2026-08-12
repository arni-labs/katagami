// Trajectory — one run's recorded content, read back through the kernel
// (ARN-295).
//
// Not one of this app's entity types. `Trajectory` is the kernel's own
// resource and `read_trajectories` its own action, asked for by the two
// endpoints layer 1 of the judge is built on:
//
//   POST /api/conformance/check              replays a session against the
//                                            actor spec that governed it
//   GET  /api/ots/trajectories/<id>/atif     the run itself, as ATIF
//
// Both return a named run verbatim — its prompts, its decisions, its tool
// results, its request bodies — so neither carries the principal-kind bypass
// the aggregate observe views have: an Admin-kind caller is refused exactly
// like anyone else no policy names
// (temper-server authz::helpers::require_trajectory_content_auth). The kernel
// ships no built-in permit for the pair either, so until this file existed
// both endpoints answered 403 to every principal and layer 1 could not run at
// all outside a policy rule posted by hand at runtime.
//
// This is an ALLOWLIST of principal ids; Cedar's default denies everything it
// does not name. Ids rather than a described class because there is nothing
// else to decide on: the request carries no resource attributes at all (the
// resource is built as `Trajectory::"unknown"`), so the only fact available is
// who is asking.
//
//   Agent::"katagami-judge"  the judge role's own credential
//                            (mcp/skills/katagami-judge/SKILL.md). It reads
//                            the trajectory for its layer 2 reading and runs
//                            layer 1 against the same run — these two
//                            endpoints are what that skill does.
//   Agent::"system"          the pipeline, for the same reason
//                            policies/trajectory_verdict.cedar admits it on
//                            Record: a verdict the platform writes from a
//                            replay it ran means the platform read the run.
//
// Deliberately NOT admitted. This surface returns another agent's recorded
// content, and the principal is a claimed id rather than an authenticated one
// (ARN-255), so the set stays as small as the work allows:
//
//   Agent::"katagami-contributor"  the judged party. Reading the corpus is
//                                  not part of authoring, and an actor that
//                                  can read what a passing run looked like is
//                                  being shown the answer sheet.
//   Agent::"katagami-reviewer"     reviews a submission's artifacts
//                                  (policies/review_agent.cedar). Its verdict
//                                  is on the work, not on the run that
//                                  produced it, and nothing it does reads a
//                                  trajectory.
//   Agent::"e2e-driver"            a test credential. An end-to-end that
//                                  needs the judge path runs as the judge.
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
