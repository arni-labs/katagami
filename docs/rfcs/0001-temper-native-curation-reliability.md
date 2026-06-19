# RFC-0001: Temper-native curation reliability

- Status: Draft
- Date: 2026-06-19
- Author: Claude Code (for Rita)
- Repos in scope: `katagami-commons` (specs), `katagami-curation` (specs + wasm), `temperpaw` (`monty_repl`)
- Related ADRs: 0003 (inline-action-triggers-hard-cut), 0004 (temper-native-curation-orchestration), 0006 (typed-finalization), 0014 (quality-finalizer-reviewability-gate)
- Related Linear: ARN-55 (artifact-ready invariant), ARN-67 (synth timeouts), ARN-60 (scheduled kickoff), ARN-39 (push logic into Temper apps)
- Related: `docs/temper-designlanguage-invariant-case-study.md`

## 1. Summary

The curation pipeline is unreliable not because of one bug but because of one structural choice: determinism-critical work — persisting files, transitioning state, spawning the next job, enforcing "don't publish broken output" — is carried out by a stochastic LLM agent and a hand-written finalizer, on top of a platform whose entire purpose is to verify and enforce exactly those things. Every brittleness symptom is a place where glue does a job Temper is built to guarantee.

This RFC proposes finishing the migration ADR-0004 already started: move the remaining mechanical guarantees into the spec, where Temper's verification cascade proves them, and reduce the agent to the one thing it is actually good at — design judgment. The key finding from grounding the kernel: **the platform already provides the primitives we need.** The core fix needs no kernel change.

## 2. What we are addressing, and the expected end state

We are addressing: a pipeline that reaches `Completed` only when ~22 LLM-driven mechanical steps and a pile of finalizer glue all happen to align, and that takes a night to fix because the only test is a 45–60 minute production run, hand-deployed by uploading WASM blobs to prod.

Expected end state:

1. A design language cannot be published with a missing/empty file — enforced by the platform, not by a finalizer poll.
2. Each pipeline job is spawned exactly once, by one owner; the query advances only when all its directions are done.
3. The agent produces design output (spec + embodiment) and nothing mechanical; persistence, attachment, and state transitions are deterministic.
4. A full curation run can be exercised locally in minutes — first by Temper's verification cascade on the specs, then by an integration run with a stubbed agent — so failures surface in seconds, not in hour-long prod polls.
5. WASM is committed to source; prod is never hand-patched and never silently diverges from git.

## 3. Why the pipeline is brittle

The pipeline is: `CurationQuery → source_search → synthesize (per direction) → quality_review → organize → Completed`. Synthesis and review run a Codex agent that executes Python-like code in a sandbox and drives entity actions through `temper.read/write/action`.

Five facets, all the same root cause — glue doing the platform's job:

1. **Non-atomic file write, unguarded.** `temper.write` creates the `Files` metadata record first (`monty_repl/entity_ops.rs`, `ensure_pawfs_file`), then streams bytes to `Files('id')/$value` separately. "Record exists, `$value` = 404" is therefore a legal state. Nothing binds "thumbnail attached" to "thumbnail readable": `AttachThumbnail` sets `has_thumbnail=true` and the `Publish` guard checks the local boolean `thumbnail_verified` (`katagami-commons/specs/design_language.ioa.toml:362-376,474-480`), never the file.

2. **Dual-owned job spawning.** ADR-0004 moved follow-up job creation to inline `[[action.triggers]]` and said the finalizer should "stand down rather than duplicating the inline-trigger cascade." The legacy cascade in `finalize_spawned_session` was never fully cut, so for typed-v1 jobs both paths can spawn — duplicates.

3. **No fan-out barrier.** A `CurationQuery` can advance toward `Organizing` after a single direction completes; there is no guard requiring all directions done first. Slow directions get stranded.

4. **Reactive, not preventive, invariants.** The `Published*` invariants (`design_language.ioa.toml:551-604`) are checked when already in `Published`. They catch a contradiction after the fact (see the case study) rather than blocking the bad transition with file evidence.

5. **The agent runs the mechanics.** The synthesize/review skills instruct the LLM through ~22 determinism-critical steps (serialize every param, extract the right `entity_id`/`file_id`, write, attach, transition, queue the next job). Reliability is bounded by prompt adherence.

## 4. Why fixes have been slow

- WASM reaches prod only via hand `POST /api/wasm/modules/{name}` — the normal Docker deploy did not reload modules.
- There is no local or staging way to exercise `synthesize → thumbnail → quality_review`; the only test is a real `CurationQuery` that fails ~40 minutes in.
- Hot-fixed `.wasm` blobs live in `deploy/hotfixes/` and were never committed, so prod is diverged from git.
- Three background watchers polled prod — which the project's own rule ("no background watchers") forbids.

