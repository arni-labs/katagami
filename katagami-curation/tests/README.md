# Katagami curation local harness

`test_local_integration_harness.py` is the bounded Stream 1b harness for this
PR. It is deterministic and in-memory on purpose: it models the contracts that
the future local Temper-backed integration run must preserve without requiring
the full kernel/runtime wiring in this first slice.

The harness asserts:

- one job per `(query, phase, direction)`
- synthesis fan-out does not cross into organizing until every direction is done
- Publish is blocked when an artifact file is missing, not `Ready`, unreadable,
  zero-byte, or missing file metadata
- a clean design-language run reaches `Completed` with published languages

Remaining wiring for a later PR: replace the in-memory state machine with the
real local Temper app install, entity actions, file `$value` reads, and
finalizer execution while keeping these contract assertions intact.
