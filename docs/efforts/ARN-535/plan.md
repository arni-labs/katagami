# Plan

Addressing: the finalizer promises a contrast gate it never had, accepts three artifacts on substrings, drops invalid banned patterns, and hands repair sessions a stale description of itself.

Expected end state: the rules in `spec.md` are enforced by the shipped WASM, proven by unit tests and by the local lane e2e against a real Temper, deployed through Genesis, and verified live.

1. Measure published palettes against the promised rule (done: 6 of 38 fail; rule revised with Rita).
2. Red-green unit tests in `real_gate_tests`, then the implementation.
3. Update `synthesize-palette/SKILL.md` to the enforced rule.
4. Rebuild `finalize_spawned_session.wasm`.
5. Extend `tests/e2e/e2e_lane_verification.py` with contrast accept and reject cases; run it against a local Temper.
6. Review panel, merge, publish to Genesis, install, verify the deployed finalizer rejects a low-contrast palette on a disposable entity.
