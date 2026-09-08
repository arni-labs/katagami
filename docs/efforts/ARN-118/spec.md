# Manifestation encyclopedia maps

Design draft. Cell validation and graph helpers exist, but the reader interface and collection workflow below are not complete. The current document parser still uses the earlier example definition of manifestation and must change before population.

## Reader experience

The encyclopedia lets a reader explore art, writing, palettes, and design languages through connected cells. Each cell describes an area or direction and can have manifestations and narrower cells at the same time. A manifestation can be a reusable art style, writing style, palette system, or design language. Source examples and generated studies can attach directly to a cell without becoming manifestations.

The four maps are views of the same records, so a cell can appear in several views without duplicating either the cell or the work it references. The interface distinguishes broader and narrower cells from comparisons, shared techniques, documented influence, and other connections. It names the relationship and its evidence.

Readers can open a cell, inspect its examples and sources, follow a connection, and compare two cells. Direct examples remain separate from examples in descendants. Unclassified entries remain accessible. The overview shows nesting without requiring the reader to inspect the entire graph at once.

The effort delivers all four populated maps. Populate art and writing first, then palettes and design languages, with actual representative material and useful comparisons that include examples at parent and child levels. Cells remain revisable. The first entries do not define a complete classification of creative practice.

## Records

Add `EncyclopediaCell` to `katagami-commons`. Keep the existing `Taxonomy` records and gallery navigation unchanged. The current taxonomy organizer enforces a two-level browsing tree and assigns languages to leaves. It must have no authority to reorganize encyclopedia cells.

Each cell has a stable identifier and a structured document containing:

- A name, description, applicable maps, and open research questions.
- Broader-cell references, with an explanation of each narrower relationship.
- Typed references to existing manifestations, with the reason each expresses this direction. An art style and a design language can reference the same cell without becoming the same record.
- Direct studies and source examples, with stable identifiers and one or more representations. An image study need not create an ArtStyle, and a writing sample need not create a WritingStyle.
- Other cell relationships, with a named relationship, explanation, and sources.
- Sources and rights evidence, including links to existing Katagami records where applicable.

Use ordinary data and code for these records and checks. The structure does not prescribe which artistic decisions a model must make. This effort does not use Lean or SMT to establish aesthetic value, historical truth, or creative improvement.

### Development and distance

Record available descriptions, sources, studies, and manifestations independently for each medium. Review status is separate. A cell can have detailed art material and only a writing question, and a broad cell can have direct studies as well as narrower cells. Additional studies extend that cell unless review establishes a distinct direction.

Allow multiple broader cells with explicit scope explanations. Broader/narrower scope, derivation, historical influence, shared mechanism, similarity, and theory references are different relationships. An ancestor in common does not establish stylistic proximity. Disconnected entries remain usable, and the interface must not invent a root to connect them.

Similarity measurements identify their inputs, model version, and comparison method. Existing description embeddings support descriptive retrieval only. Image similarity, writing-style similarity, and cross-media comparisons need separate evaluation against actual examples and human comparisons before they influence coverage claims. Report graph distance separately from these measurements.

### Alternatives considered

1. Extend `Taxonomy`: reuse the current parent field and language assignments, then remove its fixed-depth organizing rules. This would change existing gallery curation and still require new support for representative works and review.
2. Store the whole encyclopedia in one document: review the whole collection and resolve its links together. Each small edit would require replacing the whole collection, and agents would need to retrieve unrelated cells.
3. Store cells independently and reuse existing works and sources: read or extend a cell without replacing the collection. Cross-cell checks run against a collection snapshot, and the reader must handle missing references and conflicting containment explicitly.

Use independent cells. Keep containment and other relationships separately labeled. Graph traversal must terminate on cycles, retain disconnected cells, and report unresolved references. A record-level validation result is not a proof that the entire evolving graph is consistent.

## Review and publication

### Numbered proposal batches

Agents may inspect the collection and prepare research notes and proposed placements without changing cells. Before adding cells, descriptions, links, studies, or manifestations, submit a numbered batch to the user. The initial batch can propose a broad map and placements of existing records without generating new work.

Each item records its batch identifier, fixed number, proposal revision, target, exact operation, supporting evidence, expected result, and dependencies. Generated work also records the requested quantity and scope. Items can request cell creation, attachment of existing work, research enrichment, generation of studies, creation of a manifestation, or publication. Show combined operations explicitly, and allow the user to accept or reject items by number in one response.

