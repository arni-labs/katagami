#!/usr/bin/env python3
"""Claude Code hook wrapper for Katagami trajectory capture (ARN-293).

Three subcommands. The first two read the hook payload as JSON on stdin:

    enqueue   SessionEnd   — record session_id + transcript_path and return.
    process   SessionStart — publish this session's capture identity, then
                             convert and post whatever is queued.
    identity  (no hook)    — print the current session's capture identity, for
                             a skill that has to record it on its actor entity.

The enqueue/process split is deliberate. Converting a long conversation takes
real time (Harbor parses the whole transcript, and the post is a network call),
and SessionEnd runs while the user is closing the session. Enqueuing is a file
write; the work happens at the start of the *next* session, where a couple of
seconds is affordable and bounded.

`identity` exists because the ids have to match. The actor record a skill
writes carries `session_id` and `trajectory_id`, and the stored trajectory is
derived from the harness session id — so a skill that mints its own ids records
a trajectory_id that points at nothing. There is one derivation
(`claude_session_to_ots.derive_trajectory_id`), it is applied to the harness
session id, and both the hook and the skill read the result from here.

Failures are loud. A queue entry that cannot be converted moves to `failed/`
with the error beside it and the reason goes to stderr, which Claude Code
shows. A capture pipeline that fails quietly is indistinguishable from one
that was never installed.

Environment:

    KATAGAMI_TRAJECTORY_QUEUE   queue root (default ~/.katagami/trajectory-queue)
    KATAGAMI_TRAJECTORY_SCRIPT  path to claude_session_to_ots.py
    KATAGAMI_AGENT_ID           agent identity for the run (required)
    KATAGAMI_ACTOR_SPEC         actor automaton, e.g. CuratorAgent (optional;
                                defaults to the actor mapped from the agent id)
    KATAGAMI_ACTOR_SPEC_VERSION explicit spec version (optional; normally
                                computed from the actor spec in the checkout)
    KATAGAMI_TRAJECTORY_BATCH   max entries per process run (default 5)
    TEMPER_API_URL / TEMPER_API_KEY / TEMPER_TENANT_ID
"""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_QUEUE = Path.home() / ".katagami" / "trajectory-queue"
DEFAULT_BATCH = 5
PER_ENTRY_TIMEOUT_SECONDS = 180


def queue_root() -> Path:
    return Path(os.environ.get("KATAGAMI_TRAJECTORY_QUEUE", str(DEFAULT_QUEUE))).expanduser()


def converter_script() -> Path:
    configured = os.environ.get("KATAGAMI_TRAJECTORY_SCRIPT")
    if configured:
        return Path(configured).expanduser()
    # Default to the checked-out repo layout: hooks/trajectory-capture/ ->
    # scripts/trajectory/claude_session_to_ots.py
    return (
        Path(__file__).resolve().parents[2]
        / "scripts"
        / "trajectory"
        / "claude_session_to_ots.py"
    )


def _load_converter():
    """Import the converter module so the id derivation has one implementation.

    A second copy of `derive_trajectory_id` here would drift, and the drift
    would be invisible: both sides would keep producing plausible ids that no
    longer point at the same document.
    """
    script = converter_script()
    if not script.is_file():
        return None
    sys.path.insert(0, str(script.parent))
    try:
        spec = importlib.util.spec_from_file_location("katagami_ots_converter", script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception as exc:  # pragma: no cover - surfaced to the human channel
        print(f"katagami-trajectory: cannot load converter {script}: {exc}", file=sys.stderr)
        return None
    finally:
        sys.path.remove(str(script.parent))


def read_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"katagami-trajectory: unreadable hook payload: {exc}", file=sys.stderr)
        return {}
    return payload if isinstance(payload, dict) else {}


# --------------------------------------------------------------------------
# capture identity
# --------------------------------------------------------------------------

IDENTITY_PATH = "current-session.json"


