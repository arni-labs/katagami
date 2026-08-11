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

    TEMPER_API_URL    base URL, e.g. https://temper.example.com   (--post)
    TEMPER_API_KEY    bearer token — REQUIRED for --post          (--post)
    TEMPER_TENANT_ID  tenant, default "default"
    KATAGAMI_AGENT_ID default for --agent-id

Every failure exits non-zero with the reason on stderr. A capture that
silently produced nothing would be worse than no capture at all.

Two things this module refuses to do:

  * Post without a credential. Attribution is the point of the corpus, and an
    unauthenticated post lets the caller name any agent and any tenant it likes.
  * Post without a spec version. A trajectory that cannot name the contract it
    ran under cannot enter either judgement layer, so it would be stored and
    never judged — a silent failure dressed as HTTP 201.

Everything that leaves here passes through `redaction`. Tool arguments, tool
output, message text and reasoning are all verbatim agent content, and verbatim
agent content is where credentials live.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
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
    SpecVersionError,
    actor_for_agent_id,
    compute_version,
)

OTS_VERSION = "0.1.0"
DEFAULT_HARNESS = "claude-code"
OTS_INGEST_PATH = "/api/ots/trajectories"

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


def _content_parts(message: Any) -> tuple[str, list[dict[str, Any]]]:
    """ATIF content: a string, or a list of parts (v1.6+), text and images mixed.

    Images are not thrown away. A curator that rendered a landing page and
    looked at it made its judgement on the picture, and a trajectory that keeps
    only the words around the picture cannot be judged on taste or finish at
    all. ATIF image parts carry a media type and a path rather than the bytes
    (`harbor.models.trajectories.content.ImageSource`), so the reference is what
    there is to keep — and keeping it is what lets layer 2 go and look.
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
            source = part.get("source") or {}
            media_type = source.get("media_type") or "image"
            path = redact_text(str(source.get("path") or ""))
            attachments.append(
                {"type": "image", "media_type": media_type, "path": path}
            )
            chunks.append(f"[image {media_type} {path}]" if path else f"[image {media_type}]")
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


def _build_decisions(
    step: dict[str, Any], trajectory_id: str
) -> list[dict[str, Any]]:
    """One decision per tool call, each linked to its observation by cause_id.

    `cause_id` is the tool_call id. It is what turns a flat list of decisions
    and a flat list of results into a causal chain: a judge reading the
    trajectory can say which observation a given choice produced, rather than
    inferring it from adjacency.
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
            "choice": {
                "action": call.get("function_name", ""),
                "arguments": redact_value(call.get("arguments") or {}),
            },
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
            "decisions": _build_decisions(step, trajectory_id),
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
        # The Temper OTS ingest handler indexes on `metadata.trajectory_id`
        # (temper-server observe/evolution/trajectories.rs) and mints a random
        # id when it is absent, which would orphan the id we minted and sent as
        # X-Trajectory-Id. Emitting it here keeps the document findable by the
        # id the judge will ask for. The canonical field is the top-level
        # `trajectory_id`; this is the index key.
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
    if tags:
        metadata["tags"] = tags
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
    """POST one OTS document, under a credential, as a named agent principal.

    The credential is mandatory. `X-Agent-Id` is a claim the caller makes about
    itself, and against a server with no key configured an anonymous caller
    could make that claim about anyone — so this client will not post without
    one, and sends the same identity as the request principal
    (`x-temper-principal-id`) so the server sees one identity rather than two.

    Correlating the claimed agent id with the credential that authenticated the
    request is the server's to do; this client makes the two agree so that the
    correlation has something to check.
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
        default=os.environ.get("KATAGAMI_AGENT_ID"),
        help="agent identity for the run (default $KATAGAMI_AGENT_ID)",
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
    *, spec_version: str | None, actor_spec: str | None, agent_id: str
) -> str | None:
    """The actor spec version to stamp, computed rather than typed.

    Order: an explicit `--spec-version`, then the version of the named actor
    spec, then the version of the actor this agent id runs under. Returning
    None means there is no actor contract to name — the caller decides whether
    that is fatal (it is, for `--post`).
    """
    if spec_version:
        return spec_version
    actor = actor_spec or actor_for_agent_id(agent_id)
    if not actor:
        return None
    return compute_version(actor)


def _session_id_from(atif: dict[str, Any], transcript: Path, override: str | None) -> str:
    if override:
        return override
    from_atif = atif.get("session_id")
    if isinstance(from_atif, str) and from_atif:
        return from_atif
    return transcript.stem


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if not args.agent_id:
        print(
            "error: --agent-id is required (or set KATAGAMI_AGENT_ID). The run must "
            "be attributed to the role's own agent credential.",
            file=sys.stderr,
        )
        return 2
    if not args.out and not args.post:
        print("error: nothing to do — pass --out and/or --post", file=sys.stderr)
        return 2

    try:
        spec_version = resolve_spec_version(
            spec_version=args.spec_version,
            actor_spec=args.actor_spec,
            agent_id=args.agent_id,
        )
    except SpecVersionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if args.post and not spec_version:
        print(
            "error: no actor spec version could be resolved for agent "
            f"{args.agent_id!r}. A trajectory with no spec_version cannot enter "
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
        )
    except (HarborUnavailable, HarborConversionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    session_id = _session_id_from(atif, transcript, args.session_id)
    trajectory_id = args.trajectory_id or derive_trajectory_id(session_id)

    try:
        ots = atif_to_ots(
            atif,
            agent_id=args.agent_id,
            session_id=session_id,
            trajectory_id=trajectory_id,
            spec_version=spec_version,
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
                agent_id=args.agent_id,
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
