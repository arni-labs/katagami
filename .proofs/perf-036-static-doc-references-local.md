# PERF-036 Static Doc References Local Proof

Date: 2026-05-20

## Goal

Reduce Katagami `CurationJob` child-session spawn latency by removing normal
runtime `ResolvePath` calls for static skill and knowledge files in
`build_session_message`.

## Before Baseline

Production baseline on TemperPaw `sha-2a6c2d0`, Datadog window
`2026-05-20T22:30:00Z..22:45:00Z`:

- trace `7a7f1278e006479d86cb985d7ec7dcd9`: `wasm:build_session_message`
  about `1126 ms`; step total log `832 ms`
- trace `482beef3d0605af725c74b502b71da15`: `wasm:build_session_message`
  about `637 ms`; step total metric `581 ms`
- Datadog metric query:
  `sum:katagami_curation_build_session_message_step_duration_ms_total{service:temperpaw,env:prod,version:2a6c2d08b66b326ea7d0503c7ce1194ecb77af21} by {step}.as_count().rollup(sum,60)`
- second-run step values: `ensure_workspace=16`, `create_session=89`,
  `configure_session=24`, `session_spawned=18`, `create_session_link=139`,
  `configure_session_link=18`, `total=581`

## Local Verification

Passed:

- `cargo fmt --manifest-path katagami-curation/wasm/build_session_message/Cargo.toml -- --check`
- `cargo check --manifest-path katagami-curation/wasm/build_session_message/Cargo.toml`
- `cargo clippy --manifest-path katagami-curation/wasm/build_session_message/Cargo.toml -- -D warnings`
- `python3 -m unittest katagami-curation.tests.test_build_session_step_metrics katagami-curation.tests.test_source_search_hot_path`
- `python3 -m unittest discover -s katagami-curation/tests`
- `./katagami-curation/wasm/build.sh`
- `git diff --check`

## Remaining Gates

- PR CI
- merge
- TemperPaw image pin/rollout
- Railway deploy
- live CurationJob before/after proof on the new `service.version`
- Datadog proof that `prompt_assets` is visible and total
  `build_session_message` duration improves without losing SessionLink
  correctness
