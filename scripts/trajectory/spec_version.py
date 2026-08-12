"""The version of an actor spec, derived from the spec itself.

A verdict is only meaningful against the contract that was in force when the
run happened, so every captured trajectory carries a `spec_version`. Leaving
that to a human-typed environment variable made it optional in practice — an
install that forgot it produced rows nothing could judge — so the version is
computed here instead, from the actor spec file, and capture refuses to post
without one.

The version is `sha256:<64 hex>` over the spec file's RAW bytes.

That is the kernel's definition, not one of ours: `spec_content_hash`
(temper-store-turso) hashes the registered `ioa_source`, and the conformance
endpoint compares the version a trajectory records against that hash, stripping
only a `sha256:` prefix before an exact string match
(`temper-server/src/api/trajectory_analysis.rs::names_same_spec`).

This used to be `<AutomatonName>@sha256:<12 hex>` over the spec's *semantic*
content, so that reflowing a comment did not invalidate every verdict already
written against the protocol. That property was worth having and it cost too
much: a version in a private format can never equal the kernel's hash, so
`POST /api/conformance/check` answered 409 for every trajectory capture
produced — the canonical judge could not judge anything, and the offline
fallback silently became the only engine that ever ran. One vocabulary, shared
with the kernel, beats a nicer one nobody else speaks.

What that costs, and what pays it back: editing a comment in a spec now
produces a new version. Verdicts already written are not lost — capture
snapshots the exact source under its hash (below), so the contract a run
executed under stays retrievable even after the file moves on. The automaton
name is not in the version any more either; it travels beside it, in the
snapshot record and in `TrajectoryVerdict.actor_spec`.

Because the version is a function of the file, a judge can recompute it from
the spec in the checkout and prove it is reading the same contract the run
executed under, instead of trusting a label.

That only holds while the file is still there. A spec edited after the run —
the normal case, since specs evolve — leaves every trajectory captured under
the old version naming a contract nobody can produce, and a caller passing
`--spec-version` by hand could name a contract that never existed. So capture
also SNAPSHOTS the spec source, keyed by the version hash, under
`spec-snapshots/` in the capture archive. The snapshot is immutable: a version
is written once and never rewritten, and a version that disagrees with an
existing snapshot is a hash collision or a corrupted archive, not an update.

A version is therefore accepted only when it is either recomputable from this
checkout or retrievable from the snapshot store. A hand-typed version that is
neither is refused rather than stamped onto a trajectory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tomllib
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# scripts/trajectory/ -> repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
ACTOR_SPEC_DIR = REPO_ROOT / "katagami-curation" / "specs"

# Where capture keeps its queue, archive, and spec snapshots. Mirrors
# hooks/trajectory-capture/capture.py::queue_root so both sides agree without
# either importing the other.
DEFAULT_QUEUE = Path.home() / ".katagami" / "trajectory-queue"
SNAPSHOT_DIRNAME = "spec-snapshots"

# The actor spec each captured role runs under. An agent id that is not here
# has no actor contract, and capture says so rather than guessing.
ACTOR_SPEC_BY_AGENT_ID = {
    "katagami-contributor": "CuratorAgent",
    "katagami-curator": "CuratorAgent",
    "katagami-iterate": "CuratorAgent",
    "katagami-reviewer": "ReviewAgent",
    "katagami-review-agent": "ReviewAgent",
    "katagami-human-curator": "HumanCurator",
}

# The interchange form. `names_same_spec` strips exactly this prefix from both
# sides before comparing, so `sha256:<hex>` and a bare `<hex>` are the same
# version to the kernel; the prefix is here because a bare 64-hex string in a
# log tells nobody what it is.
VERSION_PREFIX = "sha256:"


class SpecVersionError(RuntimeError):
    """The actor spec could not be located or read."""


def _snake(name: str) -> str:
    out: list[str] = []
    for index, char in enumerate(name):
        if char.isupper() and index:
            out.append("_")
        out.append(char.lower())
    return "".join(out)


def actor_spec_path(actor: str) -> Path:
    """Locate `CuratorAgent` -> katagami-curation/specs/curator_agent.ioa.toml."""
    candidate = Path(actor).expanduser()
    if candidate.suffix == ".toml":
        if not candidate.is_file():
            raise SpecVersionError(f"actor spec not found: {candidate}")
        return candidate
    path = ACTOR_SPEC_DIR / f"{_snake(actor)}.ioa.toml"
    if not path.is_file():
        raise SpecVersionError(
            f"no actor spec for {actor!r} at {path}. Known actors: "
            + ", ".join(sorted(set(ACTOR_SPEC_BY_AGENT_ID.values())))
        )
    return path


def actor_for_agent_id(agent_id: str) -> str | None:
    return ACTOR_SPEC_BY_AGENT_ID.get(agent_id)


def load_spec(actor: str) -> dict[str, Any]:
    path = actor_spec_path(actor)
    try:
        return tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as exc:
        raise SpecVersionError(f"cannot read actor spec {path}: {exc}") from exc


def version_of_source(ioa_source: str) -> str:
    """The kernel's `spec_content_hash`, in the interchange form.

    One function, so every place that needs to say "which spec is this" agrees
    with the server that will be asked the same question.
    """
    return VERSION_PREFIX + hashlib.sha256(ioa_source.encode("utf-8")).hexdigest()


def bare_version(version: str) -> str:
    """The hash without its prefix — how the kernel compares two versions."""
    return version.removeprefix(VERSION_PREFIX)


def compute_version(actor: str) -> str:
    """`sha256:<64 hex>` over the spec file, matching the kernel's registry."""
    return _versioned_payload(actor)[0]


