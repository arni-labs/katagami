## Preview process ownership

**Decision:** Gallery-only stop requires a matching worktree and recorded process start time, and launch reserves the existing port-keyed process record exclusively.

**Came up because:** The existing full-stack stop kills every listener on its selected ports; the accepted gallery-only contract requires unrelated previews and backends to survive.

**Options:** Reuse listener-wide killing unchanged, or record gallery ownership beside the existing PID file.

**Chose ownership over listener-wide killing because:** It prevents one worktree from stopping another and protects against stale PID reuse, at the cost of one small metadata file. The existing detached session, PID, logs, and stop command remain the lifecycle.

**Where:** scripts/lib/run-local-lib.sh, gallery_start and gallery_stop; PR #307.

## Readiness and environment

**Decision:** Use Next's existing development environment loading and require nonempty rendered encyclopedia content before readiness.

**Came up because:** The existing local-stack launcher overwrites frontend configuration and only tests the home page's HTTP response.

**Options:** Copy production settings into a generated environment, or preserve existing Next files and process precedence.

**Chose preserving existing configuration because:** It avoids silently selecting a backend or persisting credentials in generated settings. The command reports only the effective host. The route's existing development-only preview flag remains explicit.

**Where:** scripts/run-local.sh and scripts/lib/run-local-lib.sh; PR #307.