So each fix is a multi-hour, unreproducible, off-platform loop, and patching one glue gap just exposes the next.

## 5. The key realization: the platform already has the invariants

Grounding the temper kernel changed the plan for the better. The primitives we need already exist:

- **A `Ready` file provably has bytes.** `temper-fs/specs/file.ioa.toml` declares `has_content` (initial false) and an invariant `ReadyFilesHaveContent` (`when=["Ready","Locked"] assert="has_content"`). A file reaches `Ready` only via `StreamUpdated`, which the kernel dispatches **after** the blob adapter durably stores the bytes (`temper-server/src/odata/write.rs::handle_stream_put`). So `File.status == Ready` is a trustworthy "bytes exist" signal.
- **Cross-entity guards are native.** `Guard::CrossEntityStateIn { entity_type, entity_id_source, required_status }` (`temper-jit/.../table/types.rs`), resolved at dispatch time (`temper-server/.../dispatch/cross_entity.rs`), budget `MAX_CROSS_ENTITY_LOOKUPS = 4` per action. IOA exposes it as a guard predicate.
- **Counters + comparison guards are native** (`CounterMin`, `CounterMax`), enough to express a fan-out barrier.
- **The verification cascade is the test we were missing.** Temper already model-checks specs (L0 symbolic, L1 exhaustive model check, L2 simulation, L3 property tests) and blocks pushes with `VerificationRequired` + a counterexample trace — it caught a real `Published`-but-invalid contradiction once already (case study). Expressing the invariant in the spec means Temper *proves* it, locally, in seconds.

Net: the 404 class, the dual-spawn, and the missing barrier are all fixable inside the existing IOA dialect. No kernel change for the core.

## 6. Target design

Each move below states the problem, the native mechanism, the spec change, and how it is verified.

### 6.1 Preventive file-ready guards — kill the 404 class

- Mechanism: cross-entity guards referencing the `File` entity's status.
- Change (`design_language.ioa.toml`): persist `thumbnail_file_id` / `embodiment_file_id` / `design_md_file_id` / composition file ids as entity state (set in the `Attach*` effects), then add to the `Publish` (and `AttachThumbnail`/`SubmitForReview`) guards predicates of the form `{ type = "cross_entity_state", entity_type = "File", entity_id_source = "thumbnail_file_id", required_status = ["Ready", "Locked"] }`. Three file references ≤ the budget of 4.
- Effect: a language cannot publish unless its referenced files genuinely have bytes — independent of whether the finalizer ran. A 404 thumbnail keeps the language in `Draft` (correct), instead of publishing broken output or stalling silently.
- Verified by: Temper's cascade confirms the local state machine stays consistent — but note `temper-verify` maps `cross_entity_state` to `Always` (permissive), so it does **not** prove the denial. The file-ready denial is proven at runtime by an integration test that attaches a never-uploaded file id and asserts `Publish` is denied (and a `Ready` file is allowed).

### 6.2 Single-owner job lifecycle — finish ADR-0004's cutover

- Mechanism: keep the inline `[[action.triggers]]` (`resolve_target = "create"`) as the only spawner; delete the legacy imperative cascade from `finalize_spawned_session` (`spawn_synth_followup` / `spawn_quality_review_followup` / `spawn_organize_followup`).
- Change: `finalize_spawned_session` is reduced to recording the temperpaw session result and finalizing the job (its ADR-0004 role); it no longer creates follow-up jobs or advances the query. Remove the legacy `Complete(output)` compatibility window (ADR-0004 said "one window"; it has run its course — confirm no legacy jobs in flight before cutting).
- Verified by: integration run asserts exactly one job per `(query, phase, direction)`; spec verification that the trigger is the sole creator.

### 6.3 Fan-out completion barrier

- Mechanism: a `directions_pending` counter on `CurationQuery`, incremented when directions are created and decremented on each direction completion (via the existing cross-entity trigger path); guard the advance-to-`Organizing` transition with `CounterMax { var = "directions_pending", max = 0 }`.
- Verified by: L1 model check that `Organizing` is unreachable while `directions_pending > 0`; integration run with a slow direction asserts no stranded `DesignLanguage`.

### 6.4 Populate `organize_job_id` and `synthesize_job_ids`

- Mechanism: replace the hardcoded `organize_job_id = ""` literal in the synthesis-complete trigger with `params_from` carrying the real id; populate `synthesize_job_ids` when directions are queued.
- Verified by: integration run asserts the query can resolve its organize job; no empty-id watchdog timeout.

