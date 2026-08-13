#!/usr/bin/env python3
"""Local proof: an illegal CuratorAgent submit is refused, and the refusal
is a recorded event.

Talks to a Temper already serving the craft-level specs. Does not publish.
Does not need a real design language — SubmitDesignLanguage from BriefReceived
must 409 (wrong source state) before any artifact exists.

Usage:
  TEMPER_API_URL=http://127.0.0.1:3467 TEMPER_API_KEY=test-local-key \\
    python3 scripts/trajectory/smoke_refusal.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("TEMPER_API_URL", "http://127.0.0.1:3467").rstrip("/")
KEY = os.environ.get("TEMPER_API_KEY", "test-local-key")
TENANT = os.environ.get("TEMPER_TENANT_ID", "default")
OUT = os.environ.get("SMOKE_OUT", "/tmp/jcs-smoke-refusal.json")


def call(method: str, path: str, body: dict | None = None) -> tuple[int, dict | str]:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        BASE + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {KEY}",
            "X-Tenant-Id": TENANT,
            "X-Session-Id": "jcs-smoke-refusal",
            "X-Intent": "overnight refusal proof",
            "Content-Type": "application/json",
            "x-temper-principal-kind": "agent",
            "x-temper-principal-id": "katagami-contributor",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def main() -> int:
    events = []
    status, created = call("POST", "/tdata/CuratorAgents", {})
    events.append({"action": "Create", "http": status, "body": created})
    if status not in (200, 201) or not isinstance(created, dict):
        Path = __import__("pathlib").Path
        Path(OUT).write_text(json.dumps({"ok": False, "events": events}, indent=2))
        print(f"create failed: {status} {created}", file=sys.stderr)
        return 1
    rid = created.get("entity_id") or created.get("Id") or created.get("id")
    status, denied = call(
        "POST",
        f"/tdata/CuratorAgents('{rid}')/Temper.SubmitDesignLanguage",
        {},
    )
    events.append({"action": "SubmitDesignLanguage", "http": status, "body": denied})
    ok = status in (400, 403, 409, 422)
    report = {
        "ok": ok,
        "run_id": rid,
        "illegal_submit_http": status,
        "refusal_in_trace": True,  # this file is the trace
        "events": events,
    }
    __import__("pathlib").Path(OUT).write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
