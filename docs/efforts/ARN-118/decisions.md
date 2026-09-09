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

Decision: Replace `permit(principal, action, resource is EncyclopediaCell)` with a permit that enumerates the actions this deployment uses, keeping the existing forbids behind it.

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


## D25 Make the creation script survive its own failure modes

Decision: Check the payload against an operator-supplied count and its stated operation, attempt every cell instead of aborting the batch, recover a cell left mid-validation before rewriting it, refuse an identifier already holding a different cell, and treat a cell as settled only when it is attested.

Came up because: The second review round found the script fragile in ways that only appear on a rerun. `Define` is valid only from Draft, so a cell left in ValidatingDocument by an interrupted run failed and aborted every remaining cell. The skip test used the gate rather than the attestation, so a cell carrying a stale hash was skipped forever and failed the readback on every rerun. The payload's own `allowedOperation` was printed and never checked, and nothing checked how many cells the file held. Two approved names can slug to one identifier, and the collision check only looked inside the payload, so an already-deployed cell could be overwritten.

Options: Document the constraints as operator procedure, or make the script enforce them.

Chose enforcement because: This script writes production records from a file, and a rerun after a partial failure is the expected case, not the exception. `--expect <n>` makes the count an explicit confirmation rather than whatever the file happens to contain, and the `allowedOperation` check refuses a payload authorizing anything but writing private Drafts (creation at first; since D27, full approved documents).

Where: `scripts/create-encyclopedia-cells.mjs`.


## D26 Assert the stale-callback race instead of logging it

Decision: Require the race to reproduce, so the test fails when it no longer does.

Came up because: The regression logged whether it reproduced and passed either way. A runtime fix that bound callbacks to their run would have produced the same silent pass as a run where the race simply did not land.

Options: Leave it as a log line, or make it a tripwire.

Chose the tripwire because: The assertions that matter live inside the reproduction, so a run that does not reproduce proves nothing. Failing loudly is the signal to tighten the test against a corrected runtime, the same shape as the assertion that the injected document is still merged.

Where: `scripts/verify-encyclopedia.mjs`, the stale-callback section.


## D27 A cell must say where it came from

Decision: Bump the cell document contract to version 2 with a provenance rule, enforced identically in the TypeScript schema and the WASM validator: `provenance.basis` is `cited` (at least one source, and no note required) or `recollected` (a note saying the model wrote it from training data and no reference was located, and no sources); a `generated` study names `generatedBy`, and no other study does. JSON `null` is rejected for both optional fields on both sides.

Came up because: Rita asked, on 2026-09-08, for every cell to cite something a reader can learn from, and where nothing exists, to say plainly that the model recollected it; and for every example, text or image, to say whether it is real with a link or AI-generated. Version 1 allowed a cell with no source and no statement at all.

Options: Leave provenance as convention in the skill, add an optional field, or make it mandatory and version the contract.

Chose a mandatory field and a version bump because: A reader's trust depends on this, and a convention is exactly what a busy agent drops. Versioning is honest about the break: the 20 production cells are version 1 and stop re-validating once the new module is installed, so the module and the migration batch (B3) deploy in one sequence, with B3 re-defining every cell. The apply script no longer invents a provenance when a payload omits one; stating it is content the human approves.

Where: `ui/src/lib/encyclopedia-schema.ts`; `katagami-commons/wasm/validate_encyclopedia_cell/src/document.rs`; fixtures; `scripts/create-encyclopedia-cells.mjs`; `.agents/skills/encyclopedia/SKILL.md`, Provenance.


## D28 Preflight proves the claim, not only the pointer

Decision: Before writing, the apply script checks that each manifestation's quoted credit is actually declared in that record's `credits`, that each source stays on its host and mentions its subject, and that a child cell is written only after its broader cell; a human may vouch for a page a script cannot reach, and the run records that.

Came up because: Review showed the first preflight proved only that a row existed and a URL returned 200 — a soft-404, an off-site redirect, or any existing record attached to any cell would have passed, and a batch failure could leave a child attested pointing at a parent that was never written.

Options: Accept existence checks as sufficient, attempt to judge citation quality, or check the specific claim each link makes.

Chose checking the specific claim because: The explanation says which credit the record declares; that is mechanically verifiable and is the whole basis for the link. Judging whether a page is a *good* reference is not mechanical and would become a rabbit hole; whether it stays on its host and mentions its subject is. Museum sites that refuse scripts are cited only when a named human opened them on a named date.

Where: `scripts/create-encyclopedia-cells.mjs`, `sourceAnswers`, `declaredCredit`, write ordering.


## D29 The preflight proves existence and order; relevance is the approval

Decision: Remove the two relevance heuristics added after round one — "the page mentions its subject" and "the record's quoted credit matches" — and keep the preflight to what it can prove: every linked record exists, every unverified source answers on its own host, broader cells are written and attested before their children, and a source a named human opened is recorded as such on the record.

Came up because: Round two showed both heuristics could be satisfied by a wrong page or a wrong record, and could be tightened only by inventing a judgement the script has no basis for. Rita had asked that the review not become a rabbit hole. Whether a record truly expresses a cell, or a page is a good reference, is exactly what the human's numbered approval decides; a script that pretends to check it invites trust it cannot earn.

Options: Add a third, stricter heuristic; keep the weak ones as "better than nothing"; or delete them and state the boundary.

Chose deletion because: A check that can be passed by the wrong thing is worse than no check, since it reports coverage it does not have. The boundary is now written where an agent reads it: the preflight guards against dead links and wrong order, and the approval guards against wrong content. Alongside: a Create batch can resume an interrupted run (a cell holding exactly this document is a resume, not a conflict), a child is written only after its parent has attested rather than after the parent's request returned, the two validators share one explicit definition of blank (JavaScript's and Rust's trim() disagree on U+0085 and U+FEFF), and `verifiedOn` must be a real calendar date.

Where: `scripts/create-encyclopedia-cells.mjs`; `ui/src/lib/encyclopedia-schema.ts`; `katagami-commons/wasm/validate_encyclopedia_cell/src/document.rs`; `.agents/skills/encyclopedia/SKILL.md`.


## D30 What the apply script does about a partner that failed

Decision: When a cell in a batch fails to write, cells that relate to it are still written, the readback names the failed partner as a problem on each of them, the run exits non-zero, and the rerun repairs the gap. The batch is not made a Temper entity.

Came up because: Review kept returning to two objections. First, that an attested cell can be left relating to a partner that failed later in the same run. Second, from Greptile, that the script orchestrates a batch imperatively where the repository prefers entities with state machines.

Options: Roll back or rewrite the surviving cell, order relations, make the batch an entity, or report and rerun.

Chose report and rerun because: Relations are symmetric, so no write order removes the window. Rolling back means archiving, which is final and would destroy an approved cell over a transient failure; rewriting means altering approved content. What is left is to say exactly what happened, which the readback does, and to make the rerun idempotent, which it is. A batch entity would be a state machine for a curator's one-off script over a few dozen cells — machinery that looks architectural and does the same thing more slowly. Redirects, meanwhile, are now followed hop by hop, and every hop must be public HTTPS on the original host with no private, loopback or link-local address.

Where: `scripts/create-encyclopedia-cells.mjs`, the write loop, readback, `publicHost`; `.agents/skills/encyclopedia/SKILL.md`, which now sends enrichment through the script rather than direct actions.


## D31 The recollection note is a fixed sentence, and free text after it is the human's to read

Decision: A recollected cell's note must begin with the complete sentence "Written from model training data; no external reference was located". Anything after it is free text that no validator judges.

Came up because: Review escalated from "the note can say anything" to "the fixed prefix can be followed by a contradiction". The first was a defect and is fixed. The second cannot be fixed by a validator: no check on a string can stop free text from contradicting itself, and a longer fixed sentence only moves the contradiction further right.

Options: Keep extending the fixed text, forbid free text entirely, or fix the full sentence and state the boundary.

Chose the full sentence with the boundary stated because: The purpose of the rule is that every reader sees the same plain statement on every recollected cell, in front, where it cannot be hidden. That is achieved. What follows — which sources were tried, what remains uncertain — is content, and content is what the human's numbered approval reads. Forbidding the free text would remove the one place an agent records why no source was found.

Where: `ui/src/lib/encyclopedia-schema.ts`; `katagami-commons/wasm/validate_encyclopedia_cell/src/document.rs`; tests on both sides, including one that asserts free text after the sentence is accepted by design.


## D32 The apply script is a loader

Decision: The apply script writes an approved batch and reads it back. It guarantees that every linked record exists, every unverified source answers on its own host, and parents are written before children. It does not judge whether a record expresses a cell or whether a page is a good reference, and it does not undo a partial batch.

Came up because: Three review rounds and a synthesis kept asking the script to be smarter — to judge relevance, to roll back, to become a Temper entity. The arbiter assessment named this a rabbit hole. Rita, asked to choose between a loader and a judge, chose the loader and called the alternative "way too much."

Options: A loader that checks what is mechanically checkable, or a script that also tries to decide what is true.

Chose the loader because: Truth about a cell is decided when a human approves it by number; a script that pretends otherwise invites trust it cannot earn and grows a new surface with every round. An agent could call the API directly instead, but then every agent re-implements the boring step — did it land, is it attested, do not overwrite the wrong cell — and the script is the one tested way to do it.

Where: `scripts/create-encyclopedia-cells.mjs`; D29, D30, D31; arbiter assessment kept outside the repository.


## D33 A map membership is a cited claim

Decision: Contract version 3. `maps` entries are `{map, explanation, sourceIds}` rather than bare map names. On a cited cell each membership cites a source; on a recollected cell the placement is recollected too, so the explanation is required and a citation cannot exist.

