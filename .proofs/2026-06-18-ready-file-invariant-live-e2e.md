# Ready File Artifact Invariant Live E2E Proof

- Date: 2026-06-18
- App ref installed in production: `katagami/katagami-curation@1e6f43993be70ca3d7dadf42c032fa6a206ac482`
- Linear: ARN-51, ARN-55

## Local Verification

- `python3 -m unittest tests.test_artifact_ready_contract`
  - Result: 2 passed.
- `cargo build --target wasm32-unknown-unknown --release`
  - Path: `wasm/finalize_spawned_session`
  - Result: passed.
- `./wasm/build.sh`
  - Result: `build_session_message`, `finalize_spawned_session`, and
    `launch_research` built successfully.

## Genesis Publish And Install

Genesis latest was verified for:

- `katagami/katagami-curation@1e6f43993be70ca3d7dadf42c032fa6a206ac482`

Production install response:

- Status: 200
- Closure: `genesis:katagami/katagami-curation@1e6f43993be70ca3d7dadf42c032fa6a206ac482:1e6f43993be70ca3d7dadf42c032fa6a206ac482`
- Materialized path: `/root/.local/share/temperpaw/genesis-app-cache/katagami-katagami-curation-1e6f43993be70ca3d7dadf42c032fa6a206ac482`
- WASM: `build_session_message`, `finalize_spawned_session`, `launch_research`
- Agent: `curator`

## Additive-Awareness Correction

An initial publish used a stale local tree and removed files that existed on
Genesis main. This was immediately corrected by cloning the current Genesis
repo, restoring prior main `7d305f42dde5eb6b4348f193d393eaf93866d8a7`,
overlaying only the intended changed files, and publishing the forward commit
`1e6f43993be70ca3d7dadf42c032fa6a206ac482`.

## Production Negative E2E

Created disposable entities in production:

- Workspace: `ws-019ed8c1-1bcd-77e1-b513-56ba5563785a`
- Placeholder File: `fl-019ed8c1-1c6b-7961-b7c6-8fa5a7d1b522`
  - Status: `Created`
  - No `$value` upload.
- DesignLanguage: `en-019ed8c1-1d63-73e1-af67-53197d8776e1`
- CurationJob: `en-019ed8c1-1ef6-7792-b993-cf7546f68c37`

Flow:

1. Created a placeholder File shell.
2. Attached that File as the DesignLanguage embodiment artifact.
3. Started a `quality_review` CurationJob.
4. Triggered `CompleteQualityReview` with `await_integration=true`.

Observed result:

```text
DesignLanguage 'en-019ed8c1-1d63-73e1-af67-53197d8776e1' embodiment file 'fl-019ed8c1-1c6b-7961-b7c6-8fa5a7d1b522' is in state 'Created', expected Ready
```

The CurationJob reached `Failed`, proving the installed finalizer blocks
placeholder artifacts before publish.

## Composition Self-Heal Patch

Follow-up live retry after the PawFS hot path fix proved the ready-file
invariant was no longer the blocker. The active regeneration session completed
and attached verified embodiment and thumbnail artifacts, but the CurationJob
failed on `SubmitForReview` because the DesignLanguage still had no attached
or verified composition files:

- Language: `en-019edb01-bbbc-75a2-be14-b6530caaad41`
- Job: `en-019edbb6-6205-7230-b053-12a413f49a81`
- Session: `ss-019edbdd-184f-7f50-be0d-189deae28df5`
- Observed state: `has_compositions = null`,
  `compositions_verified = null`, `composition_count = "5"`.
- Failure: `SubmitForReview` rejected from `Draft` because the guard requires
  `AttachCompositions` and `VerifyCompositions`.

Local red/green verification for the finalizer composition repair:

- `python3 -m unittest tests.test_quality_review_finalize_contract.QualityReviewFinalizeContractTests.test_finalizer_generates_missing_compositions_before_review`
  - Red before implementation: failed on missing `fn verify_compositions`.
  - Green after implementation: passed.
- `cargo test --manifest-path wasm/finalize_spawned_session/Cargo.toml`
  - Result: 21 passed.
- `python3 -m unittest tests.test_quality_review_finalize_contract`
  - Result: 15 passed.
- `python3 -m unittest discover -s tests`
  - Result: 65 passed, 16 skipped.
- `./wasm/build.sh`
  - Result: `build_session_message`, `finalize_spawned_session`, and
    `launch_research` built successfully.

