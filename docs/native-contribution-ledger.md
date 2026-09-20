# Native contribution ledger and trajectory evidence

This reference documents Katagami's `CuratorAgent` ledger and existing capture
tools. The [Stack contributor skill](https://github.com/arni-labs/stack/blob/main/skills/katagami-contributor/SKILL.md)
owns the contribution procedure. A ledger records a run; it never grants
permission to create, verify, or publish an artifact.

## Trajectory capture

Use the role's own agent credential through the configured native Temper
connection. Never supply principal headers to impersonate an agent or human.
The native connector owns authentication and request attribution. Where a
capture transport supports `X-Session-Id` and `X-Intent`, preserve the real
session identifier and a short description of the operation; do not replace
the native connection with hand-written HTTP calls to add headers.

For an existing Claude Code capture session, read its identity:

```bash
python3 hooks/trajectory-capture/capture.py identity
```

Read `session_id` and `trajectory_id`; do not invent a trajectory identifier.
The derivation is owned by
`scripts/trajectory/claude_session_to_ots.py::derive_trajectory_id`.
The hooks must be installed before capture starts. Resuming after installing
hooks triggers `SessionStart`; merely continuing an uncaptured session does
not retroactively capture it. A missing capture identity means capture is
unavailable, not that a successful trajectory can be claimed.

Outside that harness, use a real harness session ID and derive the matching
identity with `capture.py derive <session-id> <harness>`. Name the actual
harness, such as `codex` or `grok`. Convert the real transcript with
`--session-id`; do not override `--trajectory-id`. Confirm ingestion accepted
the resulting document. An identity or ledger without a stored trajectory is
not evidence of capture. Preserve the archived document for the judge because
the trajectory listing supplies metadata, not the full document.

Read the registered `CuratorAgent` spec version with native
`temper.spec_detail(tenant, "CuratorAgent")`. The helper
`python3 scripts/trajectory/spec_version.py CuratorAgent` can read the registry
for offline capture tooling; disclose a local fallback. The trajectory and
`ReceiveBrief` must identify the actual contract that ran. A ledger version
alone does not attest an absent trajectory.

## Native ledger operations

Inspect the live `CuratorAgent` actions first. Reuse the current run's ledger;
do not create a duplicate merely because a session resumes. When the workflow
requires a new ledger, create it through the existing native connection and
retain the server-returned `"entity_id"`:

```python
run = await temper.create(tenant, "CuratorAgents", {})
run_id = run["entity_id"]
await temper.action(tenant, "CuratorAgents", run_id, "ReceiveBrief", brief_fields)
```

The following table describes the current actor alphabet. Parameters and
states remain governed by the live spec.

| Action | Parameters and purpose |
|---|---|
| `ReceiveBrief` | `direction_id`, `brief`, `session_id`, `trajectory_id`, `spec_version`, `harness`; record actual identities and the brief. |
| `BeginDrafting` | No parameters; requires `has_brief` and moves to `Drafting`. |
| `ClaimJob` / `ReleaseJob` | No parameters; account for parallel work, with at most ten jobs in flight. |
| `RecordDraft` | `draft_notes`; record substantive progress. |
| `RecordDesignLanguage` / `RecordArtStyle` / `RecordPaletteSystem` / `RecordWritingStyle` | Actual corresponding entity-ID arrays from accepted contribution operations. |
| `SelfReview` | `self_review_notes`; record what was checked and changed. |
| `SubmitDesignLanguages` / `SubmitArtStyles` / `SubmitPaletteSystems` / `SubmitWritingStyles` | `submitted_entity_type`; finish the ledger after its guards hold. |
| `Abandon` | `abandon_reason`; honestly record an abandoned run. |

Submission requires `self_review_complete`, no `jobs_in_flight`, the relevant
`has_<lane>_ids`, and a satisfied `cross_entity_state` guard: the recorded
artifacts must actually be `UnderReview` or `Published`. Read their state,
rather than attesting success yourself. `Submitted` is terminal. A failed guard
requires fixing its cause; an authorization denial requires its real approval
path. The ledger has no artifact `Publish` action and cannot substitute for
the finalizer's independent verification.
