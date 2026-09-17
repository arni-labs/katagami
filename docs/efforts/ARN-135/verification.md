# Verification, 2026-09-16

- Finalizer: 96 Rust tests pass, including one/two matched sources per model
  and rejection of unsupported counts, asymmetric matrices and mismatched hashes.
- Public worker: seven route tests pass; the three new-namespace checks returned
  404 against the previous worker and 200 after the allowlist repair. Existing
  asset prefixes still serve; unrelated storage remains inaccessible.
- Cloudflare local runtime (Wrangler 4.133.0): GET and HEAD on the new art-style
  prefix return 200/image/png; bytes match the pipeline fixture exactly.
- Thumbnail contract: nine pass, one pre-existing synthesize-language skill-text
  assertion fails. The changed publication-namespace assertion now passes.
- MCP typecheck passes. Release WASM builds for wasm32-unknown-unknown.
- The user authorized disposable local bootstrap after the spec-upload denial.
  The production policy snapshot remains installed, with the application repair
  adding the two missing ArtStyle curator-only actions. No permission was widened.
- The local runtime uses temperpaw image sha-f2eb7d1, digest
  sha256:c33b788317f3a4829523c5c70bd00ecd181b757db657c3e3ee81d4e6598d1651.
  Its missing artifact_batch_apply module is supplied read-only from the existing
  local build. The finalizer loaded by the runtime has SHA-256
  64045111d6ac011a052cc6ceb4f98a1913ebc68f96b45e65bdb4da38b0552a98.
- Local publication succeeds for one-source/two-output and two-source/four-output
  art styles and palettes. Malformed images, hash mismatches and invalid palette
  exports are rejected. A registered contributor is denied AttachArtStyleReview,
  SubmitForReview, PATCH, PUT and DELETE with HTTP 403.
- Python contract suite: 18 pass; three historical policy assertions remain
  incompatible with the current baseline. Two search for retired policy comment
  delimiters and a header-based identity model; the third assumes WritingStyle
  allows contributor SubmitForReview, which its existing policy no longer does.
  The live credential-backed policy checks above cover the changed ArtStyle boundary.
- Genesis source repositories were recovered and verified with git fsck. Source
  reconciliation and publication remain pending.
- Grok CLI authentication and native image-edit capability now work. Disputed
  Google visual outputs are not accepted as style-quality proof. No cross-model
  visual approval, application merge, deployment or public style verification
  is claimed yet. The existing style remains Draft.

## Authenticated contribution follow-up

The first full contributor-MCP run failed on File lock propagation, unattributed
creation, and an unauthorized attempt to create a CurationJob. Those failures
remain in the evidence. The repaired flow creates an attributed Draft, waits for
Locked files, and queues the existing finalizer through engine-owned triggers.
An independent run now publishes valid one-source/two-output submissions and
rejects altered hashes and invalid reports. Direct contributor job creation,
verification actions, and RecordVerificationJob remain forbidden.

The built CLI independently imports three files, submits, and reports
Published/Completed for valid evidence; invalid hashes report Draft/Failed with
the precise verification error. Discovery JSON points to the existing Railway
contribution MCP and advertises the image import tool. MCP and CLI builds pass;
twenty routing, resolver and Genesis contract checks pass.

The local image sink previously discarded uploaded bytes, a separate verification
weakness. The contributor-specific 404 was traced to the nested File creation
wrapper dropping Path; this is corrected at the upload boundary. Separately, the test sink now persists
and serves exact bytes with image MIME types and HEAD.
A fresh pipeline run completed and published; the browser loaded all three fixture
images (64, 720 and 64 pixels wide) through the local gallery's file route. These
are engineering fixtures, not semantic approval of the Vermilion artwork. The
public CDN worker is verified separately against its real local R2 binding.

The final authenticated CLI run publishes en-01a0acaf-364c-78d2-bb7c-628fd935c783.
Both gallery images load in the browser with naturalWidth 1536, and independent
HTTP checks match the imported SHA-256 values. The real MCP upload regression
runs with one pass and zero skips. These remain engineering fixtures.
