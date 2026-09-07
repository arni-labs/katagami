# Manifestation encyclopedia maps

Design draft. The behavior below is planned and has not been implemented.

## Reader experience

The encyclopedia lets a reader explore art, writing, palettes, and design languages through connected cells. A cell describes an area or direction and can have manifestations and narrower cells at the same time. A manifestation is a representative work or example. Its representations can include a description, an image, and an implementation.

The four maps are views of the same records, so a cell can appear in several views without duplicating either the cell or the work it references. The interface distinguishes broader and narrower cells from comparisons, shared techniques, documented influence, and other connections. It names the relationship and its evidence.

Readers can open a cell, inspect its examples and sources, follow a connection, and compare two cells. Direct examples remain separate from examples in descendants. Unclassified entries remain accessible. The overview shows nesting without requiring the reader to inspect the entire graph at once.

The effort delivers all four populated maps. Populate art and writing first, then palettes and design languages, with actual representative material and useful comparisons that include examples at parent and child levels. Cells remain revisable. The first entries do not define a complete classification of creative practice.

## Records

Add `EncyclopediaCell` to `katagami-commons`. Keep the existing `Taxonomy` records and gallery navigation unchanged. The current taxonomy organizer enforces a two-level browsing tree and assigns languages to leaves. It must have no authority to reorganize encyclopedia cells.

Each cell has a stable identifier and a structured document containing:

- A name, description, applicable maps, and open research questions.
- Broader-cell references, with an explanation of each narrower relationship.
- Direct manifestations, with stable example identifiers and one or more representations.
- Other cell relationships, with a named relationship, explanation, and sources.
- Sources and rights evidence, including links to existing Katagami records where applicable.

Use ordinary data and code for these records and checks. The structure does not prescribe which artistic decisions a model must make. This effort does not use Lean or SMT to establish aesthetic value, historical truth, or creative improvement.

### Alternatives considered

1. Extend `Taxonomy`: reuse the current parent field and language assignments, then remove its fixed-depth organizing rules. This would change existing gallery curation and still require new support for representative works and review.
2. Store the whole encyclopedia in one document: review the whole collection and resolve its links together. Each small edit would require replacing the whole collection, and agents would need to retrieve unrelated cells.
3. Store cells independently and reuse existing works and sources: read or extend a cell without replacing the collection. Cross-cell checks run against a collection snapshot, and the reader must handle missing references and conflicting containment explicitly.

Use independent cells. Keep containment and other relationships separately labeled. Graph traversal must terminate on cycles, retain disconnected cells, and report unresolved references. A record-level validation result is not a proof that the entire evolving graph is consistent.

## Review and publication

Use a Temper lifecycle: Draft, ValidatingDocument, UnderReview, ValidatingReview, Published, and Archived. Defining or revising a document clears previous validation and review. The validator checks the document format and example metadata. Successful validation permits review. Review validation checks that the recorded attestation covers this exact document. On failure, the cell returns to Draft with specific findings.

Publication requires successful document validation and an approving review. The reviewer checks permission for each representation's intended use, the examples and relationships, and living-creator imitation (including imitation under a renamed style). Any revision requires another review. Generic updates must not bypass those transitions or set validation and review fields directly.

Validation checks whether the required evidence is recorded. It does not establish that a copyright statement or historical claim is true. The review record identifies the reviewer, the evidence considered, findings, and unresolved limitations.

Keep drafts and review material out of public responses. Existing Katagami visitor-visibility restrictions also apply to any linked work. A cell must not expose a hidden language merely because it references that language.

## Examples and source restrictions

Representative examples retain their own colors, textures, typography, framing, and composition. Katagami's interface rules apply only to navigation and surrounding explanation. The interface must not recolor, crop, add grain over, or otherwise restyle an example implicitly. Provide an uncropped inspection view when a thumbnail uses a crop.

Each example identifies whether it is a historical source, an original demonstration, or a generated study. Revisions and additional representations of the same example retain its example identifier. Generated studies do not count as historical evidence.

Exclude living-creator imitation, including imitation concealed under a renamed style. Rights records identify the particular source or edition, evidence URL, jurisdiction where relevant, permitted uses, and required attribution. A creator's death or a tradition label does not establish permission. Known community restrictions and requests remain part of review.

## Checks

The implementation must demonstrate:

- Parent and child cells that both have direct examples, including further nesting.
- Cross-links that do not change containment and cells that appear in multiple maps.
- Comparisons that explain differences with source-backed examples.
- A revision that retains the cell identifier and clears its prior review.
- Rejection of malformed documents and publication attempts before validation or review.
- Rejection of generic writes that try to bypass the lifecycle.
- Safe handling of missing references, disconnected cells, and containment cycles.
- Separation of public content from drafts and linked works hidden from visitors.
- Faithful example rendering, including a palette with more than three colors.
- Working desktop and mobile browsing, images, source links, and comparisons.

Run record lifecycle checks against the real Temper implementation and production policies. Run the document parser against shared valid and invalid fixtures. Verify the actual browser experience locally before deployment, then verify the installed app and deployed routes.

## Outside this effort

The theory graph, base-model training, autonomous scheduled expansion, historical novelty claims, and experiments measuring improved creativity remain separate work. Changes to Impeccable and collaborator outreach are excluded. Source research and generation remain distinct operations.
