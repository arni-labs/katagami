# ADR-0004: Temper-Native Curation Orchestration

## Status

Accepted

## Context

Katagami curation originally used WASM as both runtime glue and workflow brain.
`build_session_message` routed job types and carried job-specific prompt text.
`finalize_spawned_session` parsed generic JSON output, spawned follow-up
`CurationJob` entities, and advanced the parent `CurationQuery`.

Current upstream Temper supports app `reactions/reactions.toml` rules with:

- `resolve_target` modes `field`, `same_id`, `static`, `create_if_missing`, and `create`
- static `params`, dynamic `params_from`, source/cross-entity guards, and bounded reaction depth

WASM runtime effects remain declared as IOA `effect = [{ type = "trigger", ... }]`
plus `[[integration]]` entries. Current Temper does not parse nested
`[[action.triggers]]` blocks inside IOA actions.

That means Katagami can express most cross-entity workflow directly in app data.
The remaining imperative boundary is external runtime integration: OpenPaw
session creation, session finalization, and workspace provisioning.

## Decision

Katagami curation workflow is modeled in Temper entities and reactions. WASM
remains only where it bridges to OpenPaw runtime behavior.

The implementation adds:

- `CurationJobTemplate`, a data-owned template entity for job type, skill,
  instruction path, tools profile, sandbox requirement, and completion action
- `CurationDirection`, one entity per researched direction, so research fan-out
  becomes entity-triggered job creation instead of a Rust loop
- `katagami-curation/reactions/reactions.toml`, the native Temper declaration
  of direction/job/query choreography
- typed `CurationJob` completion actions for research, synthesis, quality
  review, organization, regeneration, and evolution
- `CurationJob.ConfigureAndSubmit`, so reactions can create, configure, and
  start a follow-up job in one target action

New jobs use `completion_contract = "typed-v1"`. For those jobs,
`finalize_spawned_session` records the OpenPaw session result and finalizes the
job. It also carries an idempotent compatibility fallback for today's OpenPaw
OS app installer, which does not yet register app reaction files during install.
When reactions are registered by the platform, the fallback checks existing
query/direction/job state and stands down rather than duplicating the cascade.

The legacy `Complete(output)` action stays for one compatibility window. Jobs
already running against the old prompt contract can still complete and use the
old finalizer cascade.

## Consequences

Prompt policy lives in Katagami skill/instruction files and
`CurationJobTemplate` seed data, not Rust source. `build_session_message`
loads those files from TemperFS when it creates a Session so spawned agents get
the current app-owned instructions without recompiling WASM.

Published `DesignLanguage`, `DesignSource`, `Taxonomy`, `ElementManifest`,
embodiment files, and existing gallery data are not migrated or rewritten.
Schema changes are additive. Existing completed curation records remain
readable. In-flight legacy jobs retain a compatible completion path.

Temper does not currently fan one JSON array into N target entities from a
single trigger. Katagami models that fan-out explicitly with
`CurationDirection` records.

## Rejected Alternatives

Keep orchestration in `finalize_spawned_session`.

Rejected because it duplicates capabilities now available in Temper specs and
keeps cross-entity workflow hidden in Rust.

Move every runtime effect into reactions immediately.

Rejected because OpenPaw session creation/finalization and workspace ensuring
are still external runtime effects. Those stay in small WASM bridges until
Temper has native replacements.