def _versioned_payload(actor: str) -> tuple[str, str]:
    """(version, source) — the hash and the exact bytes it was taken over."""
    path = actor_spec_path(actor)
    try:
        source = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise SpecVersionError(f"cannot read actor spec {path}: {exc}") from exc
    return version_of_source(source), source


# --------------------------------------------------------------------------
# the snapshot store
# --------------------------------------------------------------------------


def snapshot_root() -> Path:
    """Where snapshots live. Env-overridable so tests never touch a real archive."""
    explicit = os.environ.get("KATAGAMI_SPEC_SNAPSHOT_DIR")
    if explicit:
        return Path(explicit).expanduser()
    queue = os.environ.get("KATAGAMI_TRAJECTORY_QUEUE", str(DEFAULT_QUEUE))
    return Path(queue).expanduser() / SNAPSHOT_DIRNAME


def _snapshot_name(version: str) -> str:
    """`sha256:8f2c…` -> `sha256-8f2c….json`.

    Only the colon is rewritten, and only because it is awkward in a filename;
    the version inside the file stays verbatim, so the name is a convenience
    and never the record.
    """
    return version.replace(":", "-").replace("/", "_") + ".json"


def snapshot_path(version: str, root: Path | None = None) -> Path:
    return (root or snapshot_root()) / _snapshot_name(version)


def _verified_snapshot(
    stored: Any, version: str, path: Path, actor: str | None = None
) -> dict[str, Any]:
    """A stored record, or an error. Never a record taken on trust.

    The file name says which version this is. Nothing else does — so a
    truncated write, a hand-edited archive, or a file dropped in by anything
    at all would otherwise be read back as provenance. Recomputing the hash
    over the stored source is the whole guarantee, and it costs a sha256.
    """
    if not isinstance(stored, dict):
        raise SpecVersionError(f"spec snapshot {path} is not a snapshot record")

    source = stored.get("source")
    if not isinstance(source, str) or not source:
        raise SpecVersionError(f"spec snapshot {path} records no spec source")

    actual = version_of_source(source)
    if bare_version(actual) != bare_version(version):
        raise SpecVersionError(
            f"spec snapshot {path} does not contain the spec it claims: its source hashes "
            f"to {actual}, not {version}. A snapshot that does not hash to its own name is "
            "not evidence of what a run executed under."
        )
    if actor is not None and stored.get("actor") != actor:
        raise SpecVersionError(
            f"spec snapshot {path} holds {stored.get('actor')!r}, not {actor!r}. A version "
            "belonging to a different actor cannot be stamped on this run."
        )
    return stored


def load_snapshot(
    version: str, root: Path | None = None, actor: str | None = None
) -> dict[str, Any] | None:
    """The stored spec for a version, verified, or None if never captured."""
    path = snapshot_path(version, root)
    if not path.is_file():
        return None
    try:
        stored = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SpecVersionError(f"spec snapshot {path} is unreadable: {exc}") from exc
    return _verified_snapshot(stored, version, path, actor)


