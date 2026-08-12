"""The version of an actor spec, derived from the spec itself.

A verdict is only meaningful against the contract that was in force when the
run happened, so every captured trajectory carries a `spec_version`. Leaving
that to a human-typed environment variable made it optional in practice — an
install that forgot it produced rows nothing could judge — so the version is
computed here instead, from the actor spec file, and capture refuses to post
without one.

The version is the digest the KERNEL registered, read from
`GET /observe/specs/{entity}`, which reports it as `spec_version`. Failing
that — offline, or no API configured — it is `sha256:<64 hex>` over the spec
file's raw bytes, and the trajectory records that it was computed rather than
read.

Reading beats computing, and the difference is not pedantry. The local hash is
the registered one only if the deploy registered these exact bytes; any path
that re-serializes the TOML on the way in breaks that, and nothing local can
tell you it happened. sha256 avalanches, so a re-emitted spec disagrees in its
first twelve characters exactly as it does in all sixty-four — no shorter or
looser pin format repairs it. Reading the digest the kernel holds is the only
thing that removes the risk instead of widening around it.

That is also the kernel's definition of the hash: `spec_content_hash`
(temper-store-turso) over the registered `ioa_source`. The conformance endpoint
compares a trajectory's recorded version against it
(`temper-server/src/api/spec_pin.rs`): a bare or `sha256:`-qualified digest
matches exactly, and an entity-qualified pin (`CuratorAgent@sha256:<≥12 hex>`)
matches by prefix.

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

Three kinds of provenance, and a version is stamped only if it has one:

  * READ — the kernel reported it. Recorded as an attestation, so a capture
    that read the registry while online can still be converted later offline.
  * COMPUTED — hashed from the spec in this checkout, and snapshotted.
  * RETRIEVED — a snapshot or attestation this machine wrote earlier.

A hand-typed version with none of the three is refused rather than stamped.

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
import math
import os
import re
import sys
import tomllib
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, NamedTuple

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


# --------------------------------------------------------------------------
# the registered digest, read from the kernel
# --------------------------------------------------------------------------

REGISTRY_SPEC_PATH = "/observe/specs/{entity}"
ATTESTATION_DIRNAME = "spec-attestations"

# Short on purpose. This read happens inside the SessionEnd and SessionStart
# hooks, where every second is a second the user is waiting on their own
# session, and a registry that cannot answer quickly is exactly the case the
# local fallback exists for. Falling back is a documented outcome, not a
# failure, so waiting longer buys nothing worth the stall.
DEFAULT_REGISTRY_TIMEOUT_SECONDS = 3.0


def registry_timeout() -> float:
    raw = os.environ.get("KATAGAMI_SPEC_REGISTRY_TIMEOUT")
    if not raw:
        return DEFAULT_REGISTRY_TIMEOUT_SECONDS
    try:
        timeout = float(raw)
    except ValueError:
        return DEFAULT_REGISTRY_TIMEOUT_SECONDS
    # `inf` and `nan` both pass a bare `> 0`, and `inf` means "block this
    # session hook forever" — the one value this setting must not accept.
    if not math.isfinite(timeout) or timeout <= 0:
        return DEFAULT_REGISTRY_TIMEOUT_SECONDS
    return timeout


class _NoRedirects(urllib.request.HTTPRedirectHandler):
    """Follow nothing.

    The request carries `Authorization` and the principal headers, and the
    stdlib's redirect handler re-sends every header it did not strip to
    whatever host the `Location` names — any scheme, up to ten hops. A parked
    domain, a reclaimed host, or a misconfigured proxy answering `302` would
    therefore be handed the credential. There is no redirect worth following to
    read one digest.
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(_NoRedirects)

# A spec digest is 64 hex characters. Anything else answering on this path is
# a captive portal, a gateway error page, or a server we do not understand —
# and stamping its output as the authoritative version would poison every
# capture behind it.
_DIGEST = re.compile(r"^[0-9a-f]{64}$")

# The body is a spec detail document, not a stream. A server that drips bytes
# forever would otherwise hold a session hook open indefinitely, because the
# socket timeout resets on every packet.
MAX_REGISTRY_BODY_BYTES = 4 * 1024 * 1024


def _http_get_json(url: str, headers: dict[str, str], timeout: float) -> Any:
    """One seam, so tests can answer without a server."""
    request = urllib.request.Request(url, method="GET")
    for name, value in headers.items():
        request.add_header(name, value)
    with _OPENER.open(request, timeout=timeout) as response:
        body = response.read(MAX_REGISTRY_BODY_BYTES + 1)
    if len(body) > MAX_REGISTRY_BODY_BYTES:
        raise ValueError(f"the answer exceeded {MAX_REGISTRY_BODY_BYTES} bytes")
    return json.loads(body.decode("utf-8"))


