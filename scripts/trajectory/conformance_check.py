"""Layer 1 of the Judged Conformance System: replay a trajectory against its spec.

This is the deterministic half. It reads a captured OTS trajectory, finds the
actor actions the run actually invoked, and replays them against the actor's
I/O automaton. Everything rule-shaped is decided here — state order, action
legality, guards that the recorded run carries the evidence for, exactly-once,
and the counter budgets. The LLM judge (`mcp/skills/katagami-judge/SKILL.md`)
never overrules this file; it judges what a replay structurally cannot see.

It runs locally against the actor specs in this repository. There is no
`/api/conformance/check` on the Temper server — the kernel has no conformance
engine — so a skill that called one would 404 on every run. The specs are
Katagami's, the trajectories are Katagami's, and the replay needs nothing the
kernel holds, so it lives here.

What a pass does and does not mean:

  * `guard_violation` is only reported for guards this trajectory can decide:
    `is_true` and `max_count`, both of which are functions of effects recorded
    earlier in the same run.
  * `cross_entity_state` guards are read off the entity graph at dispatch time
    and cannot be reconstructed from a transcript. They are listed under
    `unverifiable`, never silently counted as satisfied, so a pass is never
    read as covering more than it checked.

Usage:

    python3 conformance_check.py --trajectory traj.json --actor-spec CuratorAgent
    python3 conformance_check.py --trajectory traj.json --actor-spec CuratorAgent \\
        --out verdict.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from spec_version import (  # noqa: E402  (path set above)
    SpecVersionError,
    compute_version,
    load_spec,
)

ENGINE = "katagami-conformance@1"


class ConformanceError(RuntimeError):
    """The check could not be run at all — never a verdict of `passed`."""


# --------------------------------------------------------------------------
# finding the actor's actions inside the trajectory
# --------------------------------------------------------------------------

# POST /tdata/CuratorAgents('<id>')/Temper.SelfReview — the OData action shape,
# however it was issued: an MCP tool argument, a curl in a Bash call, a fetch.
# The namespace is optional in the pattern so a call written without it is still
# seen, but a segment with no namespace only counts when it names an action the
# actor actually has: `/tdata/CuratorAgents('x')/State` reads a property, and
# reporting that as an unknown action would be a violation the run never made.
_ODATA_ACTION = re.compile(
    r"/tdata/(?P<set>[A-Za-z][A-Za-z0-9_]*)\((?P<id>[^)]*)\)/"
    r"(?P<namespace>[A-Za-z][A-Za-z0-9_]*\.)?(?P<action>[A-Za-z][A-Za-z0-9_]*)"
)


def entity_set_name(actor: str) -> str:
    """`CuratorAgent` -> `CuratorAgents`, matching the CSDL EntityContainer."""
    return f"{actor}s"


def _argument_action(arguments: Any, actor: str) -> str | None:
    """An explicit `{entity_type, action}` argument pair, as the MCP tools take."""
    if not isinstance(arguments, dict):
        return None
    entity_type = arguments.get("entity_type") or arguments.get("entityType")
    action = arguments.get("action") or arguments.get("action_name")
    if isinstance(entity_type, str) and isinstance(action, str):
        if entity_type in (actor, entity_set_name(actor)):
            return action
    return None


def _url_action(
    arguments: Any, actor: str, known_actions: frozenset[str]
) -> str | None:
    """The OData action path, wherever it appears in the call's arguments."""
    try:
        blob = json.dumps(arguments, ensure_ascii=False)
    except (TypeError, ValueError):
        blob = str(arguments)
    for match in _ODATA_ACTION.finditer(blob):
        if match.group("set") != entity_set_name(actor):
            continue
        action = match.group("action")
        if match.group("namespace") or action in known_actions:
            return action
    return None


def extract_actor_calls(
    trajectory: dict[str, Any], actor: str, known_actions: frozenset[str] = frozenset()
) -> list[dict[str, Any]]:
    """Every call in the trajectory that drove this actor's entity, in order.

    Decisions are the source rather than raw messages: the converter writes one
    decision per tool call with its arguments and its consequence, so a call
    that was issued and a call that succeeded are distinguishable here.
    """
    calls: list[dict[str, Any]] = []
    for turn in trajectory.get("turns") or []:
        turn_id = turn.get("turn_id")
        for decision in turn.get("decisions") or []:
            choice = decision.get("choice") or {}
            arguments = choice.get("arguments")
            action = _argument_action(arguments, actor) or _url_action(
                arguments, actor, known_actions
            )
            if not action:
                continue
            consequence = decision.get("consequence") or {}
            calls.append(
                {
                    "turn_id": turn_id,
                    "decision_id": decision.get("decision_id"),
                    "action": action,
                    "tool": choice.get("action"),
                    "succeeded": bool(consequence.get("success")),
                }
            )
    return calls