def snapshot_spec(actor: str, root: Path | None = None) -> tuple[str, Path]:
    """Record the spec source under its version hash. Write-once.

    Called at capture time, which is the only moment the spec that governed the
    run is guaranteed to still be on disk. Re-snapshotting an unchanged spec is
    a no-op, so this is safe to call on every session — including from several
    sessions at once, which is why the staged file carries this process's pid.
    """
    version, source = _versioned_payload(actor)
    directory = root or snapshot_root()
    path = directory / _snapshot_name(version)

    if path.is_file():
        # Verifies as a side effect: an archive whose record does not hash to
        # its own name is an error here rather than silent provenance later.
        load_snapshot(version, directory, actor=actor)
        return version, path

    directory.mkdir(parents=True, exist_ok=True)
    record = {
        "version": version,
        "actor": actor_name(actor),
        "source_path": str(actor_spec_path(actor)),
        "captured_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        # The exact bytes the hash was taken over, so a judge can recompute the
        # version from the snapshot alone.
        "source": source,
    }
    # Staged then renamed, so an interrupted capture cannot leave a truncated
    # snapshot. The staging name is unique per call, not per process: two
    # sessions starting at once would otherwise share one staging path, and the
    # loser would try to rename a file the winner had already moved away.
    staged = directory / f"{_snapshot_name(version)}.{uuid.uuid4().hex}.partial"
    try:
        staged.write_text(
            json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        # Last writer wins, and every writer writes the same bytes: the content
        # is a function of the version, which is a function of the content.
        staged.replace(path)
    finally:
        staged.unlink(missing_ok=True)
    return version, path


def actor_name(actor: str) -> str | None:
    """The automaton name declared inside the spec, for the snapshot record."""
    try:
        return (load_spec(actor).get("automaton") or {}).get("name")
    except SpecVersionError:
        return None


def resolve_version(
    *, claimed: str | None, actor: str | None, root: Path | None = None
) -> str | None:
    """The version to stamp, proven against the spec or against the snapshot.

    Three outcomes, and no fourth:

      * The actor spec is in this checkout — the version is computed from it and
        snapshotted. A `claimed` version that disagrees is refused, because the
        caller is naming a contract this checkout can prove it is not running.
      * The actor spec is not here but the claimed version was snapshotted by an
        earlier capture — accepted, and the snapshot is what a judge reads.
      * Neither — refused. An unverifiable version is worse than none: it looks
        like provenance and carries none.
    """
    if actor:
        version, _path = snapshot_spec(actor, root)
        if claimed and bare_version(claimed) != bare_version(version):
            # A version this checkout cannot produce may still be one an
            # earlier capture recorded, for the same actor. The snapshot has to
            # hash to its own name and name this actor, or it is not evidence.
            if load_snapshot(claimed, root, actor=actor_name(actor)) is not None:
                return claimed
            raise SpecVersionError(
                f"the caller claims spec version {claimed!r} but {actor} in this checkout "
                f"is {version!r}, and no snapshot of {claimed!r} exists in "
                f"{snapshot_path(claimed, root)}. A version that can be neither recomputed "
                "nor retrieved names a contract nobody can produce."
            )
        return version

    if claimed:
        if load_snapshot(claimed, root) is None:
            raise SpecVersionError(
                f"no actor spec is available for the claimed version {claimed!r} and no "
                f"snapshot of it exists in {snapshot_path(claimed, root)}. Pass "
                "--actor-spec so the version is computed from the spec, or run the "
                "capture on a checkout that has it."
            )
        return claimed

    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Print the version of an actor spec, or verify a claimed one."
    )
    parser.add_argument("actor", help="actor name (CuratorAgent) or path to a .ioa.toml")
    parser.add_argument("--verify", help="exit non-zero unless the version matches this")
    parser.add_argument(
        "--snapshot",
        action="store_true",
        help="record the spec source under its version hash and print the path",
    )
    parser.add_argument(
        "--show-snapshot",
        metavar="VERSION",
        help="print the stored spec content for a version, as captured at the time",
    )
    args = parser.parse_args(argv)

    if args.show_snapshot:
        try:
            stored = load_snapshot(args.show_snapshot)
        except SpecVersionError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
        if stored is None:
            print(
                f"error: no snapshot of {args.show_snapshot!r} in "
                f"{snapshot_path(args.show_snapshot)}. Capture records one for every "
                "version it stamps; a missing snapshot means this version was never "
                "captured on this machine.",
                file=sys.stderr,
            )
            return 1
        print(stored.get("source", ""))
        return 0

    try:
        version = compute_version(args.actor)
        if args.snapshot:
            version, path = snapshot_spec(args.actor)
            print(f"snapshot: {path}", file=sys.stderr)
    except SpecVersionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.verify and args.verify != version:
        # A version the checkout cannot produce may still be one capture
        # recorded when the run happened. That is provenance, not drift.
        try:
            stored = load_snapshot(args.verify)
        except SpecVersionError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
        if stored is None:
            print(
                f"error: spec version mismatch. The trajectory claims {args.verify!r} but "
                f"{args.actor} in this checkout is {version!r}, and no snapshot of the "
                f"claimed version exists in {snapshot_path(args.verify)}. Judge against "
                "the spec the run executed under, or say plainly that you could not.",
                file=sys.stderr,
            )
            return 1
        print(
            f"note: {args.verify} is not the current {args.actor} ({version}); reading it "
            f"from the capture snapshot {snapshot_path(args.verify)}",
            file=sys.stderr,
        )
        print(args.verify)
        return 0

    print(version)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
