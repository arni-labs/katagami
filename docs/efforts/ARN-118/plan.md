# Build the manifestation encyclopedia maps

## Objective

Deliver populated, browsable maps for art, writing, palettes, and design languages, with recursive cells, representative work, sources, review, and comparisons. Preserve the existing collections and their navigation.

## Implementation

1. Check Genesis against the GitHub mirror before changing app files. Preserve Genesis-side changes and the existing visitor-access rules.
2. Inventory art and writing through all continuation pages, preserving identifiers and review statuses. Prepare a private mapping proposal with current clusters, uncertain placements, and gaps. Check existing unfinished work before proposing additions. Present the proposed cells and placements in a fixed-number batch, then wait for the user's selections before adding them.
3. Correct the cell document and its valid and invalid fixtures. Separate typed manifestation references from direct studies and source examples. Include nesting, multiple broader cells, cross-links, independent development by medium, and rights evidence. Ordinary description embeddings must not imply a validated style distance.
4. Add the numbered approval workflow and align it with the Temper cell lifecycle, document validation, and publication policies. Bind each decision to exact operations and a proposal revision. Test partial selections, changed proposals, rejected dependencies, repeated approvals, and attempts to bypass review through generic writes. Approval to generate must not approve publication of its results.
5. Add cell reads and graph traversal. Keep drafts private, respect visibility of linked Katagami works, preserve disconnected entries, and report graph conflicts.
6. Build the four map views, cell pages, and comparisons in the existing interface. Compare a nested browsing layout with a node-link overview before choosing the initial interaction. Keep representative examples free of interface styling effects.
7. Research and populate approved art and English writing proposals through the cell workflow, then palettes and design languages. Check individual source rights and inspect examples before publication. Request further numbered approvals for generated enrichment, new manifestations, and publication. Do not treat the earlier seed list as rights evidence or force its categories into the new map.
8. Run the complete local workflow against the real policies and source material. Inspect desktop and mobile views, revisions, review, source links, and example rendering.
9. Complete the required independent reviews and fix their findings. Merge the reviewed PR, publish app changes to Genesis, deploy, and verify the installed versions and live experience.

Each step must leave a testable result. Record deviations and technical decisions in [the decision log](decisions.md) when they occur.

## Current checkpoint

The user approved all 20 cells in batch B2 and requested their creation in the existing TemperPaw deployment. Deliver that approved part now: verify cell storage locally, install the cell specification into Katagami commons on TemperPaw, create the 20 private Draft records with their approved names and scopes, and read them back. Do not wait for map views or add relationships, existing manifestations, examples, or generated enrichment without a further numbered approval. Proposal files and local test records do not count as created encyclopedia cells.

The document contract, validator, and shared fixtures now separate manifestations from studies. The local upload denial was traced to a server started without authentication; an explicitly approved restart configured a test-only key on the isolated instance.

Three review rounds each returned findings, and every remaining one lived in the review and publication machinery that batch B2 does not use. Rather than a fourth repair round on unapproved code, that machinery is removed from this deployment: the lifecycle is Draft, ValidatingDocument, and Archived, the review fields and the review half of the validator are gone, and a contract test fails if the surface returns without the approval that authorizes publishing. Authorization became a closed allow-list so an action reaching the runtime without a policy decision fails closed. Interrupted validation gained an explicit exit. The non-curator denial is now proved with a credential the identity resolver actually resolves, because the runtime strips inbound identity headers.

The reported publication bypass turned out to be general and to belong to the runtime: any action persists a submitted string parameter whose name matches a field, including an action declaring no parameters. Cedar cannot see parameters, so the app cannot filter them. What the deployment relies on instead is verified: declared booleans and counters are written only by specification effects, only principals already permitted to call Define can reach any action, and the validated hash stored beside the document makes a replaced document detectable. That defect is reported against the runtime and is not claimed as fixed here.

The full local lifecycle passes on a fresh isolated fixture under the exact commons policies: Draft create, Define, retry, authenticated access, denied contributor access, blocked public callbacks, WASM validation with matching hashes, absent publication actions, blocked generic writes, interrupted-validation recovery, archival, malformed-document rejection and error clearing, and a document blob over 128 KiB. The UI suite passes with 44 encyclopedia and inventory tests; TypeScript, five Rust tests, formatting, native clippy, WASI-target clippy, and the packaged WASI build pass. Independent reviews on this corrected candidate are still required. No B2 production cells exist yet. Public map pages remain part of the broader effort.

Deployment is also awaiting an explicit workflow choice. The deployed Effort merge action only configures a container deployment, while this app change needs the documented Genesis hot-install route. The existing Open Ask requests approval for that app-only route after checks pass. Do not fabricate a container image or redeploy the server to satisfy the factory fields.

## Completion evidence

The effort report must link the PR, commits, installed app revisions, deployed encyclopedia, local and live test results, and unresolved source limitations. Keep proof and review evidence outside the repository. Do not report the collection as deployed before opening and checking the deployed pages.
