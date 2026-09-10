# NarrativeStructure implementation report

Date: 2026-09-10

Effort: ARN-118

Deployment status: not deployed

## Result

The repository defines `NarrativeStructure` as a Temper entity and contains load-ready records for all 32 approved candidates (entries 1 through 32). The four rejected candidates (entries 33 through 36) are absent.

The fixture contains 32 unique records. Each record has a stable slug identifier, aliases, a whole-work instruction, movements, at least two exemplars, source citations, source-handling metadata, and approved encyclopedia cell IDs. The fixture serializes JSON-valued parameters as strings because the corresponding OData fields use `Edm.String`. The task-required aliases `起承転結`, `序破急`, and `पञ्चसन्धि` are present.

## Entity contract

`NarrativeStructure` follows the `WritingStyle` lifecycle:

1. `Draft`
2. `UnderReview`
3. `Published`
4. `Archived`

Authoring transitions set the identity, instruction, movements, exemplars, sources, and encyclopedia links. Any authoring change clears `structure_verified`. The Cedar policy lets an owner or `curation-service` agent create and author records, submit them for review, and archive them. System and the exact `service:wasm-runtime` principal may also submit or archive records, and only those two principals may call `MarkStructureVerified` or `Publish`. It denies generic OData `update` and `delete` requests, which would bypass the named transitions.

| Field | Purpose |
| --- | --- |
| `id`, `name`, `slug`, `aliases` | Give loaders, URLs, and readers stable identifiers and retain names used in other languages or traditions. |
| `instruction` | Give an authoring agent one direction it can apply before drafting. |
| `movements` | Give the agent an ordered outline contract. |
| `exemplars` | Name the works used to establish that the arrangement recurs. The records contain names and creator credits, not copies. |
| `sources` | Record the citation and whether the record uses public-domain material or a paraphrase of a copyrighted source. |
| `encyclopedia_cell_ids` | Link a structure to existing genre or form records without treating those records as instructions. |
| `structure_verified`, `verification_report`, `version` | Record the finalizer's result, the evidence it checked, and the published revision. |

`movements` has two JSON forms:

- `fixed` stores a complete ordered list of named parts.
- `rule` stores the repeatable ordering rule and one ordered example.

Variable structures such as ring composition, hypertext narrative, and abstract episodic structure use a rule and example because they have no universal part count.

The repository registration includes the IOA spec, CSDL entity and entity set, Cedar policy, app documentation, fixture, and a contract test that checks agreement across those files.

`Publish` requires all five presence flags and `structure_verified`. The finalizer contract requires a non-empty name and slug, aliases encoded as a JSON array, a non-empty instruction, one valid movement form with an ordered non-empty sequence, at least two named exemplars, at least one source with `public_domain` or `cited_and_paraphrased` handling, and resolvable encyclopedia links before the finalizer sets `structure_verified`. `SubmitForReview` clears earlier verification, so the finalizer must check the stored `UnderReview` record before publishing it.

## Deliberate omissions

Unlike `WritingStyle`, this entity has no corpus, consent attestation, license check, mechanical bands, replication sample, portable document, thumbnail, or public asset requirement. Exemplars and sources hold names, citations, and paraphrased facts, so the entity does not distribute a writer's work.

This change does not add curation jobs, session templates, finalizer code, UI, a production loader, or a production installation. It does not publish either Katagami app to Genesis and does not change production data. An authorized later installation can create each fixture row by its `id` and dispatch `SubmitNarrativeStructure` with the matching `params` object.

## Candidate and source audit

All 32 approved candidates have at least one cited source. The fixture records Aristotle's *Poetics* and Freytag's *Technique of the Drama* as public-domain sources. It cites and paraphrases every other source and copies no third-party prose into the records.

The source pass checked 30 unique URLs. This environment fetched 22 URLs directly and could not fetch eight:

| Candidate | Source | Result |
| --- | --- | --- |
| Linked-story cycle | Wiley DOI | HTTP 403 |
| Diary form | Cambridge University Press excerpt | Connection timeout |
| Branching narrative | Library of Congress authority | HTTP 403. The second cited source returned content. |
| Field three-act structure | CUNY teaching gloss | HTTP 403. Open Library returned content. |
| Eight-sequence structure | Bloomsbury book page | HTTP 403 |
| Yorke five-act structure | John Yorke page | HTTP 403 |
| Kishōtenketsu | University of California Press DOI | HTTP 403 |
| Pancha-sandhi | INFLIBNET chapter | HTTP 403 |

The supplied research notes contain the prior source audit for all eight. This run did not independently read the blocked pages again.

## Production encyclopedia links

A read-only production query on 2026-09-10 confirmed all seven explicit cell IDs from the task. Each cell exists, is in `Draft`, and has a validated document.

