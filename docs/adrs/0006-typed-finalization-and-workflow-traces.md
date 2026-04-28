# ADR 0006: Typed Finalization And Workflow Traces

Date: 2026-04-28

## Status

Accepted for the reliability pass.

## Context

Katagami curation jobs were able to reach a completed-looking state even when
the world they produced was not actually publishable. A synthesis or review
session could report success, but the referenced embodiment or DESIGN.md file
could be missing, unreadable, stale, or not tied to the expected entity state.

The same workflow was hard to inspect in Datadog. Temper propagated W3C trace
context through many async calls, but logical workflow metadata was not carried
across WASM HTTP calls. State-timeout sleepers also appeared as long active
spans, stretching waterfalls and hiding the actual slow work.

## Decision

Typed Katagami jobs are finalized by verifying the entity and file world, not
by trusting the agent's prose.

- Synthesis finalization checks each `DesignLanguage`, required spec sections,
  and the attached embodiment file.
- Quality review finalization checks the embodiment, DESIGN.md file, and clean
  DESIGN.md lint metadata before marking quality as passed and publishing.
- `AttachDesignMd` and `AttachEmbodiment` attach candidates. Internal verifier
  actions mark artifacts as verified only after finalizer-side checks.
- `Publish` requires verified embodiment, verified DESIGN.md, all spec
  sections, and a passed quality review.

Temper workflow observability carries `workflow.root_entity_type`,
`workflow.root_entity_id`, and `workflow.run_id` across dispatch and WASM
internal HTTP calls. Timeout scheduling logs the arm event, then creates a short
span only when the timeout actually fires.

## Boundaries

This ADR deliberately excludes the Postgres storage-engine migration. Turso
versus Postgres remains a substrate decision behind Temper storage, not a
Katagami domain model change.

PawFS remains the governed artifact plane for embodiments, DESIGN.md files,
exports, and other durable artifacts. It is not the hot operational state path.

## Consequences

Completed curation jobs now mean the referenced artifacts are readable and the
domain entity is in the right state. Bad "completed-ish" outputs become failed
jobs with concrete error messages.

Datadog traces can be grouped by logical workflow run instead of only by
request trace id, and timeout sleeps no longer make waterfalls look like hours
of active work.