Came up because: The cross-modal research found the failure mode this prevents in a real, professionally curated vocabulary: the Library of Congress carries "Gothic fiction", "Gothic poetry" and "Gothic rock music" as three unrelated terms with near-identical scope notes, because medium was a parent and the direction was minted once per medium. Katagami's `maps`-as-role structure avoids that, but `maps` was the one link on a cell that carried no explanation and no source, so a cell could be placed on the writing map by its name alone — the same drag in the other direction. Rita approved closing it before the build-out agents start adding cells.

Options: Leave `maps` as words and rely on review, or make membership a link like every other.

Chose the link because: Every other connection on a cell must say why and cite; placement on a map is the connection that decides which readers see the cell at all. The recollected case follows from D27: a cell with no sources cannot cite its placement, so its placement is recollected with it, and the reader sees that on the cell.

Where: `ui/src/lib/encyclopedia-schema.ts`; `katagami-commons/wasm/validate_encyclopedia_cell/src/document.rs`; fixtures; `scripts/verify-encyclopedia.mjs`; `.agents/skills/encyclopedia/SKILL.md`. Migration of the 24 live cells is batch B4, applied with the version-3 validator in one sequence, as B3 was with version 2.


## D34 The collection grows by reading passes, tracked per source

Decision: Sources enter the encyclopedia through reading passes: an agent reads a slice of one source and records one decision per term (cell, merge, declined, deferred) in that source's committed ledger, then brings a numbered proposal. Coverage of a source is terms decided over its total. Writing goes first, alternating with visual passes; a cleanup pass over the 24 existing cells and 19 WritingStyle records runs before new cells land beside them. A cell is named by the source vocabulary, never by an invented label; a record credited to one writer is a manifestation under a cell.

Came up because: The research found the node layer already exists several times over (Getty, Wikidata, Artsy) and Rita refused a blind import: "we will just gradually collect, consolidate, and organize", with a way "to track how much of each source we have processed and integrated". She also found the existing WritingStyle names ("Plainhand" over a single author) senseless, and asked that Surrealism and the other early cells be re-read against the sources.

Options: An import script per source; a Temper entity per source with its own approval flow; a committed ledger file per source plus a read-only coverage command.

Chose the ledger because: Declines are most of the work and cells cannot record a decline, so coverage cannot be derived from the cells alone. A file next to the skill is state any agent can read without a client, it is versioned with the decisions it records, and it adds no runtime. An entity can come later if the ledger ever needs approval flows of its own.

Where: `.agents/skills/encyclopedia/SKILL.md` "Sources and reading passes"; `.agents/skills/encyclopedia/sources/*.json`; `scripts/encyclopedia-coverage.mjs`; `ui/scripts/encyclopedia-coverage.test.mjs`. The population plan is kept in Rita's vault, not committed.


## D35 The loader asks for machine representations first

Decision: The loader's source fetch sends `Accept: application/json, text/html;q=0.9, */*;q=0.8`. Citations stay the canonical human-readable URIs; no host gets a rule of its own; no source is marked verified by hand to get past a fetch.

Came up because: Batch B5 and B6 cite the Library of Congress (id.loc.gov). Its canonical URI negotiates: browsers go to an HTML page behind a bot challenge (403 to scripts), scripts asking for JSON get the record (200). The loader sent no Accept header, so every LCGFT citation was refused. Rita ruled out a host-specific handler ("we're not going to give it a special handle") and marking sources verified without a human opening them would be false.

Options: A host rule for id.loc.gov (rejected: special handling); cite the `.json` URL (rejected: a reader wants the page); mark LCGFT sources verified in the payload (rejected: false); state what the script accepts, generically.

Chose the header because: It is what a well-behaved script says on every fetch, it changes nothing about the safety checks (same-host redirects, private-address refusal, 2xx only), and on Getty it is strictly stricter, turning a soft-404 HTML page into a real 404. Given up: nothing observed; Wikipedia and ordinary pages answer as before.

Where: `scripts/create-encyclopedia-cells.mjs` (the fetch in the source check); PR #279.


## D36 A direction that appears in prose and in verse gets a cell each, under a shared parent

Decision: Where a technique or tradition exists in more than one literary form, the direction is carried by a parent cell, and a form gets its own cell under it when that form's practice has its own canon and hands. Epistolary fiction and Epistolary poetry stand apart under an epistolary parent; the same for dialect, hypertext, and the Gothic. Where the practice reads as one across forms, one cell is right and the forms are described in its scope: Literary nonsense is the standing example, holding Lear's verse and Carroll's prose together because the sources treat them as one tradition and the Library of Congress splits them only by cataloguing form. The test is whether a reader could say something about one form that is not true of the other; where they could not, splitting invents a distinction.

Came up because: Pass 2 proposed merging Gothic poetry into the live Gothic fiction cell and asked whether epistolary, dialect and hypertext poetry should merge into their fiction twins. The owner answered: "They can be separate cells with a parent. That's the point of this nested stuff."

Options: One cell per direction across forms, with the forms described inside its scope; a cell per form with a parent above them; or the judgment above, which allows both and says how to choose.

Chose the judgment because: a rule that always splits would divide Literary nonsense, which every source treats as one tradition across verse and prose, and a rule that never splits would put Gothic poetry inside a cell about novels. Each verse tradition that does have its own canon and hands earns its own cell, and the nesting is what makes the collection explorable. Given up: an agent working alone has to make a call rather than follow a mechanical rule, so the test is written down and the reasoning goes in the document.

Where: this ledger's Gothic poetry row; the parent cells arrive in a later numbered batch. `.agents/skills/encyclopedia/sources/lcgft-literature.json`.


## D37 Cells sit at depths, and a made record manifests a leaf

Decision: A cell may be broad (a genre, form or movement: Fantasy fiction, Diaries) or a leaf (a manner: a form plus a stance plus a period or milieu, narrow enough to write a recognisable paragraph in). A writing style, art style or design language manifests a leaf, never a broad cell. Leaf cells are cited from criticism and scholarship, or recorded as recollected; they are not harvested from a catalogue.

Came up because: The owner stopped the writing-style work: "the writing styles that we have right now can't be directly attached to existing cells because existing cells are broad... we can't create a new writing style called fantasy novel." Ninety writing cells were live and not one of them could host a voice, because every source read so far (Library of Congress, Wikidata, Wikipedia) catalogues works and therefore stops at genre and form.

Options: Attach voices to the broad cells anyway and let scope drift; keep harvesting vocabularies and hope depth appears; name the leaf layer as its own kind of curation with its own sources.

Chose the leaf layer because: the vocabularies stop where they stop by design, so more slices add breadth and never reach the level a voice occupies. Naming the leaf explicitly also says what the encyclopedia is for: below the catalogue, it stops mirroring a library and starts being ours. Given up: leaves are slower to make than terms are to read, and some will be recollected rather than cited.

Where: `.agents/skills/encyclopedia/SKILL.md`, "What is and is not a cell".


## D38 The graph is expected to deepen in place

Decision: Inserting a cell between an existing parent and child is a normal maintenance move, not a rewrite. Create the middle cell under the old parent, then Define the child under the middle cell, dropping the child's link to the grandparent unless it remains a separate parent for a separate reason. Both operations ride in one numbered batch, and the new links carry their own explanations and citations.

Came up because: The owner described the collection as living: "imagine neurons forming connections... later on some agent discovers that something could go in between there... you insert between, created a missing node in the middle if that is where that node most organically would sit."

Options: Treat the hierarchy as settled once approved and only add at the edges; allow insertion as an ordinary move with stated evidence.

Chose insertion because: the depth of the graph is discovered, not designed, and the collection would otherwise ossify at whatever shape the first pass happened to give it. No new machinery is needed: Create plus Define is what the loader already does. Given up: a child's parent can change between reads, so anything caching the hierarchy must tolerate that.

Where: `.agents/skills/encyclopedia/SKILL.md`, "Maintaining"; the gap watch now also looks for broad cells with no leaves and for links that span too far.


## D39 The prose an agent writes is product prose; the example text is not

Decision: In a writing style, the corpus passages and the exemplars quoted from them are the specimen and are never edited by anyone. A public-domain passage is copied character for character from its named edition; an original passage is written in-register once and is not rewritten afterwards. Everything else a reader sees — persona, register lines, moves, refusals, annotations, curator notes, the framing sentences of the VOICE.md, and an encyclopedia cell's scope text — is product prose and goes through the unspeak skill before it is attached.

Came up because: The owner asked how the standing unspeak rule lands on a writing style, where an agent writes both the framing and, on an original basis, the specimen itself. An earlier wording said the specimen "must be free of the tells", which reads as a licence to clean a passage after the fact.

Options: Run unspeak over everything including the specimen; exempt the whole style from it; or split the two kinds of text and say which rule governs which.

Chose the split because: a corpus is evidence. Editing it would make the style's measured fingerprint describe prose nobody wrote, and on a public-domain basis it would misquote a real author. Writing an original passage clean is a rule about authorship, and it keeps a corpus from teaching the tells it carries. Given up: an original corpus written before this rule may carry tells, and correcting it means writing a new corpus rather than editing the old one.

Where: `katagami-curation/agents/curator/skills/synthesize-writing-style/SKILL.md`, "Prose an agent writes here goes through unspeak"; `.agents/skills/encyclopedia/SKILL.md`, the scope-text rule.


## D40 An unattended run may mint, under a stated boundary

Decision: The owner may authorise a run that creates content without waiting for her numbered approval. When she does: Draft only, nothing published or deleted, every mint numbered in a morning report with its citation and one line of reasoning, consent public-domain or pipeline-original, a question written into the document rather than settled by the agent, and ledger counts that match what the coverage command prints.

