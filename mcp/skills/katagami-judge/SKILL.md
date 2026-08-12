---
name: katagami-judge
description: Judge a captured Katagami agent trajectory against its actor spec. Runs the deterministic conformance replay first and treats its verdict as authoritative for everything rule-shaped, then judges only taste, quality, and reasoning against the actor's spec slice. Writes one TrajectoryVerdict per layer. Use when asked to judge, review, or score a captured trajectory or agent run.
---

# Katagami judge — layer 2

You judge one captured trajectory against the actor spec it ran under.

There are two layers, and they do different jobs:

| Layer | Who decides | Scope |
|---|---|---|
| 1 — deterministic | The kernel: `POST /api/conformance/check` | Everything rule-shaped: state order, action legality, guards the run carries evidence for, exactly-once, budgets. |
| 2 — LLM | You | Only what no rule can state: taste, quality, and the reasoning behind the choices. |

Layer 1 is the **kernel's** conformance engine, not a local script. It replays
the governed dispatch rows the kernel itself recorded for the session, which is
the record of what the platform actually did — a transcript only shows what the
agent asked for. `scripts/trajectory/conformance_check.py` still exists and is
still useful, but it is an offline tool with a narrower view; §2 says when to
reach for it.

**You never override layer 1.** If the replay says a run violated its spec, it
violated its spec — a well-argued paragraph does not overturn a replay. If you
believe layer 1 is wrong, say so in your own verdict's violations as a finding
against the engine, and still leave layer 1's verdict standing. The two layers
are stored as separate `TrajectoryVerdict` rows precisely so a disagreement
stays visible instead of being averaged away.

Correspondingly: do not re-litigate rule-shaped questions. "It submitted twice"
and "it skipped self-review" are layer 1's, already answered, and repeating them
in layer 2 turns your verdict into noise. Judge what layer 1 structurally
cannot see.

## 0. Identity — your own run is captured too

You are an actor like any other. Take your `session_id` and `trajectory_id`
from the capture pipeline rather than minting them:

```bash
python3 hooks/trajectory-capture/capture.py identity
```

Send that `session_id` on **every** Temper call as `X-Session-Id`, together
with a one-sentence `X-Intent`. Run as the judge's own agent credential, never
a human's and never the credential of the agent you are judging —
`policies/trajectory_verdict.cedar` admits `Agent::"katagami-judge"` and
`Agent::"system"` on `Record` and nobody else.

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

## 1. Get the trajectory and the spec slice — and nothing else

### The trajectory — from the kernel

The kernel is the canonical source. Read the trajectory from it, not from any
machine's local files: a judge that can only work on the laptop that captured
the run cannot judge the corpus.

**Find the run, if you were given an agent rather than an id:**

```
GET $TEMPER_API_URL/api/ots/trajectories?agent_id=<agent>&outcome=<outcome>&limit=50
    -> { "trajectories": [ { "trajectory_id": ..., "session_id": ..., "agent_id": ...,
                             "outcome": ..., "turn_count": ..., "created_at": ... } ],
         "total": N }
```

Metadata only — ids, outcome, turn count, and `total` is the size of this page,
not a global count. The stored document is **not** in this response.

**Read the document:**

```
GET $TEMPER_API_URL/api/ots/trajectories/<trajectory-id>/atif
    -> the full trajectory as ATIF v1.7, returned bare (no envelope)
```

That is the whole run: `steps[]`, each with `source`, `message`,
`tool_calls[]`, and `observation.results[]`. The OTS metadata rides in
`extra["temper.metadata"]` — that is where `spec_version` and `harness` are,
**not** at a top-level `metadata` key. `extra["temper.context"]` carries the
context, `extra["temper.ots_version"]` the OTS version.

Answers other than 200 mean different things, and the bodies are **plain text,
not JSON**:

| Status | What it means |
|---|---|
| 400 | You sent no `X-Tenant-Id`. It is required here. |
| 403 | Your principal has no Cedar permit for `read_trajectories` on `Trajectory` in that tenant. There is no admin bypass on this endpoint. |
| 404 | No trajectory with that id in that tenant. |
| 422 | The stored document has no valid ATIF rendering. The row is intact; it cannot be exported. Say so and stop. |
| 503 | The server has no durable metadata backend, so nothing is stored to read. |

There is no `GET /api/ots/trajectories/<id>` without the `/atif` suffix; the
only routes are the list, the POST, and this export
(`temper-server/src/api/mod.rs`).

