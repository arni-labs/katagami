# Decisions

## Keep matched sources within a style

Decision: Both image models receive the same one or two new sources for a style.
Came up because: Rita requested fewer proofs and variation between art styles.
Options: Different subjects for each model; matched subjects within each style.
Chose matched subjects because it isolates differences in style transfer while
fresh subjects per style avoid the repetitive gallery.
Where: ArtStyle portability verifier and contributor instructions in this effort.

## Preserve provenance and scoring

Decision: Change proof cardinality and role coverage, retaining the existing
file-hash, prompt, source-identity and independent score checks.
Came up because: The eight-proof count is hard-coded across the submission path.
Options: Bypass finalization for this draft; update the shared contract.
Chose the shared contract because every new contributor needs the approved behavior.
Where: ArtStyle finalizer, MCP schema, specs and skills.

## Use supported publication namespaces

Decision: Use single-segment publication namespaces for design languages, palettes,
and art styles.
Came up because: The live local finalizer accepted valid proofs but publication
failed with HTTP 400 because the artifact API rejects slashes in namespaces.
Options: Change the application namespace values; weaken the artifact API validation.
Chose application values because the API intentionally validates object-key segments
and all three application callers shared the invalid format. Existing public URLs
remain immutable; this affects newly published artifacts.
Where: katagami-curation/wasm/finalize_spawned_session/src/lib.rs.

## Restore the finalizer-owned review boundary

Decision: Include AttachArtStyleReview and SubmitForReview in the existing
curator/pipeline-only ArtStyle action list.
Came up because: A real registered contributor credential could attach forged
review attestations in the local runtime with the production policy snapshot.
The contribution contract already reserves these actions to finalization.
Options: Accept the failing security check; restore the two missing restrictions.
Chose the restrictions because accepting contributor-supplied attestations as
verified contradicts the existing publication contract. The existing trusted
principal definitions and the remaining application policies are unchanged.
Where: katagami-commons/policies/art_style.cedar.

## Preserve old asset URLs while serving new namespaces

Decision: Add the three single-segment publication prefixes to the public asset
worker while retaining its existing prefixes.
Came up because: All three independent reviewers found that the API namespace
repair would create object keys the public worker rejects with 404.
Options: Revert to invalid API namespaces; accept both old and new public prefixes.
Chose both because new publication must satisfy the API and existing immutable
asset links must keep working. The worker still rejects unrelated storage paths.
Where: infra/cloudflare/katagami-assets-worker/src/index.js and index.test.mjs.

## Bind contributor ownership at draft creation

Decision: Create ArtStyle drafts with authenticated human attribution and require
Cedar to match creator_sub to the verified actingFor claim for contributor writes.
Came up because: The authenticated local MCP flow authored a draft then failed on
SetCreator, which is intentionally curator-only. The prior operator-driven proof
did not exercise this boundary.
Options: Permit contributor SetCreator calls; bind ownership when creating a draft.
Chose creation binding because it prevents attribution changes and editing another
human's draft while allowing the supported submission and remix paths to complete.
Where: mcp/src/tools.ts and both ArtStyle Cedar policy copies.

## Await accepted file transitions

Decision: Poll the File projection after upload and Lock using one bounded waiter.
Came up because: The live MCP returned import failure while all three exact Files
became Locked shortly afterward with correct bytes and digests.
Options: Read once; repeat Lock; await the already accepted transition.
Chose bounded observation because it handles asynchronous projection without
creating duplicate files or redispatching a successful mutation.
Where: mcp/src/temper.ts and mcp/src/tools.ts.

## Advertise the live contribution service

Decision: Use the verified Railway contribution origin as the default, derive
public discovery URLs from the configured OAuth resource, and expose proof import
in the CLI.
Came up because: mcp.katagami.ai has no DNS record; katagami.ai/mcp is a separate
read-only server. Login and whoami succeed at the deployed Railway contributor
service, but the CLI had no command for the mandatory image-import tool.
Options: Provision another domain; use the already deployed authenticated service.
Chose the existing service because it preserves the configured token audience and
avoids unnecessary infrastructure while making the supported workflow executable.
Where: CLI, MCP defaults, OAuth resource default, and contribution discovery routes.


### D6 — Queue verification through the submitted artifact's trigger

**Decision:** SubmitArtStyle creates a verification job through an engine-owned entity trigger.

**Came up because:** The real contributor JWT correctly received 403 when the MCP adapter tried to create CurationJobs, so successful authoring never reached verification.

**Options:** Grant contributors job powers; use an operator credential in MCP; or trigger the existing finalizer from the authorized artifact submission.

**Chose the trigger over the alternatives because:** It binds the job to the submitted artifact's engine-supplied identity and preserves the contributor boundary. The job records its ID on the submitted ArtStyle through a curator-only action. MCP reads that field before reporting VerificationQueued; it neither reads internal job collections nor chooses arbitrary privileged job types. The independent run confirmed that collection reads are also forbidden.

**Where:** katagami-commons/specs/art_style.ioa.toml, katagami-curation/specs/curation_job.ioa.toml, mcp/src/tools.ts; PR 317.


### D7 — Preserve File metadata at the upload boundary

**Decision:** Send File creation properties at the OData top level, with a canonical contribution path.

**Came up because:** A real contributor submission published successfully but its gallery images returned 404. The MCP sent Name, Path and MimeType inside an unsupported fields wrapper; the kernel stored bytes but omitted Path. The gallery correctly refused a pathless File.

**Options:** Relax the gallery visibility policy; manually repair individual images; or correct the shared upload request for every contribution lane.

**Chose the request correction because:** It preserves the existing file visibility boundary and prevents new uploads from losing their metadata. The local storage test sink also now preserves bytes instead of returning a false success for discarded content.

**Where:** mcp/src/temper.ts, katagami-curation/tests/e2e/blob_sink.py; PR 317.

## Retain existing CLI credential locations

Decision: Prefer an existing XDG credential file, retain an existing legacy login
when the XDG file is absent, and clear both locations on logout.
Came up because: Honoring XDG without checking the previous location stranded
users who had signed in with the earlier CLI.
Options: Force a fresh login; migrate credentials on every read; retain the
existing location until explicit logout.
Chose retention because it preserves working logins without copying credentials
or adding a migration lifecycle. New logins use the configured XDG directory.
Where: cli/src/cli.ts credential path selection and logout.
