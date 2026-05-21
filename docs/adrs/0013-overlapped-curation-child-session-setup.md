# ADR-0013: Overlapped Curation Child Session Setup

## Status

Accepted

## Context

PERF-035 added per-step timing for `build_session_message`, and PERF-036
proved packaged prompt document preparation is already cheap. The remaining
CurationJob setup envelope is dominated by child Session and SessionLink work:
creating the Session, configuring it, creating the SessionLink, configuring the
SessionLink, and finally marking the CurationJob as `SessionSpawned`.

The existing implementation performs all of those HTTP host calls serially.
After the child Session entity has been created, however, two operations are
independent:

- `OpenPaw.Configure` for the child Session, which writes the user message,
  provider, model, tools, and workspace.
- `POST /tdata/SessionLinks`, which creates an empty link entity so it can be
  configured after its generated ID is known.

Those two operations do not depend on each other's result. Serializing them
adds avoidable wall-clock time without adding correctness.

## Decision

Batch the child Session configure request and empty SessionLink create request
through `Context::http_call_batch` after the child Session ID is known.

Keep the remaining ordering conservative:

1. Create the child Session and parse its ID.
2. Batch child Session configure with empty SessionLink create.
3. Parse the SessionLink ID.
4. Configure the SessionLink.
5. Dispatch `CurationJob.SessionSpawned`.

This preserves the verified state machine semantics: the CurationJob is not
marked `Running` until the child Session has been configured and the SessionLink
is watching. If any child setup step fails, the builder still dispatches
`CurationJob.Fail` and returns an error.

## Consequences

- Expected win is bounded but real: the configure-session span can overlap with
  the SessionLink create span. The Datadog acceptance bar is a deployed
  before/after comparison on the same CurationJob path, with the `child_setup_batch`
  step visible in step metrics.
- The change does not add entity-specific shortcuts to Temper. It stays inside
  Katagami's orchestration WASM and continues to use OData actions generated
  from specs.
- The change does not bypass Cedar, event sourcing, projection writes, or the
  SessionLink monitor.
- A larger future win may require a spec-owned create-and-configure primitive
  or a Temper-side workflow transaction, but this ADR deliberately avoids that
  broader architectural move until this isolated overlap is measured.

## Verification

- Rust fmt/check/clippy for `katagami-curation/wasm/build_session_message`.
- Existing curation Python tests plus a source contract that requires the child
  setup batch and the post-link `SessionSpawned` ordering.
- Release WASM rebuild.
- Live CurationJob proof after rollout: child Session configured, SessionLink
  configured/completed, CurationJob running/completing through the same path.
- Datadog metrics: compare `total`, `child_setup_batch`, `configure_session`,
  `create_session_link`, `configure_session_link`, and `session_spawned` for
  fixed before/after versions.
