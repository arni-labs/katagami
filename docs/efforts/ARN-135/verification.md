# Verification, 2026-09-16

## Passing checks

- Finalizer: 96 Rust tests pass, including acceptance of one and two cases per
  model and rejection of unsupported counts, asymmetric matrices, duplicate
  sources, mismatched hashes and invalid scores. The new acceptance tests failed
  against the previous eight-proof validator before the implementation changed.
- MCP: `npm run typecheck` passes.
- Release WASM builds for the repository's `wasm32-unknown-unknown` target; the
  checked-in module was copied from that build.
- `git diff --check` passes.

## Incomplete verification and release blockers

- Python contract suite: 18 pass, three pre-existing policy assertions fail/error.
  The expected finalizer-only policy text is absent in the unchanged base policy.
  These checks were not weakened and the policy was not changed by this effort.
- Local end-to-end publication has not passed. Existing runtime image
  `ghcr.io/nerdsane/temperpaw:sha-f2eb7d1` (image digest
  `sha256:c33b788317f3a4829523c5c70bd00ecd181b757db657c3e3ee81d4e6598d1651`)
  fails startup because its required `artifact_batch_apply.wasm` is absent.
  Mounting the existing local built artifact read-only allows startup in a
  disposable container. Spec installation then returns 403, no matching permit,
  decision `PD-01a0abe4-46bf-7323-bde8-e38f1249edc3`. No permission was changed
  and no alternative credential was used to bypass the denial. The production
  policy snapshot has not been activated in the local test tenant.
- Genesis advertises curation main
  `8ea270e245327f9ab7c003e18319a1267322b5cd` and commons main
  `1157c9a1b210402027d454b57ac60c5c03478ce5`, but fetching pack data fails with
  disconnect/bad pack header. Source reconciliation and publication are pending.
- Grok CLI 1.0.24 returns 401 for explicit `grok-4.6`, reporting no native auth
  context and an unconfigured OAuth client. Image-generation capability and
  included entitlement are not verified. No substitute model counts as a Grok
  proof.
- Complete-panel review, merge, deployment, live Google/Grok proof generation
  and public style verification remain pending. The existing style stays Draft.

The disposable image run is diagnostic evidence, not a passing production-shape
publication test. This branch is not ready to deploy.
