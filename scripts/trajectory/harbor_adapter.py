"""The single seam between Katagami and Harbor.

Every Harbor import, the version pin, and the native-transcript -> ATIF
conversion live in this module and nowhere else. Everything downstream sees
plain dictionaries, so replacing Harbor means rewriting this one file and
leaving `claude_session_to_ots.py` untouched.

Why Harbor at all: the Claude Code transcript format belongs to the harness,
not to us, and it moves. Harbor's installed-agent for Claude Code declares
`SUPPORTS_ATIF` and already handles the parts that bite —

  * subagent transcripts written to `subagents/*.jsonl` instead of inlined
    sidechain events — Harbor reads them when they are in the tree it is given,
    which is why `_stage_subagent_transcripts` puts them there,
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
import hashlib
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

# Bounds on the image archive. A trajectory that carried a screenshot of every
# render would otherwise pull an unbounded pile of pixels into the queue
# directory. Past the cap the image is still identified by content hash — the
# judge learns the picture existed and what it was, just not what it looked
# like, which is a better answer than a path to nothing.
MAX_ARCHIVED_IMAGE_BYTES = 8 * 1024 * 1024
MAX_ARCHIVED_IMAGE_TOTAL_BYTES = 64 * 1024 * 1024


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


def subagent_transcripts(transcript_path: Path) -> list[Path]:
    """The subagent JSONLs that belong to one Claude Code session transcript.

    Claude Code writes each subagent's transcript to
    `<projects>/<slug>/<session-id>/subagents/agent-<id>.jsonl`, a directory
    that sits beside `<session-id>.jsonl` rather than inside it. Delegated work
    — a published artifact, a file the main agent never touched itself — exists
    only in those files.

    Staging the primary JSONL alone therefore produces a trajectory that is
    quietly missing whatever was delegated, and a conformance replay over it
    can pass a run whose actions are not all there. The pinned Harbor reads
    `session_dir.rglob("subagents/*.jsonl")` alongside the primary
    (`claude_code.py::_convert_events_to_trajectory`), so handing it the tree is
    all that is needed; it dedupes and orders by timestamp itself.
    """
    subagent_dir = transcript_path.parent / transcript_path.stem / "subagents"
    if not subagent_dir.is_dir():
        return []
    return sorted(p for p in subagent_dir.glob("*.jsonl") if p.is_file())


def _stage_subagent_transcripts(source: Path, session_dir: Path) -> list[Path]:
    """Copy the session's subagent transcripts into the layout Harbor reads.

    `ClaudeCode._session_dirs` excludes any directory whose path contains a
    `subagents` component, so staging them here adds no second session
    directory and leaves the "exactly one session dir" requirement intact.
    """
    found = subagent_transcripts(source)
    if not found:
        return []
    staged_dir = session_dir / source.stem / "subagents"
    staged_dir.mkdir(parents=True, exist_ok=True)
    staged: list[Path] = []
    for path in found:
        destination = staged_dir / path.name
        shutil.copyfile(path, destination)
        staged.append(destination)
    return staged


def _image_sources(node: Any) -> list[dict[str, Any]]:
    """Every ATIF image `source` object anywhere in the document.

    Image parts appear on step messages and inside tool results, and the shape
    is the same in both places (`harbor.models.trajectories.content.ImageSource`
    — a media type and a path, never the bytes). Walking the whole document
    rather than the two known places means a third place cannot quietly start
    producing dangling references.
    """
    found: list[dict[str, Any]] = []
    if isinstance(node, dict):
        source = node.get("source")
        # `type == "image"` as well as the shape: without it any structure that
        # happens to carry a `source.path` would have that file hashed and
        # copied into the archive, which is a way to pull an arbitrary file off
        # disk into the upload.
        if (
            node.get("type") == "image"
            and isinstance(source, dict)
            and isinstance(source.get("path"), str)
        ):
            found.append(source)
        for value in node.values():
            found.extend(_image_sources(value))
    elif isinstance(node, list):
        for item in node:
            found.extend(_image_sources(item))
    return found


def _resolve_image(raw: str, roots: list[Path]) -> Path | None:
    candidate = Path(raw).expanduser()
    if candidate.is_absolute():
        return candidate if candidate.is_file() else None
    for root in roots:
        resolved = root / candidate
        if resolved.is_file():
            return resolved
    return None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def archive_images(
    atif: dict[str, Any], *, roots: list[Path], image_dir: Path | None
) -> dict[str, int]:
    """Copy referenced images out before their directory disappears.

    Harbor resolves images relative to the staged log tree, and that tree is a
    TemporaryDirectory this module deletes on the way out. Leaving the relative
    path on the document produced a reference that pointed at nothing the
    moment conversion finished — worse than no reference, because it reads like
    evidence a judge could go and open.

    So every referenced file is hashed here, while it still exists, and copied
    into `image_dir` when it is within the size bounds. What leaves is either
    an image the judge can open or an explicit `available: false` with the
    content hash and the reason. Never a path to nothing.
    """
    counts = {"archived": 0, "hashed_only": 0, "missing": 0}
    budget = MAX_ARCHIVED_IMAGE_TOTAL_BYTES

    for source in _image_sources(atif):
        raw = source.get("path")
        source["source_ref"] = raw if isinstance(raw, str) else None
        source.pop("path", None)

        resolved = _resolve_image(raw, roots) if isinstance(raw, str) and raw else None
        if resolved is None:
            source["available"] = False
            source["unavailable_reason"] = (
                "the transcript referenced this image but no file was found at that "
                "path during capture"
            )
            counts["missing"] += 1
            continue

        try:
            size = resolved.stat().st_size
            source["sha256"] = _sha256(resolved)
            source["bytes"] = size
        except OSError as exc:
            source["available"] = False
            source["unavailable_reason"] = f"the image could not be read during capture: {exc}"
            counts["missing"] += 1
            continue

        if image_dir is None:
            source["available"] = False
            source["unavailable_reason"] = (
                "no image archive was configured for this capture; the content hash "
                "identifies the image but the pixels were not kept"
            )
            counts["hashed_only"] += 1
            continue
        if size > MAX_ARCHIVED_IMAGE_BYTES or size > budget:
            source["available"] = False
            source["unavailable_reason"] = (
                f"the image is {size} bytes, past the capture archive's bounds "
                f"(per-image {MAX_ARCHIVED_IMAGE_BYTES}, per-trajectory "
                f"{MAX_ARCHIVED_IMAGE_TOTAL_BYTES}); it is identified by hash only"
            )
            counts["hashed_only"] += 1
            continue

        try:
            image_dir.mkdir(parents=True, exist_ok=True)
            destination = image_dir / f"{source['sha256']}{resolved.suffix.lower()}"
            if not destination.exists():
                shutil.copyfile(resolved, destination)
        except OSError as exc:
            source["available"] = False
            source["unavailable_reason"] = f"the image could not be archived: {exc}"
            counts["hashed_only"] += 1
            continue

        source["path"] = str(destination)
        source["available"] = True
        budget -= size
        counts["archived"] += 1

    return counts


def transcript_to_atif(
    transcript_path: Path | str,
    *,
    session_id: str | None = None,
    model_name: str | None = None,
    image_dir: Path | str | None = None,
) -> dict[str, Any]:
    """Convert one Claude Code transcript JSONL into an ATIF trajectory dict.

    Args:
        transcript_path: the `transcript_path` a Claude Code hook handed us.
        session_id: used only to name the staged file; the real session id comes
            from the transcript's own `sessionId` events.
        model_name: fallback model for events that do not name one.
        image_dir: where to copy referenced images. Without it the images are
            still hashed and marked unavailable rather than left as paths into
            a deleted temp tree (`archive_images`).

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
        staged_subagents = _stage_subagent_transcripts(source, session_dir)

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
                f"harbor produced no ATIF trajectory for {source} "
                f"({len(staged_subagents)} subagent transcript(s) staged).\n"
                f"harbor debug output:\n{detail}"
            )
        atif = json.loads(produced.read_text(encoding="utf-8"))

        # Inside the `with`, deliberately: `logs_dir` is about to be deleted,
        # and it is where the image paths on this document resolve.
        archive_images(
            atif,
            roots=[logs_dir, session_dir, source.parent],
            image_dir=Path(image_dir).expanduser() if image_dir else None,
        )

    if not atif.get("steps"):
        raise HarborConversionError(
            f"harbor produced an ATIF trajectory with no steps for {source}"
        )
    return atif
