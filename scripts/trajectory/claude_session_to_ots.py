#!/usr/bin/env python3
"""Claude Code transcript -> OTS trajectory, optionally posted to Temper.

    transcript JSONL --[harbor]--> ATIF v1.7 --[this module]--> OTS 0.1.0

The Harbor half lives behind `harbor_adapter`; this file owns only the small
ATIF -> OTS mapping and the HTTP post. Nothing here imports Harbor.

Usage:

    python3 claude_session_to_ots.py --transcript ~/.claude/projects/-x/abc.jsonl \\
        --agent-id katagami-contributor --out trajectory.json

    python3 claude_session_to_ots.py --transcript ... --agent-id ... --post

Environment:

    TEMPER_API_URL      base URL, e.g. https://temper.example.com  (--post)
    TEMPER_API_KEY      bearer token — REQUIRED for --post         (--post)
    TEMPER_TENANT_ID    tenant, default "default"
    TEMPER_PRINCIPAL_ID the identity TEMPER_API_KEY belongs to
    KATAGAMI_AGENT_ID   the same thing, under the older name

Every failure exits non-zero with the reason on stderr. A capture that
silently produced nothing would be worse than no capture at all.

Three things this module refuses to do:

  * Post without a credential. Attribution is the point of the corpus, and an
    unauthenticated post lets the caller name any agent and any tenant it likes.
  * Post as an identity the environment did not configure. See below.
  * Post without a spec version. A trajectory that cannot name the contract it
    ran under cannot enter either judgement layer, so it would be stored and
    never judged — a silent failure dressed as HTTP 201.

Attribution, and what this client can and cannot prove
------------------------------------------------------

A trajectory is only worth keeping if it is attributable, and attribution here
means: the agent named on the document is the agent that produced it.

This client cannot prove that, and does not pretend to. It holds a bearer
token; it has no way to ask the token who it belongs to, so it cannot bind the
credential to the identity. What it CAN stop doing is manufacturing the
identity — and it previously did exactly that, copying a `--agent-id` command
line argument into both `X-Agent-Id` and `x-temper-principal-id`, so anyone
holding any valid token could file a run under any agent's name.

So the posting identity is now configuration, not an argument: it comes from
`TEMPER_PRINCIPAL_ID` (or `KATAGAMI_AGENT_ID`), which sits beside the
credential it belongs to. One configured identity per role credential. An
explicit `--agent-id` is read as an assertion about that configuration and is
checked against it — a mismatch is refused rather than silently honoured.

That reduces the problem from "any caller can claim any identity" to "any
caller holding a role's credential can post as that role", which is what a
bearer credential means anyway.

Closing it completely is the kernel's job and is not in this repository:
the server has to correlate the credential that authenticated the request with
the principal the request claims, and reject the pair when they disagree.
That work is tracked as ARN-255 (platform-run authorization server, verified
principals) and ARN-187. Until it lands, a compromised role credential can
still post as that role, and no client-side change alters that.

Everything that leaves here passes through `redaction`. Tool arguments, tool
output, message text and reasoning are all verbatim agent content, and verbatim
agent content is where credentials live.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from harbor_adapter import (  # noqa: E402  (path set above)
    ATIF_SCHEMA_VERSION,
    HARBOR_PINNED_VERSION,
    HarborConversionError,
    HarborUnavailable,
    transcript_to_atif,
)
from redaction import redact_text, redact_value  # noqa: E402  (path set above)
from spec_version import (  # noqa: E402  (path set above)
    SpecStamp,
    SpecVersionError,
    actor_for_agent_id,
    resolve_stamp,
)

OTS_VERSION = "0.1.0"
DEFAULT_HARNESS = "claude-code"
OTS_INGEST_PATH = "/api/ots/trajectories"

# The environment that names the identity the credential belongs to. Checked in
# order; the second is the older spelling and still honoured.
PRINCIPAL_ENV_VARS = ("TEMPER_PRINCIPAL_ID", "KATAGAMI_AGENT_ID")

# How the provenance of `spec_version` rides to a judge. It goes in `tags`
# because that is a field the kernel models and therefore returns; a metadata
# key of our own invention is dropped on ingest and reads as absent.
SPEC_VERSION_SOURCE_TAG = "spec-version-source:"

# Result summaries are for a judge to read, not a datastore to hoard. Full tool
# output stays on the message; the decision carries a legible excerpt.
RESULT_SUMMARY_CHARS = 400
TASK_DESCRIPTION_CHARS = 500


class TrajectoryError(RuntimeError):
    """Anything that stops us producing a well-formed OTS document."""


# --------------------------------------------------------------------------
# identifiers
# --------------------------------------------------------------------------


def _stable_id(prefix: str, *parts: object) -> str:
    """A deterministic id derived from the trajectory's own content.

    Deterministic on purpose: re-running the converter over the same transcript
    must produce the same document, so a retried post is an overwrite rather
    than a duplicate, and so tests can assert on exact output.
    """
    digest = hashlib.sha256("\x00".join(str(p) for p in parts).encode()).hexdigest()
    return f"{prefix}-{digest[:24]}"


def derive_trajectory_id(session_id: str) -> str:
    return _stable_id("traj", "claude-code", session_id)


# --------------------------------------------------------------------------
# timestamps
# --------------------------------------------------------------------------


def _normalize_timestamp(value: Any) -> str | None:
    """ISO 8601 in, RFC 3339 UTC out — the shape chrono parses on the Rust side."""
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _step_timestamps(steps: list[dict[str, Any]]) -> list[str | None]:
    return [_normalize_timestamp(step.get("timestamp")) for step in steps]


def _duration_ms(start: str, end: str) -> float | None:
    try:
        a = datetime.fromisoformat(start.replace("Z", "+00:00"))
        b = datetime.fromisoformat(end.replace("Z", "+00:00"))
    except ValueError:
        return None
    delta = (b - a).total_seconds() * 1000.0
    return delta if delta >= 0 else None


# --------------------------------------------------------------------------
# ATIF -> OTS
# --------------------------------------------------------------------------

_ROLE_BY_SOURCE = {"user": "user", "agent": "assistant", "system": "system"}


def _image_attachment(source: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """One ATIF image reference as an OTS attachment, and its inline marker.

    `harbor_adapter.archive_images` has already resolved the reference while
    the staged tree still existed: an archived image carries `available: true`
    and a path that opens, and everything else carries `available: false`, the
    content hash, and the reason. This function never invents a path, because a
    path that does not open is the failure it exists to prevent — a judge told
    to "open the image before judging what it looks like" needs the difference
    between "here it is" and "it is gone" to be explicit.
    """
    media_type = source.get("media_type") or "image"
    available = bool(source.get("available"))
    attachment: dict[str, Any] = {
        "type": "image",
        "media_type": media_type,
        "available": available,
    }
    for field in ("sha256", "bytes"):
        if source.get(field) is not None:
            attachment[field] = source[field]

    # The marker has to stand on its own, because the attachment does not
    # survive the kernel. `OTSMessage` has no attachments field — the word
    # appears nowhere in `temper-ots` — so a document read back through
    # `GET /api/ots/trajectories/<id>/atif` has only the message text. Whatever
    # a judge needs in order to find the picture goes in the marker, and the
    # attachment stays as the richer structure the local archive keeps.
    digest = source.get("sha256")
    fingerprint = f" sha256:{digest}" if digest else ""

    if available and source.get("path"):
        attachment["path"] = redact_text(str(source["path"]))
        return attachment, f"[image {media_type}{fingerprint} {attachment['path']}]"

    reason = source.get("unavailable_reason") or "the image was not archived with this capture"
    attachment["unavailable_reason"] = redact_text(str(reason))
    return attachment, f"[image {media_type} unavailable{fingerprint}]"


def _content_parts(message: Any) -> tuple[str, list[dict[str, Any]]]:
    """ATIF content: a string, or a list of parts (v1.6+), text and images mixed.

    Images are not thrown away. A curator that rendered a landing page and
    looked at it made its judgement on the picture, and a trajectory that keeps
    only the words around the picture cannot be judged on taste or finish at
    all. ATIF image parts carry a media type and a path rather than the bytes
    (`harbor.models.trajectories.content.ImageSource`), so the file itself is
    archived at capture time and the attachment points at the archived copy.
    """
    if isinstance(message, str):
        return redact_text(message), []
    if not isinstance(message, list):
        return "", []

    chunks: list[str] = []
    attachments: list[dict[str, Any]] = []
    for part in message:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "image" or part.get("source"):
            attachment, marker = _image_attachment(part.get("source") or {})
            attachments.append(attachment)
            chunks.append(marker)
        elif isinstance(part.get("text"), str):
            chunks.append(redact_text(part["text"]))
    return "\n".join(chunks), attachments


def _message_text(message: Any) -> str:
    return _content_parts(message)[0]


def _result_parts(content: Any) -> tuple[str, list[dict[str, Any]]]:
    if isinstance(content, str):
        return redact_text(content), []
    if isinstance(content, list):
        return _content_parts(content)
    if content is None:
        return "", []
    # A structured result is redacted as structure first — a `{"api_key": ...}`
    # field is a credential whatever its value looks like, and serializing
    # before redacting would leave only the text patterns to catch it.
    return json.dumps(redact_value(content), ensure_ascii=False), []


def _result_text(content: Any) -> str:
    return _result_parts(content)[0]


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def _results_by_call(step: dict[str, Any]) -> dict[str, dict[str, Any]]:
    observation = step.get("observation") or {}
    out: dict[str, dict[str, Any]] = {}
    for result in observation.get("results") or []:
        call_id = result.get("source_call_id")
        if isinstance(call_id, str) and call_id:
            out[call_id] = result
    return out


def _result_is_error(result: dict[str, Any] | None) -> bool:
    if not result:
        return False
    extra = result.get("extra") or {}
    return bool(extra.get("tool_result_is_error"))


def _unobserved_calls(step: dict[str, Any]) -> list[str]:
    """Tool calls this step issued and never got a result for.

    A call with no observation is an operation whose outcome nobody recorded —
    the session was interrupted between the request and the result, or the
    result never came. It is not a success, and labelling it one puts an
    unfinished operation into the corpus as an example of a finished one.
    """
    results = _results_by_call(step)
    return [
        call.get("tool_call_id")
        for call in step.get("tool_calls") or []
        if call.get("tool_call_id") not in results
    ]


def _build_messages(
    step: dict[str, Any], trajectory_id: str, timestamp: str
) -> list[dict[str, Any]]:
    step_id = step.get("step_id")
    role = _ROLE_BY_SOURCE.get(step.get("source", ""), "system")
    messages: list[dict[str, Any]] = []

    text, attachments = _content_parts(step.get("message"))
    reasoning = step.get("reasoning_content")
    if text or reasoning or attachments or not step.get("tool_calls"):
        message: dict[str, Any] = {
            "message_id": _stable_id("msg", trajectory_id, step_id, "text"),
            "role": role,
            "timestamp": timestamp,
            "content": {"type": "text", "text": text},
        }
        if attachments:
            message["attachments"] = attachments
        if role == "assistant" and isinstance(reasoning, str) and reasoning:
            message["reasoning"] = redact_text(reasoning)
        messages.append(message)

    results = _results_by_call(step)
    for call in step.get("tool_calls") or []:
        call_id = call.get("tool_call_id")
        messages.append(
            {
                "message_id": _stable_id("msg", trajectory_id, step_id, "call", call_id),
                "role": "assistant",
                "timestamp": timestamp,
                "content": {
                    "type": "tool_call",
                    "data": {
                        "tool_call_id": call_id,
                        "name": call.get("function_name", ""),
                        "arguments": redact_value(call.get("arguments") or {}),
                    },
                },
            }
        )
        result = results.get(call_id) if isinstance(call_id, str) else None
        if result is not None:
            content, result_attachments = _result_parts(result.get("content"))
            data: dict[str, Any] = {
                "tool_call_id": call_id,
                "content": content,
                "is_error": _result_is_error(result),
            }
            if result_attachments:
                data["attachments"] = result_attachments
            messages.append(
                {
                    "message_id": _stable_id(
                        "msg", trajectory_id, step_id, "result", call_id
                    ),
                    "role": "tool",
                    "timestamp": timestamp,
                    "content": {"type": "tool_response", "data": data},
                }
            )

    # An observation with no matching tool_call (a system-initiated result, or
    # an orphan replayed after compaction) still happened; keep it.
    for result in (step.get("observation") or {}).get("results") or []:
        if result.get("source_call_id"):
            continue
        content, result_attachments = _result_parts(result.get("content"))
        data = {"content": content}
        if result_attachments:
            data["attachments"] = result_attachments
        messages.append(
            {
                "message_id": _stable_id(
                    "msg", trajectory_id, step_id, "orphan", len(messages)
                ),
                "role": "tool",
                "timestamp": timestamp,
                "content": {"type": "tool_response", "data": data},
            }
        )

    return messages


# A governed action reached over OData, as the curator skills call it:
#   POST $TEMPER_API_URL/tdata/CuratorAgents('<run id>')/Temper.ReceiveBrief
# Only the last dot-segment is the action name — the `Temper.` namespace prefix
# is required in the path but is not part of it.
GOVERNED_CALL_RE = re.compile(
    r"/tdata/[A-Za-z0-9_]+\([^)]*\)/[A-Za-z0-9_]+\.([A-Za-z0-9_]+)"
)

# The kernel's rule for "this string names a governed action", mirrored from
# `temper-server/src/conformance/decisions.rs::is_action_name`. It is duplicated
# rather than imported because the two live in different languages; the tests
# assert the envelope this module writes is NOT one of these, so the duplication
# cannot drift silently.
_BARE_TOKEN_RE = re.compile(r"^[A-Za-z0-9_.-]+$")


def _is_bare_token(value: str) -> bool:
    return bool(value) and bool(_BARE_TOKEN_RE.match(value))


def _governed_actions(arguments: Any) -> list[dict[str, Any]]:
    """The governed actions one harness call reached, read off its arguments.

    A Claude Code agent reaches Temper by making an HTTP request — `curl` in a
    Bash command, or any tool whose arguments carry the URL. The action name is
    in the path, so the path is where it is read from.

    Read from the *redacted* arguments, which is what the stored document
    carries: a reader can check the extraction against the same bytes the
    judge sees. Redaction never touches a `/tdata/` path, and if it ever did,
    under-reporting is the safe direction — the kernel's own rows remain the
    authority on what was actually dispatched.

    Two things this deliberately does not do. It does not read tool *results*,
    only the call, so a run that merely read a document naming an action is not
    credited with attempting it. And it does not parse `temper.action(...)` out
    of `mcp__temper__execute` code: a session that goes through MCP has its
    governed actions recorded by the MCP server's own envelope and by the
    kernel rows, so re-deriving them from Python source here would add a second,
    more fragile parser for no new evidence.

    The known limit: a Bash command that merely greps for the literal path
    shape would be read as an attempt. The consequence is benign — a declared
    action is counted, not violated, and an undeclared one should be reported.
    """
    if not isinstance(arguments, str):
        try:
            arguments = json.dumps(arguments, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
            arguments = str(arguments)
    seen: list[dict[str, Any]] = []
    for name in GOVERNED_CALL_RE.findall(arguments):
        entry = {"action": name, "params": {}}
        if entry not in seen:
            seen.append(entry)
    return seen


def _tool_envelope(tool_name: str, arguments: Any, harness: str) -> dict[str, Any]:
    """One harness tool call, in the envelope shape the checker recognises.

    `temper-server/src/conformance/decisions.rs` classifies a decision by its
    `choice.action`: a bare token is read as a governed action name and checked
    against the actor's alphabet, anything else is an envelope whose real
    actions are listed under `choice.arguments.trajectory_actions`. Writing a
    raw tool name here therefore claimed `Bash` was a CuratorAgent action and
    produced one `unknown_action` violation per tool call.

    Harness tool use is cognition: it belongs in the trajectory for the LLM
    judge and must never reach the deterministic action walk. So the tool name
    goes into an envelope string that is not a bare token, and the governed
    actions the call actually reached — if any — go where the checker reads
    them. This mirrors the MCP producer (`temper-mcp::record_execute_turn`),
    which writes `"execute: <code>"` with the same `trajectory_actions` key.
    """
    envelope = f"{harness} tool: {tool_name}"
    if _is_bare_token(envelope):
        # Unreachable while the format carries a space and a colon, and worth
        # failing on rather than silently emitting a decision the checker would
        # score as a governed action.
        raise ValueError(
            f"envelope {envelope!r} reads as a governed action name; "
            "the conformance checker would report it as an illegal action"
        )
    # Only OTSChoice's own fields are written. The kernel parses an upload into
    # its model and drops every key it does not know, so a `tool` field of our
    # own would read as absent on the canonical path while surviving in the
    # local archive — the same trap the judge skill documents for metadata. The
    # tool name is already in the envelope string and in the ATIF tool_calls.
    choice: dict[str, Any] = {"action": envelope}
    if arguments not in (None, {}, ""):
        choice["arguments"] = arguments
    governed = _governed_actions(arguments)
    if governed:
        # `arguments` has to be an object for the checker to find the key.
        existing = choice.get("arguments")
        choice["arguments"] = {"trajectory_actions": governed}
        if existing not in (None, {}, ""):
            choice["arguments"]["tool_arguments"] = existing
    return choice


def _build_decisions(
    step: dict[str, Any], trajectory_id: str, harness: str = DEFAULT_HARNESS
) -> list[dict[str, Any]]:
    """One decision per tool call, each linked to its observation by cause_id.

    `cause_id` is the tool_call id. It is what turns a flat list of decisions
    and a flat list of results into a causal chain: a judge reading the
    trajectory can say which observation a given choice produced, rather than
    inferring it from adjacency.

    Every call is written as a harness envelope (`_tool_envelope`), because a
    harness tool is cognition, not an attempt to act on the governed system.
    The governed actions a call actually reached ride under
    `choice.arguments.trajectory_actions`, which is where the conformance
    checker looks for them.
    """
    step_id = step.get("step_id")
    results = _results_by_call(step)
    decisions: list[dict[str, Any]] = []

    for call in step.get("tool_calls") or []:
        call_id = call.get("tool_call_id")
        result = results.get(call_id) if isinstance(call_id, str) else None
        is_error = _result_is_error(result)
        # No observation means nobody recorded what the call did. That is not a
        # success — a run interrupted between the request and the result would
        # otherwise be stored as an example of the operation completing.
        consequence: dict[str, Any] = {"success": result is not None and not is_error}
        if result is not None:
            summary = _truncate(_result_text(result.get("content")), RESULT_SUMMARY_CHARS)
            if summary:
                consequence["result_summary"] = summary
            if is_error:
                consequence["error_type"] = "tool_error"
        else:
            consequence["error_type"] = "no_result"
            consequence["result_summary"] = (
                "no observation was recorded for this call; the outcome is unknown"
            )

        decision: dict[str, Any] = {
            "decision_id": _stable_id("dec", trajectory_id, step_id, call_id),
            "decision_type": "tool_selection",
            "choice": _tool_envelope(
                call.get("function_name", ""),
                redact_value(call.get("arguments") or {}),
                harness,
            ),
            "consequence": consequence,
        }
        if isinstance(call_id, str) and call_id:
            decision["cause_id"] = call_id
        decisions.append(decision)

    return decisions


def _turn_token_fields(step: dict[str, Any]) -> dict[str, Any]:
    """Token ids and logprobs, only when the serving stack actually supplied them.

    RL consumers need the exact ids the model saw; retokenizing text drifts.
    Claude Code transcripts carry token *counts*, not ids, so these fields are
    normally absent — and absent is the honest answer. They are populated here
    the moment a serving stack starts filling ATIF's `prompt_token_ids` /
    `completion_token_ids` / `logprobs`, with no other change needed.

    `response_mask` has no ATIF source at all and is therefore never emitted
    from this converter; it is written by producers that own the token stream.
    """
    metrics = step.get("metrics") or {}
    out: dict[str, Any] = {}
    for field in ("prompt_token_ids", "completion_token_ids", "logprobs"):
        value = metrics.get(field)
        if isinstance(value, list) and value:
            out[field] = value
    return out


def _derive_outcome(turns: list[dict[str, Any]]) -> str:
    """Success unless a tool errored, in which case partial_success.

    Deliberately not cleverer than the evidence. A transcript records what
    happened, not whether the human was satisfied; `--outcome` exists for the
    caller that actually knows.
    """
    return "partial_success" if any(turn.get("error") for turn in turns) else "success"


def _tool_entities(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: list[str] = []
    for step in steps:
        for call in step.get("tool_calls") or []:
            name = call.get("function_name")
            if isinstance(name, str) and name and name not in seen:
                seen.append(name)
    return [{"type": "tool", "id": name, "name": name} for name in seen]


def atif_to_ots(
    atif: dict[str, Any],
    *,
    agent_id: str,
    session_id: str,
    trajectory_id: str,
    spec_version: str | None = None,
    spec_version_source: str | None = None,
    harness: str = DEFAULT_HARNESS,
    domain: str | None = None,
    environment: str | None = None,
    tags: list[str] | None = None,
    task_description: str | None = None,
    outcome: str | None = None,
    parent_trajectory_id: str | None = None,
    started_at: str | None = None,
) -> dict[str, Any]:
    """Map one ATIF trajectory onto the OTS document Temper stores."""
    steps = atif.get("steps") or []
    if not steps:
        raise TrajectoryError("ATIF trajectory has no steps")

    timestamps = _step_timestamps(steps)
    known = [ts for ts in timestamps if ts]
    start = _normalize_timestamp(started_at) or (known[0] if known else None)
    if start is None:
        raise TrajectoryError(
            "no usable timestamp in the transcript and no --started-at given; "
            "OTS metadata.timestamp_start is required and must not be invented"
        )
    end = known[-1] if known else start

    turns: list[dict[str, Any]] = []
    for index, step in enumerate(steps):
        timestamp = timestamps[index] or start
        results = (step.get("observation") or {}).get("results") or []
        turn: dict[str, Any] = {
            "turn_id": step.get("step_id", index + 1),
            "span_id": _stable_id("span", trajectory_id, step.get("step_id", index + 1)),
            "timestamp": timestamp,
            # An unobserved call marks the turn too: the record of what happened
            # in it is incomplete, and a consumer reading `error: false` would
            # take it for a clean turn.
            "error": any(_result_is_error(result) for result in results)
            or bool(_unobserved_calls(step)),
            "messages": _build_messages(step, trajectory_id, timestamp),
            "decisions": _build_decisions(step, trajectory_id, harness),
        }
        turn.update(_turn_token_fields(step))
        turns.append(turn)

    if task_description is None:
        first_user = next(
            (s for s in steps if s.get("source") == "user"),
            None,
        )
        task_description = _truncate(
            _message_text(first_user.get("message")) if first_user else "",
            TASK_DESCRIPTION_CHARS,
        )
    else:
        task_description = redact_text(task_description)

    agent = atif.get("agent") or {}
    metadata: dict[str, Any] = {
        "task_description": task_description,
        "timestamp_start": start,
        "timestamp_end": end,
        "agent_id": agent_id,
        "framework": agent.get("name") or harness,
        "outcome": outcome or _derive_outcome(turns),
        "human_reviewed": False,
        "harness": harness,
        # The ingest takes the document's TOP-LEVEL `trajectory_id` as its
        # identity and mints a random one when that is empty
        # (temper-server observe/evolution/trajectories.rs), which would orphan
        # the id we minted and sent as X-Trajectory-Id. This copy is not the
        # identity; it is here so a stored document still names itself when it
        # is read back through a path that hands over metadata alone.
        "trajectory_id": trajectory_id,
    }
    duration = _duration_ms(start, end)
    if duration is not None:
        metadata["duration_ms"] = duration
    if spec_version:
        metadata["spec_version"] = spec_version
    if domain:
        metadata["domain"] = domain
    if environment:
        metadata["environment"] = environment

    # Where the version came from, carried as a TAG.
    #
    # `tags` is a field the kernel models (`OTSMetadata.tags`), so it survives
    # ingest and comes back on the ATIF export. An invented metadata key does
    # not: the kernel parses the upload into `OTSMetadata` and anything it does
    # not know is dropped, so a `spec_version_source` written as its own field
    # was always absent by the time a judge read it — and absent reads as
    # "locally computed", which is exactly the wrong answer for a version the
    # kernel itself reported.
    all_tags = list(tags or [])
    if spec_version and spec_version_source:
        all_tags.append(f"{SPEC_VERSION_SOURCE_TAG}{spec_version_source}")
    if all_tags:
        metadata["tags"] = all_tags
    if parent_trajectory_id:
        metadata["parent_trajectory_id"] = parent_trajectory_id

    context: dict[str, Any] = {}
    entities = _tool_entities(steps)
    if entities:
        context["entities"] = entities
    custom = {
        "harness": harness,
        # OTS has no session field of its own — the session id travels in the
        # X-Session-Id header. Recording it here too means a stored document is
        # still traceable to its session after the request is long gone, which
        # is what TrajectoryVerdict.session_id has to be filled from.
        "session_id": session_id,
        "atif_schema_version": atif.get("schema_version") or ATIF_SCHEMA_VERSION,
        "converter": f"harbor@{HARBOR_PINNED_VERSION}",
        "agent_version": agent.get("version"),
        "model_name": agent.get("model_name"),
        "agent_extra": agent.get("extra"),
        "final_metrics": atif.get("final_metrics"),
    }
    context["custom_context"] = json.dumps(
        {k: v for k, v in custom.items() if v is not None},
        ensure_ascii=False,
        sort_keys=True,
    )

    return {
        "trajectory_id": trajectory_id,
        "version": OTS_VERSION,
        "metadata": metadata,
        "context": context,
        "turns": turns,
    }


# --------------------------------------------------------------------------
# transport
# --------------------------------------------------------------------------


def configured_principal() -> str | None:
    """The identity this install's credential belongs to, from the environment."""
    for name in PRINCIPAL_ENV_VARS:
        value = (os.environ.get(name) or "").strip()
        if value:
            return value
    return None