The finalizer now deterministically renders landing and dashboard HTML
composition projections from existing DesignLanguage fields, writes them to
PawFS, dispatches `AttachCompositions`, verifies both files, then dispatches
`VerifyCompositions` before any Draft-to-review transition.

## Finalizer PawFS Direct-Key Patch

After installing `katagami/katagami-curation@58e6f7e63cc26ace549e25d9ceedaf2b46277beb`,
the next live retry proved the composition self-heal code was deployed, but it
hit the same bounded OData hot-path issue inside the finalizer's own PawFS
writer:

- Job: `en-019edbb6-6205-7230-b053-12a413f49a81`
- Session: `ss-019edbec-da9d-73b2-9765-4bf593050e5b`
- Session result: `{"language_ids":["en-019edb01-bbbc-75a2-be14-b6530caaad41"]}`
- Failure: `Failed to query Directories with filter 'Path eq
  '/katagami/compositions/codex-fresh-workspace-repair-proof-1781790784'
  and WorkspaceId eq 'os-app-docs' and Status ne 'Archived'': HTTP 413`

Local red/green verification for the direct-key finalizer PawFS write patch:

- `python3 -m unittest tests.test_quality_review_finalize_contract.QualityReviewFinalizeContractTests.test_finalizer_pawfs_writes_use_direct_keys`
  - Red before implementation: failed on missing `fn pawfs_directory_id`.
  - Green after implementation: passed.
- `cargo test --manifest-path wasm/finalize_spawned_session/Cargo.toml pawfs_path_helpers_normalize_and_build_direct_keys`
  - Result: 1 passed.
- `cargo test --manifest-path wasm/finalize_spawned_session/Cargo.toml`
  - Result: 21 passed.
- `python3 -m unittest tests.test_quality_review_finalize_contract`
  - Result: 16 passed.
- `python3 -m unittest discover -s tests`
  - Result: 66 passed, 16 skipped.
- `./wasm/build.sh`
  - Result: `build_session_message`, `finalize_spawned_session`, and
    `launch_research` built successfully.

The finalizer's PawFS writer now derives stable directory and file IDs from
workspace plus normalized path, then reads `Directories` and `Files` directly
by ID instead of querying broad `Path` + `WorkspaceId` filters.

## Production Published E2E

Installed in production:

- App ref: `katagami/katagami-curation@9dc9f859f40a87f27614a8a6ef6c3a75fe9f50f5`
- Live `finalize_spawned_session` SHA-256:
  `a5061217dd8c437191892f4140e6a209671f983cd55c869bbce214cdca362a9f`

Retried the original failed repair job:

- Regeneration job: `en-019edbb6-6205-7230-b053-12a413f49a81`
- Regeneration session: `ss-019edbf4-d384-7f62-a095-8da7123558f8`
- Result: `Completed`
- Language after regeneration: `UnderReview`
- Composition files:
  - Landing: `fl-e94aee6960b0eed5`
  - Dashboard: `fl-8bddfbb96511ee66`
- Composition state: `has_compositions = true`,
  `compositions_verified = true`

The follow-up quality-review job then completed and published the language:

- Quality job: `en-019edbf7-f4c0-7380-a79e-a36adf6a1c19`
- Quality session: `ss-019edbf7-fab7-7700-b5c8-908b8490f495`
- DesignLanguage: `en-019edb01-bbbc-75a2-be14-b6530caaad41`
- Final state: `Published`

Verified final DesignLanguage booleans:

- `has_compositions = true`
- `compositions_verified = true`
- `has_design_md = true`
- `design_md_verified = true`
- `has_shadcn_export = true`
- `shadcn_export_verified = true`
- `has_shadcn_component_spec = true`
- `shadcn_component_spec_verified = true`
- `has_shadcn_preview_shots = true`
- `shadcn_preview_shots_verified = true`
- `has_published_assets = true`
- `quality_review_passed = true`
- `embodiment_verified = true`
- `thumbnail_verified = true`

Verified generated files:

- Landing composition: `fl-e94aee6960b0eed5`
  - Path:
    `/katagami/compositions/codex-fresh-workspace-repair-proof-1781790784/landing.html`
  - Status: `Ready`
  - Workspace: `os-app-docs`
  - MIME: `text/html`
  - Size: `5050`
  - Hash:
    `sha256:9cb3966c9d2803d55e7a0fb2d1f04e13e0a878ec0427b332a624a4b5dc591c70`