Came up because: The owner asked for an overnight build so she could browse the collection in the morning: "run agents overnight because I'm going to sleep to actually build out the remaining encyclopedia from the remaining sources... and create good writing styles and connect them."

Options: Keep the approval discipline absolute and have the night produce proposals only; or allow minting inside a boundary that keeps every act visible and reversible.

Chose the boundary because: proposals alone would have left her nothing to browse, which was the point of the night. Draft-only plus a numbered report keeps the cost of a wrong mint at one instruction, and Archive is reversible in the sense that matters: identity and history survive.

Where: `.agents/skills/encyclopedia/SKILL.md`, "Working unattended"; `/private/tmp/encyclopedia-passes/OVERNIGHT.md` carries the same boundary to each agent.


## D41 A payload that revises a cell states the bytes it was built from

Decision: A payload that revises a cell carries `baseHash`, the sha256 of the document as its author read it, and declaring it is not optional. The loader refuses the write when the stored document has moved since, and refuses a payload that would replace an existing document and names no base at all. Both checks run in the plan and again immediately before writing, and the message says what to do: re-read, rebuild on the document production holds now, re-apply only your own change. Replaying bytes already stored is not a conflict, and creating a cell that holds nothing needs no base.

Came up because: On the night of 2026-09-09 two runs edited the same five cells. One added manifestations; the other rewrote their prose from a copy taken before those writes, and the manifestations were gone. Neither run saw an error. `Define` replaces the whole document and the loader refused only when an identifier held a differently named cell, so two runs changing different parts of one cell had no safe ordering and the second write won silently. It was found by a watch one of the runs had started on its own writes, not by the loader.

Options: Tell agents to re-read immediately before writing and rely on that; have the runtime take an expected hash and refuse the transition itself; have the loader compare a declared base against what is stored.

Chose the loader check because: re-reading is what both runs already did and it does not close the window, since the document can move between the read and the write. A runtime compare-and-swap is the stronger fix and is where this belongs eventually, but it is a spec change to a deployed application, and the loader is the one path every write already goes through. Given up: the window between the loader's last read and its Define is still open, so this narrows the race rather than closing it; a runtime that took the expected hash would close it.

The rule above is the amended one. It shipped an hour earlier as opt-in, where a payload could simply omit the field, and that was wrong: opt-in would have depended on every author remembering the field, and a payload that omits it overwrites exactly as before, so the guard protected only the runs that already knew to ask for it. A run cannot lose another's work by omission now; it can only lose it by declaring a base it did not read.

A second incident that night looked like the same loss and was not, which is worth recording because it shaped what the guard can and cannot do. One run deliberately removed five records from two broad cells as it moved them to new leaf cells. Another run's watch held the expected counts from its own batches, read the correct removal as corruption, and restored them, leaving five records attached to both cells for about half an hour until the first run cleaned it up. Both runs reported their own error plainly. The guard would not have refused that write: the restoring run did read the current document immediately before writing, so its base matched. A lost update between concurrent writers and an agent with a stale idea of the correct state are different failures with similar symptoms, and only the first is a race. The rule the second one produces belongs to whoever writes a watch: alert on unexplained change, never assert what the right answer is, because the right answer moved four times that night.

Two orderings the review panel found, both fixed the same night. A cell found in `ValidatingDocument` may be another run's write in flight, and the loader used to abandon that validation before checking its own base, disrupting a run it was about to refuse anyway; the base is checked first now, and a refused payload abandons nothing. And a payload that names the bytes it was built from is describing a cell that held a document when it was read, so finding none now is a move rather than an exemption, and it is refused.

What is still open, and it is the reason the runtime fix matters: the loader's last read and its `Define` are not one operation. Two runs that both read the same document and both pass the check can still write in sequence, and the second wins. Narrowing that window is all a client can do. A `Define` that took the expected hash and refused the transition would close it, which is the same attestation pair the collection already computes.

Where: `scripts/encyclopedia-base.mjs`, `scripts/create-encyclopedia-cells.mjs`, `ui/scripts/encyclopedia-base.test.mjs`, and the "Revising a cell another run may also be revising" rule in `.agents/skills/encyclopedia/SKILL.md`.


## D42 A pass that gives a cell children revisits that cell's questions

Decision: When a pass creates or links children under an existing cell, the parent's `questions` entries are re-read in the same batch and any that the pass has just answered are rewritten or removed. A count of children stated in a `questions` entry is restated from production at the end of the pass rather than from the plan.

Came up because: this pass created Drama and left its question saying it has no children, after making it the parent of 52 live cells. Poetry's question said it parents 43 while the ledger and the report both said 91. Dialect literature's question said its third child had no cell, after the same pass linked that cell as its third child. All three were true when written and false by the time the owner would read them.

Options: Treat a `questions` entry as a record of what was true when the cell was written; regenerate counts at read time, which needs a projection that does not exist; or make revisiting the parents part of the pass that changed them.

Chose the third because: `questions` is how a cell tells the owner what it does not know, so a stale one sends her to look at something already done, which is worse than a wrong number in prose. The other two options either accept that or need machinery. Given up: a nesting pass now has a closing step over every cell it gave children to, and the cost grows with the size of the pass.

Where: `.agents/skills/encyclopedia/SKILL.md`, "Maintaining"; batch `B26.json`; the corrected cells are drama, poetry and dialect-literature.


## D43 The writing map nests on the Library of Congress broader-term hierarchy, and stops where that hierarchy stops being about made work

Decision: Every cell that cites a Library of Congress Genre/Form Term takes its parent from that term's own `skos:broader` link, walking up until a term is reached that is already a cell or that passes the cell test. Nineteen terms on those paths were declined as cataloguing containers rather than families of made work, and a cell whose only path runs through them stays a root. The declined set is Literature, Informational works, Recreational works, Instructional and educational works, Discursive works, Ephemera, Visual works, Commemorative works, Religious materials, Records (Documents), Reference works, Serial publications, Periodicals, Illustrated works, Musical texts, Sacred music texts, Radio scripts, Humor, and Pornographic comics.

Came up because: Production held 367 root cells out of 553 and the owner's complaint was that the map was one flat row: "That's the point of this nested stuff." The Library of Congress already states a parent for 239 of those roots, so the hierarchy did not have to be invented, only read.

Options: Invent a taxonomy over the whole collection; take every broader term the Library of Congress states, including its top-level form facets; or take the stated terms and decline the ones that name a shelving category rather than a practice.

Chose the third because: the skill says a cataloguing convenience is not a cell and that the top stays open. Literature is the strongest case: the Library of Congress files 235 terms under it, and accepting it would put one root over the whole writing map, which is a bigger decision than a nesting pass should make on its own. It is also the medium the `writing` map membership already records, so a Literature cell would be the map appearing as a node inside itself. Given up: 26 cells stay roots because their only stated parent is one of the declined terms, and each one is listed in the report so the owner can rule on it.

Recorded in the ledger, after the review round asked where these declines live: four of the nineteen sit inside this source's slice and now have a `declined` row, Literature, Musical texts, Sacred music texts and Pornographic comics. The other fifteen are top-level Library of Congress facets outside the Literature slice this ledger covers, so recording them here would claim a decision about terms the ledger does not track. They are declined for the purposes of this pass and named in this entry, which is their record.

Where: batch payloads `B21-create.json` and `B21-links-1..4.json`; `.agents/skills/encyclopedia/sources/lcgft-literature.json`; `docs/efforts/ARN-118/proposal-B21-B23-nesting.md`.


## D44 Fiction, Poetry and Drama return as cells, overturning B6

Decision: The three Library of Congress form divisions are cells. Fiction now parents 50 live cells, Poetry 91 and Drama 52.

Came up because: B6 declined all three as "a form category of literature, like a medium; a cell needs a direction inside it". Without them the writing map has no layer between a single form and nothing at all, and 193 cells that state one of the three as their broader term have nowhere to hang.

Options: Keep the B6 ruling and leave those cells as roots; accept a single Literature cell instead; accept the three form divisions.

Chose the three because: verse, prose and the stage are where the traditions actually divide, and a reader argues about that boundary in a way they do not argue about "literature". Each of the three carries a `questions` entry naming the B6 decline it overturns.

Extended after the verifier read pull request 286: the practice applies to every reversal, not to these three. Ten further cells in this run revived a term an earlier batch had declined and carried an empty `questions`, so a reader met the cell with nothing saying it was once refused or why. Batch B23 gives each of the ten the entry, quoting the original decline and saying what changed. The rule now reads: a cell that overturns a recorded decision states in `questions` which decision, in the words that decision used, and how to keep the earlier ruling. Given up: if the owner keeps the B6 ruling, striking these three cells drops the links that depend on them, which the report lists separately from the cross-form links so the two can be judged apart.

Where: `B21-create.json` items 1 to 3; ledger rows Fiction, Poetry and Drama, revised from `declined` to `live`.


## D45 The visual map does not nest on Getty, because Getty's parents there are guide terms

Decision: The art cells get no parent layer from the Getty Art & Architecture Thesaurus in this pass. Five links were written where a cell's own Getty record names a broader concept that is already a cell, and one cell, Printmaking, was created from the Wikipedia article that names lithography, screenprinting, woodcut, etching, engraving and risograph as its techniques.

Came up because: 52 visual cells were roots and each cites a Getty concept, so Getty looked like the same lane as the Library of Congress. Reading the records showed the parents are guide terms written in angle brackets, `<modern European fine arts styles and movements>` and the like, which are shelving categories and in several cases sort directions by nation.

Options: Accept the Getty guide terms as cells; invent a movement taxonomy for the visual map; take only the links Getty states between two concepts that are both already cells.