def resolve_agent_id(*, requested: str | None, posting: bool) -> str:
    """The identity to file this trajectory under.

    Configuration decides it; `requested` (the `--agent-id` argument) is only
    ever an assertion about that configuration. See the module docstring for
    why the argument is not allowed to be the source.
    """
    configured = configured_principal()

    if configured and requested and requested != configured:
        raise TrajectoryError(
            f"refusing to post as {requested!r}: this environment is configured for "
            f"{configured!r} ({' / '.join(PRINCIPAL_ENV_VARS)}). The posting identity "
            "comes from the configuration that holds the credential, so one role's "
            "credential cannot file a run under another role's name. Set the "
            "environment for the identity you mean to post as, or drop --agent-id."
        )

    if configured:
        return configured
    if requested and not posting:
        # A local conversion authenticates to nobody and claims nothing; the
        # argument is enough to label the file being written.
        return requested
    raise TrajectoryError(
        "no posting identity is configured. Set TEMPER_PRINCIPAL_ID (or "
        "KATAGAMI_AGENT_ID) to the agent the credential in TEMPER_API_KEY belongs "
        "to. A trajectory whose agent id came from the command line is attributed "
        "to whoever typed it, which is not attribution."
    )


def post_trajectory(
    ots: dict[str, Any],
    *,
    api_url: str,
    api_key: str | None,
    agent_id: str,
    session_id: str,
    tenant_id: str,
    trajectory_id: str,
    timeout: float = 60.0,
) -> int:
    """POST one OTS document, under a credential, as its configured principal.

    The credential is mandatory, and `agent_id` must be the identity the
    environment configured for it (`resolve_agent_id`) rather than anything a
    caller typed. The same value goes out as `X-Agent-Id` and as the request
    principal (`x-temper-principal-id`) so the server sees one identity rather
    than two.

    Correlating that identity with the credential that authenticated the
    request is the server's to do — ARN-255 / ARN-187, see the module
    docstring. This client's job is to make the two agree so the correlation
    has something to check, and to refuse to invent either one.
    """
    if not api_key:
        raise TrajectoryError(
            "refusing to post without TEMPER_API_KEY. The trajectory is attributed "
            "to an agent, and an unauthenticated post can claim any agent and any "
            "tenant it likes."
        )

    body = json.dumps(ots, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        api_url.rstrip("/") + OTS_INGEST_PATH,
        data=body,
        method="POST",
    )
    request.add_header("Content-Type", "application/json")
    request.add_header("X-Agent-Id", agent_id)
    request.add_header("X-Session-Id", session_id)
    request.add_header("X-Tenant-Id", tenant_id)
    request.add_header("X-Trajectory-Id", trajectory_id)
    request.add_header("x-temper-principal-kind", "agent")
    request.add_header("x-temper-principal-id", agent_id)
    request.add_header("Authorization", f"Bearer {api_key}")

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:2000]
        raise TrajectoryError(
            f"OTS ingest rejected the trajectory: HTTP {exc.code} {detail}"
        ) from exc
    except urllib.error.URLError as exc:
        raise TrajectoryError(f"OTS ingest unreachable at {api_url}: {exc.reason}") from exc


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert a Claude Code transcript into an OTS trajectory.",
    )
    parser.add_argument("--transcript", required=True, help="Claude Code transcript JSONL")
    parser.add_argument("--out", help="write the OTS JSON here ('-' for stdout)")
    parser.add_argument("--post", action="store_true", help="POST to the Temper OTS ingest")
    parser.add_argument("--session-id", help="override the transcript's session id")
    parser.add_argument("--trajectory-id", help="override the derived trajectory id")
    parser.add_argument(
        "--agent-id",
        default=None,
        help=(
            "assert the identity this run is filed under. The identity itself comes "
            "from $TEMPER_PRINCIPAL_ID / $KATAGAMI_AGENT_ID, beside the credential it "
            "belongs to; passing a different one here is refused"
        ),
    )
    parser.add_argument(
        "--tenant-id",
        default=os.environ.get("TEMPER_TENANT_ID", "default"),
        help="tenant for the X-Tenant-Id header (default $TEMPER_TENANT_ID or 'default')",
    )
    parser.add_argument(
        "--spec-version",
        default=os.environ.get("KATAGAMI_ACTOR_SPEC_VERSION"),
        help=(
            "actor spec version this run executed under. Normally omitted: it is "
            "computed from the actor spec in this checkout (default "
            "$KATAGAMI_ACTOR_SPEC_VERSION)"
        ),
    )
    parser.add_argument(
        "--actor-spec",
        default=os.environ.get("KATAGAMI_ACTOR_SPEC"),
        help=(
            "actor automaton this run conforms to, e.g. CuratorAgent. Defaults to "
            "$KATAGAMI_ACTOR_SPEC, then to the actor mapped from --agent-id"
        ),
    )
    parser.add_argument(
        "--no-registry",
        action="store_true",
        help=(
            "do not read the registered spec version from the kernel; compute it from "
            "this checkout instead. The computed hash is only the registered one if the "
            "deploy registered these exact bytes, so the trajectory records that its "
            "version was locally computed"
        ),
    )
    parser.add_argument(
        "--image-dir",
        help=(
            "archive images referenced by the transcript here, so the trajectory's "
            "image references still open after conversion. Without it the images are "
            "recorded by content hash and marked unavailable"
        ),
    )
    parser.add_argument("--harness", default=DEFAULT_HARNESS)
    parser.add_argument("--domain")
    parser.add_argument("--environment")
    parser.add_argument("--tag", action="append", dest="tags", default=[])
    parser.add_argument("--task-description")
    parser.add_argument(
        "--outcome",
        choices=["success", "partial_success", "failure"],
        help="override the derived outcome",
    )
    parser.add_argument("--parent-trajectory-id")
    parser.add_argument("--started-at", help="ISO 8601 fallback when the transcript has no timestamps")
    parser.add_argument("--model-name", help="fallback model for events that do not name one")
    return parser


