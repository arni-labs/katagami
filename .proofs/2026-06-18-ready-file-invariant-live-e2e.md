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
