#!/usr/bin/env python3
"""Project a Temper/OTS ATIF document to the Braintrust flat event list.

Published so the study's most attackable step is not buried in a notebook.
Every event keeps its original id. Tool results are kept. A denied HTTP
call (4xx/5xx in the tool result) is an event, not a hole.

Usage:
  python3 scripts/trajectory/project_atif.py path/to/atif.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def project(atif: dict) -> dict:
    events = []
    for i, turn in enumerate(atif.get("turns") or atif.get("events") or []):
        event_id = (
            turn.get("id")
            or turn.get("event_id")
            or turn.get("turn_id")
            or f"evt-{i+1}"
        )
        events.append(
            {
                "event_id": str(event_id),
                "actor": turn.get("actor") or turn.get("role") or "agent",
                "action": turn.get("action") or turn.get("name") or turn.get("type") or "",
                "content": turn.get("content") or turn.get("text") or "",
                "metadata": {
                    "tool": turn.get("tool"),
                    "result": turn.get("result") or turn.get("tool_result"),
                    "status": turn.get("status") or turn.get("http_status"),
                    "denied": _denied(turn),
                },
            }
        )
    status = (atif.get("metadata") or {}).get("actor_status") or atif.get("status")
    complete = status in {
        "Submitted",
        "Abandoned",
        "VerdictRecorded",
        "Published",
        "ReturnedWithCritique",
        "Escalated",
    } or bool(atif.get("complete"))
    return {
        "complete": complete,
        "events": events,
        "spec_version": (atif.get("metadata") or {}).get("spec_version"),
        "harness": (atif.get("metadata") or {}).get("harness"),
    }


def _denied(turn: dict) -> bool:
    status = turn.get("status") or turn.get("http_status")
    if isinstance(status, int) and status >= 400:
        return True
    result = str(turn.get("result") or turn.get("tool_result") or "")
    return "409" in result or "ActionFailed" in result or "denied" in result.lower()


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: project_atif.py <atif.json>", file=sys.stderr)
        return 2
    raw = json.loads(Path(sys.argv[1]).read_text())
    json.dump(project(raw), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
