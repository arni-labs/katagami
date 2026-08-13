#!/usr/bin/env python3
"""Fold both study arms from a projected trajectory + two judge JSON files.

Does not call a model. The caller supplies the two judge outputs (Braintrust
shape for prose, adapted shape for the machine). This script only folds.

Prose units that are in PROSE_EXEMPT are dropped from the score and listed
as a finding — the machine can express them; the prose arm is not asked to.

Usage:
  python3 scripts/trajectory/judge_both_arms.py \
      --prose path/to/prose-judge.json \
      --machine path/to/machine-judge.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# D2. Mechanism items: scored on the machine arm only.
PROSE_EXEMPT = {"C7", "C9", "C17", "R13"}


def fold(verdicts: list[str]) -> str | None:
    """Braintrust fold: any false → false; else all na → na; else true."""
    cleaned = [v.lower() for v in verdicts]
    if any(v == "false" for v in cleaned):
        return "false"
    if cleaned and all(v == "na" for v in cleaned):
        return "na"
    if not cleaned:
        return None
    return "true"


def score(verdict: str | None) -> float | None:
    if verdict == "true":
        return 1.0
    if verdict == "false":
        return 0.0
    return None


def collect_prose(doc: dict) -> list[tuple[str, str]]:
    out = []
    for mb in doc.get("meta_behaviors") or []:
        name = mb.get("name") or ""
        for occ in mb.get("occurrences") or []:
            out.append((name, (occ.get("verdict") or "na").lower()))
    return out


def collect_machine(doc: dict) -> list[tuple[str, str]]:
    out = []
    for unit in doc.get("units") or []:
        name = unit.get("name") or ""
        for occ in unit.get("occurrences") or []:
            out.append((name, (occ.get("verdict") or "na").lower()))
    return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--prose", required=True)
    p.add_argument("--machine", required=True)
    args = p.parse_args()
    prose = json.loads(Path(args.prose).read_text())
    machine = json.loads(Path(args.machine).read_text())

    prose_rows = collect_prose(prose)
    scored_prose = [(n, v) for n, v in prose_rows if not any(tag in n for tag in PROSE_EXEMPT)]
    exempted = [(n, v) for n, v in prose_rows if any(tag in n for tag in PROSE_EXEMPT)]
    machine_rows = collect_machine(machine)

    prose_fold = fold([v for _, v in scored_prose])
    machine_fold = fold([v for _, v in machine_rows])
    report = {
        "prose": {
            "fold": prose_fold,
            "score": score(prose_fold),
            "units": len(scored_prose),
            "exempted": [n for n, _ in exempted],
        },
        "machine": {
            "fold": machine_fold,
            "score": score(machine_fold),
            "units": len(machine_rows),
        },
        "policy": {
            "prose_exempt": sorted(PROSE_EXEMPT),
            "truncation": "split-by-unit, never drop a tail",
            "complete_flag": "terminal actor state or explicit Abandon",
        },
    }
    json.dump(report, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