### 6.5 Agent does design-only; mechanics become deterministic

- Mechanism: the synthesize/review skills return a structured result (the spec JSON + embodiment/thumbnail file references the agent produced); a deterministic step — the existing finalizer, now minimal, or a small dedicated executor — performs the attachments and state transitions. The agent stops calling `Attach*`/`Complete*` directly.
- This is the larger, stageable piece (see §8). The §6.1 guards make it safe to land incrementally: even while the agent still drives some attaches, the cross-entity guards prevent bad publishes.
- Verified by: integration run with a stubbed agent returning fixed output drives a full query to `Completed` with zero agent-issued state transitions.

## 7. Verification as the test — the fast loop we were missing

Two layers, both local, both fast:

1. **Spec verification (seconds–minutes).** Every spec change runs Temper's cascade locally; L1 explores reachable states and returns a counterexample on any invariant violation. This is the red-green loop for the state machine — it already caught a real `Published`-but-internally-invalid lifecycle contradiction (see the case study). It does not, however, prove the cross-entity file-ready property (`cross_entity_state` is permissive in verify); that is the integration harness's job below. Specs do not merge unless the cascade passes.
2. **Integration harness (minutes).** A `make`-level target seeds a minimal `CurationQuery`, stubs the Codex agent with deterministic output, and drives the pipeline to a terminal state against a local Temper, asserting: one job per phase, the fan-out barrier holds, a 404 file blocks publish, and a clean run reaches `Completed`. This replaces the 45-minute prod poll.

WASM is built in CI and committed; the Docker image is the source of truth for what prod runs; no hand uploads.

## 8. Migration plan and sequencing

Additive and staged so katagami reaches reliable without blocking on anything external. One PR per repo (merge order: Genesis apps → temperpaw):

- **Stage A — make broken states illegal (highest leverage).** `katagami-commons`: persist file-id state + add the cross-entity file-ready guards (§6.1). Land with L1 verification + the deny-on-404 integration test. This alone kills the dominant failure.
- **Stage B — single owner + barrier.** `katagami-curation`: cut the finalizer cascade (§6.2), add the fan-out barrier (§6.3), fix `organize_job_id`/`synthesize_job_ids` (§6.4). `temperpaw`: make `temper.write` fail loudly if the file is not `Ready` after upload, and stop returning success on a non-landed blob.
- **Stage C — determinism extraction.** Move the mechanical steps out of the agent (§6.5).
- **Stage D — process.** Commit WASM to source; wire the integration harness into CI; remove `deploy/hotfixes`.

After each Genesis-side merge: push to Genesis and verify both sides in sync (Genesis wins on divergence).

## 9. Risks and open questions

- **File-id as a queryable field.** The cross-entity guard reads `entity_id_source` from the entity's fields. `thumbnail_file_id` is currently an action param, not a declared `[[state]]`. We must confirm params persist as queryable fields, or add explicit state vars. Verifiable with a one-line OData read; resolved before relying on §6.1.
- **Cross-app entity type addressability.** `DesignLanguage` (katagami-commons) would reference the `File` entity type (temper-fs). Cross-entity resolution is tenant-scoped by type name; we must confirm `File` is addressable from a commons guard and that there is no name collision (relates to ARN-28). If not addressable, fall back to a commons-local readiness field set by a verified-by-Temper attach path.
- **Cross-entity budget.** Budget is 4 lookups/action; we use 3 (thumbnail, embodiment, design_md) plus possibly compositions — keep within budget or split across `SubmitForReview` and `Publish`.
- **In-flight legacy jobs.** Cutting the `Complete(output)` window requires confirming no legacy-contract jobs are mid-flight at deploy.
- **Genesis availability.** Genesis fetch is currently erroring (`fetch-pack: expected ACK/NAK, got '?PACK'`); work proceeds on `origin/master` and reconciles to Genesis when reachable.

## 10. Deferred (non-goals here)

- Kernel polish, optional and ARN-39-aligned: making `File` create + first-byte-write atomic; boolean (non-status) cross-entity guards. Not needed — `File.status == Ready` already gives us the invariant.
- Reworking the agent's design-judgment loop (taste rules, embodiment quality) — out of scope; this RFC is about reliability of the mechanical path.

## 11. Compatibility and rollback

All spec changes are additive (new state vars, stricter guards). Stricter guards can only *prevent* bad transitions, never corrupt existing data; published languages remain valid. Each change is gated by Temper verification before merge, so a spec that would break the model cannot land. Rollback is reverting the per-repo PR; because nothing is destructive, revert is clean.
