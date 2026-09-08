# Decisions and tradeoffs

## D1 Keep encyclopedia cells separate from gallery taxonomy

Decision: Add independent encyclopedia cells and preserve the existing gallery taxonomy.

Came up because: The current organizer requires a two-level tree and assigns languages only to leaves. The user requires recursive cells with manifestations at any level.

Options: Extend the existing taxonomy and rewrite its organizer, store the encyclopedia in one replacement document, or add independently readable cells linked to existing works and sources.

Chose independent cells because: The encyclopedia can expand without restructuring the gallery or replacing the full collection on each edit. This adds a record type and requires consistency checks across cells during review and browsing.

Where: `docs/efforts/ARN-118/spec.md`, Records. The conflicting organizer is `katagami-curation/agents/curator/skills/organize-taxonomy/SKILL.md`.

## D2 Exempt representative examples from interface styling

Decision: Apply Katagami's interface rules to navigation and explanation, while preserving each example's own visual treatment.

Came up because: The project rules otherwise impose three accents, no gradients, and other house preferences on examples that may require different palettes or techniques. The user explicitly approved the exception on 7 September 2026.

Options: Restyle examples to the house rules, or isolate example rendering from the surrounding interface.

Chose isolated example rendering because: Readers need faithful examples for comparison and reuse. The checks must include page-wide grain, cropping, and other effects that could alter the example.

Where: `docs/efforts/ARN-118/spec.md`, Examples and source restrictions.

## D3 Validator callbacks

Decision: Give document validation and review validation distinct lifecycle states.

Came up because: The local verifier rejects the `is_false` guard used to route document and review callbacks through `Validating`.

Options: Add another boolean to select a phase, or represent the two phases as separate states.

Chose separate states because: Each callback is permitted only during its matching validation phase. The two phases replace `Validating` with `ValidatingDocument` and `ValidatingReview`, without weakening the publication requirements. Both failures return to Draft and clear the gates. A rejected review therefore requires document revalidation; this keeps one fail-closed recovery path instead of adding a separate recovery action.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, ValidatingDocument and ValidatingReview.

## D4 Use a nested browser for the main navigation

Decision: Show examples alongside narrower cells and separately labeled related cells, with linked pages for inspection and comparison.

Came up because: The encyclopedia needs to show nested cells and their representative work together.

Options: A nested browser with examples, or an all-connections node-link map with a separate inspection area.

Chose the nested browser because: In browser sketches at desktop and 390 px widths, it kept the examples readable alongside narrower cells and cross-links. The desktop node-link sketch showed shared ancestry more directly but required a separate area for examples. The mobile node-link comparison remains unverified because the browser connection failed during the recheck.

Where: `docs/efforts/ARN-118/spec.md`, Reader experience. The application pages have not been implemented yet.

## D5 Separate manifestations from direct studies

Decision: Reference reusable ArtStyle, WritingStyle, PaletteSystem, and DesignLanguage records as manifestations, and attach studies or source examples directly to cells.

Came up because: The earlier draft treated manifestations as sample works. The user clarified that an art style can itself be a manifestation and that a cell can have generated examples without a reusable style.

Options: Keep specimen records inside the manifestations field, duplicate typed styles into cells, or separate typed references from direct studies.

Chose separate references and studies because: A cell can contain several kinds of reusable language and independent examples without creating extra style records. The document contract and validator use this distinction; future readers must preserve it.

Where: `docs/efforts/ARN-118/spec.md`, Records and Development and distance; `ui/src/lib/encyclopedia-schema.ts`; `katagami-commons/wasm/validate_encyclopedia_cell/src/document.rs`; shared test fixtures.

## D6 Obtain scoped decisions in numbered batches

Decision: Require the user's selection of numbered, revision-specific proposals before agents add cells, enrichment, or manifestations.

Came up because: The user approved starting the map and inventory and wants to select several numbered proposals in one reply.

Options: Treat the collection plan as continuing permission, ask separately for every operation, or present selectable numbered batches.