- Dashboard composition: `fl-8bddfbb96511ee66`
  - Path:
    `/katagami/compositions/codex-fresh-workspace-repair-proof-1781790784/dashboard.html`
  - Status: `Ready`
  - Workspace: `os-app-docs`
  - MIME: `text/html`
  - Size: `5469`
  - Hash:
    `sha256:c13783ae4c759afc5ecb63c5b24ce1a3c157aded6e1dac2be3ae01c447514b7e`
- DESIGN.md: `fl-bc0cde0938b08643`
  - Path:
    `/katagami/design-md/codex-fresh-workspace-repair-proof-1781790784/DESIGN.md`
  - Status: `Ready`
  - Workspace: `os-app-docs`
  - MIME: `text/markdown`
  - Size: `4033`
  - Hash:
    `sha256:5cfa21bb9bea3eef4d7841e1097cb88c58a717608c167c5cfe35a98ca3a7d12a`

Verified public asset URLs:

- DESIGN.md:
  `https://assets.katagami.ai/katagami/design-languages/DesignLanguage/en-019edb01-bbbc-75a2-be14-b6530caaad41/design_md-5cfa21bb9bea3eef4d7841e1097cb88c58a717608c167c5cfe35a98ca3a7d12a.md`
- Embodiment:
  `https://assets.katagami.ai/katagami/design-languages/DesignLanguage/en-019edb01-bbbc-75a2-be14-b6530caaad41/embodiment-4fe3ea4eb35b71d7ecf70b8d01ac601d6d7a17ab29c3f6ffdad4fa7abc65b559.html`
- Thumbnail:
  `https://assets.katagami.ai/katagami/design-languages/DesignLanguage/en-019edb01-bbbc-75a2-be14-b6530caaad41/thumbnail-c15fdc7a0a00ccb534b8af8bfd950316dd7a68bc45487b2d6ff70f6d15118e58.jpg`

## Concurrent Synthesis Orchestration Patch

Fresh AYA batch run after the publish fix exposed an earlier orchestration
failure mode:

- Four synthesis jobs ended with unfinished typed-completion tool calls.
- Three synthesis jobs attempted `CurationQuery.SynthesisComplete` after the
  query had already advanced to `Organizing`.
- One synthesis job attempted to complete a `CurationDirection` that was
  already `Completed`.
- No new DesignLanguage records were attached to that batch.

Root cause: concurrent synthesis branches were all allowed to dispatch
completion actions against the same query/direction state machine. One branch
could legitimately advance the entity first, while later branches treated the
already-advanced state as fatal.

Patch:

- `CurationDirection.Complete` now accepts duplicate dispatches from
  `Completed`.
- `CurationQuery.ResearchComplete` now accepts duplicate dispatches from
  `Synthesizing`.
- `CurationQuery.SynthesisComplete` now accepts duplicate dispatches from
  `Organizing`.
- `CurationQuery.OrganizationComplete` now accepts duplicate dispatches from
  `Completed`.
- `finalize_spawned_session` now treats rejected completion dispatches as
  idempotent if the target entity is already in the desired state.
- Transient provider/unfinished typed-completion retry budget increased from
  2 to 4.

Local verification:

- `python3 -m unittest tests.test_reaction_resolver_types.ReactionResolverTypeTests.test_completion_state_transitions_are_idempotent_for_concurrent_finalizers`
  - Result: passed.
- `python3 -m unittest tests.test_quality_review_finalize_contract.QualityReviewFinalizeContractTests.test_concurrent_completion_dispatches_are_idempotent tests.test_quality_review_finalize_contract.QualityReviewFinalizeContractTests.test_failed_provider_streams_retry_without_failing_query`
  - Result: 2 passed.
- `cargo test --manifest-path wasm/finalize_spawned_session/Cargo.toml action_state_rejections_are_detected_for_idempotent_completion`
  - Result: 1 passed.
- `cargo test --manifest-path wasm/finalize_spawned_session/Cargo.toml`
  - Result: 22 passed.
- `python3 -m unittest tests.test_quality_review_finalize_contract`
  - Result: 17 passed.
- `python3 -m unittest tests.test_reaction_resolver_types`
  - Result: 7 passed.
- `python3 -m unittest discover -s tests`
  - Result: 68 passed, 16 skipped.
- `./wasm/build.sh`
  - Result: `build_session_message`, `finalize_spawned_session`, and
    `launch_research` built successfully.
