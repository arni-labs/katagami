# ADR 0012: Static Curation Doc References

Date: 2026-05-20

## Status

Accepted for the next measured latency slice.

## Context

PERF-035 made Katagami `build_session_message` visible in Datadog. The fixed
production run on TemperPaw `sha-2a6c2d0` shows the known stateful boundaries:
Session creation, Session configure, parent notification, and SessionLink setup.
Those steps account for only part of the total span. The remaining time includes
prompt asset preparation before the Session is created.

Most prompt assets are packaged app files under the known `os-app-docs`
workspace. In the normal path, the agent does not need the file contents
inlined; it only needs exact `temper.read(...)` commands. The existing WASM path
still resolves each static doc path through runtime HTTP before building those
commands, even though the workspace ID is known and the files are part of the
repository contract.

## Decision

Use static document references for the normal non-inline path:

- instruction and knowledge paths are rendered with workspace
  `os-app-docs` without a runtime `ResolvePath` call
- the existing `ResolvePath` and `$value` reads remain in place when
  `inline_job_docs` is explicitly enabled, because that mode needs actual file
  content in the prompt
- add a `prompt_assets` step metric so Datadog can distinguish prompt-template
  preparation from Session/SessionLink work
- add a contract test that all seeded `CurationJobTemplate.instruction_path`
  values and all static knowledge paths exist in the packaged app tree

## Consequences

- Normal CurationJob spawning removes synchronous runtime doc-resolution calls
  from the hot path while keeping exact file paths and workspace IDs in the
  child Session prompt.
- Correctness shifts from runtime existence checks to repository/package
  contracts for the default path; if a path changes, tests fail before deploy.
- Inline-doc mode remains slower but intentionally self-verifying because it is
  a debugging/proof mode, not the default production fast path.
