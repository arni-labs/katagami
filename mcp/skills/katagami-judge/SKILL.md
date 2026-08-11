---
name: katagami-judge
description: Judge a captured Katagami agent trajectory against its actor spec. Runs the deterministic conformance check first and treats its verdict as authoritative for everything rule-shaped, then judges only taste, quality, and reasoning against the actor's spec slice. Writes one TrajectoryVerdict per layer. Use when asked to judge, review, or score a captured trajectory or agent run.
---

# Katagami judge — layer 2

You judge one captured trajectory against the actor spec it ran under.

There are two layers, and they do different jobs:

| Layer | Who decides | Scope |
|---|---|---|
| 1 — deterministic | `POST /api/conformance/check` | Everything rule-shaped: state order, action legality, guards, invariants, exactly-once, budgets. |
| 2 — LLM | You | Only what no rule can state: taste, quality, and the reasoning behind the choices. |

**You never override layer 1.** If the conformance engine says a run violated
its spec, it violated its spec — a well-argued paragraph does not overturn a
replay. If you believe layer 1 is wrong, say so in your own verdict's
violations as a finding against the engine, and still leave layer 1's verdict
standing. The two layers are stored as separate `TrajectoryVerdict` rows
precisely so a disagreement stays visible instead of being averaged away.

Correspondingly: do not re-litigate rule-shaped questions. "It submitted twice"
and "it skipped self-review" are layer 1's, already answered, and repeating them
in layer 2 turns your verdict into noise. Judge what layer 1 structurally
cannot see.

## 0. Identity — your own run is captured too

You are an actor like any other. Before the first call, mint a `session_id`
(e.g. `judge-<trajectory-id-short>-<n>`) and send it on **every** Temper call as
`X-Session-Id`, together with a one-sentence `X-Intent`. Run as the judge's own
agent credential, never a human's and never the credential of the agent you are
judging.

Standard headers on every call:

```
X-Tenant-Id: <tenant>
X-Session-Id: <your session id>
X-Intent: <one sentence: what this call is for>
Authorization: Bearer $TEMPER_API_KEY
x-temper-principal-kind: agent
x-temper-principal-id: katagami-judge
```

Your own trajectory is captured by the same pipeline
(`hooks/trajectory-capture/README.md`), so a judge that drifts is itself
judgeable.

## 1. Fetch the trajectory and the spec slice — and nothing else

### The trajectory

```
GET $TEMPER_API_URL/api/ots/trajectories?agent_id=<agent>&limit=50
    -> { "trajectories": [ { "trajectory_id": ..., "session_id": ..., "data": "<OTS JSON>" } ], "total": N }
```

Filter to the `trajectory_id` you were asked to judge and parse its `data`.
`metadata.spec_version` on that document tells you which version of the actor
spec the run executed under; `metadata.harness` tells you which harness drove
it.

### The spec slice — only the actor's own

```
GET $TEMPER_API_URL/tdata/Specs?$filter=Name eq '<ActorName>' and Version eq '<spec_version>'
```

`<ActorName>` is one of `CuratorAgent`, `ReviewAgent`, `HumanCurator`
(`katagami-curation/specs/`). Read that actor's states, actions, guards, and
invariants — and stop there.

**Only the actor's own slice.** Not the sibling actors, not the artifact
entities, not the Cedar policies, not the taste rules of a different lane. A
judge that reads the whole system starts scoring runs against obligations their
actor never had, and the verdicts stop being about conformance at all. If the
slice does not contain the ground for a finding, the finding does not belong in
this verdict.

If `metadata.spec_version` is missing or names a version you cannot fetch,
**stop**: judging a run against a contract you cannot confirm was in force is
not a judgement. Record that as the reason and do not invent a substitute.

## 2. Layer 1 first — always

Run the deterministic check before you form any opinion, so your reading is
anchored to what actually replayed.

```
POST $TEMPER_API_URL/api/conformance/check
Content-Type: application/json

{
  "trajectory_id": "<trajectory id>",
  "actor_spec": "CuratorAgent",
  "spec_version": "<metadata.spec_version>"
}
```

Response:

```json
{
  "passed": false,
  "actor_spec": "CuratorAgent",
  "spec_version": "<hash>",
  "violations": [
    {
      "kind": "illegal_transition",
      "turn_id": 14,
      "detail": "Submit from Drafting; Submit is only legal from SelfReviewed"
    }
  ]
}
```

Write layer 1's result verbatim into its own `TrajectoryVerdict` (§4) with
`layer = "deterministic"`. Do not summarize, soften, or re-score it.

## 3. Layer 2 — judge taste, quality, and reasoning

Now judge what the replay cannot. Three questions, each answered against the
spec slice and the trajectory's own content:

1. **Taste.** Where the actor made a design judgement, is it good work by
   Katagami's standards — bright and clean, generous spacing, restrained
   accents, real hierarchy? Cite the turn.
2. **Quality.** Is the output finished, or nominally complete? A submission
   that satisfies every guard and still looks unfinished passes layer 1 and
   fails here.
3. **Reasoning.** Do the decisions in the trajectory follow from the
   observations? `cause_id` links each decision to the observation it produced
   — use it. A run that read a file and then ignored what it said is visible in
   the chain.

Rules for findings:

- Every finding cites a `turn_id`, and where relevant a `decision_id`.
- Every finding names the part of the spec slice it is judged against, or is
  labelled explicitly as a taste judgement with no rule behind it.
- No finding restates a layer 1 violation.
- Absent evidence, no finding. "Probably did not consider X" is not a finding.

## 4. Write one TrajectoryVerdict per layer

Two rows, always: one for layer 1, one for layer 2. Create the entity, then
record it in a single action.

```
POST $TEMPER_API_URL/tdata/TrajectoryVerdicts
{}
    -> { "Id": "<verdict id>" }

POST $TEMPER_API_URL/tdata/TrajectoryVerdicts('<verdict id>')/Temper.Record
{
  "trajectory_id": "<trajectory id>",
  "session_id":    "<the judged run's session id>",
  "actor_spec":    "CuratorAgent",
  "spec_version":  "<metadata.spec_version>",
  "layer":         "deterministic",
  "passed":        false,
  "violations":    "[{\"kind\":\"illegal_transition\",\"turn_id\":14,\"detail\":\"...\"}]",
  "judged_by":     "temper-conformance@<engine version>",
  "created_at":    "2026-08-11T10:00:00Z"
}
```

Then the same call again with `layer = "llm"`, your own findings in
`violations`, and `judged_by` set to your agent id and model.

`Recorded` is terminal — a verdict is a fact about a completed judgement and is
never edited in place. Re-judging writes a new `TrajectoryVerdict`.

If `violations` is large, write it to a file and pass `file:<file_id>` instead
of inline JSON.

## 5. Hand back

Report, in this order:

1. The layer 1 verdict — passed or failed, and the violations, unedited.
2. Your layer 2 verdict — passed or failed, with findings, each citing a turn.
3. The two `TrajectoryVerdict` ids.
4. Anything you could not judge and why (missing spec version, unfetchable
   slice, truncated trajectory). Say it plainly; a judge that quietly narrows
   its own scope is worse than one that abstains out loud.
