// TrajectoryVerdict — one judged trajectory at one layer (ARN-294 / ARN-295).
permit(
  principal,
  action,
  resource is TrajectoryVerdict
);

// A contributor never writes the verdict on its own trajectory. The judge runs
// under its own agent credential (mcp/skills/katagami-judge/SKILL.md), and
// layer 1 verdicts are written from the conformance engine's result — not by
// the actor being judged.
forbid(
  principal,
  action == Action::"Record",
  resource is TrajectoryVerdict
) when { principal has agent_type && principal.agent_type == "contributor" };

// Judging is a named principal's job, both layers of it. Forbidding
// contributors alone still let any other authenticated principal fabricate a
// verdict — including a passing layer 1 verdict for a run that never replayed,
// which is the one record the whole system is supposed to be unable to forge.
//
//   Agent::"katagami-judge"  the judge role's own credential; it writes the
//                            layer 1 result verbatim and its own layer 2
//   Agent::"system"          the pipeline, when it records a replay directly
//
// A verdict is terminal on write (RecordedIsFinal), so this is also the only
// moment the content can be set.
forbid(
  principal,
  action == Action::"Record",
  resource is TrajectoryVerdict
) unless {
  principal == Agent::"katagami-judge" ||
  principal == Agent::"system"
};

// An unauthenticated caller is nobody. `anonymous` is the principal id the
// platform assigns when no identity was presented (temper-authz
// SecurityContext::from_headers).
forbid(
  principal,
  action,
  resource is TrajectoryVerdict
) when { principal.id == "anonymous" };