Chose the third because: the skill forbids partitioning by kind-of-thing and forbids forcing directions through a national frame, and every bracketed Getty term does one or the other. The visual lane needs the Artsy Art Genome, which the source table names as the first visual lane and which stands at zero coverage. Given up: 192 visual cells are still roots, and a separate Artsy pass has to do that work.

Where: `B21-art.json`; `B21-create.json` item 16.


## D46 The visual map nests on the claims Wikidata actually carries, which is a minority of its movements

Decision: A visual cell takes its parent from its own cited Wikidata item, reading `subclass of`, `part of` and `movement` and walking up until the target is a cell. Where Wikidata carries no such claim, or carries only a class like art, Western art, cultural movement or avant-garde, the cell stays a root. One cell was created for this, Abstract art, because four live cells name it as their parent and nothing above them existed.

Came up because: the Getty finding in D45 left 192 visual roots, and the Artsy pass that was expected to nest them produced cells sourced to Wikipedia, Wikidata and Getty rather than to Artsy gene pages, so no cell carries an Artsy citation to cite a parent from. Wikidata is the vocabulary 147 of those roots do cite, and it states parents in machine-readable form.

Options: Add Artsy gene pages as new sources to 147 cells so their genes could be cited; invent a movement taxonomy over the visual map; read the claims Wikidata already carries on the items the cells cite.

Chose the third because: it repeats the method that worked for the Library of Congress, and it adds no source a cell does not already stand on. The result is honest about the ceiling: Wikidata records a parent for 28 of the 192 roots and records nothing at all for Der Blaue Reiter, CoBrA, Suprematism, Minimalism and most other named groups, so 165 visual cells are still roots and the movement layer above them has to be curated rather than harvested. Given up: the visual map is nested far less than the writing map, and the difference is a property of the sources rather than of the pass.

Where: `B22-create.json`, `B22-links.json`; visual roots fall from 192 to 165.


## D47 A parent more than one step up the vocabulary is read before it is written

Decision: A broader link taken from a source vocabulary is written directly when the source states it. Where the nearest term that is a cell sits more than one step above, the intermediate terms are opened and read before the link is written, because a label that matches a cell's name can carry a different sense. Three links in this run were built by walking two steps; two were right and one was wrong.

Came up because: the visual sweep linked Precisionism to Realism by walking Wikidata from Precisionism to magic realism to realism. The Realism cell in this collection is the French movement of the 1840s standing on Q2642826, and Precisionism's own article opens by calling it a modernist art movement that emerged in the United States after the First World War. The nesting-visual agent raised it in review, and reading the article confirmed the link was wrong. The same review found two links that were right but sat one level too high, Ashcan School under Realism where American realism exists, and Die Brücke under Expressionism where German Expressionism exists; both were replaced with the insertion move.

Corrected after the verifier read pull request 286: Precisionism was not the only wrong link of the 350, and the first version of this entry said so. American realism and Social realism reached the same French movement by the same route, their Wikidata items naming Q10857409, the general realist tendency, rather than Q2642826. Both links are removed in batch B23 and those cells are roots again, because no cell stands for the general tendency. The count that holds is three wrong links of 350, all one defect: a walk that crossed a sense boundary at a label match.

Options: Forbid the transitive walk and accept fewer links; keep the walk and accept that some links are wrong; keep it and require the intermediate terms to be read.

Chose the third because: the walk found the two correct Renaissance and Rococo placements that a direct-claim-only rule would have missed, so forbidding it costs real links. Reading three intermediate pages costs minutes. Given up: a pass that walks cannot be fully automatic, and the reading is the slow part.

Corrected a second time, after the review round read the report: a check over all 42 cells this run minted was reported as finding zero remaining, and that zero was wrong. Survival fiction still credited a canon to Robinson Crusoe, which its only cited page never names; the checker missed it because it fell back to matching the first word of a phrase, and "Robinson" appears inside "Robinsonades" in that record. The fallback existed to tolerate a surname written without its initials and it hid a real defect instead. The honest count is 17 of 42 carrying an unsupported claim, one of which survived the first repair.

Where: `.agents/skills/encyclopedia/SKILL.md`, "Sources and reading passes"; batches `B22-fix.json` and `B26.json`; the corrected cells are ashcan-school, die-brucke, precisionism and survival-fiction.


## D48 OPEN, for the owner: the Abstract art cell contradicts an Artsy ledger decline

Question, not a decision. This run created an Abstract art cell because four live cells name it as their parent and nothing above them existed. The Artsy reading pass, on branch `claude/encyclopedia-sources-night`, declined the Artsy gene of that name with the note "a medium crossed with a broad quality, which is a way of filtering a catalogue rather than a direction". The live cell and that ledger row now say opposite things and both will land on master.

The case for the cell: abstract art has a hundred-year body of painting and sculpture, a boundary critics argue about, and four cells whose own Wikidata items name it as their parent. The case for the decline: as an Artsy gene it works as a catalogue filter, and the cell may be doing the job that Geometric abstraction and Abstract Expressionism already do more precisely.

Both readings are defensible and this is the owner's call. If she keeps the cell, the ledger row needs revising to `merge` naming `abstract-art`. If she strikes it, four broader links drop with it and Geometric abstraction becomes the parent of the group, which is the placement the nesting-visual agent proposed independently.


## D49 Made work is connected by what a record credits, never by what it is called

Decision: A Katagami record manifests a cell when one of the record's own `credits` entries names that direction. Names are not evidence: a record called Sumiko Ink is placed by its credit "Sumi-e tradition", not by its name, and a record whose name rhymes with a cell is not placed at all. Every manifestation explanation quotes the credit verbatim and states the record's status, so a reader can check the placement against the record without leaving the cell.

Came up because: 13 of 105 live cells carried a manifestation, all art, and the DesignLanguages, PaletteSystems and WritingStyles sets were unconnected entirely. The skill already said to search `credits` rather than names; nothing had done it at scale.

Options: Match record names against cell names; read each record and judge; take the credit vocabulary as the unit of decision.

Chose the credit vocabulary because: it is the record's own claim about its lineage, it is what the skill asks for, and it makes the decision reviewable one credit name at a time rather than one record at a time. Reading the whole vocabulary of 2,291 records, 697 carrying credits, produced 1,276 distinct credit names once artists and writers are set aside, and 401 records connected through 668 entries. Given up: a record whose credits are empty or a placeholder cannot be placed at all, and seven such records name only "x".

Where: `.agents/skills/encyclopedia/sources/getty-aat-styles.json`; batches C1 and C2 in production.


## D50 An archived record may be a manifestation, and the entry says so

Decision: A manifestation may name a record in any status including Archived, while a `broader` or `relations` link must point at a live attested Draft. Where an archived record is attached, its status is written into the explanation.

Came up because: 67 entries point at Archived records. The skill names Draft, UnderReview and Published as the statuses that count and is silent on Archived.

Options: Skip archived records; attach them silently; attach them and mark them.

Chose attach and mark because: an archived record is still made work that credits the direction, and the visibility projection is meant to resolve status at read time rather than by forbidding the link. Marking makes the whole set strikeable in one instruction. Given up: cells carry retired work until that projection exists, which is why the integrity watch reports the count rather than leaving it to be discovered.

Where: `scripts/encyclopedia-integrity.mjs`, the breadth tell.


## D51 A cell's children are a tell about its breadth, never a test of it

Decision: A record is misplaced when its own credit names a cell that sits below the one it is attached to. A record attached to a cell that merely has children is not misplaced, and the child count is reported as context rather than enforced.

Came up because: settling where one record belonged produced a tidy structural rule, that a cell with children is a parent and a record on it is at the wrong depth. It was proposed, endorsed, and passed to a second run as settled, all before anyone ran it. Two runs ran it when they sat down to build it and it fails: 103 records sit on a cell with children and none credits a child. 99 of the 103 are in five art cells populated deliberately, and a record about watercolour generally belongs on Watercolour painting even though one narrower cell hangs beneath it.

Options: Ship the child count as an invariant; drop the idea; ship the narrow rule and report the count.

Chose the narrow rule because: breadth is what a cell claims, and children only correlate with it. Had the child count shipped as something CI enforces, the obvious way to make the build green would have been to detach 103 correct manifestations, so the pressure would have pointed at the data instead of at the rule. Given up: a simpler rule that was wrong. The narrow rule is what the parent-drop in batch C1 already applied to 14 entries, and it found one more in production within the hour, after another run inserted a Pointillism leaf beneath Neo-Impressionism.

Where: `scripts/encyclopedia-integrity.mjs`; `ui/scripts/encyclopedia-integrity.test.mjs`; batch C10.


## D52 The integrity sweep reports, and it fails the run rather than reporting green on data it did not read

Decision: The gap watch reads the live collection and reports violations; nothing in CI asserts the collection is free of findings, and the fixture tests cover the function rather than the graph. A read that cannot account for every row the server reports exits non-zero and reports nothing about the collection.

Came up because: the skill asks for an integrity sweep and nobody could run one. A verifier then stopped the paging early and the first version reported zero while a broken cell sat unread on page two, and a wrong-typed field threw out of the checker so one malformed cell aborted the whole sweep.

Options: Fail CI on findings; report only; report and treat an incomplete read as a clean result.

Chose report-only with a hard failure on an incomplete read because: a watch that goes green without seeing the data is worse than no watch, which is the same argument as an invariant that flags correct records. Every read reconciles against `@odata.count`; a wrong-typed field is a finding on that cell and the sweep carries on. Given up: nothing blocks a merge on collection state, which is deliberate, since the collection is data rather than code.

Where: `scripts/encyclopedia-integrity.mjs`; `ui/scripts/encyclopedia-integrity.test.mjs`; wired into `test:encyclopedia`.


