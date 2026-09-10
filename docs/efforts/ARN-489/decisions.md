### Preview process ownership

**Decision:** Gallery-only stop requires a matching worktree and recorded process identity, and the existing detached launcher publishes the port-keyed process record exclusively. The full-stack stop also clears gallery ownership for the UI port it stops.

**Came up because:** The existing full-stack stop kills every listener on its selected ports; the accepted gallery-only contract requires unrelated previews and backends to survive.

**Options:** Reuse listener-wide killing unchanged, or record gallery ownership beside the existing PID file.

**Chose ownership over listener-wide killing because:** It prevents one worktree from stopping another and protects against stale PID reuse, at the cost of one small metadata file. The existing detached session, PID, logs, and stop command remain the lifecycle.

**Where:** scripts/lib/run-local-lib.sh, gallery_start and gallery_stop; PR #307.

### Readiness and environment

**Decision:** Use Next's existing development environment loading and require nonempty rendered encyclopedia content before readiness.

**Came up because:** The existing local-stack launcher overwrites frontend configuration and only tests the home page's HTTP response.

**Options:** Copy production settings into a generated environment, or preserve existing Next files and process precedence.

**Chose preserving existing configuration because:** It avoids silently selecting a backend or persisting credentials in generated settings. The command reports only the effective host. The route's existing development-only preview flag remains explicit.

**Where:** scripts/run-local.sh and scripts/lib/run-local-lib.sh; PR #307.

### Executable CI tests

**Decision:** Move the existing optional credential check into job environment before running the launcher tests in CI.

**Came up because:** GitHub rejected tests.yml before creating jobs, and actionlint identified its secrets reference in a step condition as invalid.

**Options:** Leave the workflow invalid and rely on local evidence, or correct that expression using the repository's existing verification-workflow pattern.

**Chose the expression correction because:** The accepted launcher regressions must actually run in CI. The optional production credential check retains its behavior; no new secret or permission is added.

**Where:** .github/workflows/tests.yml; PR #307.

### Complete ownership at publication

**Decision:** Publish a complete ownership record from the existing detached launcher before it writes the shared PID or log, and use Linux boot ID plus process start ticks for identity.

**Came up because:** Review reproduced failed temporary-file creation leaving an incomplete reservation. Formatted process start times also depend on clock/timezone conversion rather than process identity.

**Options:** Keep a shell-side incomplete reservation with more recovery states, or atomically publish the detached process's complete record using a temporary file and an exclusive hard link.

**Chose complete publication because:** It removes the incomplete startup state and lets a failed competing launch leave the winner untouched. Per-launch scratch paths avoid shared launcher-file writes. Linux start ticks avoid clock-step sensitivity; macOS uses its process start time with fixed locale/timezone. This extends the existing launcher and ownership file, not a separate registry or lifecycle.

**Where:** scripts/run-local.sh write_launcher and scripts/lib/run-local-lib.sh gallery_process_identity/gallery_start; PR #307. Linux process start semantics: https://www.kernel.org/doc/html/latest/filesystems/proc.html. Formatted lstart conversion: https://gitlab.com/procps-ng/procps/-/raw/master/src/ps/output.c.
