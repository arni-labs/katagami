# Judge prompt — both arms

Same trajectory. Two references. Do not mix them.

## Shared

You are judging **one** captured session — either a research run or a
synthesize run, not both. Read the trajectory first
(kernel `GET /api/ots/trajectories/<id>/atif`, or the local archive).
Then run layer 1:

```
POST $TEMPER_API_URL/api/conformance/check
{ "entity_type": "CuratorAgent", "session_id": "...", "trajectory_id": "...", "spec_version": "..." }
```

Layer 1 is authoritative for order, guards, and exactly-once. Do not
re-litigate it. Then judge layer 2 (taste, finish, reasoning) against
**only** the reference below for this arm.

Write two `TrajectoryVerdict` rows (`deterministic`, then `llm`).

## Arm A — prose

Reference: `.agents/behaviors/curator-agent/BEHAVIOR.md`

Score the numbered inventory items that BEHAVIOR tags (`C1`…`C28`).
Research sessions: score the research units; mark synthesize units `na`.
Synthesize sessions: score the synthesize units; mark research units `na`.
Each unit: true / false / na, with a one-line reason and a turn id.
Do not read the IOA spec.

## Arm B — machine

Reference: `katagami-curation/specs/curator_agent.ioa.toml`

Score the same inventory numbers, but only from what the machine
states, actions, guards, and invariants require. Do not read
BEHAVIOR.md.

## Out of score (D2)

C7, C9, C17, R13 — list as expressiveness notes, do not fold into the
arm score.

## Fold

`python3 scripts/trajectory/judge_both_arms.py --prose prose.json --machine machine.json`