## D53 Two writers on one path is the same failure whether or not the path is instrumented

Decision: Recorded rather than fixed by machinery. Runs sharing a scratch directory use a per-run subdirectory; a shared filename is a convention, not a guard.

Came up because: the night's lesson was two writers on one document with no compare-and-swap, fixed in the loader within the hour by D41. Two runs then wrote a pull request body to the same scratch path, and one published the other's text as its own pull request description. No cell or record was involved.

Options: Add a lock; rename by convention; leave it.

Chose the convention and wrote down why it is weaker: a filesystem has no compare-and-swap, so nothing can refuse the second write the way the loader now does. The general form is the one worth keeping: the same failure appeared in two systems on the same night, refused in the one that had been instrumented and silent in the one that had not.

Where: this ledger; the effort reports.


## D54 A watch alerts on unexplained change and never asserts what the right answer is

Decision: A watch over live state takes its baseline from what the system holds when it starts, reports only that something changed, and never restores. It does not hold an expectation of the correct state from its own writes.

Came up because: the same failure happened three times in one night. A watch built from the counts one run had applied read another run's deliberate removal as data loss, and the run restored five records that had been correctly moved, leaving them attached to two cells for half an hour. Rewritten to alert on change, it stayed quiet through about 120 revisions of a corpus-wide sweep and fired twice, both times to say a cell was mid-write. Rebuilt a third time only after it fired eight times on a move its own author had just made deliberately, because its baseline was still that author's payloads rather than production.

Options: Hold the expected state and alarm on any difference; diff against production and alert on loss; snapshot production at start, alert on change, and adopt the new state as the baseline.

Chose the snapshot because: the right answer moved four times in one night, so anything asserting it is wrong within the hour. A deliberate move now alerts once and becomes the baseline, rather than alarming forever. Given up: a watch like this cannot tell a correct removal from a corruption, which is the point. It says what changed and tells the reader to ask whoever wrote before restoring anything.

The same shape appeared three more times in this effort's tests, and it is worth naming alongside the watch. A null inside `broader` crashed the sweep and none of the eight tests put one there, so the suite agreed with the bug. A test asserted that a duplicate decision number produces exactly one problem, and it produces two, because a repeat is both a duplicate and a break in ascending order. Then a stub gave DesignLanguages one row, so slicing it to one produced no mismatch, and two tests written to detect a short read could not produce one.

The third is the cleanest statement of the rule: **a fixture has to be able to exhibit the failure before it can testify to its absence.** A one-row set cannot be read short. A list with no null cannot crash on a null. In each case the test passed, or failed for an unrelated reason, while saying nothing about the thing it was written for. All of them encode what the author expected rather than what the rule says, and an assertion like that holds for exactly as long as the author is right. A watch that holds its own expectation of the correct state and a test that holds its own expectation of the correct output fail the same way, and the fix is the same: build the failure first and watch the instrument react to it.

The sharpest instance came from the exemplar work on another branch, and it is the one to quote. Every writing style's exemplars were passing the mechanical bands checker, and all of them were passing because each fell under the checker's 150-word evaluation floor, so it skipped them and reported a pass. **A check with a floor silently exempts everything beneath it, so a corpus of short things always passes.** Nothing was wrong with the checker or with the exemplars; the green came from the two never meeting. That is the same failure as a fixture that cannot exhibit what it tests for, seen from the other side: there, the input could not reach the check, and here the check could not reach the input. Both produce a pass that means nothing, and neither shows up as a failure anywhere.

A check that skips is worth more than a check that passes, if it says so. Any threshold, floor, sampling rate or minimum in a check should report what it declined to evaluate, and a run where the skipped count equals the input count is a finding rather than a success.

The same shape reaches operations, where it has no test to catch it. Twice in this effort a git operation reported the state anyone would have checked while the thing that mattered did not happen. A push answered "Everything up-to-date" while two commits sat on a detached HEAD, so the branch ref had never moved and the head being reported existed only on one disk. Then a push moved the ref correctly, and GitHub, the pull request and a fresh checkout all agreed on the new head, while Actions never received the event, so no continuous integration ran for those bytes at all and the documented manual fallback produced no run either. In both cases the obvious check passed: the first would have been caught by reading the push output, the second by nothing anyone would think to look at, because a correct ref is exactly what you would verify. **Confirming that a command reported success, or that state looks right, is not confirming the effect happened.** For a push, the check is that the remote ref moved AND that the event it should have triggered exists.

The worked example, because it is the case where only the second half would ever have told you. **GitHub does not schedule `pull_request` workflows when it cannot construct the merge commit those workflows check out, and a conflicting pull request is exactly that case.** So a conflicting branch does not report a failing gate; it reports no gate at all. Every push moves the ref, the pull request shows the new head, a fresh checkout agrees, and nothing anywhere says that no continuous integration ran. The documented manual fallback re-fires the same event that cannot be built, so it produces nothing either. It reads as a broken CI and it is a conflicting branch. The tell is that `mergeable` is false, `mergeStateStatus` is `DIRTY`, `merge_commit_sha` is null, and `refs/pull/<n>/merge` is stale or absent; the fix is to resolve the conflict, not to push again.

The detached HEAD happened three times in one day on one branch, and all three were caught the same way: by reading the push output instead of trusting it. `Everything up-to-date` while commits sit unreferenced is the same sentence as a successful push, and the only difference is whether the remote ref actually moved. Nothing was lost because the check was cheap and habitual, which is the argument for making it habitual rather than for remembering to do it when it matters.

One more, about evidence rather than instruments. Offering "the count is unchanged at 67" as proof that a refactor was count-neutral compared two runs over a collection that was moving underneath them, and the number had gone to 66 for reasons unrelated to the change. The claim was right and its evidence could not support it. **A property of a transformation is demonstrated by computing both ways over one snapshot, never by comparing two runs**, and the integrity script now reports the archived count both set-qualified and by bare id so the neutrality is visible rather than asserted.

Where: the run's own watch; `ui/scripts/encyclopedia-integrity.test.mjs`; this rule belongs to whoever writes the next one.


## D55 Two runs nesting one lane write additively, and neither removes the other's links

Decision: When a second run finds another already writing the lane it was sent to nest, it keeps every write additive. It adds `broader` entries and the sources those entries cite, it creates only the parent cells that do not yet exist, and it never removes a link the other run wrote, even where removing one is the correct shape. A cell that ends up under both a parent and that parent's own parent is left redundant and reported as a cleanup, because a redundant link costs a reader one line and a wrong removal costs the other run its work.

Came up because: On 2026-09-09 a run was sent to nest the visual map, read production, spent an hour grounding 61 parent claims in each cell's own Wikipedia and Wikidata sources, and found on its first payload build that another run had created the Abstract art cell and written 18 of the same links in the meantime. Three of its remaining links were the insertion move D38 describes: `ashcan-school` had just been put under `realism-art-movement`, and the better parent is `american-realism`, which sits under that same cell. D38 says to drop the child's link to the grandparent. Doing so would have deleted a link written twenty minutes earlier by a run still working.

Options: Stop and hand the whole plan to the other run; apply the plan as designed, including the removals D38 calls for; or apply only the additions and report the removals.

Chose additions only because: D41 records what the last collision cost, and it was not a lost link, it was a run asserting what the right answer was while the right answer was still moving. A removal cannot be distinguished at read time from the corruption D41's second incident describes, and the guard does not catch it: the removing run does read the current document, so its base matches. An addition is safe under exactly the same conditions. Given up: three cells carry a parent and a grandparent where one link would do, and someone has to tidy them once both runs have stopped.

Where: `docs/efforts/ARN-118/payloads/` (`plan.json`, the two batches, `mkbatch.mjs`); the redundant pairs are `ashcan-school`, `precisionism` and `die-brucke`, listed in `/private/tmp/encyclopedia-passes/report-nesting-visual.md`.

### Addendum: one read tells you what is there, never what left

A run that reads production once cannot see a removal. It sees a cell without a
parent and has no way to tell a cell that never had one from a cell that had one
taken away an hour ago. That is the same blindness D55 is built around, arriving
from the other side: D55 reasons about the removal you might write, and this is
about the removal someone else already wrote.

The worked example. Rebuilding these payloads for the apply, a session read 170
art roots where the run that built them had reported 168, with the art-cell count
identical at 214 both times. Diffing last night's snapshot against that morning's
found it: `american-realism` and `social-realism` had each lost their `broader`
link to `realism-art-movement` overnight. Nothing else in either document had
moved. No single read could have shown this, and neither could the loader's base
check, which compares a document to the version you read and says nothing about a
document you are not writing.

It was a correct edit, which is the point. `realism-art-movement` describes
itself as a French movement of the 1840s and stands on Wikidata's *French
Realism*; both children were hanging off it on claims naming the *general*
realist style, a different item. Removal beat re-parenting because no cell stands
for the general realist tendency and American realism's own article calls it a
separate movement rather than a branch of the French one. The same audit is why
the claim that Precisionism was the only wrong link of 350 had to be corrected to
three. So the lesson is not that removals are suspicious. It is that a figure
carried between runs decays silently, and the only instrument that shows the
decay is two snapshots.

What follows: a run that reports a count of this collection keeps the snapshot it
counted, and a run that inherits a figure from an earlier report diffs before it
repeats it. A number quoted from a report is a claim about a moment, not a
reading.

Where: the diff is `cells-raw.json` in the branch worktree root (2026-09-09
01:49) against `docs/efforts/ARN-118/payloads/cells-raw.json` (the morning read);
`docs/efforts/ARN-118/payloads/README.md` carries the rule.

## D56 An unattended run stops at a blocked permission rather than routing around it

