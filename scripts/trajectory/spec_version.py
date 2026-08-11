"""The version of an actor spec, derived from the spec itself.

A verdict is only meaningful against the contract that was in force when the
run happened, so every captured trajectory carries a `spec_version`. Leaving
that to a human-typed environment variable made it optional in practice — an
install that forgot it produced rows nothing could judge — so the version is
computed here instead, from the actor spec file, and capture refuses to post
without one.

The version is `<AutomatonName>@sha256:<12 hex>` over the spec's SEMANTIC
content: the automaton header, the state variables, the actions with their
source states, guards and effects, the invariants, and the state timeouts.
Comments and formatting are excluded on purpose — reflowing a comment must not
invalidate every verdict already written against the protocol — while any
change to the protocol itself produces a new version.

Because the version is a function of the file, a judge can recompute it from
the spec in the checkout and prove it is reading the same contract the run
executed under, instead of trusting a label.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tomllib
from pathlib import Path
from typing import Any

# scripts/trajectory/ -> repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
ACTOR_SPEC_DIR = REPO_ROOT / "katagami-curation" / "specs"

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

VERSION_PREFIX_LENGTH = 12


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


def _canonical(spec: dict[str, Any]) -> dict[str, Any]:
    """The protocol, with everything that is not the protocol removed."""
    automaton = spec.get("automaton") or {}

    def action(entry: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": entry.get("name"),
            "kind": entry.get("kind"),
            "from": entry.get("from"),
            "to": entry.get("to"),
            "params": entry.get("params"),
            "guard": entry.get("guard"),
            "effect": entry.get("effect"),
        }

    return {
        "automaton": {
            "name": automaton.get("name"),
            "states": automaton.get("states"),
            "initial": automaton.get("initial"),
            "allow_indefinite_states": automaton.get("allow_indefinite_states"),
        },
        "state": [
            {"name": s.get("name"), "type": s.get("type"), "initial": s.get("initial")}
            for s in spec.get("state", [])
        ],
        "action": [action(a) for a in spec.get("action", [])],
        "invariant": [
            {"name": i.get("name"), "when": i.get("when"), "assert": i.get("assert")}
            for i in spec.get("invariant", [])
        ],
        "state_timeout": spec.get("state_timeout", []),
    }


def load_spec(actor: str) -> dict[str, Any]:
    path = actor_spec_path(actor)
    try:
        return tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as exc:
        raise SpecVersionError(f"cannot read actor spec {path}: {exc}") from exc


def compute_version(actor: str) -> str:
    """`CuratorAgent@sha256:8f2c1d4a9b0e` — stable across formatting, not protocol."""
    spec = load_spec(actor)
    name = (spec.get("automaton") or {}).get("name")
    if not name:
        raise SpecVersionError(f"actor spec for {actor!r} has no automaton name")
    payload = json.dumps(_canonical(spec), sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"{name}@sha256:{digest[:VERSION_PREFIX_LENGTH]}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Print the version of an actor spec, or verify a claimed one."
    )
    parser.add_argument("actor", help="actor name (CuratorAgent) or path to a .ioa.toml")
    parser.add_argument("--verify", help="exit non-zero unless the version matches this")
    args = parser.parse_args(argv)

    try:
        version = compute_version(args.actor)
    except SpecVersionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.verify and args.verify != version:
        print(
            f"error: spec version mismatch. The trajectory claims {args.verify!r} but "
            f"{args.actor} in this checkout is {version!r}. Judge against the spec the "
            "run executed under, or say plainly that you could not.",
            file=sys.stderr,
        )
        return 1

    print(version)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
