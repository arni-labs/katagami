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
