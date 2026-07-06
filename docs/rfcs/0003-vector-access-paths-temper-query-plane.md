# RFC-0003: Vector access paths in the Temper query plane

- Status: Draft (for Rita's sign-off before implementation)
- Date: 2026-07-04
- Author: Claude Code (for Rita)
- Repos in scope: `temper` (kernel — the work), `katagami-commons`/`katagami-curation` (first producer + consumer), `aya-brain` (second tenant)
- Related Linear: ARN-159 (this feature) · ARN-102 (runtime vision — searchability axis) · ARN-106 (research + decisions) · ARN-21 (producer backfill, done 2026-07-04) · ARN-160/ARN-97 (read-truth prerequisites, in flight) · ARN-158 (orientation layer)
- Related ADRs: temper `docs/adrs/0153-declared-composite-key-index.md` (the pattern this extends)

## 1. Summary

Rita decided (2026-07-04, recorded on ARN-106): **kernel-native semantic search is the goal.** Interim app-layer serving may ship first, but if the kernel path obsoletes it, the interim set gets cleaned up.

This RFC specifies vector similarity as a **first-class declared access path** in Temper's query plane — the same shape as ADR-0153's declared composite keys: a spec declares it, the kernel maintains it from persisted entity state, every read of it is budgeted, Cedar-governed, and deterministic. Embedding *generation* stays outside the kernel forever; the kernel only indexes vectors that already live on entities as ordinary action-event state.

Scale honesty, so nobody mistakes the motivation: Katagami has ~645 published items, Aya ~666 entities; exact cosine over 10k×384-d vectors is well under a millisecond. This buys **governance, verifiability, and a platform primitive every tenant gets for free** — not performance.

## 2. What we are addressing, and the expected end state

We are addressing: entity catalogs searchable only by equality filters and lowercase substring facets. Taste vectors now exist on all published Katagami entities (643 backfilled, `Xenova/all-MiniLM-L6-v2` 384-d, model stamped in `taste_vector_model`), but similarity runs out-of-process (UI cosine; an interim MCP search tool is being built by another agent) — ungoverned, unbudgeted, per-consumer duplicated.

Expected end state (each item testable):

1. An IOA spec can declare a **vector access path** on an entity type — property name, dimensions, metric, model-tag property — verified by the spec cascade like `[[key]]` declarations.
2. The kernel maintains the index from persisted vector fields: co-committed with the event on Postgres; watermark-gated on backends without co-commit (Turso). Absence is authoritative only after the backfill watermark, exactly like ADR-0153.
3. OData exposes a kNN read: nearest-k to a query vector or to another entity, composable with an equality `$filter`, inside the existing read budget, with deterministic ordering (score desc, entity-id tiebreak).
4. Identical behavior on `temper-store-postgres`, `temper-store-turso`, and `temper-store-sim`; a DST test drives writes + kNN reads under seed control.
5. Embedding generation remains in post-transition integrations/WASM (the determinism contract in `crates/temper-server/src/key_index.rs:10-12` stands).
6. Katagami "related languages" + agent search and Aya retrieval are served by this path in production, and the interim app-layer serving is deleted — one implementation remains.

## 3. Design

### 3.1 Declaration (spec surface)

A sibling of `KeyDecl` (`crates/temper-spec/src/automaton/types.rs:66-73`):

```toml
[[vector]]
name = "taste"
property = "taste_vector"          # JSON array of floats on the entity
model_property = "taste_vector_model"  # partitions the space; vectors compare only within one model tag
dims = 384
metric = "cosine"
```

Verification: the cascade checks that `property`/`model_property` exist on the automaton, `dims` > 0, `metric` ∈ {cosine, dot, l2}. Declaring a vector path on a property that actions never write is legal (it indexes nothing) — same posture as keys.

### 3.2 Index maintenance

- Index rows live in a new per-backend table `entity_vector_index (tenant, entity_type, decl_name, model_tag, entity_id, vector BLOB)`, primary key `(tenant, entity_type, decl_name, model_tag, entity_id)`. The blob is packed little-endian f32 — the journal keeps the human-readable JSON in the action event; the index is derived, rebuildable state.
- Written where key-index rows are written today: on event append, from the post-transition entity state (follow `append_with_keys` / `EventStore` trait, `crates/temper-runtime/src/persistence/mod.rs:114-194`). Postgres: same transaction as the event. Turso: no co-commit today — index writes follow the event, and the **backfill watermark** per `(tenant, type, decl)` gates authoritative reads, mirroring `mark_key_index_backfilled`.
- Adding a declaration to an existing type triggers the same reconcile/re-key backfill path ARN-68 added for keys (temper commit ab578697).
- **Model tags partition the space.** A kNN query resolves against exactly one `model_tag` (the query names it, or it defaults to the model tag on the reference entity). Vectors from different models are never compared — model migration = backfill vectors with the new tag, then flip the consumer; old-tag rows are dropped by reconcile.

### 3.3 Query execution

- **Exact scan is the v1 engine.** Candidates for one `(tenant, type, decl, model_tag)` stream from the index table; the kernel computes the metric in fixed iteration order and keeps a k-heap. The candidate count charges the existing `scan_candidate_budget` (10,000 — `query_plane_read/types.rs:15-56`); a tenant whose partition exceeds the budget gets the same 413 contract as any other over-budget read. At current tenant sizes (≤1k), exact scan costs microseconds.
- **ANN is a later, declared opt-in**, not an automatic switch: when a tenant approaches the budget, the declaration grows `index = "hnsw"` (pgvector on Postgres, an embedded structure elsewhere). Out of scope for v1; the surface is designed so this changes no caller.
- **Determinism:** f32 accumulation in fixed order, ties broken by entity id, results independent of storage iteration order. DST asserts reproducibility under seed; this is what makes kernel-side similarity admissible where app-side similarity never was.

### 3.4 OData surface (decision needed — options)

No `$search`/nearest shape exists in Temper's OData today; a kNN query has no expressible filter form. Options:

- **(a) Bound function (recommended):** `GET /tdata/DesignLanguages/Temper.Nearest(decl='taste',to='en-…',k=10)` — also accepts `vector=[…]` for raw-vector queries, and an optional `filter='Status eq ''Published'''` param applied before ranking. Matches the existing `Temper.<Action>` naming, needs no OData grammar surgery, and is trivially MCP-wrappable.
- (b) Custom query option: `?$nearest=(decl=taste,to=en-…,k=10)&$filter=…` — composes most naturally with existing options but invents nonstandard grammar in the parser.
- (c) `$orderby=distance(taste_vector, …)` — closest to OData idiom, furthest from the current planner's abilities.

Response shape (any option): ordered entities plus per-row `@temper.score`; standard `$top`/projection semantics apply after ranking (canonical field materialization, not the ARN-97 projection path, until that fix lands).

### 3.5 Governance and budget

Nothing new: the read runs under the same Cedar entityset read authorization, the same tenant isolation, and the same budget accounting as every query-plane read. That is the point of doing this in the kernel.

### 3.6 What stays outside the kernel

Embedding generation (API calls, nondeterministic floats) — producers are post-transition integrations/WASM finalizers (`Integration`, `crates/temper-spec/src/automaton/types.rs:389-422`; the ARN-126 `AttachComputedFacets` finalizer is the shipped precedent, and the embed-at-publish extension on this branch is the first producer). The kernel treats vectors as opaque `f32[dims]`.

## 4. Migration and staging

- **A (in flight):** read-truth fixes land (ARN-160 nextLink, ARN-97 projection) — the kNN surface must not sit on reads that lie.
- **B:** kernel v1 — declaration + index + bound function on postgres + sim with DST; turso via watermark. Declare `taste` paths in katagami-commons specs for all three lanes.
- **C:** Katagami cutover — gallery "related", search ranking blend, and the agent MCP tool call `Temper.Nearest`; delete the UI-side cosine (`taste.ts` similarity path) and the interim MCP serving internals. **The cleanup is part of this phase's DoD, not a follow-up** (Rita's standing rule: one implementation remains).
- **D:** Aya adoption — add vector fields + a sync-time/producer integration to `aya-brain` specs (deferred until the in-flight `claude/aya-deploy` branch lands to avoid racing it), then the same declaration + cutover.

