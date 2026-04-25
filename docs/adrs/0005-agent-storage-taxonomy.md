# ADR 0005: Agent Storage Taxonomy

Date: 2026-04-25

## Status

Accepted for immediate unblock. The final storage architecture remains a follow-up PR.

## Context

Katagami curation jobs depend on TemperPaw sessions. The old hot session path
stored every turn by rebuilding a session JSONL document and writing it through
PawFS `Files('{id}')/$value`. That looked like an append, but it was a full
versioned file replacement. The write synchronously waited for blob storage,
`File.StreamUpdated`, `FileVersion` creation, old-version superseding,
workspace usage updates, and query projections.

That is the right lifecycle for governed user-visible files. It is the wrong
lifecycle for every assistant turn, tool result, steering message, or compaction
checkpoint.

## Decision

Katagami agents use these storage surfaces by intent:

1. Hot operational state uses Temper entities.

   Sessions, session entries, tool calls/results, child session links, job state,
   memory records, and resumability markers are modeled as Temper app specs and
   entity transitions. This state must be queryable, failure-aware, repairable,
   and fast enough to sit inside the agent control loop.

2. Large bytes use immutable blob/object references.

   Long prompts, model responses, attachments, generated media, exported
   transcripts, and long tool outputs should be stored as content-addressed or
   immutable blob references with metadata on a Temper entity. The entity is the
   control plane; the object/blob store is the data plane.

3. PawFS is for governed artifacts.

   Use PawFS for files that users or agents intentionally treat as durable
   artifacts: saved outputs, published docs, reviewed specs, exports, snapshots,
   code/files promoted out of scratch work, and library content. PawFS gives
   versioning, policy, provenance, workspace accounting, and file-like APIs.

4. Sandbox/local files are scratch work.

   Agent code editing, temporary notes, experiments, downloads, and build
   outputs should live in the sandbox or Git workspace first. Important results
   are promoted into Temper entities, PawFS, or published artifacts afterward.

5. Derived indexes are not source of truth.

   Search projections, embeddings, summaries, dashboards, and read models may
   lag and may be rebuilt. They must not be the only place where session history,
   job status, or saved outputs live.

## Immediate Implementation

TemperPaw introduces `SessionEntry` as a Temper-native hot session log. New
sessions store the session tree as one small entity per entry rather than as a
rewritten PawFS JSONL file. Existing sessions that already point at PawFS JSONL
continue to read through the legacy path.

Katagami curation jobs also create a `SessionLink` for each spawned child
session. If the child session fails or is cancelled, the parent `CurationJob`
fails through a normal Katagami state transition instead of waiting forever.

## Agent Rules

Use `temper.create`, `temper.action`, `temper.get`, and `temper.list` when the
data is operational state: job progress, session turns, tool-call outcomes,
review decisions, parent/child links, memory, or anything another workflow must
query or react to.

Use `temper.write` and `temper.read` only when the thing is intentionally a
file/artifact: a spec document, published language page, generated poster,
reviewable transcript export, reusable instruction file, or saved dataset.

Use sandbox `write`, `read`, `edit`, and `bash` for scratch work and code work.
Promote the final artifact into Temper/PawFS only when it becomes durable
product data or a reviewable deliverable.

Do not append hot conversation state by rewriting a PawFS file. Create a
session entry or another domain entity instead.

## Data Compatibility

Existing Katagami languages, saved docs, posters, and PawFS artifacts are not
rewritten by this change. Existing sessions with `session_file_id` pointing to a
PawFS file continue using the legacy JSONL reader/writer. New sessions use the
`session-entries:{session_id}` marker and `SessionEntry` entities.

No migration is required for already-created design languages. A later cleanup
can backfill old session JSONL into `SessionEntry` entities if we want uniform
history querying.

## Final Architecture Direction

The clean target is still Temper-native:

- Temper apps/specs/WASM own session, job, memory, artifact metadata, links, and
  state transitions.
- Rust crates provide substrate capabilities: dispatch, storage adapters, blob
  APIs, projection scheduling, authz, and OData plumbing.
- Turso and Postgres are physical storage engines behind an abstraction, not app
  architecture. The production move to Postgres should be a backend/storage
  deployment choice, not a rewrite of Katagami domain logic.
- Object/blob storage is the byte data plane for large immutable payloads.
- PawFS remains the governed file/artifact plane, not the hot agent memory loop.

## Consequences

Session appends become small entity creates instead of full file lifecycle
cascades. Reads remain reconstructable as JSONL during the transition, so
existing WASM modules can be upgraded incrementally.

The tradeoff is more entities per session. That is acceptable for hot state
because the entries are small, queryable, and repairable. It is preferable to
making every turn depend on synchronous file versioning.