**Offline fallback, and only that.** If the kernel is unreachable, the capture
archive on the machine that recorded the run holds the same document as OTS:

```
~/.katagami/trajectory-queue/archive/<trajectory-id>.json
```

Use it only when the kernel could not answer, and **say in your handback that
you judged from a local archive rather than the canonical store** — a verdict
read off one laptop's disk is not reproducible by anyone else. If neither the
kernel nor an archive has it, you cannot read that trajectory: say so and stop.
Never judge a run from its metadata row.

### The two paths do not carry the same things

The kernel exports ATIF (`steps[]`); the archive holds OTS (`turns[]` with
`messages[]` and `decisions[]`). Most of it corresponds — the step id and the
tool-call/observation pairing say what `turn_id` and `cause_id` say. Some of it
does not, and guessing costs you findings:

| | kernel (`/atif`) | archive (OTS) |
|---|---|---|
| turn identity | step id, plus the turn id under the step's `extra` | `turn_id` |
| decisions | folded into the agent step's tool calls and observations | `decisions[]`, each with `decision_id` and `cause_id` |
| image references | the inline `[image …]` marker in the message text | the marker **and** structured `attachments` |
| spec version provenance | `metadata.tags` | `metadata.tags` |

**Images.** `OTSMessage` has no attachments field, so the structured
`attachments` a capture writes exist only in the archive — the kernel drops
them. The inline marker is what survives both paths, and it is self-sufficient:

```
[image image/png sha256:abc123 /archive/images/abc123.png]   you can open this
[image image/png unavailable sha256:def456]                  you cannot
```

A marker never names a path that does not open. If it says `unavailable`, that
picture is gone: the hash identifies it, and a taste finding that needed to see
it is a finding you cannot make — say so rather than guessing from the words
around it.

### The spec slice — only the actor's own

The actor specs live in this repository, and the version is a function of the
spec file, so you can prove you are reading the contract the run executed
under rather than trusting a label:

```bash
python3 scripts/trajectory/spec_version.py CuratorAgent \
  --verify "<extra['temper.metadata'].spec_version>"
```

Read the provenance too, because it changes what the version proves. It rides
as a **tag**: look in `extra["temper.metadata"].tags` for
`spec-version-source:<value>`. A tag rather than a field of its own, because
the kernel parses an upload into `OTSMetadata` and drops every key it does not
model — a field we invented would read as absent on the canonical path, and
absent means "locally computed", which is the wrong answer for a digest the
kernel itself reported.

- **`registry`** — capture read the digest from `GET /observe/specs/{entity}`.
  That is the digest a conformance check compares against, so a 409 means the
  registered spec genuinely changed between the run and the check.
- **`local`** — capture computed the hash from its own checkout, because the
  registry could not be reached. It equals the registered digest only if that
  deploy registered those exact bytes. **A 409 on a `local` version is as
  likely to be a normalization difference as a real spec change**, so report it
  that way instead of concluding the run executed under a spec nobody has.
- **`attested`** — a registry answer the capturing machine had recorded
  earlier, replayed while offline. As good as `registry`, one remove: it says
  *some* kernel reported this digest, not necessarily the one you are checking
  against.
- **`snapshot`** — the version was neither read nor recomputed; it was matched
  against a spec source the machine had stored. Treat it like `local`.
- **absent** — the trajectory predates the field; read it as `local`.

A version this checkout can no longer produce is not automatically drift:
capture snapshots the spec source under its hash at capture time, so `--verify`
also accepts a version the snapshot store holds, and tells you on stderr when
it answered from there. Read the contract the run actually executed under with:

```bash
python3 scripts/trajectory/spec_version.py CuratorAgent \
  --show-snapshot "<that version>"
```

`<ActorName>` is one of `CuratorAgent`, `ReviewAgent`, `HumanCurator`
(`katagami-curation/specs/`). Read that actor's states, actions, guards, and
invariants from its `.ioa.toml` — and stop there. The deployed copy is
readable at `GET $TEMPER_API_URL/observe/specs/<ActorName>` (states, actions
with their guards and effects, invariants, state variables); that endpoint has
no version filter, which is exactly why the version is computed from the file.

**Only the actor's own slice.** Not the sibling actors, not the artifact
entities, not the Cedar policies, not the taste rules of a different lane. A
judge that reads the whole system starts scoring runs against obligations their
actor never had, and the verdicts stop being about conformance at all. If the
slice does not contain the ground for a finding, the finding does not belong in
this verdict.