Decision: The run built both payloads, dry-ran them clean, and did not write them, because the session's command classifier refused the loader's `--apply`. It did not ask a peer agent with a working permission to run them, and it did not reach the write path another way.

Came up because: `node --env-file=... scripts/create-encyclopedia-cells.mjs <payload> --expect <n>` runs clean in this session and the same command with `--apply` is refused. Another run was applying to the same collection at the same time, so a peer who could have run it was one message away.

Options: Ask the peer to apply the payload; write the documents through a direct call to the deployment; stop, report the block, and commit the payloads so the next hands can apply them.

Chose stopping because: the classifier's refusal is a permission decision made about this session, and handing the command to a peer would carry it out while leaving that decision formally intact, which is worse than either honouring it or overturning it in the open. Calling the deployment directly would also skip the loader's own checks, which are the reason writes go through it. Given up: the nesting was not live for the owner's morning, and it needs one command from her or one Bash permission rule.

Where: `docs/efforts/ARN-118/payloads/README.md` carries the two commands; the refusal is reported in `/private/tmp/encyclopedia-passes/report-nesting-visual.md`.

## D57 The additive rule in D55 lifts when the other writer stops and says which link loses

Decision: This entry supersedes D55 rather than amending it in place. D55 says a
second run nesting a lane another run is writing keeps every write additive and
never removes a link the other wrote. That rule holds only while the other run
is writing. Once it has stopped, said so, and said which of the two links loses,
the removal is ordinary maintenance and the insertion move D38 describes is
taken in full.

Came up because: the rule held for about an hour and then the condition it
depended on went away. `nesting` finished the art lane, said so, and said in each of the
four insertion cases that its link goes to the grandparent and loses. A removal
is safe once the other writer has stopped and has agreed which link wins, so all
four were taken: it applied three itself (`ashcan-school`, `die-brucke`,
`precisionism`) and this run's payload drops the fourth, `concrete-art` from
Abstract art, in the same write that puts it under Geometric abstraction.

The Precisionism case is worth stating, because it was not redundancy. The
other run's link walked Wikidata from Precisionism to magic realism to realism
and landed on the Realism cell, which holds the French movement of the 1840s,
while Precisionism's own article opens by calling it a modernist movement that
emerged in the United States after the First World War. Two of that run's three
walked links were right, Rococo under Baroque and Early Renaissance under
Renaissance art, so the walk earns its place and the reading is what was
missing. It has since encoded that: a parent more than one step up the
vocabulary is read before it is written.

What survives from D55, and it is the half worth keeping:
while another run is still writing a lane, a second run adds and does not
remove, because a removal and the corruption D41 describes are indistinguishable
at read time and the base check does not separate them. The rule is about
concurrency, not about hierarchy. When the other writer stops and says which
link loses, the insertion move D38 describes is just maintenance again.

## D58 Archived is excluded from every count, and the status is not where it looks

Decision: A cell's lifecycle status lives on the row as `status`, beside
`fields`, and not inside `fields`. Anything counting cells reads it there and
drops `Archived` rows before counting. No payload links to an archived cell.

Came up because: This run's first analysis read the status from `fields.state`,
which does not exist, so every count it produced treated 17 archived cells as
live: 761 live rather than 744, 224 art cells rather than 214, 176 art roots
rather than 168. It also planned a `broader` link from Safavid manuscript
painting to Persian miniature, and Safavid manuscript painting is archived.
`nesting` reported that the cell "does not exist", which was the same fact seen
from a client that filters archived rows out. Writing that link would have
revived an archived cell and attested it, and Archive is final.

Options: Filter in each script that counts; put the filter in a shared read
helper; or report the raw numbers and note that they include archived rows.

Chose filtering at the read because: the raw count is never the number anyone
wants, and a report that says 176 roots when 168 are live is wrong in the
direction that makes the work look bigger. The seven legacy duplicate cells this
run flagged for the owner as needing a decision turned out to be already
archived, which is a different answer to give her than "these need archiving".

Where: `docs/efforts/ARN-118/payloads/depth.mjs`; the corrected figures in
`/private/tmp/encyclopedia-passes/report-nesting-visual.md`.

## D59 The curated layer stops at 131 roots, and going lower is the owner's call

Decision: The pass nests what three independent sources support and stops. The
131 art cells left as roots stay roots, and the report says which lever was
tried against them and what it returned, rather than reaching for a parent that
is not in the evidence.

Came up because: after the Wikipedia leads were exhausted, three further levers
were tried against the remaining roots. Full article bodies, scanned for
containment phrasing across twenty candidates, returned one usable link, the
Düsseldorf school under Neue Sachlichkeit, on a sentence attributing the lineage
to critics. Tate's art-term glossary, checked for twelve terms, states no parent
for any of them. Three candidate missing parents were tested against their would
be children's own articles and all three failed: Kinetic art returns nothing for
Group Zero, Light and Space or Spatialism; Documentary photography holds only
the Düsseldorf school, because Street photography's article distinguishes itself
from it explicitly; Arts and Crafts is named as an influence on Art Nouveau, the
Bauhaus and the Werkbund and never as a container. Postmodern art was tested and
rejected on a different ground: its own article calls it "a body of art
movements", and the only two children whose sources support it are an
architecture movement and a furniture group.

Options: Create Modernism and Postmodern art and hang the remaining
avant-gardes under them; keep hunting for parents; or stop and put the movement
layer to the owner as one decision.

Chose stopping because: Modernism is the only parent that would move the number
much, and it is exactly the judgment the boundary reserves for her. It spans
1860 to 1970, which reads as the period grouping the rules forbid, and it also
has a real practice and a Tate art term, so the argument runs both ways and an
agent should not settle it at four in the morning. Given up: the art lane stays
at 131 roots against the writing lane's 133 out of a much larger set, and it
looks flatter than it is.


A second call belongs here, because it is the same shape as the Vienna Secession
one and came out the other way. The other run cautioned that the
Post-Impressionism article names Neo-Impressionism and Cloisonnism among what it
covers rather than as its subordinates, and that Neo-Impressionism began in 1886
alongside rather than after. Re-read, the two turn out to sit on different
footings and only one survives as a plain claim. Cloisonnism's own article opens
"Cloisonnism is a style of post-Impressionist painting", so the containment is
the cell's own statement about itself and it is written without a flag.
Neo-Impressionism's article never calls itself post-Impressionist; the only
containment is in the umbrella's article, which lists it among what the term
encompasses and names Seurat as one of its four principal artists. That is
weaker, so the link is written with the claim named in its own explanation and
flagged for the owner beside the Renaissance-period links. The coterminous dates
do not decide it on their own, because Post-Impressionism is a retrospective
umbrella covering 1886 to 1905 and Cloisonnism of 1888 sits inside the same span
undisputed. Getty settles nothing here: its parent for Neo-Impressionist is
`<modern French fine arts styles and movements>`, a guide term sorting by
nation, which is the reason Getty is not the source for this layer.

The four links this run leaves flagged rather than settled are
`neo-impressionism` on the umbrella claim, `venetian-painting` and `sfumato` on
the Renaissance-period footing the other run raised against itself, and
`dusseldorf-school-of-photography` on a lineage the article attributes to
critics.

Two things landed in the shared skill rather than here, and this entry points at
them rather than restating them. The nesting run wrote the reading-pass rule
that came out of the Post-Impressionism exchange: whose article makes the
containment claim decides how strong it is, with Cloisonnism and
Neo-Impressionism as the worked examples, and chronology settling it neither
way. It also wrote, into Maintaining, that an archived row is not an absent row
and that a link into an archived cell is dropped rather than the cell created.
It offered this run the wording of the first. Declined, and left where it is:
that file is already edited on its branch, and a second branch rewriting the
same paragraph is the conflict the offer was trying to avoid. Wording notes went
back to it directly instead.

One extension to D45, which found that Getty's parents in the visual lane are
guide terms and reported it from the 52 roots read there. It holds at the
movement layer too: the AAT record for Neo-Impressionist gives its broader
concept as `<modern French fine arts styles and movements>`, a guide term
sorting by nation. So the Getty route is closed for this layer rather than thin,
and a later pass need not spend the query.

Where: `/private/tmp/encyclopedia-passes/report-nesting-visual.md`, item 1.


## D60 An exemplar is a passage, and a check with a floor exempts everything below it

Decision: Every live writing style carries one to three exemplars, each between 150 and 400 words, drawn verbatim from that style's own corpus with kind `corpus`. Nothing shorter survives. `scripts/check-writing-style-exemplars.py` holds the collection to it against the deployment: the count, the length, each exemplar passing its own style's mechanical bands with that style's corpus as the reference, and on a public-domain style each appearing verbatim in that corpus.

Came up because: every one of the twenty-four live styles carried three to five exemplars totalling 250 to 960 characters, so one or two sentences apiece and in places a fragment of dialogue. A style cannot be shown by a sentence.

The part worth keeping is why nothing had caught it. Every style sets `min_words_to_evaluate` to 150, and the bands checker skips any text under that value before it evaluates anything except the banned-phrase scan. Every exemplar in the collection was under 150 words. So the checker was reporting a pass on all of them while measuring none of them, and it would have gone on doing that for any number of new short exemplars. The instrument could not exhibit the failure it exists to detect.

That is the third instance of the same shape in one night, alongside a fixture of one row that could not be read short and a guard whose eight tests put no null in the one list it missed. The general rule now written down: a check with a floor silently exempts everything below the floor, and a corpus of short things will always pass it. When a check has a threshold, the set of inputs below it is the set the check does not cover, and that set needs its own rule.

Options: raise the floor and leave the checker alone; lower `min_words_to_evaluate` so short exemplars are measured; write a separate check that enforces the floor itself.