# --------------------------------------------------------------------------
# the replay
# --------------------------------------------------------------------------


def _initial_ledger(spec: dict[str, Any]) -> dict[str, Any]:
    ledger: dict[str, Any] = {}
    for var in spec.get("state", []):
        name, kind = var.get("name"), var.get("type")
        initial = var.get("initial")
        if kind == "bool":
            ledger[name] = str(initial).lower() == "true"
        elif kind == "counter":
            ledger[name] = int(initial or 0)
        elif initial == "[]":
            # A list-valued state var. Only its length is ever guarded, and the
            # appended values are not reconstructible from a transcript, so the
            # ledger keeps the count.
            ledger[name] = 0
        else:
            ledger[name] = initial
    return ledger


def _guards(action: dict[str, Any]) -> list[dict[str, Any]]:
    guard = action.get("guard", [])
    return guard if isinstance(guard, list) else [guard]


def _effects(action: dict[str, Any]) -> list[dict[str, Any]]:
    effect = action.get("effect", [])
    return effect if isinstance(effect, list) else [effect]


def _terminal_states(spec: dict[str, Any]) -> set[str]:
    terminal: set[str] = set()
    for invariant in spec.get("invariant", []):
        if invariant.get("assert") == "no_further_transitions":
            terminal.update(invariant.get("when") or [])
    return terminal


def _value_invariants(spec: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        invariant
        for invariant in spec.get("invariant", [])
        if invariant.get("assert") != "no_further_transitions"
    ]


def replay(
    trajectory: dict[str, Any], actor: str, spec: dict[str, Any]
) -> dict[str, Any]:
    automaton = spec.get("automaton") or {}
    actions = {a["name"]: a for a in spec.get("action", [])}
    terminal = _terminal_states(spec)
    value_invariants = _value_invariants(spec)

    state = automaton.get("initial")
    ledger = _initial_ledger(spec)
    violations: list[dict[str, Any]] = []
    unverifiable: list[dict[str, Any]] = []
    replayed: list[dict[str, Any]] = []

    calls = extract_actor_calls(trajectory, actor, frozenset(actions))
    if not calls:
        violations.append(
            {
                "kind": "no_actor_actions",
                "turn_id": None,
                "detail": (
                    f"the trajectory contains no call against {entity_set_name(actor)}; "
                    f"a run with no recorded {actor} actions provides no conformance "
                    "evidence and cannot be read as conforming"
                ),
            }
        )

    for call in calls:
        name = call["action"]
        turn_id = call["turn_id"]
        spec_action = actions.get(name)

        if spec_action is None:
            violations.append(
                {
                    "kind": "unknown_action",
                    "turn_id": turn_id,
                    "decision_id": call["decision_id"],
                    "detail": f"{name} is not in the {actor} alphabet",
                }
            )
            continue

        if spec_action.get("kind") == "output":
            violations.append(
                {
                    "kind": "output_action_invoked",
                    "turn_id": turn_id,
                    "decision_id": call["decision_id"],
                    "detail": f"{name} is an output action; it is emitted, never called",
                }
            )
            continue

        # A call the transport rejected changed nothing. It is not a protocol
        # violation on its own, and replaying its effects would invent state.
        if not call["succeeded"]:
            replayed.append(
                {**call, "state_before": state, "state_after": state, "applied": False}
            )
            continue

        if state in terminal:
            violations.append(
                {
                    "kind": "terminal_state_violation",
                    "turn_id": turn_id,
                    "decision_id": call["decision_id"],
                    "detail": f"{name} after {state}, which is terminal",
                }
            )
            continue

        sources = spec_action.get("from")
        if sources and state not in sources:
            violations.append(
                {
                    "kind": "illegal_transition",
                    "turn_id": turn_id,
                    "decision_id": call["decision_id"],
                    "detail": (
                        f"{name} from {state}; {name} is only legal from "
                        f"{', '.join(sources)}"
                    ),
                }
            )
            continue

        blocked = False
        for guard in _guards(spec_action):
            kind = guard.get("type")
            if kind == "is_true":
                if not ledger.get(guard.get("var")):
                    violations.append(
                        {
                            "kind": "guard_violation",
                            "turn_id": turn_id,
                            "decision_id": call["decision_id"],
                            "detail": (
                                f"{name} requires {guard.get('var')} to be true; the run "
                                "had not set it"
                            ),
                        }
                    )
                    blocked = True
            elif kind == "max_count":
                held = int(ledger.get(guard.get("var")) or 0)
                limit = int(guard.get("max", 0))
                if held >= limit:
                    violations.append(
                        {
                            "kind": "guard_violation",
                            "turn_id": turn_id,
                            "decision_id": call["decision_id"],
                            "detail": (
                                f"{name} requires {guard.get('var')} < {limit}; the run "
                                f"held {held}"
                            ),
                        }
                    )
                    blocked = True
            else:
                unverifiable.append(
                    {
                        "kind": kind,
                        "turn_id": turn_id,
                        "action": name,
                        "detail": (
                            f"{kind} is resolved against the entity graph at dispatch "
                            "time and cannot be replayed from a transcript; this check "
                            "neither confirms nor denies it"
                        ),
                    }
                )
        if blocked:
            continue

        for effect in _effects(spec_action):
            kind, var = effect.get("type"), effect.get("var")
            if kind == "set_bool":
                ledger[var] = str(effect.get("value")).lower() == "true"
            elif kind == "increment":
                ledger[var] = int(ledger.get(var) or 0) + 1
            elif kind == "decrement":
                ledger[var] = max(0, int(ledger.get(var) or 0) - 1)
            elif kind == "list_append":
                held = ledger.get(var)
                ledger[var] = (held if isinstance(held, int) else 0) + 1

        state_before = state
        if spec_action.get("to"):
            state = spec_action["to"]
        replayed.append(
            {**call, "state_before": state_before, "state_after": state, "applied": True}
        )

        for invariant in value_invariants:
            if state not in (invariant.get("when") or []):
                continue
            if not ledger.get(invariant.get("assert")):
                violations.append(
                    {
                        "kind": "invariant_violation",
                        "turn_id": turn_id,
                        "decision_id": call["decision_id"],
                        "detail": (
                            f"{invariant.get('name')}: {state} requires "
                            f"{invariant.get('assert')}"
                        ),
                    }
                )

    return {
        "passed": not violations,
        "final_state": state,
        "actions_replayed": replayed,
        "violations": violations,
        "unverifiable": unverifiable,
    }


