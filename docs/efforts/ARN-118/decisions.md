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

## D16 Deploy the Draft-only slice and remove the publication lifecycle

Decision: Delete Publish, RecordReview, RequestChanges, Revise, the review states, the review fields, and the review half of the validator from this deployment, leaving Draft, ValidatingDocument, and Archived.

Came up because: Three review rounds each found defects, and all of them lived in the review and publication machinery. The convergence rule treats a fourth repair round as a signal that the design is carrying too much, not that the next patch will land. Batch B2 authorizes private Draft cells with names and scopes; it authorizes no review, no publication, and no enrichment. The publication half was therefore unapproved code that generated every remaining finding.

Options: Repair the publication lifecycle for a fourth round and deploy it unused, deploy it behind a policy that forbids the publication actions, or remove it from this deployment and reintroduce it with the approval that authorizes publication.

Chose removal because: A Published state asserts that a curator reviewed the content, and nothing in this delivery performs that review, so shipping the state at all misstates what the records are. Removal also deletes the surface the findings live on rather than defending it. The domain model is unchanged: cells, their documents, manifestations, and studies are defined by the document contract, which is untouched. Reintroducing publication is a specification change, a policy change, and its own review round, which is the correct cost for an unapproved capability. A contract test fails if the surface returns without that approval.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`; `katagami-commons/specs/model.csdl.xml`; `katagami-commons/policies/encyclopedia_cell.cedar`; `katagami-commons/wasm/validate_encyclopedia_cell/src/lib.rs`; `ui/scripts/encyclopedia.test.mjs`, "the deployed cell carries no review or publication surface".

## D17 Close the cell's authorization instead of narrowing a blanket grant

Decision: Replace `permit(principal, action, resource is EncyclopediaCell)` with a permit that enumerates the eight actions this deployment uses, keeping the existing forbids behind it.

Came up because: The reported publication bypass reached the runtime through an action the policy had never considered. A blanket permit narrowed by forbid rules is open by default, so any action absent from a forbid list is allowed, including one added to the specification later without a policy decision.

Options: Keep the house blanket-permit shape and add the missing actions to the forbid lists, or enumerate the permitted actions and rely on Cedar's default deny.

Chose enumeration because: An unanticipated action then fails closed rather than open, and a specification change cannot quietly widen the deployed surface. A contract test asserts the permit list and the declared actions stay in step, so adding an action without a policy decision fails before deployment. This is stricter than the other commons entities, not a weakening of the shared pattern.

Where: `katagami-commons/policies/encyclopedia_cell.cedar`; `ui/scripts/encyclopedia.test.mjs`, "cell authorization is a closed allow-list, not a blanket grant".

## D18 Close the undeclared-parameter merge in the specification, and report the runtime defect

Decision: Make every action an external principal may invoke clear `document_validated`, report the parameter overwrite as a Temper runtime defect, and claim no application fix for the merge itself.

Came up because: The reported bypass was attributed to Publish accepting a `document` parameter. A direct probe showed the cause is general: any action persists a submitted string parameter whose name matches a field, including an action that declares no parameters at all. Cedar never sees action parameters, so no policy can filter them, and the specification's `params` list is not what the runtime enforces. Root cause is `crates/temper-server/src/entity_actor/effects.rs:894-928`, `sync_fields_with_metadata`, which never receives the action name.

Options: Rename fields to obscure them, treat the stored hash as tamper evidence, delay the delivery until the runtime is fixed, or remove every path that could leave injected content marked validated.

Chose clearing the gate everywhere because: The stored hash is not evidence. `document_hash` is a string field and travels the same merge path, so a caller that sets document and hash together leaves a self-consistent record whose content never reached the validator; the first version of this decision claimed otherwise and was wrong. Declared booleans and counters, by contrast, are written only by specification effects, and the runtime writes typed state over merged parameters. `Define`, `SubmitForValidation`, and `ValidationFailed` already cleared the gate; `Archive` did not, which made it the one action that could accept an injected document and leave it marked validated. Adding the same effect to `Archive` closes that, and the harness now asserts the property for every externally invocable action rather than for the instances found. What remains is that such a principal can replace stored bytes through an action other than `Define`, which is a defect the kernel must fix: the declared parameter list should bound what an action may write.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, Archive; `scripts/verify-encyclopedia.mjs`, the undeclared-parameter section, whose assertions record today's runtime behaviour and fail when the runtime is corrected. Reproduction and root cause are kept outside the repository.

## D19 Give an interrupted validation an exit

Decision: Add AbandonValidation from ValidatingDocument to Draft, and allow Archive from ValidatingDocument.

Came up because: Review reported that a cell in a validating state had no permitted retry, recovery, or archive operation, and the earlier evidence did not establish what happens after an interrupted validation or a restart.

Options: Rely on the trigger timeout, add a scheduled sweep, or declare an explicit recovery transition.

Chose the explicit transition because: A timeout that never fires, because the process restarted between dispatch and callback, leaves the record stranded with no operation available. The recovery asserts nothing about the document; it returns the cell to Draft with its validation gate cleared. The harness proves it by racing the recovery against a live validation until one lands while the cell is still validating.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, AbandonValidation and Archive; `scripts/verify-encyclopedia.mjs`, `recoverDuringValidation`.

## D20 Prove the non-curator denial with a real credential

Decision: Mint one contributor AgentCredential inside the disposable fixture's setup window and test the denial with that credential.

Came up because: The privacy evidence gap was that no test used a legitimate authenticated identity that is not a curator. Sending identity headers proves nothing: the runtime strips inbound `x-temper-principal-*` headers before authorization, so a header-only identity silently resolves to the operator key instead.

Options: Send identity headers, extend the commons policy to grant credential management, or issue one credential during the fixture's existing setup grants.

Chose the fixture credential because: The commons policy denies credential management to everyone in production, and the fixture already has a documented, user-authorized setup window that the harness replaces with the exact commons policy before any test runs. The denial is then evaluated on a principal the resolver actually resolves to `agent_type` "contributor".

Where: `scripts/verify-encyclopedia.mjs`, contributor registration and the non-curator checks; the fixture's `local_test_install.cedar`, which stays outside the repository.

## D21 Permit enumeration explicitly

Decision: Add `Action::"list"` to the cell's permit and to the curator-only forbid.

Came up because: The closed allow-list denied collection reads to everyone, including curators, because OData authorizes enumeration as its own `list` action (`crates/temper-server/src/odata/authz.rs:17`) rather than as `read`. The live fixture returned 403 for a curator listing cells, a capability the previous blanket permit allowed.

Options: Return to a blanket permit, leave enumeration denied, or name `list` in both rules.

Chose naming it because: Losing enumeration would remove a capability that worked, and returning to a blanket permit would undo the reason for the change. The harness now checks both halves: a curator can list, a contributor cannot. This is the failure mode a closed allow-list is meant to produce, caught by the live run rather than in production.

Where: `katagami-commons/policies/encyclopedia_cell.cedar`; `scripts/verify-encyclopedia.mjs`, the non-curator section.

## D22 Answer the review findings the harness could not see

Decision: Widen the removed-surface test to every removed identifier, require exactly one permit in the policy file, prove the contributor denial against a 401 baseline and across every action, and align the effort specification with the deployed lifecycle.

Came up because: The independent review found that each of these checks passed for the wrong reason. The removed-surface test banned six identifiers but not `Revise`, `UnderReview`, `ValidatingReview`, `review_document_hash`, or `review_findings`, so most of the deleted machine could return without failing it. The closed-list test read only the text before the first `forbid(`, so a second blanket permit after it would pass. The contributor test accepted 403 or an empty 200 for a collection read, which was indistinguishable from `list` being denied to everyone, and it never established that an unresolvable bearer returns 401 rather than 403. The effort specification still described the review and publication lifecycle as the contract.

Options: Record the findings as accepted risk, or make each check discriminate.

Chose making them discriminate because: A test that cannot fail is worse than no test, since it reports coverage it does not have. The 401 baseline is what turns "contributor got 403" into evidence that the credential resolved and Cedar refused the principal it resolved to.

Where: `ui/scripts/encyclopedia.test.mjs`; `scripts/verify-encyclopedia.mjs`, the non-curator section; `docs/efforts/ARN-118/spec.md`, Cell lifecycle.

## D23 Keep validation recovery explicit rather than adding a timer

Decision: Leave AbandonValidation and Archive as the recovery path, document that recovery is deliberate, and add no scheduled sweep.

Came up because: Review pointed out that a cell can still sit in ValidatingDocument indefinitely if the process dies between dispatching the validator and its callback, since `allow_indefinite_states` includes that state and the recovery actions are manual.

Options: Add a `schedule` effect that fires AbandonValidation, declare a `[[state_timeout]]`, or keep recovery explicit and make the strand visible.

Chose explicit recovery because: Neither mechanism is durable in this runtime. `schedule` and `schedule_at` are an in-memory `tokio::spawn` with a `sleep` and are lost on restart, with no replay hook. A `[[state_timeout]]` is re-armed from the event log but only during the next dispatch to that same entity, which a stranded cell never receives, and there is no background sweeper. The trigger's `timeout_secs` is the WASM invocation deadline, so a validator that hangs while the server runs already fails through it and returns the cell to Draft. Adding a timer would therefore add machinery that does not cover the one case it is meant for. The strand is instead made visible: the creation script waits for a validated Draft and reports any cell that never arrives, and a curator recovers it with one call.

Where: `katagami-commons/specs/encyclopedia_cell.ioa.toml`, AbandonValidation and Archive; `scripts/create-encyclopedia-cells.mjs`, the readback; `.agents/skills/verify-katagami/features/encyclopedia-cells.md`.

## D24 Treat the validated hash and the gate as one attestation

Decision: Define a validated cell as one whose gate is true and whose stored document hashes to `document_hash`, check that pair on every read, and report the unbound callback as a runtime gap.

Came up because: An independent review predicted, and a direct probe then reproduced, that an abandoned validation run keeps executing and its callback becomes valid again as soon as the cell re-enters ValidatingDocument. The run reports the hash of the document it read. The observed result was a cell holding `{}`, an invalid document, with `document_validated` true and `document_hash` naming the abandoned document.

Options: Remove AbandonValidation so a run can never be orphaned, bind the callback to its run, or define the attestation as the pair and check it.

Chose the pair because: Binding a callback to its run is not expressible here. Guards compare a state variable against a literal; there is no comparison between an action parameter and stored state, so nothing in the specification can reject a callback from an earlier run. Removing AbandonValidation would close the window but leave a cell stranded by a server restart with no way back, and Archived is final, so its identifier could never be reused. The pair is sound in a way the gate alone is not: only the runtime may dispatch the callback, and every action an external principal may invoke clears the gate, so a true gate whose hash matches the stored bytes can only come from a run over exactly those bytes. The harness reproduces the race and asserts the pair rejects the cell; the creation readback checks it for every approved record.

Where: `scripts/verify-encyclopedia.mjs`, the stale-callback section and `attested`; `scripts/create-encyclopedia-cells.mjs`, the readback; `.agents/skills/verify-katagami/features/encyclopedia-cells.md`.
