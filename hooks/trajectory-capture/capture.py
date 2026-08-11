#!/usr/bin/env python3
"""Claude Code hook wrapper for Katagami trajectory capture (ARN-293).

Two subcommands, both reading the hook payload as JSON on stdin:

    enqueue   SessionEnd  — record session_id + transcript_path and return.
    process   SessionStart — convert and post whatever is queued.

The split is deliberate. Converting a long conversation takes real time
(Harbor parses the whole transcript, and the post is a network call), and
SessionEnd runs while the user is closing the session. Enqueuing is a file
write; the work happens at the start of the *next* session, where a couple of
seconds is affordable and bounded.

Failures are loud. A queue entry that cannot be converted moves to `failed/`
with the error beside it and the reason goes to stderr, which Claude Code
shows. A capture pipeline that fails quietly is indistinguishable from one
that was never installed.

Environment:

    KATAGAMI_TRAJECTORY_QUEUE   queue root (default ~/.katagami/trajectory-queue)
    KATAGAMI_TRAJECTORY_SCRIPT  path to claude_session_to_ots.py
    KATAGAMI_AGENT_ID           agent identity for the run (required)
    KATAGAMI_ACTOR_SPEC_VERSION optional actor spec version to stamp
    KATAGAMI_TRAJECTORY_BATCH   max entries per process run (default 5)
    TEMPER_API_URL / TEMPER_API_KEY / TEMPER_TENANT_ID
"""

from __future__ import annotations

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

    pending = queue_root() / "pending"
    pending.mkdir(parents=True, exist_ok=True)
    entry = {
        "session_id": session_id,
        "transcript_path": transcript_path,
        "cwd": payload.get("cwd"),
        "hook_event_name": payload.get("hook_event_name"),
        "enqueued_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "harness": "claude-code",
        "agent_id": os.environ.get("KATAGAMI_AGENT_ID"),
        "spec_version": os.environ.get("KATAGAMI_ACTOR_SPEC_VERSION"),
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
        "--post",
    ]
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
    read_payload()  # drain stdin so the hook does not block on a pipe

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


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in {"enqueue", "process"}:
        print("usage: capture.py {enqueue|process}", file=sys.stderr)
        return 2
    return cmd_enqueue() if argv[1] == "enqueue" else cmd_process()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
