# ADR 0007: Monty JSON Helper Contract

Date: 2026-04-28

## Status

Accepted for the reliability pass.

## Context

Katagami typed job actions store several fields as JSON strings, including
source ids, topic lists, synthesis input, review output, and taxonomy metadata.
The curator skills correctly require JSON serialization instead of Python
`str(...)`, because Python repr uses single quotes and produces payloads that
break UI parsing and finalizer validation.

The Monty REPL is intentionally restricted and forbids imports in agent code.
That made the old instruction contradictory: skills told agents not to import
anything, but also told them to call `json.dumps(...)`. In production, a
source-search smoke session confirmed that `json` was undefined.

## Decision

OpenPaw preloads a safe `json` helper in every Monty REPL session. Katagami
skills use `json.dumps(...)` and `json.loads(...)` without importing.

Katagami skills must continue to serialize every array or object action
parameter with `json.dumps(...)`. They must not use `str(...)`, Python repr, or
hand-built JSON-like strings for typed job payloads.

## Consequences

Agents get a stable JSON serialization contract that works inside the
restricted REPL. Typed Katagami actions can remain strict without forcing each
skill to carry its own fragile JSON helper.

This does not change the storage architecture. Hot operational state remains
Temper entities; PawFS remains for governed artifacts such as embodiments,
DESIGN.md exports, snapshots, and explicit archives.
