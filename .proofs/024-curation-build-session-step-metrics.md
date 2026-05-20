# Curation Build-Session Step Metrics Proof

Date: 2026-05-20
Branch: `codex/curation-step-metrics-20260520`
Base: `origin/master` at `4ccca90`

## Purpose

Production TemperPaw exposes Katagami `CurationJobs`, not the reusable
`paw-wiki` `WikiJobs` surface. PERF-035 therefore needs step metrics in
Katagami's `build_session_message` WASM before Datadog can attribute the
CurationJob child-session spawn tail.

## ADR

- `docs/adrs/0010-curation-build-session-step-metrics.md`

## Red-Green Evidence

Red test:

```text
python3 -m unittest katagami-curation/tests/test_build_session_step_metrics.py

Result: failed as expected before implementation because
`katagami_curation_build_session_message_step_duration_ms` was absent.
```

Green test:

```text
python3 -m unittest katagami-curation/tests/test_build_session_step_metrics.py

Result: passed.
```

## Verification

```text
python3 -m unittest katagami-curation/tests/test_build_session_step_metrics.py \
  katagami-curation/tests/test_source_search_hot_path.py \
  katagami-curation/tests/test_curation_liveness_contract.py
Result: passed, 11 tests.

python3 -m unittest discover -s katagami-curation/tests
Result: passed, 56 tests.

cargo test --manifest-path katagami-curation/wasm/build_session_message/Cargo.toml
Result: passed, 12 tests.

cargo fmt --manifest-path katagami-curation/wasm/build_session_message/Cargo.toml -- --check
Result: passed.

git diff --check
Result: passed.

cargo build --manifest-path katagami-curation/wasm/build_session_message/Cargo.toml \
  --target wasm32-unknown-unknown --release
Result: passed.

cd katagami-curation/wasm && ./build.sh
Result: passed. All Katagami curation WASM modules built.
```

The full `build.sh` command regenerated unrelated checked-in WASM binaries for
`finalize_spawned_session` and `launch_research`; those generated artifacts are
not part of this change.

## Expected Live Proof After Deploy

After the Katagami branch merges and TemperPaw deploys an image that pulls that
Katagami ref, run a production CurationJob proof and confirm Datadog sees:

- `katagami_curation_build_session_message_step_duration_ms`

Required tags:

- `job_type`
- `step`
- `result`
- deployed `service.version`

The key step values are `ensure_workspace`, `create_session`,
`configure_session`, `session_spawned`, `create_session_link`,
`configure_session_link`, and `total`.
