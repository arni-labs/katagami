# Decisions

### Load optional search only when requested

**Decision:** Remove command-palette index construction from the shared layout and request it from a server endpoint when the visitor opens search.

**Came up because:** The layout awaited full-catalog index construction before returning the gallery, including on a cold signed-in visit.

**Options:** Stream the index behind a Suspense boundary on every page visit, or fetch it only when the search dialog opens.

**Chose on-demand loading because:** It removes full-catalog reads and index serialization from gallery loading entirely. The tradeoff is that the first search opening can show a loading state.

**Where:** ui/src/app/(site)/layout.tsx; ui/src/components/command-palette.tsx; ui/src/app/api/command-palette/route.ts.

### Keep visibility enforcement on the server

**Decision:** Determine the visitor tier on every endpoint request and use private, no-store HTTP responses; retain the existing internal index cache keyed by tier.

**Came up because:** The index includes catalog entries that anonymous visitors must not receive, and layouts can survive client navigation.

**Options:** Let the browser choose a tier or reuse its prior index, or authorize each request on the server.

**Chose server authorization because:** It preserves the existing anonymous shelf boundary and rechecks identity whenever search reopens. The tradeoff is a request on each opening, amortized by the existing derived-index cache.

**Where:** ui/src/app/api/command-palette/route.ts; ui/src/lib/command-palette-index.ts; ui/scripts/command-palette-loading.test.mjs.

### PR identity

Decision: use GH-311, the actual GitHub pull-request/issue number, for CI artifact discovery. Came up because the PR body mentioned an unrelated credential-recovery issue and the checker selected it. Options: reuse that unrelated issue or identify the gallery effort explicitly. Chose GH-311 because it keeps the scopes separate and satisfies the repository's existing issue-key convention without changing the checker. Where: PR title/body and docs/efforts/GH-311.

### Synchronize asynchronous production React tests

**Decision:** Wait for the asserted rendered state with a bounded deadline in the new asynchronous palette test.

**Came up because:** Node 24 reproduced the Vercel failure: the test asserted after one timer turn while production React still displayed the loading state.

**Options:** Increase a fixed sleep, or wait for the expected state while preserving a failing timeout.

**Chose state-based waiting because:** It verifies the actual render without assuming scheduler timing. A missing error or result still fails within two seconds.

**Where:** ui/scripts/command-palette-loading.test.mjs.

### Restore the existing test workflow

**Decision:** Apply the same two-line GitHub expression correction already proposed in PR #307.

**Came up because:** GitHub rejects `secrets` in a step condition, so the existing workflow cannot run this PR's UI tests. Workflow write access is now restored.

**Options:** Wait for the independent launcher PR to merge, or reuse its minimal correction here.

**Chose the existing correction because:** It enables the required tests without incorporating launcher changes or adding a diagnostic workflow. The optional credential-dependent ledger check keeps the same condition.

**Where:** .github/workflows/tests.yml.

### One-time production sign-in verification

**Decision:** With the owner's explicit approval, defer the real Google sign-in check to katagami.ai for this release instead of registering the branch preview callback.

**Came up because:** The owner requested a recognizable staging environment for future releases and declined the temporary preview OAuth setup for this release.

**Options:** Register the branch callback, build staging before this fix, or retain the completed local and preview checks and verify real sign-in immediately after release.

**Chose production sign-in verification because:** The owner approved this specific exception. It accepts the remaining uncertainty in the real post-login flow; it does not waive model review or claim that the missing sign-in proof passed. Stable staging remains follow-up work.

**Where:** PR #311 release verification; owner instruction in the gallery-loading session.

### Preserve the merged gallery-preview workflow

**Decision:** Resolve the workflow conflict using the exact workflow now on master after PR #307 merged.

**Came up because:** Both branches corrected the same secret-dependent test condition, and master also added preview launcher checks.

**Options:** Preserve our equivalent expression spelling, or accept master's workflow intact.

**Chose master's workflow because:** It retains the other session's launcher tests and removes this PR's redundant workflow change without changing the gallery implementation.

**Where:** .github/workflows/tests.yml; merge of master at 3c58768.