Chose the floor plus a separate check because: lowering `min_words_to_evaluate` would make the statistical bands run over twenty-word texts, where a sentence mean and a burstiness figure measure noise. The floor is what makes the existing bands meaningful, and the new check is what makes the floor enforced rather than declared. Given up: two numbers now have to agree, the 150-word floor here and `min_words_to_evaluate` in every style's bands. The check reads both, so a drift between them is visible.

Where: `scripts/check-writing-style-exemplars.py`, `scripts/set-writing-style-exemplars.py`, `docs/efforts/ARN-118/exemplar-selection.json`. Against production before the change: 143 problems across 24 styles. After the seventeen public-domain styles were written: 42, all of them in the seven that still hold a model-written corpus.


## D61 The record that travels is the one that has to be clean

Decision: A style whose corpus is replaced is not done until its VOICE.md and its replication samples are rebuilt on the new corpus. The corpus files, the VOICE.md and the replicas are one artifact for the purpose of this fix, and none of the seven is reported as complete before all three are real.

Came up because: the VOICE.md attached to each of the seven quotes its entire model-written corpus verbatim in a "Gold standard samples" section — around 14 KB of model prose in the Op-ed file, and the same shape in the other six. The replication samples were then produced from that VOICE.md. VOICE.md is the portable projection, the file at `/voice/<id>/VOICE.md` that gets handed to another agent as a prompt, so it is the copy most likely to be read and reused.

Anyone who replaced the corpus files and stopped there would have believed the problem was fixed while the model text went on being handed out, now under a real author's name, which is worse than where it started. Fixing a source without regenerating what quotes it fixes nothing.

Options: replace the corpora and leave VOICE.md for a follow-up; replace both together; hold the whole replacement until both can be written.

Chose holding both together because: a follow-up is how the model text survives, and the interval during which a style is called Sherwood Anderson while its contract file quotes a model is the exact false attribution this effort exists to remove. Given up: the corpus replacement is blocked on the same write route as the VOICE.md, so neither lands early.

The general rule: when a fix has to reach a source and everything derived from it, the derived copies are part of the fix rather than a follow-up, and the copy that travels is the one to check first.

Where: the seven styles' `voice_md_file_id` fields; `docs/efforts/ARN-118/corpus-sources.md`, "What is still open"; the docstring of `scripts/replace-writing-style-corpora.py`; and the VOICE.md rule added to `scripts/check-writing-style-exemplars.py`, which refuses a VOICE.md whose quoted samples do not appear in the style's own corpus.


## D62 None of the seven is archived; six are renamed for what their text is

Decision: The seven styles carrying a model-written corpus keep their records and get real text. Six are renamed because the label claimed more than the text can deliver: Op-ed becomes The Crisis — editorial page (1910–1911); Explanatory journalism becomes Congressional Research Service — issue reports (2020s); Minimalism (technical communication) becomes Federal Aviation Administration — Airplane Flying Handbook (2021); Liveblogging becomes National Hurricane Center — forecast discussions (2024); Lyric essay becomes Charles Lamb — Elia essays (1823); Dirty realism becomes Sherwood Anderson — Winesburg, Ohio (1919). High fantasy keeps its name, because the register genuinely is Morris and MacDonald and only the corpus changes.

Came up because: the owner ruled that a model cannot write in a style it was not trained on, so a model-written passage labelled as an example of a register is not evidence of that register. Those seven were also exactly the modern registers she had asked for, and the seventeen styles with real corpora are all pre-1930, because that is where public-domain text stops.

Options: archive all seven and record the registers as ones we do not have; keep the names and attach the nearest real text under them; rename each record to what its text actually is; archive the record and mint a new style beside it.

Chose renaming because: three of the seven found genuinely modern text by working hands — CRS analysts, the FAA, and the named forecasters at the National Hurricane Center — because works of the United States federal government are outside copyright under 17 U.S.C. 105. Archiving those would have thrown away real modern registers. Keeping the old names over the new text would have repeated the original error in a quieter form, since a 1911 editorial page is not an op-ed and a 1919 story collection is not dirty realism.

Archiving and minting beside was argued for Lyric essay in particular, where the new record is closer to a different style occupying the same row than to a narrowing: Lamb wrote the familiar essay and the lyric essay is the fragmentary white-space form named in 1997. The owner took the rename knowing that. What the rename must not do is carry the old persona, so each of the six has a persona describing what its text does rather than what it replaced, and each curator note records what the register we lost was and why we could not keep it.

What it costs, which the owner was told in these terms before she decided: this does not deliver the modern registers she asked for. The argumentative, fragmentary and contemporary-fiction registers come back as pre-1930 voices, because for those three the only modern corpora are in copyright or Creative Commons licensed. Those registers are now recorded as ones the collection does not hold.

Where: `docs/efforts/ARN-118/corpus-sources.md`; `scripts/replace-writing-style-corpora.py`; the `curator_notes` on each of the seven.


## D63 Creative Commons has no honest home in the consent basis, so it stays shut

Decision: No Creative Commons text enters the collection, and the `consent.basis` enum is left alone.

Came up because: the modern registers the owner wanted have modern corpora, and some of them carry Creative Commons licences. Two were read rather than assumed. The Conversation is CC BY-ND 4.0 and its republishing guidelines separately forbid systematic republication and permit only lead paragraphs with a link back. Global Voices is CC BY 3.0, attribution only, and genuinely permissive.

The blocker turned out to sit under the licence rather than in it. `AttachCorpus` takes a consent block whose `basis` is one of `opt_in`, `public_domain`, `original`. CC BY text is none of the three, and recording it as `public_domain` would be false about the one field whose job is to be true.

Options: record CC BY text as `public_domain` and describe the licence in the provenance string; add a fourth basis to the spec and use it; leave the enum alone and take only text that fits an existing basis.

Chose leaving it alone because: the first is a lie in the field that exists to prevent exactly that lie, on a branch whose entire subject is provenance. The second is a spec change to a deployed application, and justifying it on one clean example is how machinery gets built for a case nobody has measured. The owner chose to have someone map what CC BY text actually exists for the registers she wants, and the spec change gets justified by that map or it does not happen. Given up: Global Voices is usable text we are not using, and three registers stay pre-1930 as a result.

Where: `katagami-commons/specs/writing_style.ioa.toml`, the `AttachCorpus` and `AttestConsent` hints; `docs/efforts/ARN-118/corpus-sources.md`, "What closed the Creative Commons route".


## D64 A probe against a production write route is a production write

Decision: The way to find out whether a write route exists is to read the metadata, not to send it a request and see what comes back. `File` in the OData metadata carries `HasStream="true"` and a `StreamUpdated` action whose hint describes the whole mechanism, and that metadata was already fetched and sitting on disk when the probe was sent.

Came up because: POSTing `{}` to `/tdata/Files` to find out whether the route was routed, expecting a validation error, minted `fl-01a08644-8b10-7060-9f08-7f8080cef32e` — a File in state Created with no Name, no Path and no content. Nothing references it and it touches no writing style.

Options: give the stray row a real path and corpus content so it stops being stranded; leave it and account for it in the report; delete it.

Chose leaving it because: deletion is outside the boundary this run is working under, and repurposing is worse than stranding. A row minted by a probe and then filled with corpus bytes has worse provenance than a row created for that corpus, and this branch exists because provenance is the thing we got wrong. An empty stranded row the report accounts for is honest; a repurposed one is a small lie in exactly the place being cleaned up.

This is the same shape as D60 and as two other findings the same night: an instrument asked a question it could not answer without changing the thing it was measuring. A read that has a side effect is not a read.

Where: `fl-01a08644-8b10-7060-9f08-7f8080cef32e` on production, accounted for in the effort report; the Files mechanism written into `katagami-curation/agents/curator/skills/synthesize-writing-style/SKILL.md` so the next agent reads it instead of rediscovering it the same way.


## D65 Bands are derived with the collection's own margins, and only the keys the checker reads are emitted

Decision: Each replacement style's mechanical bands are computed from its own new corpus with the margins the collection already uses, and the band set is limited to the keys `docs/research/harness/voice_check_local.py` evaluates.

Came up because: replacing a corpus invalidates the bands derived from the old one, and bands have to be derived rather than chosen or the finalizer rejects them. Two questions had no written answer: how much margin is honest, and which keys to emit.

The margins were read off two styles the pipeline built earlier rather than invented. Against Jane Austen and Aphorism, the mean band runs from the shortest file's mean at about 0.70 to the longest file's mean at about 1.35, the burstiness floor sits near 0.55 of the least bursty file, the distinct-word floor near 0.80 of the poorest file, and the two divergence ceilings near 2.75 times the file furthest from the corpus centre. Those are the constants used.

The key set is the one Aphorism emits, which is the subset the checker actually evaluates. Jane Austen's bands additionally carry `pos_trigrams`, `contractions_per_1000`, `hedges_per_1000`, `passive_per_1000` and `readability_grade`, and the checker reads none of them.

Options: emit the full Austen key set; emit only what the checker reads; extend the checker to evaluate the missing keys.

Chose the checker's subset because: a band nothing checks is a band nothing proves, and emitting a figure that no code will ever test is a claim with no evidence behind it. Extending the checker is the better long-term answer and is a separate piece of work, since the mirror has to keep agreeing with the deployment's finalizer and the finalizer is the arbiter. Given up: the five unevaluated dimensions go unconstrained on the seven replacements, where Austen nominally constrains them.

One consequence, recorded because it changed a source choice: Lamb's Dream-Children was cut from that corpus in favour of A Chapter on Ears. Dream-Children runs at a mean sentence length of 74 words against 23 to 32 for the other essays, which would have set the style's ceiling near 100 words a sentence. A band that admits everything is not a band, and the derivation is only as honest as the corpus it runs over.