Chose numbered batches because: The user can approve several proposals in one response while limiting execution to the displayed operations. This requires fixed numbers, proposal revisions, explicit dependencies, and separate result review after generation.

Where: `docs/efforts/ARN-118/spec.md`, Numbered proposal batches. Batch execution is not implemented or deployed.

## D7 Inventory before commissioning additions

Decision: Compare published availability with unfinished and archived records before proposing breadth or depth work, and use English writing examples only.

Came up because: The user identified dense art-style clusters, does not know the writing inventory, and wants grounded additions instead of arbitrary new names.

Options: Generate missing-looking categories from a preset taxonomy, count published records only, or inspect the complete collection and propose evidence-backed gaps.

Chose the complete inventory because: Unfinished records may already cover an apparent gap, and similar descriptions need comparison before merging. The first pass records the inventory and obtains approval before generation. English-only is the approved writing-collection scope, not a universal restriction on text representations in art traditions. The current B2 operation creates no studies or writing-style manifestations. Future writing proposals must check their actual language during review, not trust a language tag as proof.

Where: `docs/efforts/ARN-118/spec.md`, Inventory and expansion, and `docs/efforts/ARN-118/plan.md`, step 2. Per-record draft material remains in private working evidence.

## D8 Create the approved cells in TemperPaw

Decision: Create all 20 cells approved in batch B2 as Draft EncyclopediaCell records in the existing TemperPaw production deployment, tenant default.

Came up because: The user approved all of B2, asked for actual cells, and clarified that the encyclopedia must be in the TemperPaw deployment.

Options: Wait for all map views and enrichment tools, retain proposal files only, or install cell support and create the approved records now.

Chose deployed Draft records because: The user can start the encyclopedia before its entries have examples, manifestations, or relationships. The existing Katagami commons app on TemperPaw remains the storage system. Local records are synthetic verification data only. Creating these records does not complete the broader map effort or authorize enrichment or publication.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, `scripts/verify-encyclopedia.mjs`, and the private approval source `/private/tmp/encyclopedia-inventory.2xasm8/batch-B2-proposal.md`. The execution copy is `/private/tmp/encyclopedia-b2.hWoBq9/approved-b2.json`. Execution must preserve the 20 approved names and scopes, use stable record identifiers, and read each record back from production.

## D9 Permit unenriched cells

Decision: Allow an empty source list and an empty description in the cell format while retaining evidence requirements on individual relationships and manifestations.

Came up because: A cell can start with a name or a name and scope before anyone researches or enriches it.

Options: Invent source evidence, require enrichment before creating a cell, or permit empty enrichment fields.

Chose empty enrichment fields because: They record the actual development of the entry. Format validation does not approve historical claims or publication.

Where: `ui/src/lib/encyclopedia-schema.ts`, `katagami-commons/wasm/validate_encyclopedia_cell/src/document.rs`, and the shared fixtures and tests.

## D10 Authenticate the isolated local verifier

Decision: Start the isolated local test server with a test-only API key, using the documented authentication middleware.

Came up because: The previous server had no configured API key and did not authenticate the credential sent by the test harness, so validator upload was denied.

Options: Change Cedar policies, inject an identity header, or configure authentication on the isolated test server.

Chose configured test authentication because: It exercises the real authenticated path without modifying production credentials or Cedar policies. The restart was submitted for explicit execution approval. The test database is isolated under a private temporary directory.

Where: `scripts/verify-encyclopedia.mjs`; local verification evidence for ARN-118.

## D11 Separate test installation from cell authorization

Decision: Give a disposable localhost fixture narrowly scoped installation permissions, then replace them with the exact commons app policies before testing cell operations.

Came up because: The current runtime separately authorizes spec installation, validator upload, and policy management. Loading app policies first removes those setup permissions. The user explicitly approved repairing this isolated test setup.

Options: Broaden the deployed app policy, self-approve denied requests, or configure an isolated fixture with temporary setup grants.

