# ADR-0015: Preventive file-ready guards for DesignLanguage

## Status

Accepted

## Context

A `DesignLanguage` could reach `Published` while a referenced file (thumbnail,
embodiment, DESIGN.md, compositions) had no stored bytes. The `Publish` and
`SubmitForReview` guards check only local booleans — `has_thumbnail`,
`thumbnail_verified`, etc. — and those booleans are set by the finalizer
(`VerifyThumbnail`, `VerifyEmbodiment`, …) after it reads the file. The whole
safety property therefore depends on the finalizer running and being right. When
the agent's `temper.write` created a `Files` metadata record but never landed the
bytes (a non-atomic write: the record exists, `Files('id')/$value` returns 404),
the language either published a broken artifact or stalled in `Draft` while the
finalizer polled. This was the dominant curation failure (ARN-55).

The platform already provides the missing invariant. `temper-fs`'s `File`
automaton declares `has_content` and the invariant `ReadyFilesHaveContent`
(`when=["Ready","Locked"] assert="has_content"`), and a `File` reaches `Ready`
only via `StreamUpdated`, which the kernel dispatches after the blob adapter
durably stores the bytes. So `File.status ∈ {Ready, Locked}` is a trustworthy
"bytes exist" signal. Temper also supports cross-entity guards natively —
`{ type = "cross_entity_state", entity_type, entity_id_source, required_status }`
— resolved at dispatch time against the referenced entity's status
(`temper-server/.../dispatch/cross_entity.rs`), with a budget of four lookups per
action.

This completes the direction of ADR-0004 (orchestration and guarantees live in
the spec, not in finalizer glue) for the file-readiness property specifically.

## Decision

Add cross-entity `cross_entity_state` guards on the gating transitions of
`DesignLanguage`, requiring each referenced file to be `Ready` or `Locked`:

- `SubmitForReview` (Draft → UnderReview): `embodiment_file_id`,
  `landing_file_id`, `dashboard_file_id`, `thumbnail_file_id` (4 lookups — the
  budget).
- `Publish` (UnderReview → Published): `thumbnail_file_id`, `embodiment_file_id`,
  `design_md_file_id` (3 lookups — the publish-critical, most-failed files).

The existing local-boolean guards stay. The cross-entity resolver treats an empty
id as a vacuous pass, so the `has_*` booleans remain necessary to prove the id was
actually set; the cross-entity guard then proves the referenced file has bytes.
Together a language cannot leave `Draft`/`UnderReview` toward publication unless
its files are genuinely stored — enforced by the platform, independent of whether
the finalizer ran.

The `*_file_id` values are action params on the `Attach*` actions and persist as
queryable entity fields (the resolver reads them from entity state), so no new
state declarations are required; this is confirmed by the deny-on-unready runtime
test.

## Consequences

- The 404 / empty-file class of publish failures becomes structurally impossible.
  A language with an unready file stays in its current state (repairable) instead
  of publishing broken output.
- Temper's verification cascade maps `cross_entity_state` to `Always` (permissive)
  during model checking (`temper-spec/.../translate.rs`). L1 therefore still proves
  the local state machine is consistent but does **not** prove the file-ready
  denial. That guarantee is enforced at runtime and proven by an integration test
  (attach an unready file id → assert the transition is denied; attach a Ready file
  → assert it is allowed). The change is additive to the verify gate: permissive
  guards cannot make L1 fail.
- Budget (4 lookups/action) means `Publish` does not cross-gate the compositions
  on the `Revise → UnderReview → Publish` path; they remain protected by their
  `compositions_verified` boolean and by the `SubmitForReview` cross-gate on the
  normal path. If the revise path needs the same guarantee, gate compositions via
  a dedicated internal action rather than expanding `Publish` past the budget.

## Rejected alternatives

Keep enforcing readiness in the finalizer (poll the file, then set the boolean).
Rejected: it is the band-aid that ARN-55 was opened against — it cannot help when
the bytes never landed, it is a background poll the platform should not need, and
it leaves "published with an empty file" reachable if the finalizer is wrong or
skipped.

Extend the kernel for atomic file create+write, or boolean (non-status)
cross-entity guards. Rejected as unnecessary: `File.status == Ready` already gives
the invariant with no kernel change. Recorded as deferred kernel polish (ARN-39).
