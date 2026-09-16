# Gallery-only launch contract

`UI_PORT=3501 KATAGAMI_LAB_PREVIEW=1 bash scripts/run-local.sh --gallery-only` starts only Next development mode using Next's existing environment-file precedence and inherited process environment. It never writes a frontend environment file, starts Temper, or seeds data. The default command remains the complete local stack.

Before detachment, fail precisely for missing Node/npm, unsupported Node, missing or inconsistent UI dependencies/lockfile, invalid backend configuration, missing launcher utilities, or an occupied preview port. Explain the corrective command. Log only the backend host, never keys or URL credentials.

Reuse the existing detached session launcher and log/PID conventions. Gallery stop uses the selected UI port and its owned PID; it must not kill a backend, another worktree's preview, or an unrelated listener. A failed launch cleans up its own process.

Readiness requires the real /encyclopedia route to respond successfully with rendered nonempty cell content, not only a listening port. Do not bypass its existing development-only access rule. Verify in a browser and again several minutes after the invoking shell exits.

In Tensorlake, use the existing governed Computer lifecycle (Heartbeat during active feedback). Suspended compute cannot serve a preview. Do not redesign Wake or add a monitoring service.

Acceptance covers local Codex and the real Foundry/Tensorlake workflow, environment hashes before/after, shell exit, sustained content, isolated stop, and early runtime/dependency failures. Instructions distinguish full-stack testing from UI review and defer missing capability scope decisions to Stack.