Where: `derive.py` and `docs/efforts/ARN-118/derived-bands-seven.json`; `docs/efforts/ARN-118/corpus-sources.md`, "Bands".

### D61 addendum, 2026-09-09: what rebuilding the contract actually took

D61 said the VOICE.md and the replication samples are part of the fix rather than
a follow-up. Building them turned up two things worth keeping.

The VOICE.md is now generated by the loader from the corpus it has just attached,
rather than carried in the approved payload. A contract carried in a payload can
disagree with the corpus that lands beside it; one generated from those exact
bytes cannot. The plan and the read-back both check that every passage it quotes
appears in the stored corpus, and the extractor that finds those passages is one
function shared by the loader and the standing checker, so the two cannot drift
into disagreeing about what counts as a quoted passage.

The replicas exposed a bad corpus rather than a bad band. The National Hurricane
Center corpus was four discussions of one storm, and its derived character-trigram
ceiling came out at 0.103 — tight enough that a replica written in the same
register about a different storm failed at 0.209, and still failed at 0.123 after
being lengthened to corpus length. The band was measuring Helene's place names
rather than the register. Swapping one Helene discussion for a Milton one moved
the honest ceiling to 0.141 and the replica passed. Nothing was widened.

That is D65's Dream-Children problem from the other side. There, one unusually
long essay pushed a ceiling so high the band admitted everything; here, four
passages about one subject pulled a ceiling so low the band admitted almost
nothing. Both are the same defect: a band derived from an unrepresentative corpus
measures the corpus rather than the register, and the fix is the corpus. A band
is only as honest as the sample it was derived from, and the tell in both
directions is a threshold that no reasonable text can sit inside.

Where: `scripts/writing_style_voice_md.py`, `scripts/replace-writing-style-corpora.py`,
`scripts/check-writing-style-exemplars.py`; `docs/efforts/ARN-118/corpus-sources.md`.

<!-- D66–D70 assigned by the team lead for the mobile and performance work on the
     encyclopedia (PR #291). Numbers in this log are assigned rather than chosen:
     five collisions have come from a branch picking its own block by reading the
     others at a moment when those others were still growing.

     These were written on #291 as D42-D46 and arrive here already renumbered,
     in one commit rather than as a block followed by a renumber. #291 is closed:
     the same five code commits ended up in two pull requests, and when they were
     fast-forwarded into #288 only the code crossed - this file was never on that
     branch at all, so there was no D42 here to renumber. -->


## D66 The phone gets a browser, not the map made smaller

Decision: Below 1024px the encyclopedia opens as a search-and-drill-down browser over the cells. The map is still there, one tap from the browser and one tap back, with the culling below applied to it.

Came up because: The owner said the encyclopedia is not responsive and is very difficult to browse on a phone, and named that as the harder half of the work.

Options: Keep one map and give it phone affordances — bigger hit targets, a search field, a cleaner sheet; or give small screens a different way in and keep the map available.

Chose the browser because: the four things browsing this collection means — reach a cell you have in mind, step between a cell and its neighbours, read one without losing your place, get back out — are all navigation, and none of them is served by panning. A map buys spatial recall and overview and pays for both in screen area a 393px viewport does not have: the far view holds a top layer that does not fit and the reading layer holds about two cards. The collection's own shape is a shallow hierarchy — 265 roots, 479 cells with a parent, four levels — which is a drill-down natively. Measured, the browser's interactive time barely moves across 744, 2,232 and 5,208 cells (1,326ms, 1,394ms, 1,953ms) because the list is windowed, where the map's frame rate used to collapse from 19 fps to 2.4. Given up: the phone loses the field at a glance, which is a real thing to lose — hence the map staying one tap away rather than being removed.

Where: `ui/src/components/encyclopedia/browse.tsx`, and the view switch in `ui/src/components/encyclopedia/encyclopedia-map.tsx`.


## D67 The map draws what is on screen, not what the library holds

Decision: Plates and satellites are looked up in a uniform grid over the settled field and mounted only if they overlap the camera, with a 420px margin.

Came up because: Measured on a phone at the reading layer, the map mounted every plate in the library — 5,208 cards and 3,416 images to show the two that fit on a 393px screen. A single 40-step drag took 34.8 seconds, 34.9 of it in long tasks.

Options: Cull with a linear scan over the plates each frame; index the field spatially; or render the field to a canvas instead of DOM cards.

Chose the grid because: a linear scan fixes the DOM cost but leaves a per-frame pass proportional to the library, which is the thing the requirement is about. Canvas would be the fastest and would throw away the cards' text, links, focus behaviour and accessibility, which the map's whole design rests on. Given up: a card's box must be known to the index, so the grid has to be rebuilt when the layout changes — cheap, since the layout is already computed once per state of the library.

Where: `ui/src/components/encyclopedia/spatial-index.ts`, `ui/src/components/encyclopedia/encyclopedia-map.tsx`, `ui/scripts/encyclopedia-culling.test.mjs`.


## D68 Both settling loops stop when they stop helping

Decision: The relaxation and the separation sweeps end on a measurement — movement per card, and cleared overlap — with their old fixed counts kept as guards.

Came up because: The separation sweep's comment said it ran "until nothing overlaps". Measured over the live 744 cells it never reaches that and always spent its full 900-pass guard; passes 100 to 900 took 89% of the time, took the overlapping-pair count from 354 to 202, and did not improve the deepest overlap by a single pixel.

Options: Lower the pass cap; scale the cap by cell count; or stop on a convergence measurement.

Chose the measurement because: a lower cap is a guess that is wrong at both ends — at 744 cells the sweep still has real work at pass 200, and at 5,208 it still has work at pass 800. Scaling by count degrades the field precisely where it is densest. Stopping on progress does the right thing at both sizes: over the live library it settles in a third of the passes and brings the deepest overlap down from 130px to 76px; at 5,208 it takes about the same time and leaves 1,271 overlapping pairs instead of 1,519. Given up: the threshold and the patience count are two tuned numbers where there was one; both were chosen from the measured curve rather than picked, and the layout's determinism test covers the result.

Where: `ui/src/components/encyclopedia/graph-layout.ts`.


## D69 The library is read once and shared, and the cache may never see the request

Decision: The graph read is held for sixty seconds behind a single flight. The module that holds it may not import `next/headers` or mention a header, cookie, session, token or user, and a contract test enforces that.

Came up because: The read cost 3.5s on every request — a third of interactive time on a phone and all of desktop's problem — and at a genuine 5,000 cells it would be roughly seven times that.

Options: Leave it; cache per request only; hold it in the process behind a TTL.

Chose the held read because: it is the same bytes for everyone the gate lets through, so there is one answer to hold. That is also exactly what makes it dangerous, so the safety condition is written down and tested rather than assumed: the gate runs in the request, before the read, and the cache cannot become per-reader because it cannot see the reader. Given up: a cell written now appears within a minute rather than immediately, and a stale-but-good copy is served in preference to a failure, with the failure logged.

Two things happened while writing that guard, and both are about instruments rather than about caching.

The gate contract test already asserted the ordering that matters — every read of the library must run after the owner check, or a stranger's request reaches the backend with the tenant's key on its way to a 404. It matched read names with `indexOf` and skipped any name it did not find. Renaming the read to `loadEncyclopediaCached`, which I did, therefore removed the encyclopedia page from that assertion entirely, and the suite stayed green. **The general rule is that a check must fail when its subject disappears, not merely when its subject is wrong.** A check that silently skips what it cannot find will report a pass for a page it is no longer looking at, and the greener it looks the less it is doing. The test now requires each page to match at least one known read and fails on anything read-shaped appearing above the gate.

The second is the same shape one level down. My first attempt at the "the cache may not see the request" assertion listed forbidden call syntax — `cookies(`, `headers(` — and passed a mutation that added `import { cookies } from "next/headers"`, which is exactly how request state actually gets into a module that should not have it. It was found by running mutations against the new check until they bit, rather than by trusting the first green. A new assertion is worth what it fails on; until it has failed on something it is a comment.

Where: `ui/src/lib/encyclopedia-cache.ts`, `ui/src/lib/held-read.ts`, `ui/scripts/encyclopedia-cache.test.mjs`, `ui/scripts/encyclopedia-gate.test.mjs`.


## D70 The far view's arithmetic is named, not half-fixed

Decision: The map's four regions each have to be big enough to hold every cell they contain, and the top layer is spread across all four, so the far view can show everything small or some of it large and no threshold gives both. Nesting each layer inside its parent's territory is the fix. It is not built here.

Came up because: It is the structural half of the 5,000-cell problem, and the culling work sits next to it.

Options: Attempt the nesting inside this effort; or fix the rendering cost and name the layout problem.

Chose to name it because: culling changes what is drawn, not where cells are placed, so it does not make nesting cheap and does not address the far view at all. What it does change is the constraint around it — the cost of a card is no longer tied to the size of the field, so whoever restructures the geometry can pack the layers differently without watching the frame rate collapse.

**The part nobody has written down: nesting would very likely fix the cold layout as well, and that should change how it is prioritised.** The separation sweep is the layout's dominant cost — 19.9s of the 30.4s of settling at 5,208 cells — and what drives it is how densely the field is packed, because every pair pushed apart pushes each of them into another. Nesting means a lower layer claims no paper until you enter its parent's territory, so the settled field holds far fewer cells competing for the same room at any one level. That is the same variable. So the fix for the far view, which is a legibility problem, is plausibly also the fix for the ~n^1.5 cold layout, which is the sharpest ceiling left and currently 28.3s at 5,208. It is not two pieces of work with one of them optional; it may be one piece of work that pays twice.

Given up: the far view is no better than it was.

Where: named here and in the report; not implemented.
