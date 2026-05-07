# 023 Curation Finalizer Tolerances And Liveness

Date: 2026-05-07

## Change

- `finalize_spawned_session` accepts image-like thumbnail payloads mislabeled as `text/plain`.
- `finalize_spawned_session` regenerates deterministic `DESIGN.md` when lint metadata is missing, invalid, or dirty.
- Curation query/job/direction specs now give active states timeouts so stale work fails through entity actions instead of remaining indefinitely nonterminal.

## Red

```text
cargo test
error[E0432]: unresolved import `super::design_md_projection_refresh_reason`

python3 katagami-curation/tests/test_curation_liveness_contract.py
FAILED (failures=3)
```

The tests first captured the missing finalizer helper and the indefinite active curation states.

## Green

```text
cargo fmt --check
cargo test
running 5 tests ... ok

python3 katagami-curation/tests/test_curation_liveness_contract.py
Ran 3 tests in 0.003s
OK
```

## Build

```text
cargo build --target wasm32-unknown-unknown --release
finalize_spawned_session.wasm sha256 a6f4afd9d086823a2a20061016ecab2c347444bd159e614404f648d610c144c6
```

## Production Hot-Load

```json
{"module_name":"finalize_spawned_session","sha256_hash":"a6f4afd9d086823a2a20061016ecab2c347444bd159e614404f648d610c144c6","size_bytes":405003}
```

Spec hot-load returned `HTTP 200`, loaded `CurationDirection`, `CurationJob`, and `CurationQuery`, and all verification levels passed for all three.

## Live Cleanup

- Moved stale curation jobs with failed/missing spawned sessions through `Katagami.Curation.Fail`.
- Verified production has `0` nonterminal `CurationJob` entities after cleanup.