def registered_version(
    entity: str,
    *,
    api_url: str | None = None,
    tenant: str | None = None,
    api_key: str | None = None,
    principal_id: str | None = None,
    timeout: float | None = None,
) -> tuple[str | None, str | None]:
    """The digest the kernel registered for this entity: `(version, why_not)`.

    This is the authoritative answer and the reason this function exists.
    Computing the hash locally assumes the bytes the kernel registered are the
    bytes on disk here, and any deploy path that re-serializes the spec breaks
    that assumption silently — sha256 avalanches, so a re-emitted TOML disagrees
    in its first twelve characters exactly as it does in all sixty-four. There
    is no format that repairs it. Reading the digest the kernel holds is the
    only thing that removes the risk rather than widening around it.

    Never raises: a capture that cannot reach the server still has to produce a
    trajectory. `why_not` says what happened so the caller can say it out loud
    rather than quietly stamping a computed hash as if it were read.
    """
    api_url = api_url or os.environ.get("TEMPER_API_URL")
    if not api_url:
        return None, "TEMPER_API_URL is not set, so there is no registry to ask"

    url = api_url.rstrip("/") + REGISTRY_SPEC_PATH.format(entity=urllib.parse.quote(entity))
    headers = {"Accept": "application/json"}
    tenant = tenant or os.environ.get("TEMPER_TENANT_ID", "default")
    if tenant:
        headers["X-Tenant-Id"] = tenant
    api_key = api_key if api_key is not None else os.environ.get("TEMPER_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    principal_id = principal_id or os.environ.get("TEMPER_PRINCIPAL_ID") or os.environ.get(
        "KATAGAMI_AGENT_ID"
    )
    if principal_id:
        headers["x-temper-principal-kind"] = "agent"
        headers["x-temper-principal-id"] = principal_id

    try:
        detail = _http_get_json(url, headers, timeout or registry_timeout())
    except urllib.error.HTTPError as exc:
        return None, f"{url} answered HTTP {exc.code}"
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return None, f"{url} is unreachable: {exc}"
    except (json.JSONDecodeError, ValueError) as exc:
        return None, f"{url} did not answer with JSON: {exc}"

    digest = detail.get("spec_version") if isinstance(detail, dict) else None
    if not isinstance(digest, str) or not digest.strip():
        return None, f"{url} reported no spec_version for {entity!r}"
    digest = bare_version(digest.strip()).lower()
    if not _DIGEST.match(digest):
        return None, (
            f"{url} answered with {digest[:32]!r}, which is not a sha256 digest; "
            "refusing to stamp it as the registered version"
        )
    # The endpoint reports the bare hash; the interchange form adds the prefix,
    # and the kernel strips it again before comparing.
    return VERSION_PREFIX + digest, None


def attestation_root() -> Path:
    """Where registry attestations live, beside the snapshots in the archive."""
    explicit = os.environ.get("KATAGAMI_SPEC_ATTESTATION_DIR")
    if explicit:
        return Path(explicit).expanduser()
    queue = os.environ.get("KATAGAMI_TRAJECTORY_QUEUE", str(DEFAULT_QUEUE))
    return Path(queue).expanduser() / ATTESTATION_DIRNAME


def attestation_path(version: str, root: Path | None = None) -> Path:
    # `root` is the snapshot directory a caller pinned; attestations go under
    # it rather than beside it, so a caller that pinned one directory cannot
    # have writes land in its parent.
    directory = (root / ATTESTATION_DIRNAME) if root is not None else attestation_root()
    return directory / _snapshot_name(version)


