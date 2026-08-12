# Trajectory capture (ARN-293)

Turns a Claude Code session into an OTS trajectory Temper can store and a judge
can replay against an actor spec.

```
transcript JSONL --[harbor v0.21.0]--> ATIF v1.7 --[claude_session_to_ots]--> OTS 0.1.0 --> POST /api/ots/trajectories
```

| File | Role |
|---|---|
| `harbor_adapter.py` | The only place Harbor is imported. Transcript (plus its subagent transcripts) -> ATIF, and the version pin. |
| `claude_session_to_ots.py` | ATIF -> OTS mapping, and the HTTP post. Imports no Harbor. |
| `redaction.py` | Strips credential shapes from every string before it leaves. |
| `spec_version.py` | The actor spec version, computed from the spec file. |
| `conformance_check.py` | Layer 1: replays a captured trajectory against its actor spec. |
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
  --image-dir ~/.katagami/trajectory-queue/archive/images \
  --out -

# convert and post, as the identity the credential belongs to
TEMPER_API_URL=https://your-temper-host TEMPER_API_KEY=... \
TEMPER_PRINCIPAL_ID=katagami-contributor \
python3 scripts/trajectory/claude_session_to_ots.py \
  --transcript <path> --post

# what version of the actor spec is in force, and record it
python3 scripts/trajectory/spec_version.py CuratorAgent --snapshot

# read back the contract a run executed under, after the file has moved on
python3 scripts/trajectory/spec_version.py CuratorAgent --show-snapshot <version>

# layer 1, offline. The kernel's POST /api/conformance/check is authoritative;
# this is the fallback for when it cannot be reached.
python3 scripts/trajectory/conformance_check.py \
  --trajectory ~/.katagami/trajectory-queue/archive/<trajectory-id>.json \
  --actor-spec CuratorAgent
```

Hook installation (capture every session automatically) is in
[`hooks/trajectory-capture/README.md`](../../hooks/trajectory-capture/README.md).

## Three refusals

`--post` fails, loudly, without every one of these:

- **A credential.** `TEMPER_API_KEY` is required. An unauthenticated post can
  claim any agent and any tenant it likes.
- **A configured identity.** The agent a run is filed under comes from
  `TEMPER_PRINCIPAL_ID` (or `KATAGAMI_AGENT_ID`), which sits beside the
  credential it belongs to — one configured identity per role credential.
  `--agent-id` is read as an assertion about that configuration and a mismatch
  is refused, so one role's credential cannot file a run under another role's
  name. The same value goes out as `X-Agent-Id` and `x-temper-principal-id`, so
  the server sees one identity rather than two.

  This client cannot bind the token to the identity — it has no way to ask a
  bearer token who it belongs to. Correlating the credential with the claimed
  principal is the kernel's, tracked as ARN-255 and ARN-187. Until that lands,
  a compromised role credential can still post as that role.
- **A spec version.** Preferred from the kernel: `GET /observe/specs/{entity}`
  reports `spec_version`, the digest it registered, and that is the digest a
  conformance check compares against. A hash computed from the spec in this
  checkout is right only if the deploy registered these exact bytes, and
  nothing local can tell you whether it did — so the fallback is marked
  `spec_version_source: "local"` on the trajectory and warns on the way past.
  `--no-registry` forces it.

  The local hash is computed and snapshotted either way. When it disagrees with
  the registered one, that disagreement is the point: the deploy is not holding
  the spec this checkout has, and it is reported loudly rather than stamped
  over.

  An explicit `--spec-version` is accepted only when it is what we resolved,
  names a snapshot, or names a registry answer this machine recorded earlier
  (`spec-attestations/`). A version with none of those is refused: it names a
  contract nobody can produce. A trajectory that cannot name its contract
  cannot enter either judgement layer, so posting one would store a row nothing
  can judge.

## Redaction

Every string — message text, reasoning, tool arguments, tool output, the task
description — passes through `redaction.py` before it reaches the document.
It removes the credential shapes (bearer and basic authorization values,
private key blocks, JWTs, GitHub/Anthropic/OpenAI/Slack/Google/AWS keys,
`user:password@host`, and `NAME=value` where the name says secret) and drops
values under keys like `api_key` or `authorization` whatever they contain.

It is a reduction, not a guarantee: a secret with no recognizable shape still
travels. `hooks/trajectory-capture/README.md#privacy` states plainly what gets
uploaded so nobody has to guess.

## What the mapping produces

| OTS | Source |
|---|---|
| `trajectory_id` | `--trajectory-id`, else derived deterministically from the session id. |
| `metadata.harness` | `--harness`, default `claude-code`. |
| `metadata.spec_version` | Computed from the actor spec (see above). `--spec-version` overrides. |
| `metadata.framework` | ATIF `agent.name`. |
| `metadata.outcome` | `success`, or `partial_success` when any tool errored or any call went unobserved. `--outcome` overrides. |
| `turns[]` | One per ATIF step, `turn_id` = `step_id`. |
| `turns[].messages[]` | The step text, then one `tool_call` message per call and one `tool_response` message per result. |
| `turns[].messages[].attachments` | Image parts kept as `{type, media_type, path}` references, with an `[image ...]` marker inline in the text. ATIF carries image locations rather than bytes. |
| `turns[].decisions[]` | One `tool_selection` decision per tool call. A call with no observation is `success: false` with `error_type: "no_result"` — the outcome is unknown, and unknown is not success. |
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
