"""The single seam between Katagami and Harbor.

Every Harbor import, the version pin, and the native-transcript -> ATIF
conversion live in this module and nowhere else. Everything downstream sees
plain dictionaries, so replacing Harbor means rewriting this one file and
leaving `claude_session_to_ots.py` untouched.

Why Harbor at all: the Claude Code transcript format belongs to the harness,
not to us, and it moves. Harbor's installed-agent for Claude Code declares
`SUPPORTS_ATIF` and already handles the parts that bite —

  * subagent transcripts written to `subagents/*.jsonl` instead of inlined
    sidechain events,
  * duplicate `uuid` events replayed after a compaction,
  * streaming usage that accumulates across chunks, so only the last one is
    real,
  * `tool_use` / `tool_result` pairing across separate events,
  * one LLM inference (several events sharing a `message.id`) bundled into a
    single step.

A hand-rolled transcript parser gets those wrong quietly, which is the worst
failure mode for a capture pipeline: it keeps producing plausible output while
drifting away from what the harness actually did.

Verified against the pinned source: Harbor v0.21.0,
`src/harbor/agents/installed/claude_code.py`. `ClaudeCode` is constructible
with nothing but a logs directory, and `populate_context_post_run` — a public
method — reads `<logs_dir>/sessions/projects/<slug>/*.jsonl` and writes
`<logs_dir>/trajectory.json` in ATIF v1.7. That is the whole conversion API we
need; we stage a transcript into that layout and read the result back.
"""

from __future__ import annotations

import contextlib
import json
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

# Pinned in scripts/trajectory/requirements.txt. Both constants are asserted by
# the contract tests, so bumping the pin means bumping it in one place and
# seeing the test tell you where else it is referenced.
HARBOR_PINNED_VERSION = "0.21.0"
HARBOR_PINNED_REF = "v0.21.0"
HARBOR_REQUIREMENT = (
    f"harbor @ git+https://github.com/harbor-framework/harbor.git@{HARBOR_PINNED_REF}"
)

# The ATIF schema version the pinned Harbor emits. Recorded on the OTS document
# so a consumer can tell which interchange format the trajectory came through.
ATIF_SCHEMA_VERSION = "ATIF-v1.7"


class HarborUnavailable(RuntimeError):
    """Harbor is not installed, or not at the pinned version."""


class HarborConversionError(RuntimeError):
    """Harbor was present but produced no trajectory for this transcript."""


def _installed_version() -> str:
    from importlib.metadata import PackageNotFoundError, version

    try:
        return version("harbor")
    except PackageNotFoundError as exc:  # pragma: no cover - import-time guard
        raise HarborUnavailable(
            "harbor is not installed. Install the pinned version:\n"
            f"    pip install '{HARBOR_REQUIREMENT}'\n"
            "or: pip install -r scripts/trajectory/requirements.txt"
        ) from exc


def require_harbor() -> str:
    """Return the installed Harbor version, or explain why we cannot proceed.

    The pin is strict. A capture pipeline that silently accepts whatever Harbor
    happens to be installed produces trajectories whose provenance nobody can
    reconstruct later, so a drifted version is an error rather than a warning.
    """
    installed = _installed_version()
    if installed != HARBOR_PINNED_VERSION:
        raise HarborUnavailable(
            f"harbor {installed} is installed but this pipeline is pinned to "
            f"{HARBOR_PINNED_VERSION}. Install the pin:\n"
            f"    pip install '{HARBOR_REQUIREMENT}'"
        )
    return installed


class _LogCapture(logging.Handler):
    """Collects Harbor's debug lines so a silent failure can still be reported.

    `populate_context_post_run` swallows its own exceptions and logs them at
    DEBUG. Losing that reason is not acceptable — every failure has to reach the
    human channel — so we attach a handler, and if no trajectory comes out we
    replay what Harbor said into the raised error.
    """

    def __init__(self) -> None:
        super().__init__(level=logging.DEBUG)
        self.lines: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        try:
            self.lines.append(record.getMessage())
        except Exception:  # pragma: no cover - never let logging break capture
            pass


@contextlib.contextmanager
def _stdout_to_stderr():
    """Keep converter chatter off stdout.

    Harbor pulls in litellm for cost estimation, and litellm prints a provider
    banner. Our stdout is the OTS document itself when the CLI is run with
    `--out -`, so a stray banner corrupts the output for whatever is next in the
    pipe. Redirect file descriptor 1 rather than `sys.stdout`, so a library that
    grabbed the real stream at import time is covered too.
    """
    sys.stdout.flush()
    saved = os.dup(1)
    try:
        os.dup2(2, 1)
        yield
    finally:
        sys.stdout.flush()
        os.dup2(saved, 1)
        os.close(saved)


def transcript_to_atif(
    transcript_path: Path | str,
    *,
    session_id: str | None = None,
    model_name: str | None = None,
) -> dict[str, Any]:
    """Convert one Claude Code transcript JSONL into an ATIF trajectory dict.

    Args:
        transcript_path: the `transcript_path` a Claude Code hook handed us.
        session_id: used only to name the staged file; the real session id comes
            from the transcript's own `sessionId` events.
        model_name: fallback model for events that do not name one.

    Raises:
        HarborUnavailable: harbor missing or not at the pin.
        HarborConversionError: transcript unreadable, empty, or rejected.
    """
    require_harbor()

    source = Path(transcript_path).expanduser()
    if not source.is_file():
        raise HarborConversionError(f"transcript not found: {source}")
    if source.stat().st_size == 0:
        raise HarborConversionError(f"transcript is empty: {source}")

    with _stdout_to_stderr():
        from harbor.agents.installed.claude_code import ClaudeCode
        from harbor.models.agent.context import AgentContext

    staged_name = f"{session_id}.jsonl" if session_id else source.name

    with tempfile.TemporaryDirectory(prefix="katagami-atif-") as tmp:
        logs_dir = Path(tmp)
        # Harbor locates sessions at <logs_dir>/sessions/projects/<slug>/*.jsonl
        # and requires exactly one such directory, which is why we stage into a
        # fresh temp tree rather than pointing it at ~/.claude.
        session_dir = logs_dir / "sessions" / "projects" / "katagami-capture"
        session_dir.mkdir(parents=True)
        shutil.copyfile(source, session_dir / staged_name)

        capture = _LogCapture()
        harbor_logger = logging.getLogger("harbor")
        previous_level = harbor_logger.level
        harbor_logger.addHandler(capture)
        harbor_logger.setLevel(logging.DEBUG)
        try:
            with _stdout_to_stderr():
                agent = ClaudeCode(logs_dir=logs_dir, model_name=model_name)
                agent.populate_context_post_run(AgentContext())
        finally:
            harbor_logger.removeHandler(capture)
            harbor_logger.setLevel(previous_level)

        produced = logs_dir / "trajectory.json"
        if not produced.is_file():
            detail = "\n".join(capture.lines[-20:]) or "(harbor logged nothing)"
            raise HarborConversionError(
                f"harbor produced no ATIF trajectory for {source}.\n"
                f"harbor debug output:\n{detail}"
            )
        atif = json.loads(produced.read_text(encoding="utf-8"))

    if not atif.get("steps"):
        raise HarborConversionError(
            f"harbor produced an ATIF trajectory with no steps for {source}"
        )
    return atif