def attest_registered_version(
    version: str,
    *,
    entity: str,
    local_version: str | None,
    api_url: str | None,
    root: Path | None = None,
) -> Path:
    """Record that the kernel reported this digest, so a later run can trust it.

    A registry digest has no local snapshot by definition: under normalization
    the content it names is the deploy's bytes, not the ones in this checkout,
    and writing our source under that name would be a snapshot that does not
    hash to itself — the exact lie the snapshot store refuses to tell.

    So the fact recorded here is a different one, and a true one: at this
    moment, the kernel at this URL reported this digest for this entity, while
    our local source hashed to that. Capture reads the registry when it queues
    a session and the converter runs at the *next* session start, which may be
    offline; without this the queued version would look like an unverifiable
    hand-typed one and the trajectory would be dropped.
    """
    path = attestation_path(version, root)
    if path.is_file():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "version": version,
        "entity": entity,
        "local_version": local_version,
        "api_url": api_url,
        "observed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    staged = path.with_name(f"{path.name}.{uuid.uuid4().hex}.partial")
    try:
        staged.write_text(
            json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        staged.replace(path)
    finally:
        staged.unlink(missing_ok=True)
    return path


def load_attestation(
    version: str, root: Path | None = None, entity: str | None = None
) -> dict[str, Any] | None:
    """A recorded registry observation for this version, or None."""
    path = attestation_path(version, root)
    if not path.is_file():
        return None
    try:
        stored = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SpecVersionError(f"spec attestation {path} is unreadable: {exc}") from exc
    if not isinstance(stored, dict) or stored.get("version") != version:
        raise SpecVersionError(f"spec attestation {path} does not name {version!r}")
    if entity is not None and stored.get("entity") != entity:
        raise SpecVersionError(
            f"spec attestation {path} names entity {stored.get('entity')!r}, not {entity!r}"
        )
    return stored


class SpecStamp(NamedTuple):
    """The version to stamp, where it came from, and what to say about it."""

    version: str | None
    # "registry" — read from the kernel; "local" — computed here; "attested" —
    # a registry answer this machine recorded earlier.
    source: str | None
    local_version: str | None
    warnings: list[str]


def resolve_stamp(
    *,
    claimed: str | None,
    actor: str | None,
    root: Path | None = None,
    use_registry: bool = True,
) -> SpecStamp:
    """Prefer the kernel's digest; compute locally only when it cannot be read.

    The local computation is still done every time, and still snapshotted —
    it is what keeps the contract retrievable, and it is what makes a
    normalization problem visible instead of theoretical. When the two
    disagree, that disagreement IS the signal: the bytes the kernel registered
    are not the bytes in this checkout.
    """
    warnings: list[str] = []

    if not actor:
        # No actor spec to compute from, so a claimed version has to stand on
        # what this machine already recorded — a snapshot, or a registry answer
        # it wrote down — or not at all.
        if not claimed:
            return SpecStamp(None, None, None, warnings)
        if load_attestation(claimed, root) is not None:
            return SpecStamp(claimed, "attested", None, warnings)
        if load_snapshot(claimed, root) is not None:
            return SpecStamp(claimed, "snapshot", None, warnings)
        raise SpecVersionError(
            f"no actor spec is available for the claimed version {claimed!r}, and neither a "
            f"snapshot ({snapshot_path(claimed, root)}) nor a registry attestation "
            f"({attestation_path(claimed, root)}) exists for it. Pass --actor-spec so the "
            "version is resolved from the spec, or run the capture on a checkout that has it."
        )

    local, _ = _versioned_payload(actor)
    snapshot_spec(actor, root)
    entity = actor_name(actor) or actor

    registered: str | None = None
    if use_registry:
        registered, why_not = registered_version(entity)
        if registered is None:
            warnings.append(
                f"could not read the registered spec version for {entity} ({why_not}); "
                "stamping the version computed from this checkout, which is only correct "
                "if the deploy registered these exact bytes"
            )
        elif bare_version(registered) != bare_version(local):
            # Not an error. It is the normalization signal arriving, and the
            # registered digest is the one the conformance endpoint compares
            # against, so it is the one to stamp.
            warnings.append(
                f"the kernel registered {registered} for {entity} but this checkout computes "
                f"{local}. The spec the deploy holds is not byte-identical to the one here — "
                "stamping the registered digest, which is what a conformance check matches "
                "against. Reconcile the checkout with what is deployed."
            )
            attest_registered_version(
                registered, entity=entity, local_version=local, api_url=os.environ.get("TEMPER_API_URL"), root=root
            )
        else:
            attest_registered_version(
                registered, entity=entity, local_version=local, api_url=os.environ.get("TEMPER_API_URL"), root=root
            )

    version = registered or local
    source = "registry" if registered else "local"

    if claimed and bare_version(claimed) != bare_version(version):
        resolved = _accept_claimed(claimed, actor, entity, root, warnings)
        return SpecStamp(claimed, resolved, local, warnings)

    return SpecStamp(version, source, local, warnings)


def _accept_claimed(
    claimed: str, actor: str, entity: str, root: Path | None, warnings: list[str]
) -> str:
    """Why a claimed version is allowed to stand, or an error saying it is not."""
    try:
        attestation = load_attestation(claimed, root, entity=entity)
    except SpecVersionError as exc:
        # A damaged side-file must not block a version the self-verifying
        # snapshot store can prove on its own.
        warnings.append(f"ignoring an unusable attestation: {exc}")
        attestation = None
    if attestation is not None:
        # The kernel said so, on this machine, and we wrote it down. Which
        # kernel matters: a digest a dev server registered is not evidence
        # about production, and the two are one exported variable apart.
        observed = attestation.get("api_url")
        current = os.environ.get("TEMPER_API_URL")
        if observed and current and observed != current:
            warnings.append(
                f"spec version {claimed} was attested against {observed}, but this run is "
                f"configured for {current}. A digest one deployment registered says nothing "
                "about another; re-capture against the server you are posting to if the "
                "conformance check rejects it."
            )
        return "attested"
    if load_snapshot(claimed, root, actor=actor_name(actor)) is not None:
        return "snapshot"
    raise SpecVersionError(
        f"the caller claims spec version {claimed!r} for {entity}, but this checkout computes "
        f"{compute_version(actor)!r}, no snapshot of it exists in {snapshot_path(claimed, root)}, "
        f"and no registry attestation exists in {attestation_path(claimed, root)}. A version "
        "that can be neither recomputed, retrieved, nor shown to have come from the kernel "
        "names a contract nobody can produce."
    )


def resolve_version(
    *, claimed: str | None, actor: str | None, root: Path | None = None
) -> str | None:
    """Just the version from [`resolve_stamp`], for callers that want no more.

    One resolution path, not two: a second copy of these rules would drift, and
    the drift would show up as two components stamping different versions for
    the same run.
    """
    return resolve_stamp(claimed=claimed, actor=actor, root=root).version


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