Only the human decides. Accepted items authorize the displayed revision and operations. Unselected items remain pending. Conflicting selections and unknown numbers require clarification. Do not reuse a rejected number for a replacement proposal, execute an item whose prerequisite was rejected, or rerun completed work on a repeated approval message. Record execution results separately from approval.

Permission to generate is not approval of the generated result. Present those results for selection before attaching them to the collection or publishing them. Edits to an approved proposal require a new revision and decision. Batch preparation must not create encyclopedia cell records. Existing manifestation review and access rules continue to apply.

### Cell lifecycle

Use a Temper lifecycle: Draft, ValidatingDocument, UnderReview, ValidatingReview, Published, and Archived. Defining or revising a document clears previous validation and review. The validator checks the document format and example metadata. Successful validation permits review. Review validation checks that the recorded attestation covers this exact document. On failure, the cell returns to Draft with specific findings.

Publication requires successful document validation and an approving review. The reviewer checks permission for each representation's intended use, the examples and relationships, and living-creator imitation (including imitation under a renamed style). Any revision requires another review. Generic updates must not bypass those transitions or set validation and review fields directly.

Validation checks whether the required evidence is recorded. It does not establish that a copyright statement or historical claim is true. The review record identifies the reviewer, the evidence considered, findings, and unresolved limitations.

Keep drafts and review material out of public responses. Existing Katagami visitor-visibility restrictions also apply to any linked work. A cell must not expose a hidden language merely because it references that language.

## Examples and source restrictions

Representative examples retain their own colors, textures, typography, framing, and composition. Katagami's interface rules apply only to navigation and surrounding explanation. The interface must not recolor, crop, add grain over, or otherwise restyle an example implicitly. Provide an uncropped inspection view when a thumbnail uses a crop.

Each example identifies whether it is a historical source, an original demonstration, or a generated study. Revisions and additional representations of the same example retain its example identifier. Generated studies do not count as historical evidence.

Writing examples are English-only for this effort. The collection may use English translations with evidence for the particular edition. Describing a historical tradition does not require imitating a living creator.

### Inventory and expansion

Follow the live API's continuation links until the collection ends. Preserve record identifiers and statuses, and exclude histories and unrelated private fields from inventory summaries. Count published availability separately from work awaiting review and archived work. Similar names and description matches identify records for comparison before any proposed merge.

Prepare proposed placements from actual records, leaving uncertain placements unresolved. Label gaps as absent from the inspected records, present only in unfinished work, or insufficiently documented. Confirm an apparent gap through record inspection before commissioning an addition.

Choose additions for the distinctions they contribute to the current map, including composition, narrative, material, and rhetorical differences. Do not optimize for equal cell sizes or claim coverage of all art. Explain a proposed new combination through sources and its difference from existing work. Check for an existing unfinished attempt before commissioning another.

Exclude living-creator imitation, including imitation concealed under a renamed style. Rights records identify the particular source or edition, evidence URL, jurisdiction where relevant, permitted uses, and required attribution. A creator's death or a tradition label does not establish permission. Known community restrictions and requests remain part of review.

## Checks

The implementation must demonstrate:

- Parent and child cells that both have direct examples, including further nesting.
- A cell that references both an ArtStyle and a DesignLanguage without copying their definitions.
- Direct image and English writing studies that do not create reusable style records.
- Independent development by medium and separate review status.
- Cross-links that do not change containment and cells that appear in multiple maps.
- Comparisons that explain differences with source-backed examples.
- A revision that retains the cell identifier and clears its prior review.
- Rejection of malformed documents and publication attempts before validation or review.
- Rejection of generic writes that try to bypass the lifecycle.
- A batch with accepted, rejected, and pending items, and execution limited to the exact accepted operations.
- Rejection of changed, unknown, conflicting, or dependency-blocked approvals, and safe handling of repeated approvals.
- Approval to generate that does not publish or attach unreviewed results.
- Complete paginated inventory, with distinct published and unfinished counts and bounded summaries.
- Safe handling of missing references, disconnected cells, and containment cycles.
- Separation of public content from drafts and linked works hidden from visitors.
- Faithful example rendering, including a palette with more than three colors.
- Working desktop and mobile browsing, images, source links, and comparisons.

Run record lifecycle checks against the real Temper implementation and production policies. Run the document parser against shared valid and invalid fixtures. Verify the actual browser experience locally before deployment, then verify the installed app and deployed routes.

## Outside this effort

The theory graph, base-model training, autonomous scheduled expansion, historical novelty claims, and experiments measuring improved creativity remain separate work. Changes to Impeccable and collaborator outreach are excluded. Source research and generation remain distinct operations.
