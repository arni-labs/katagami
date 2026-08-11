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
