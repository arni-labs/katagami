# Trajectory capture (ARN-293)

Turns a Claude Code session into an OTS trajectory Temper can store and a judge
can replay against an actor spec.

```
transcript JSONL --[harbor v0.21.0]--> ATIF v1.7 --[claude_session_to_ots]--> OTS 0.1.0 --> POST /api/ots/trajectories
```

| File | Role |
|---|---|
| `harbor_adapter.py` | The only place Harbor is imported. Transcript -> ATIF, plus the version pin. |
| `claude_session_to_ots.py` | ATIF -> OTS mapping, and the HTTP post. Imports no Harbor. |
| `requirements.txt` | The pin. |

## Why Harbor rather than our own parser

The transcript format belongs to the harness and it moves. Harbor's installed
agent for Claude Code declares `SUPPORTS_ATIF` and already handles subagent
sidechain files, duplicate events replayed after compaction, streaming usage
that only the last chunk gets right, tool_use/tool_result pairing across
events, and bundling one LLM inference into one step. A hand-rolled parser gets
those wrong quietly — it keeps emitting plausible trajectories that no longer
match what the harness did.

Harbor is confined to `harbor_adapter.py` precisely so it stays swappable: the
rest of the pipeline sees plain dictionaries.

## Install

```bash
pip install -r scripts/trajectory/requirements.txt
```

The pin is strict and checked at runtime. A drifted install raises rather than
warns, because a trajectory whose converter version cannot be reconstructed is
not evidence of anything.

## Use

```bash
# convert only, to stdout
python3 scripts/trajectory/claude_session_to_ots.py \
  --transcript ~/.claude/projects/<slug>/<session-id>.jsonl \
  --agent-id katagami-contributor \
  --out -

# convert and post
TEMPER_API_URL=https://your-temper-host TEMPER_API_KEY=... \
python3 scripts/trajectory/claude_session_to_ots.py \
  --transcript <path> --agent-id katagami-contributor \
  --spec-version 'CuratorAgent@<hash>' --post
```

Hook installation (capture every session automatically) is in
[`hooks/trajectory-capture/README.md`](../../hooks/trajectory-capture/README.md).

## What the mapping produces

| OTS | Source |
|---|---|
| `trajectory_id` | `--trajectory-id`, else derived deterministically from the session id. |
| `metadata.harness` | `--harness`, default `claude-code`. |
| `metadata.spec_version` | `--spec-version` — the actor spec the run executed under. |
| `metadata.framework` | ATIF `agent.name`. |
| `metadata.outcome` | `success`, or `partial_success` when any tool errored. `--outcome` overrides. |
| `turns[]` | One per ATIF step, `turn_id` = `step_id`. |
| `turns[].messages[]` | The step text, then one `tool_call` message per call and one `tool_response` message per result. |
| `turns[].decisions[]` | One `tool_selection` decision per tool call. |
| `turns[].decisions[].cause_id` | The tool_call id — what links a decision to the observation it produced. |
| `turns[].prompt_token_ids` / `completion_token_ids` / `logprobs` | Copied from ATIF metrics **only when the serving stack supplied them**. Absent for ordinary Claude Code sessions, which record token counts but not ids. |
| `context.custom_context` | JSON: harness, ATIF schema version, converter version, agent version, model, and the ATIF final metrics (token totals and cost). |

`response_mask` is never written by this converter. It has no ATIF source, and
a mask inferred from text rather than from the token stream would be wrong in
exactly the cases RL cares about. Producers that own the token stream write it.

Ids (`trajectory_id`, `span_id`, `message_id`, `decision_id`) are content
derived and deterministic, so re-running the converter over the same transcript
yields the same document — a retried post is an overwrite, not a duplicate.

## Notes for the Temper side

`metadata.trajectory_id` is emitted in addition to the canonical top-level
`trajectory_id`. The current ingest handler
(`temper-server/src/observe/evolution/trajectories.rs`) reads its index key from
`metadata.trajectory_id` and mints a random uuid when it is missing, which would
orphan the id we minted and sent as `X-Trajectory-Id`. When the handler starts
honouring the header or the top-level field, the duplicate can be dropped.