def _spec_version(converter, agent_id: str | None) -> tuple[str | None, str | None]:
    """(version, error) for the actor spec this session runs under."""
    if converter is None:
        return os.environ.get("KATAGAMI_ACTOR_SPEC_VERSION"), None
    try:
        version = converter.resolve_spec_version(
            spec_version=os.environ.get("KATAGAMI_ACTOR_SPEC_VERSION"),
            actor_spec=os.environ.get("KATAGAMI_ACTOR_SPEC"),
            agent_id=agent_id or "",
        )
    except Exception as exc:
        return None, str(exc)
    return version, None


def build_identity(session_id: str) -> dict:
    """The ids this session is captured under, derived rather than invented."""
    converter = _load_converter()
    agent_id = os.environ.get("KATAGAMI_AGENT_ID")
    trajectory_id = (
        converter.derive_trajectory_id(session_id) if converter is not None else None
    )
    version, version_error = _spec_version(converter, agent_id)
    identity = {
        "session_id": session_id,
        "trajectory_id": trajectory_id,
        "harness": "claude-code",
        "agent_id": agent_id,
        "actor_spec": os.environ.get("KATAGAMI_ACTOR_SPEC"),
        "spec_version": version,
        "derived_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    if version_error:
        identity["spec_version_error"] = version_error
    return identity


def write_identity(session_id: str) -> dict:
    identity = build_identity(session_id)
    root = queue_root()
    root.mkdir(parents=True, exist_ok=True)
    (root / IDENTITY_PATH).write_text(
        json.dumps(identity, indent=2) + "\n", encoding="utf-8"
    )
    return identity


def cmd_identity() -> int:
    path = queue_root() / IDENTITY_PATH
    if not path.is_file():
        print(
            "katagami-trajectory: no capture identity recorded yet. The SessionStart "
            "hook writes it; if the hooks are not installed, mint the ids yourself and "
            "pass --session-id/--trajectory-id to claude_session_to_ots.py so the "
            "actor record and the stored trajectory agree.",
            file=sys.stderr,
        )
        return 1
    print(path.read_text(encoding="utf-8").rstrip())
    return 0


# --------------------------------------------------------------------------
# queue
# --------------------------------------------------------------------------


def cmd_enqueue() -> int:
    payload = read_payload()
    session_id = payload.get("session_id")
    transcript_path = payload.get("transcript_path")

    if not session_id or not transcript_path:
        print(
            "katagami-trajectory: hook payload had no session_id/transcript_path; "
            "nothing enqueued",
            file=sys.stderr,
        )
        return 1

    identity = build_identity(session_id)
    pending = queue_root() / "pending"
    pending.mkdir(parents=True, exist_ok=True)
    entry = {
        "session_id": session_id,
        "transcript_path": transcript_path,
        "trajectory_id": identity["trajectory_id"],
        "cwd": payload.get("cwd"),
        "hook_event_name": payload.get("hook_event_name"),
        "enqueued_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "harness": "claude-code",
        "agent_id": identity["agent_id"],
        "actor_spec": identity["actor_spec"],
        "spec_version": identity["spec_version"],
    }
    (pending / f"{session_id}.json").write_text(
        json.dumps(entry, indent=2) + "\n", encoding="utf-8"
    )
    return 0


def _convert_and_post(entry: dict) -> tuple[bool, str]:
    agent_id = entry.get("agent_id") or os.environ.get("KATAGAMI_AGENT_ID")
    if not agent_id:
        return False, (
            "KATAGAMI_AGENT_ID is not set. The run must be attributed to the "
            "role's own agent credential; capture refuses to guess one."
        )

    script = converter_script()
    if not script.is_file():
        return False, (
            f"converter not found at {script}. Set KATAGAMI_TRAJECTORY_SCRIPT to "
            "scripts/trajectory/claude_session_to_ots.py in your katagami checkout."
        )

    # Every posted document is also kept locally, keyed by the id it was posted
    # under. `GET /api/ots/trajectories` lists rows without their data, so this
    # archive is what a judge on this machine reads to see the trajectory it is
    # judging (mcp/skills/katagami-judge/SKILL.md §1).
    archive = queue_root() / "archive"
    archive.mkdir(parents=True, exist_ok=True)
    archive_name = entry.get("trajectory_id") or entry["session_id"]

    command = [
        sys.executable,
        str(script),
        "--transcript",
        str(entry["transcript_path"]),
        "--session-id",
        str(entry["session_id"]),
        "--agent-id",
        agent_id,
        "--harness",
        entry.get("harness", "claude-code"),
        "--out",
        str(archive / f"{archive_name}.json"),
        "--post",
    ]
    if entry.get("trajectory_id"):
        command += ["--trajectory-id", entry["trajectory_id"]]
    if entry.get("actor_spec"):
        command += ["--actor-spec", entry["actor_spec"]]
    if entry.get("spec_version"):
        command += ["--spec-version", entry["spec_version"]]

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=PER_ENTRY_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return False, f"conversion timed out after {PER_ENTRY_TIMEOUT_SECONDS}s"

    if completed.returncode != 0:
        return False, (completed.stderr or completed.stdout or "").strip()
    return True, (completed.stderr or "").strip()


def cmd_process() -> int:
    payload = read_payload()
    session_id = payload.get("session_id")
    if session_id:
        identity = write_identity(session_id)
        if identity.get("spec_version_error"):
            print(
                "katagami-trajectory: no actor spec version for this session: "
                f"{identity['spec_version_error']}",
                file=sys.stderr,
            )
        elif not identity.get("spec_version"):
            print(
                "katagami-trajectory: no actor spec version resolved for agent "
                f"{identity.get('agent_id')!r}. Set KATAGAMI_ACTOR_SPEC (e.g. "
                "CuratorAgent); a trajectory without one cannot be judged and will "
                "not be posted.",
                file=sys.stderr,
            )

    pending = queue_root() / "pending"
    if not pending.is_dir():
        return 0
    entries = sorted(pending.glob("*.json"))
    if not entries:
        return 0

    try:
        batch = int(os.environ.get("KATAGAMI_TRAJECTORY_BATCH", DEFAULT_BATCH))
    except ValueError:
        batch = DEFAULT_BATCH

    failed_dir = queue_root() / "failed"
    problems = 0

    for path in entries[: max(batch, 1)]:
        try:
            entry = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            failed_dir.mkdir(parents=True, exist_ok=True)
            path.rename(failed_dir / path.name)
            (failed_dir / f"{path.stem}.error.txt").write_text(str(exc), encoding="utf-8")
            print(f"katagami-trajectory: unreadable queue entry {path.name}: {exc}", file=sys.stderr)
            problems += 1
            continue

        ok, detail = _convert_and_post(entry)
        if ok:
            path.unlink(missing_ok=True)
            print(
                f"katagami-trajectory: captured session {entry.get('session_id')} {detail}".rstrip(),
                file=sys.stderr,
            )
            continue

        failed_dir.mkdir(parents=True, exist_ok=True)
        path.rename(failed_dir / path.name)
        (failed_dir / f"{path.stem}.error.txt").write_text(detail + "\n", encoding="utf-8")
        print(
            f"katagami-trajectory: FAILED session {entry.get('session_id')}: {detail}",
            file=sys.stderr,
        )
        problems += 1

    remaining = len(entries) - min(len(entries), max(batch, 1))
    if remaining > 0:
        print(
            f"katagami-trajectory: {remaining} session(s) still queued; they run at the next session start",
            file=sys.stderr,
        )
    return 1 if problems else 0


COMMANDS = {"enqueue": cmd_enqueue, "process": cmd_process, "identity": cmd_identity}


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in COMMANDS:
        print("usage: capture.py {enqueue|process|identity}", file=sys.stderr)
        return 2
    return COMMANDS[argv[1]]()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