| Narrative structure | Encyclopedia cell |
| --- | --- |
| Frame narrative | `frame-stories` |
| Epistolary form | `epistolary-fiction` |
| Linked-story cycle | `linked-stories` |
| Diary form | `diary-fiction` |
| Hypertext narrative | `hypertext-fiction` |
| Branching narrative | `choose-your-own-stories` |
| Sustained allegory | `allegories` |

Although the task calls this set six entries, the fixture uses the seven named pairs and no adjacent cells.

## `literary-technique` classification

The production `literary-technique` branch has 19 direct children. Under the task's whole-work instruction test, four are structure candidates, fourteen fit a different kind of entity or remain techniques, and one lacks evidence of a complete-work sequence.

| Cell | Classification | Reason |
| --- | --- | --- |
| `anti-fairy-tale` | Not a structure | It distinguishes works by outcome and genre reversal, not by a reusable complete-work arrangement. |
| `constrained-writing` | Not a `NarrativeStructure` | It is a compose-with constraint family. A writing-constraint entity would fit better than a narrative arrangement. |
| `cut-ups-literature` | Not a `NarrativeStructure` | It describes a production procedure. The approved list also rejects the overlapping collage narrative pending a separate owner decision. |
| `dialect-literature` | Not a structure | It specifies language and voice. |
| `encomium` | Structure candidate | Its record gives an opening, three ordered middle sections, and a conclusion for the complete work. |
| `episodic-storytelling` | Structure candidate | It names whole-work organization by episodes. A later record should narrow the rule and cite its movements before migration. |
| `euphuism` | Not a structure | It specifies sentence style and diction. |
| `frame-stories` | Structure candidate | It supplies the enclosing and interior narrative order already represented by the approved frame-narrative record. |
| `hypomnemata` | Not a structure | It is a notebook and excerpt-gathering practice without a required whole-work order. |
| `irohauta` | Not a structure | It is a character-use constraint on a poem. |
| `macaronic-verse` | Not a structure | It specifies how a work mixes languages. |
| `meter` | Not a structure | It specifies verse measure below the complete-work level. |
| `oneiric-vision` | Insufficient evidence | The production record labels it a genre and technique but does not establish a complete-work sequence. |
| `parodies-literature` | Not a structure | It is a relation of imitation and exaggeration to another work or style. |
| `pastiches-literature` | Not a structure | It is a mode of stylistic imitation or assembly without a required sequence. |
| `priamels` | Structure candidate | It orders alternatives before naming the preferred subject at the end of a complete poem. |
| `rhyme-scheme` | Not a structure | It is a recurring sound pattern below the complete-work narrative level. |
| `saj` | Not a structure | It is a rhymed-prose form and language pattern. |
| `zaum` | Not a structure | It is an invented-language practice. |

The production query did not move or change any cells. A later, separately authorized curation pass may add the four candidates.

## Verification

The contract suite checks the lifecycle, verifier ownership, publication requirements, 32-record allowlist, movement union, required aliases, source handling, exact encyclopedia links, CSDL registration, mirrored policies, and Cedar decisions.

- `.venv/bin/python3 -m unittest tests/test_narrative_structure_contract.py`: 18 passed.
- `temper verify -s katagami-commons/specs`: passed all four verification levels for all 17 entity types. `NarrativeStructure` passed symbolic checks with seven inductive invariants, a model check over 202 configurations, 301 simulated transitions, and 100 property-test cases.
- An isolated local OData API ran on port 3523; the UI was configured for port 3524 but did not start. The commons loader registered `NarrativeStructures`, and the metadata request returned HTTP 200 and included `HasIdentity`. `SubmitNarrativeStructure` stored the ring-composition fixture and set all five presence flags, including `has_identity`. A `SubmitForReview` call with an undeclared empty instruction moved the record to `UnderReview`, persisted that instruction, and cleared prior verification. `Publish` then returned 409. After `SetInstruction` restored the fixture instruction, I called `MarkStructureVerified` and `Publish`; the record moved to `Published` and `version` incremented to 1. Evidence is in `/tmp/verify-katagami/2026-09-10/arn118-final`.
- `ui/node_modules` is absent, so `next` could not start. ARN-118 modifies no UI code. The launcher stop command ran after the API check, but the sandbox denied `kill` for the Temper listener PIDs on ports 3521 and 3523.
- `git diff --check`: passed.
- `make test-integration`: ran 504 tests and returned 23 failures, 4 errors, and 4 skips. On clean `master`, the command ran 486 tests and returned 23 failures, 4 errors, and 4 skips. The 18 targeted tests pass, including the identity and variable-movement regressions.