def check(
    trajectory: dict[str, Any], actor: str, *, spec_version: str | None = None
) -> dict[str, Any]:
    """Replay one trajectory and return the layer 1 verdict."""
    claimed = spec_version or (trajectory.get("metadata") or {}).get("spec_version")
    if not claimed:
        raise ConformanceError(
            "the trajectory carries no metadata.spec_version and none was given. "
            "A run cannot be judged against a contract nobody can name."
        )
    try:
        current = compute_version(actor)
        spec = load_spec(actor)
    except SpecVersionError as exc:
        raise ConformanceError(str(exc)) from exc
    if claimed != current:
        raise ConformanceError(
            f"the trajectory ran under {claimed!r} but {actor} in this checkout is "
            f"{current!r}. Check out the spec at the recorded version and re-run; "
            "judging against a different contract is not a judgement."
        )

    result = replay(trajectory, actor, spec)
    return {
        "trajectory_id": trajectory.get("trajectory_id")
        or (trajectory.get("metadata") or {}).get("trajectory_id"),
        "actor_spec": actor,
        "spec_version": claimed,
        "layer": "deterministic",
        "judged_by": ENGINE,
        **result,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Replay a captured OTS trajectory against its actor spec (layer 1).",
    )
    parser.add_argument("--trajectory", required=True, help="OTS trajectory JSON file")
    parser.add_argument("--actor-spec", required=True, help="e.g. CuratorAgent")
    parser.add_argument("--spec-version", help="override metadata.spec_version")
    parser.add_argument("--out", help="write the verdict here ('-' for stdout)", default="-")
    args = parser.parse_args(argv)

    path = Path(args.trajectory).expanduser()
    try:
        trajectory = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"error: cannot read trajectory {path}: {exc}", file=sys.stderr)
        return 1

    try:
        verdict = check(trajectory, args.actor_spec, spec_version=args.spec_version)
    except ConformanceError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    rendered = json.dumps(verdict, ensure_ascii=False, indent=2, sort_keys=True)
    if args.out == "-":
        print(rendered)
    else:
        destination = Path(args.out).expanduser()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(rendered + "\n", encoding="utf-8")
        print(f"wrote {destination}", file=sys.stderr)

    # A failed conformance check is a verdict, not a crash: exit 0 so the
    # caller reads the document rather than guessing from a status code.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