## 5. Considerations and rejected alternatives

- **pgvector sidecar** (research option C): rejected as the end-state by Rita's decision; remains the documented escape hatch if kernel work stalls. Not built now — building both would violate the no-parallel-implementations rule.
- **Kernel-computed embeddings**: rejected permanently — a live API call in the write path breaks seed-reproducible verification.
- **Automatic ANN**: rejected — index behavior is a declared contract, not a heuristic; silent engine switches are how reads start lying.
- **Multimodal**: a producer concern (voyage-multimodal-3.5 when a key exists; Cohere Embed v4 alternative). Kernel-side, a model swap that changes `dims` is a new declaration version + backfill; at catalog scale a full re-embed is minutes and <$1.
- **Vector storage in the journal**: the JSON-on-entity contract stays (replayable, governed); the packed-binary copy lives only in the derived index. Journal cost measured at 384-d ≈ 3–7KB JSON per entity — acceptable; revisit if an embedding model with ≥1536 dims becomes the space.

## 6. Open questions for sign-off

1. ~~OData surface: bound function (a) vs query option (b)?~~ **Resolved (Rita, 2026-07-04): whichever is preferable for agents — that is the bound function.** Agents consume this through tool calls, and a bound function's named parameters map 1:1 onto a tool schema (`Temper.Nearest(decl, to, k, filter)` ≡ one MCP tool); the query option would make agents compose nested custom grammar inside a URL string, where they reliably fumble quoting, and errors surface as parse failures instead of "k must be a number."
2. Should v1 `Nearest` accept an inline `filter` param (pre-ranking equality filter), or ship filter composition in v2?
3. Turso: accept watermark semantics for v1 (recommended), or block on closing the co-commit gap first?
4. Katagami consumer blend: does gallery *search* also rank by vector in phase C, or only "related" + the agent tool first?
5. Sizing acceptance: this is L (spec + runtime trait + 3 store backends + planner + OData + DST). Green-light as one effort, or split kernel-v1 (B) and cutovers (C/D) into separate reviews?
