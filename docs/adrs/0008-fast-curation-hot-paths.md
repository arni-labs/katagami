# ADR 0008: Fast Curation Hot Paths

Date: 2026-04-28

## Status

Accepted for the Layer 1 production unblock.

## Context

Katagami curation was spending too much time on generic file and entity
machinery while doing ordinary agent work. Source-search jobs scanned broad
workspace/library state, fetched and archived more than they needed, and
multiplied static knowledge reads before creating directions. Synthesis jobs
created a new language by dispatching many small setter actions in sequence,
which amplified remote storage latency and made Turso append stalls visible to
users.

The deeper architecture still moves session turns and hot agent state toward
first-class Temper entities. This ADR documents the immediate production
boundary so Katagami can run usable cycles while that larger cleanup proceeds.

## Decision

Katagami source-search is a compact metadata hot path.

- Targeted source-search jobs do not read `/katagami/index.md` or
  `/katagami/log.md` unless explicitly asked for a library-wide audit.
- Source-search must not list all `DesignSources`; duplicate checks must use a
  narrow filter such as the current query, exact URL, slug, or title.
- Targeted source-search runs a bounded number of searches, fetches at most the
  top three pages, and stores compact metadata, summaries, excerpts, topics,
  and references on `DesignSource` entities.
- Full fetched-page archives are deferred PawFS artifacts, not synchronous
  research-path writes.

Katagami synthesis writes the core language spec as one coherent transition.

- New synthesis jobs create the `DesignLanguage` and then call
  `DesignLanguage.SetSpec` once with name, slug, philosophy, tokens, rules,
  layout principles, guidance, and tags.
- `SetSpec` marks the required spec sections present and invalidates derived
  artifacts such as embodiment quality, DESIGN.md verification, and publish
  readiness.
- Narrow setter actions remain valid for small edits and repair jobs.

Agent tool instructions must match runtime reality.

- Monty `execute` calls are treated as self-contained because production
  sessions may reset the Python heap between provider turns.
- Agents should batch dependent operations in one focused call, and carry
  durable IDs/results explicitly through Temper entities or files.

## Consequences

The curation cycle does fewer unnecessary reads, fewer page fetches, and fewer
hot writes before the first publishable language exists. PawFS remains the
governed artifact plane for embodiments, DESIGN.md exports, snapshots, and
operator-requested source archives, but it is not used for every intermediate
research mutation.

This does not replace the planned Layer 2 work. Session entries, tool calls,
tool results, trace metadata, and durable memory should still become direct
Temper-native operational state. This ADR keeps the current Katagami workflow
fast enough to use while that larger model is completed.