If the trajectory names no spec version, or `--verify` fails because the spec
has moved and no snapshot of the recorded version exists either, **stop**:
judging a run against a contract you cannot confirm was in force is not a
judgement. Record that as the reason and do not invent a substitute. (Capture
refuses to post a trajectory with no spec version, so a missing one means the
row predates that rule.)

## 2. Layer 1 first — always

Run the replay before you form any opinion, so your reading is anchored to what
actually happened.

```
POST $TEMPER_API_URL/api/conformance/check
{
  "entity_type":   "CuratorAgent",
  "session_id":    "<the judged run's session id>",
  "trajectory_id": "<trajectory id>",
  "spec_version":  "<the version the run executed under>"
}
```

`entity_type` and `session_id` are required; `trajectory_id` and `spec_version`
are optional but send both. `trajectory_id` contributes the agent-side
decisions to the walk. `spec_version` is **verified, not selected**: the server
compares it with the registered spec's hash and answers 409 if they differ,
which is the check you want — a report against a spec that did not govern the
run is not a report. Omitting it makes the check fall back to the trajectory's
own `metadata.spec_version`, and if nothing names a version the report comes
back with `spec_resolution: "unresolved"` and an evidence gap saying so.

`limit` caps the rows read (1–5000, default 5000).

The answer:

```json
{
  "tenant": "...", "entity_type": "CuratorAgent", "session_id": "...",
  "trajectory_id": "...", "spec_version": "<the registered spec's hash>",
  "row_limit": 5000, "truncated": false,
  "report": {
    "verdict": "fail",
    "passed": false,
    "spec_resolution": "pinned",
    "evidence_complete": true,
    "violations": [
      {
        "index": 14,
        "kind": "illegal_transition",
        "action": "SubmitDesignLanguages",
        "entity_type": "CuratorAgent",
        "detail": "SubmitDesignLanguages from Drafting; only legal from SelfReviewed"
      }
    ],
    "evidence_gaps": [],
    "stats": { "stream_length": 22, "actor_rows": 18, "transitions_unchecked": 0, "...": 0 }
  }
}
```

Read all four of these, not just `passed`:

- **`verdict`** — `pass`, `fail`, or `indeterminate`. `indeterminate` is not a
  failure and not a pass: the evidence could not settle it.
- **`passed`** — true only for `pass`. False for both a failure and an
  unsettled check, so it can never be read as "checked and fine" on its own.
- **`evidence_complete`** — false when anything went unchecked. `passed &&
  evidence_complete` is the only pair that means a fully checked conforming run.
- **`evidence_gaps`** — plain sentences saying what was missing and why. Report
  these; they are the honest limit of the check.

`spec_resolution: "unresolved"` means the report was produced against whatever
spec is registered now, which may not be the one that governed the run. Treat
that as a reason you could not fully judge, and say so.

Failure bodies are **plain text**, not JSON: 400 (no `X-Tenant-Id`, bad
`limit`, or the trajectory belongs to a different session), 403 (no Cedar
permit for `read_trajectories` on `Trajectory`), 404 (no spec registered for
that entity type, or no such trajectory), 409 (`spec_version` disagrees with
the registered spec), 422 (malformed body), 503 (no durable store).

### The offline replay — when the kernel cannot answer

`scripts/trajectory/conformance_check.py` replays a captured trajectory against
the spec files in this checkout. It is the fallback, and it sees less: a
transcript records the calls the agent issued, while the kernel's rows record
the dispatches the platform actually governed.

```bash
python3 scripts/trajectory/conformance_check.py \
  --trajectory ~/.katagami/trajectory-queue/archive/<trajectory-id>.json \
  --actor-spec CuratorAgent \
  --out layer1.json
```

It answers in its own shape — `passed`, `evidence_complete`, `final_state`,
`actions_replayed`, `violations`, and `unverifiable` (the guards it could not
replay, chiefly `cross_entity_state`, which is resolved off the entity graph at
dispatch time). Read `unverifiable` as carefully as `violations`: those guards
were **not** checked, and a `passed: true` does not cover them.

If you used it, `judged_by` is `katagami-conformance@1` rather than the kernel,
and your handback must say layer 1 ran offline.

### Either way

Write layer 1's result **verbatim** into its own `TrajectoryVerdict` (§4) with
`layer = "deterministic"`. Do not summarize, soften, or re-score it. The
verdict entity has a field for each part of the result, so nothing has to be
flattened into a boolean:

| TrajectoryVerdict field | From the kernel report | From the offline tool |
|---|---|---|
| `passed` | `report.passed` | `passed` |
| `violations` | `report.violations` | `violations` |
| `unverifiable` | `report.evidence_gaps` | `unverifiable` |
| `actions_replayed` | `report.stats.actor_rows` — the rows it walked for this actor, not `stream_length`, which counts rows it skipped as another actor's or as platform bookkeeping | `len(actions_replayed)` |
| `evidence_complete` | `report.evidence_complete` | `evidence_complete` |
| `final_state` | `""` — the kernel walks every entity in the session and reports `stats.terminal_entities`, a count, not a per-entity final state | `final_state` |

## 3. Layer 2 — judge taste, quality, and reasoning

Now judge what the replay cannot. Three questions, each answered against the
spec slice and the trajectory's own content:

1. **Taste.** Where the actor made a design judgement, is it good work by
   Katagami's standards — bright and clean, generous spacing, restrained
   accents, real hierarchy? Cite the turn. Image evidence rides on messages as
   `attachments` (`{"type": "image", "media_type", "path"}`); open the paths
   before judging what something looks like.
2. **Quality.** Is the output finished, or nominally complete? A submission
   that satisfies every guard and still looks unfinished passes layer 1 and
   fails here.
3. **Reasoning.** Do the decisions in the trajectory follow from the
   observations? `cause_id` links each decision to the observation it produced
   — use it. A run that read a file and then ignored what it said is visible in
   the chain. A decision whose consequence is `{"success": false, "error_type":
   "no_result"}` was never observed at all: treat it as unknown, not as done.

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
    -> 201, the new entity's state:
       { "entity_type": "TrajectoryVerdict", "entity_id": "<verdict id>",
         "status": "Pending", "fields": { ... }, "@odata.id": "TrajectoryVerdicts('<verdict id>')", ... }
```

The id is **`entity_id`**. There is no `Id` key on this response — that
spelling belongs to the PG-actor and ToolDefinition creation paths, not to a
spec-governed entity like this one. Read `entity_id`.

```
POST $TEMPER_API_URL/tdata/TrajectoryVerdicts('<verdict id>')/Temper.Record
{
  "trajectory_id":     "<trajectory id>",
  "session_id":        "<the judged run's session id>",
  "actor_spec":        "CuratorAgent",
  "spec_version":      "<the version the run executed under>",
  "layer":             "deterministic",
  "passed":            false,
  "violations":        "[{\"index\":14,\"kind\":\"illegal_transition\",\"detail\":\"...\"}]",
  "unverifiable":      "[]",
  "actions_replayed":  22,
  "evidence_complete": true,
  "final_state":       "",
  "judged_by":         "katagami-conformance@kernel",
  "judged_at":         "2026-08-11T10:00:00Z"
}
```

Action parameters are top-level, with no wrapper key. A success returns 200
with the entity's state; the `Temper.` namespace prefix is required in the path
but only the last dot-segment is read as the action name. Errors come back as
`{"error": {"code": ..., "message": ...}}` — 403 `AuthorizationDenied`, 409
`ActionFailed` when a guard rejected the transition, 404
`EntityTypeNotGoverned` when no spec is registered.

Then the same call again on a **new** verdict entity with `layer = "llm"`, your
own findings in `violations`, `judged_by` set to your agent id and model, and
`actions_replayed` / `final_state` left at their defaults — those describe a
replay, and layer 2 does not replay anything. Set `evidence_complete` to false
if anything stopped you judging the whole run (an image you could not open, a
truncated trajectory).

`Recorded` is terminal — a verdict is a fact about a completed judgement and is
never edited in place. Re-judging writes a new `TrajectoryVerdict`.

If `violations` is large, write it to a file and pass `file:<file_id>` instead
of inline JSON.

## 5. Hand back

Report, in this order:

1. The layer 1 verdict — its `verdict` word (`pass` / `fail` /
   `indeterminate`), the violations unedited, and everything it could not
   settle (`evidence_gaps`, or `unverifiable` from the offline tool).
2. Which engine produced it: the kernel, or the offline replay. If it was the
   offline replay, say why the kernel could not answer.
3. Your layer 2 verdict — passed or failed, with findings, each citing a turn.
4. The two `TrajectoryVerdict` ids.
5. Anything you could not judge and why: no spec version, no snapshot of the
   version the run executed under, images marked unavailable, a truncated
   trajectory, or a document read from a local archive rather than the kernel.
   Say it plainly; a judge that quietly narrows its own scope is worse than one
   that abstains out loud.