def resolve_spec_version(
    *, spec_version: str | None, actor_spec: str | None, agent_id: str, use_registry: bool = True
) -> SpecStamp:
    """The actor spec version to stamp, read rather than guessed.

    The actor is `--actor-spec`, or the one this agent id runs under. The
    version preferred is the digest the KERNEL registered, read from
    `GET /observe/specs/{entity}` — because a locally computed hash is only
    right if the deploy registered these exact bytes, and nothing local can
    tell you whether it did.

    The local hash is still computed and snapshotted every time. It is what
    keeps the contract retrievable, and when it disagrees with the registry the
    disagreement is reported loudly: that is a spec this checkout and the deploy
    do not share, surfacing rather than staying silent.

    An explicit `--spec-version` is not taken on trust. It stands only if it is
    what we resolved, or names a snapshot, or names a registry answer this
    machine recorded earlier.

    A `version` of None means there is no actor contract to name at all — the
    caller decides whether that is fatal (it is, for `--post`).
    """
    return resolve_stamp(
        claimed=spec_version,
        actor=actor_spec or actor_for_agent_id(agent_id),
        use_registry=use_registry,
    )


def _session_id_from(atif: dict[str, Any], transcript: Path, override: str | None) -> str:
    if override:
        return override
    from_atif = atif.get("session_id")
    if isinstance(from_atif, str) and from_atif:
        return from_atif
    return transcript.stem


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if not args.out and not args.post:
        print("error: nothing to do — pass --out and/or --post", file=sys.stderr)
        return 2

    try:
        agent_id = resolve_agent_id(requested=args.agent_id, posting=args.post)
    except TrajectoryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    try:
        stamp = resolve_spec_version(
            spec_version=args.spec_version,
            actor_spec=args.actor_spec,
            agent_id=agent_id,
            use_registry=not args.no_registry,
        )
    except SpecVersionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    spec_version = stamp.version
    # Loud on purpose. Both cases mean the version being stamped is not
    # provably the one the kernel will check against, and a silent capture is
    # how that gets discovered months later as an unexplained 409.
    for warning in stamp.warnings:
        print(f"katagami-trajectory: WARNING: {warning}", file=sys.stderr)
    if args.post and not spec_version:
        print(
            "error: no actor spec version could be resolved for agent "
            f"{agent_id!r}. A trajectory with no spec_version cannot enter "
            "either judgement layer, so posting one would store a row nothing can "
            "judge. Pass --actor-spec (e.g. CuratorAgent), or --spec-version / "
            "KATAGAMI_ACTOR_SPEC_VERSION if the run executed under a spec that is "
            "not in this checkout.",
            file=sys.stderr,
        )
        return 2

    transcript = Path(args.transcript).expanduser()
    try:
        atif = transcript_to_atif(
            transcript,
            session_id=args.session_id,
            model_name=args.model_name,
            image_dir=args.image_dir,
        )
    except (HarborUnavailable, HarborConversionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    session_id = _session_id_from(atif, transcript, args.session_id)
    trajectory_id = args.trajectory_id or derive_trajectory_id(session_id)

    try:
        ots = atif_to_ots(
            atif,
            agent_id=agent_id,
            session_id=session_id,
            trajectory_id=trajectory_id,
            spec_version=spec_version,
            spec_version_source=stamp.source,
            harness=args.harness,
            domain=args.domain,
            environment=args.environment,
            tags=args.tags,
            task_description=args.task_description,
            outcome=args.outcome,
            parent_trajectory_id=args.parent_trajectory_id,
            started_at=args.started_at,
        )
    except TrajectoryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    rendered = json.dumps(ots, ensure_ascii=False, indent=2, sort_keys=True)
    if args.out == "-":
        print(rendered)
    elif args.out:
        destination = Path(args.out).expanduser()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(rendered + "\n", encoding="utf-8")
        print(f"wrote {destination}", file=sys.stderr)

    if args.post:
        api_url = os.environ.get("TEMPER_API_URL")
        if not api_url:
            print("error: --post needs TEMPER_API_URL", file=sys.stderr)
            return 2
        try:
            status = post_trajectory(
                ots,
                api_url=api_url,
                api_key=os.environ.get("TEMPER_API_KEY"),
                agent_id=agent_id,
                session_id=session_id,
                tenant_id=args.tenant_id,
                trajectory_id=trajectory_id,
            )
        except TrajectoryError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
        print(
            f"posted {trajectory_id} ({len(ots['turns'])} turns) -> HTTP {status}",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
