# Implementation plan

1. Extend the existing launcher with an explicit gallery-only branch, shared detached launch helper, prerequisite checks, ownership-aware stop, and real route readiness.
2. Add regression cases for missing runtime/dependencies, unchanged environment, nonempty real-route readiness, shell exit, and isolated stop. Retain existing full-stack contract tests.
3. Document commands and runtime/environment setup in AGENTS.md and verification guidance. Correct unsupported-capability scope advice.
4. Install dependencies and use the existing production frontend configuration in isolated local and governed Tensorlake worktrees. Drive the actual encyclopedia in a browser, wait several minutes, verify unchanged configuration, and stop only this preview.
5. Complete the fixed review/fix/confirmation cycle, required checks, merge, refresh the applicable Foundry source checkout without touching dirty work, and verify the merged preview command live.