Chose temporary fixture grants because: The production policy remains unchanged and the lifecycle runs under the actual app restrictions. Only the cell specification is resubmitted after startup; re-verifying unrelated commons entities had delayed the test and replaced the metadata during initialization. Readback waits for the exact expected state and fields because the persisted projection is asynchronous.

Where: `scripts/verify-encyclopedia.mjs`; private test configuration `/private/tmp/encyclopedia-b2.hWoBq9/test-specs/policies/local_test_install.cedar`.

## D12 Archive unwanted Drafts

Decision: Allow Archive from Draft and UnderReview as well as Published, while retaining the generic update and delete forbids.

Came up because: Review identified that an accidentally duplicated or unwanted Draft otherwise had no removal path from the active collection.

Options: Permit destructive generic deletion, retain unremovable Drafts, or allow lifecycle archival.

Chose archival because: It preserves the cell's identity and history and keeps edits governed by declared actions. Archived remains final.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, Archive; `scripts/verify-encyclopedia.mjs`, Draft and UnderReview archival checks.

## D13 Remove the unwired public reader

Decision: Remove the server loader, OData list function, graph traversal, and public projection helpers that had no consuming page.

Came up because: Review found latent pagination and owner-access errors in code unused by the approved Draft-cell delivery. A subsequent review identified the remaining graph and projection helpers as unused outside tests.

Options: Expand this delivery into public map pages, retain test-only reader modules, or remove the unused reader while retaining the shared document contract and validator tests.

Chose removal because: The immediate delivery creates private records in TemperPaw. The broader map objective remains in the plan; its reader must be implemented and tested with those pages.

Where: Removed `ui/src/lib/encyclopedia.ts`, `ui/src/lib/encyclopedia-graph.ts`, `ui/src/lib/encyclopedia-public.ts`, and `listEncyclopediaRows` from `ui/src/lib/odata.ts`. Raw OData records remain private because they contain review evidence. Publication does not grant raw-row access.

## D14 Match the runtime trigger contract

Decision: Place timeout_secs in each trigger's config table and test background and inline validation against the actual runtime.

Came up because: Review found the timeout at the trigger root, which the runtime ignores, and questioned whether inline integration dispatch could complete validation.

Options: Alter callback permissions, rely on the runtime's default timeout, or correct the config and test both dispatch paths without changing permissions.

Chose config correction and live tests because: The independent inline probe completed document and review validation with matching hashes under the unchanged commons policy. Runtime source confirms inline callbacks use internal dispatch. The timeout belongs in config; a regression test now checks that location. Public attempts to supply either callback remain forbidden in both modes.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`; `scripts/verify-encyclopedia.mjs`; `ui/scripts/encyclopedia.test.mjs`. Independent probe evidence remains outside the repository.

## D15 Validate the current request and resolve stored fields

Decision: Require an explicitly submitted review on each RecordReview action, resolve document and review fields through the existing SDK, and clear the current error after successful validation.

Came up because: Independent live probes reproduced three failures: an empty request reused a previous version's review, valid documents over 128 KiB failed when stored as blobs, and corrected documents retained old validation errors. The new regression harness failed against the preceding candidate before these fixes.

Options: Clear historical fields during revision, cap documents below the blob threshold, or check current action parameters and use the runtime's existing field reader.

Chose the current-request check and SDK reader because: They require fresh review submission without deleting history and preserve support for documents up to the declared 2 MB limit. The live regression also established that deferred blobs retain the original field's JSON string encoding, while inline fields are already unquoted. The app decodes that declared blob encoding at its input boundary; it does not change the runtime or SDK. No permission or lifecycle-state change is needed. Successful callbacks explicitly set an empty error. The TypeScript fixture validator now checks canonical JSON UTF-8 size as well; the server remains authoritative for raw input size, including whitespace.

Where: `katagami-commons/wasm/validate_encyclopedia_cell/src/lib.rs`; `katagami-commons/specs/encyclopedia_cell.ioa.toml`; `ui/src/lib/encyclopedia-schema.ts`; `scripts/verify-encyclopedia.mjs`; `ui/scripts/encyclopedia.test.mjs`.
