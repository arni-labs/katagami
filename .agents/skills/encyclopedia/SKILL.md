---
name: encyclopedia
description: Build and maintain the Katagami encyclopedia — cells, their relationships, and their links to made work. Use when adding, enriching, revising, or auditing encyclopedia cells.
---

# The Katagami encyclopedia

## Why it exists

Katagami holds hundreds of made things — art styles, writing styles, palettes,
design languages. What it lacks is the map: where each thing sits in the space
of creative directions, what its neighbours are, and where the empty regions
are. The encyclopedia is that map.

It serves two readers. A **human** browses it for understanding and
inspiration: what is this direction, what is near it, what did it grow out of,
what reacted against it. An **agent** uses it to escape its own defaults: when
everything it generates for "clean editorial" collapses to the same three
moves, the map shows what is adjacent-but-different, what is far, and which
regions have no made work at all. Distance is the working tool — near cells
give variation, far cells give contrast, and a deliberate jump across the map
is how an agent goes out of distribution *on purpose* instead of by accident.

The founding note (Rita + Howl, 22 Aug 2026) draws one line the whole design
follows: **two graphs that connect but never merge.** The *theory* graph holds
claims you can disagree with — sentences, disputes, budgets. The
*manifestation* graph holds regions of made things and the things themselves.
The cells here are the **manifestation** graph. A cell may cite claims; it
never becomes one. Made things point at cells; a cluster of made things can
suggest a missing cell; a cell plus an empty seat can later be compiled into a
made thing. Cite, induce, compile — three arrows, no merge.

Cross-modal jumps are first-class: a page inspired by a novel, a painting from
prose. That is why `maps` is a role on the cell, not a parent category — a cell
like Surrealism legitimately sits in both art and writing, and a jump between
media stays legal because medium was never a wall. Each membership says why, and
on a cited cell cites it, so the role is earned, not assumed.

## What is and is not a cell

A cell is a **direction, movement, tradition, or family of made work** —
something with a recognisable practice behind it, whose scope you could
illustrate and whose boundary you could argue about.

- Cells: Surrealism. Bauhaus. Edo-period ukiyo-e prints. Ligne claire
  illustration. Gothic atmospheric prose. CRT/phosphor graphics.
- Not cells: "poetic language" (a quality, not a practice), "beauty" (a mood
  word), "blue" (an attribute), "websites" (a medium), a single artwork (that
  is a study inside a cell), a Katagami language (that is a manifestation —
  Galley points at cells, it does not get a cell named after itself), a
  fail-able claim like "contrast has a budget" (theory graph, not here).

The test: could this have a museum wall text, a movement history, or a body of
work by multiple hands? If it names a vibe or a single artefact, it is not a
cell. When unsure, propose it with the uncertainty stated and let the human
decide — never mint quietly.

**Cells sit at different depths, and the depth decides what can hang off them.**
A broad cell names a genre, form or movement: Fantasy fiction, Diaries, Poetry.
A leaf cell names a *manner* — a form plus a stance plus a period or milieu,
narrow enough that you could write a paragraph in it and be recognised:
"Restoration private diary", "high-fantasy chronicle narration". Both are cells;
they differ only in how far down they sit.

This matters because **a made record manifests a leaf, not a broad cell.** A
writing style is a voice — rhythm, diction, stance — and no voice embodies
"Fantasy fiction", which says what a book is about and how it is shelved, not
how it sounds. So a WritingStyle attaches to the leaf under it. A design
language or art style behaves the same way: it embodies a manner, not a whole
movement.

The controlled vocabularies stop short of the leaf. The Library of Congress,
Wikidata and Wikipedia catalogue works, so they name genres and forms and go no
further. Leaf cells therefore come from criticism, scholarship, prefaces and
studies of a particular register, cited like anything else; where nothing
citable exists, `recollected` with its fixed sentence is the honest basis. Do
not manufacture leaves to fill a level — a leaf with no body of work behind it
is not a cell, it is a label.

Structure is recursive and deliberately incomplete. A cell can have several
broader cells. Disconnected cells are fine. The top stays open — a few
provisional roots, allowed to be wrong. Do not invent a tidy taxonomy to make
the graph look finished, do not partition by kind-of-thing, and do not force
directions through a national or ethnic frame; movements, techniques, and
attitudes are categories too. Split when two arguments share a page; merge when
two pages cannot state a difference. Distance lives in the edges: `broader`
gives vertical distance, `relations` (influenced, reacted against, shares a
technique) give lateral distance, and the labels matter because "reacted
against" is near-by-opposition, which is exactly what a creativity jump wants.

## The three kinds of thing, and why they stay separate

- **Cell** — the region. Revisable, recursive, may be nearly empty.
- **Manifestation** — a reusable Katagami record that expresses the cell: an
  `ArtStyles`, `WritingStyles`, `PaletteSystems`, or `DesignLanguages` entry.
  A pointer, never a copy.
- **Study** — a direct example inside the cell: an image, a text sample, a
  palette. Historical source, original demonstration, or generated study — and
  it says which, because a generated study is never historical evidence.

A study is not a manifestation. A cell's descriptive scope is not a generation
rule — do not compile "broken brushwork and fleeting observation" into
generator instructions or claim a movement has a measurable definition.

## Identity and visibility

```
$TEMPER_API_URL/tdata          # https://openpaw-production.up.railway.app
X-Tenant-Id: default
Authorization: Bearer $TEMPER_API_KEY
```

**The encyclopedia is owner-only for now.** Raw cells are readable only by
System, Admin, an `operator` or `curation-service` agent, or a Customer whose
role is `owner` or `curator`. A contributor identity is refused everything.

The intended public model, for when a reader ships (the rule is Rita's,
2026-09-08 — implement it exactly):

- Others see **published material only**.
- An unpublished cell is invisible in full, even where it links to published
  styles. Visibility cuts off at the first unpublished thing.
- A published cell that references an under-review style **is** visible — the
  cell shows, the link target does not. The cut is per-node, not viral upward.

Cells may reference styles at any status (Draft, UnderReview, Published); the
reference is always legal, and visibility is resolved at read time by the
projection, never by forbidding the link. That projection does not exist yet
and needs its own authorization; never widen raw-row access to fake it.

## Lifecycle

Intended: `Draft` → validation → review → `Published`, with `Archived` final —
the same shape as the rest of Katagami, so cells and styles review alike.

**Deployed today: Draft only.** `Draft` → `ValidatingDocument` → `Draft`, and
`Archived`. There is no `Publish`, no review states, no `review_*` fields —
deliberately, because a `Published` state asserts a curator review that nothing
currently performs. Reintroducing publication is a specification change, a
policy change, and its own approval and review round; a contract test fails
until then. Do not resurrect it to unblock a page.

| Action | From | What it does |
|---|---|---|
| `create` | — | Empty cell at a stable id |
| `Define` | Draft | Writes the document, counts a revision, clears validation |
| `SubmitForValidation` | Draft | Runs the format validator |
| `AbandonValidation` | ValidatingDocument | Recovery for an interrupted run |
| `Archive` | Draft, ValidatingDocument | Final. Nothing follows |

Validation checks *format*, not truth: the document parses and its `sourceIds`
resolve within the document. It does not look up other cells or records — the
apply script does that before writing — and it never says a rights claim or a
historical claim is correct.

## The attestation rule

A cell is validated when **both** hold:

```
document_validated == true    AND    sha256(document) == document_hash
```

The boolean alone is not enough: an abandoned validation run keeps executing
and its callback can set the gate while naming the bytes it read rather than
the bytes now stored. Check the pair on every read. A document returned as a
blob reference cannot be checked this way — treat it as unattested.

## Building: the approval discipline

**Every content operation needs the user's numbered approval before it runs.**
An agent proposes; a human selects. This holds for a background agent exactly
as for an interactive one — autonomy covers *preparing* proposals and
*maintaining* integrity, never minting content.

1. **Propose.** A numbered batch: batch id, a fixed number per item, the exact
   operation, the target, supporting evidence, the expected result, and any
   dependency between items. Include uncertain placements and say why they are
   uncertain. Preparing a proposal writes nothing.
2. **Wait.** The user accepts or rejects by number. Unselected items stay
   pending. Never reuse a rejected number for a replacement, never run an item
   whose prerequisite was rejected, and a repeated approval message is not a
   licence to rerun completed work.
3. **Execute only what was selected**, then record the result separately from
   the approval.

Permission to *generate* is not approval of the *generated result* — bring
results back for selection before attaching them. Scope creep to watch: a batch
approving names and scopes does not authorize relationships; relationships do
not authorize studies; nothing short of an explicit approval authorizes
publication.

## Writing a cell document

One JSON document per cell, validated against
`ui/src/lib/encyclopedia-schema.ts` and the WASM validator, which agree:

```json
{
  "version": 3,
  "name": "Impressionism",
  "description": "Light and colour relationships, broken brushwork, and fleeting observation.",
  "provenance": {"basis": "cited"},
  "maps": [{"map": "art", "explanation": "A movement in painting; its writing counterpart is a separate relation, not a membership.", "sourceIds": ["tate-modernism"]}],
  "broader": [{"cellId": "early-modernist-european-painting", "explanation": "Opened the reorganisation of picture space.", "sourceIds": ["tate-modernism"]}],
  "relations": [{"cellId": "pictorialist-photography", "label": "influenced", "explanation": "Pictorialists borrowed its soft atmosphere.", "sourceIds": ["wp-pictorialism"]}],
  "questions": ["Where does literary impressionism sit relative to this cell?"],
  "sources": [
    {"id": "tate-modernism", "title": "Modernism — Tate art term", "url": "https://www.tate.org.uk/art/art-terms/m/modernism", "verifiedBy": "Rita", "verifiedOn": "2026-09-08"},
    {"id": "wp-pictorialism", "title": "Pictorialism — Wikipedia", "url": "https://en.wikipedia.org/wiki/Pictorialism"}
  ],
  "manifestations": [{"entitySet": "DesignLanguages", "entityId": "en-01a068c9-845d-7e63-a1ff-a08069e046e2", "explanation": "Ombrelle declares French Impressionism as its lineage.", "sourceIds": ["tate-modernism"]}],
  "studies": []
}
```

The first source is human-verified; the second is unverified until someone
opens it. A study looks like this — `kind` is `historical`, `original`, or
`generated`, and only a generated one carries `generatedBy`:

```json
{"id": "haystacks-1891", "title": "Haystacks, end of summer", "kind": "historical", "description": "Monet's series painting.",
 "representations": [{"id": "plate", "kind": "image", "sourceId": "musee-dorsay", "url": "https://...", "alt": "...",
   "rights": {"basis": "public-domain", "evidenceUrl": "https://...", "jurisdiction": "...", "uses": ["display"], "attribution": "...", "restrictions": []}}]}
```

`kind` is one of `historical`, `original`, `generated`. Only a generated study
carries `generatedBy`; putting it on a historical one is refused.

## Provenance: a reader must always know where something came from

This is the rule the contract enforces hardest, because it is the one a
browsing human and a learning agent both depend on.

- **The cell itself.** `provenance.basis` is `cited` or `recollected`. Cited
  means at least one entry in `sources` — an encyclopedia reference, a museum
  essay, a standard history — that a reader can follow to learn more.
  Recollected means the model wrote the account from its training data and no
  external reference was located; the `note` begins with the fixed sentence
  "Written from model training data; no external reference was located" followed by anything else worth saying, and a
  recollected cell carries no sources — if you have one, you are cited. A cell
  with neither is refused by the validator. Prefer cited. Recollected is an
  honest interim state, not a destination: a maintenance sweep should be
  turning recollected cells into cited ones.
- **Every link.** `broader`, `relations`, and `manifestations` each cite a
  source. For a manifestation the natural source is the record's own page,
  because the record declares its lineage in its `credits`; that is the record
  citing the cell.
- **Every study.** `kind` says what it is: `historical` — a real work, and its
  representation links to where it came from with rights recorded;
  `original` — a demonstration a human made for this cell; `generated` — made
  by a model, and `generatedBy` names the model or tool. A generated study
  never passes as evidence of anything, and a historical study never carries a
  generator. This holds for text as much as images: an AI-written prose sample
  is `generated`, and a real passage is `historical` with its edition and its
  source.

Enforced by the contract, so plan for it:

- **Every link cites evidence.** `broader`, `relations`, `manifestations`, and
  `maps` each require `sourceIds` resolving into this cell's `sources`. Sources are
  citations — title plus HTTPS URL — not reproduced material. The apply script
  fetches every source URL and resolves every link target before writing.
- **An explanation that reports a filing must match the record; one that reasons
  from a definition only has to say so.** "The Library of Congress files it here"
  is checkable against the record's `hasBroaderAuthority`, and a link whose
  explanation says that and does not match is wrong. "The record defines it this
  way, so we place it here" is a curatorial refinement, which the collection
  allows one level below the authority, and it is honest exactly when it admits
  being one. Blank verse links to Iambic poetry on the definition and says so;
  Memorates claimed a folk-literature filing the genre/form record does not make,
  and had to be rewritten. Name the vocabulary too: the genre/form authority and
  the LCSH subject heading are different vocabularies and do not settle each
  other.

- **A map membership is a cited claim.** `maps` entries are `{map, explanation,
  sourceIds}`, not bare words: a cell sits on the writing map because of
  something a reader can check, so a cell cannot be dragged across media by its
  name alone. On a cited cell each membership cites; on a recollected cell the
  placement is recollected too — `"sourceIds": []`, key present and empty — and
  the explanation is still required. Maps are `art`, `writing`, `palettes`,
  `design`; a cell may wear several.
- Ids derive from the approved name and are the cell's identity — never
  repoint one at a different cell.
- Identifiers are unique per list; the document caps at 2,000,000 UTF-8 bytes,
  each text field at 100,000 code points. `description` may be empty — a name
  and a scope is a complete cell.

Yours to hold, because the contract cannot:

- **Rights belong to study representations**: basis, evidence URL,
  jurisdiction, permitted uses, attribution — checked per source, individually.
- **No imitation of living creators**, including under a renamed style.
- **Writing examples are English-only for now** — the approved scope of the
  initial writing collection, not a format rule; non-English text is legitimate
  in art cells.

## Doing the work

```bash
node scripts/create-encyclopedia-cells.mjs <approved.json> --expect <n>          # dry run
node scripts/create-encyclopedia-cells.mjs <approved.json> --expect <n> --apply
```

`--expect` is your own count of the approval, checked against the payload. The
payload states each cell's provenance; the script never invents one. It refuses
a payload authorizing anything but writing private Drafts, writes broader cells
before their children, waits for each cell to attest before moving on, and
skips a child whose parent failed; resolves every linked cell and manifestation
record; fetches every unverified source and requires it to answer on its own
host; recovers a cell left mid-validation, refuses an identifier
already holding a different cell, and reads every record back.

A source is shown as unverified until a named human opened it: `verifiedBy`
and `verifiedOn` live on the source itself, set by the owner's verify button
or by the payload. The script fetches unverified sources as its own gate
against dead links and skips the fetch for verified ones, which is how a page
that refuses automated requests gets cited.

To enrich, put the full approved document in a `Define` payload and run the
apply script; do not call `Define` and `SubmitForValidation` by hand, because
only the script resolves links, fetches sources, orders writes, and reads back
the attestation pair. `Define` replaces the document, never merges, and
revision keeps the cell's id and history. Verify on a local fixture first: see
`.agents/skills/verify-katagami/features/encyclopedia-cells.md` and
`scripts/verify-encyclopedia.mjs`.

## Sources and reading passes: how the collection grows

The encyclopedia grows by **reading passes**, never by import. A pass takes a
slice of one source (60 to 80 terms), reads every term, and decides one thing
per term. The decisions are written down at the moment they are made, in the
source's ledger, and the pass ends in a numbered proposal of 20 to 30 cells
that the human approves item by item (above). The loader then writes it.

| decision | meaning |
|---|---|
| `cell` | passes the cell test: a nameable style, movement or technique with a body of work. Goes into the proposal. Becomes `live` once the loader has written it (fill `cellId`). |
| `merge` | already a cell under another name or a parent; the source page is added to that cell's sources. |
| `declined` | fails the test (a period label with no practice, a cataloguing term, a mood word). One-line reason. |
| `deferred` | plausible, but the body of work is unclear or no citable source was found yet. A missing manifestation is never a reason to defer: cells exist without manifestations. |

Rules that hold in every pass:

- **A cell is named by the source vocabulary**, never by an invented label. "Field
  notes", "Epistolary fiction", "Impressionism" are names; a coined brand with one
  writer's work under it is not a cell, it is a manifestation credited to that
  writer and belongs under a cell.
- **Scope text is ours and cites the page it was read from.** Nothing is copied:
  share-alike (Aesthetics Wiki, Wikipedia) and attribution (Artsy, Getty) sources
  are read, decided, and cited. A reader sees this prose on katagami.ai, so it
  goes through the `unspeak` skill like every other user-facing sentence: no
  metaphor nouns, no inflated diction, no "X, not Y", no sentence that wraps its
  point in a setup and a tail. Say what the direction is and stop.
- **One cell per direction; a cell per form.** A movement that spans art and
  writing gains a second `maps` membership, explained and cited, rather than a
  second cell. But where a direction has a distinct practice in more than one
  literary form — Gothic fiction and Gothic poetry, epistolary fiction and
  epistolary poetry — the direction is carried by a parent and each form gets a
  cell under it, because each has its own canon and hands. The parent is what a
  reader looking for "the Gothic" finds. Where the practice reads as one across
  forms, one cell is right and the forms live in its scope: Literary nonsense
  holds Lear's verse and Carroll's prose together. The test is whether you could
  say something about one form that is not true of the other (D36).
- **A parent taken from a vocabulary is read, not walked.** Where a source
  states a cell's broader term directly, write the link and cite the record. Where
  the nearest term that is a cell is more than one step up, open the pages and
  check that the intermediate term means what its label suggests before writing.
  A label can match a cell's name and carry a different sense: Precisionism was
  linked to Realism through Wikidata's magic realism, where "realism" is the
  nineteenth-century movement rather than the modernist tendency Precisionism
  belongs to (D47).
- **Whose article makes the containment claim decides how strong it is.** A cell
  whose own page says what it belongs to is stating it about itself, and the link
  is firm: Cloisonnism opens "a style of post-Impressionist painting". A claim
  that appears only in the parent's article, which lists the cell among what the
  term covers, is the umbrella's reading and the explanation says so, because a
  reader should not be left thinking the movement said it of itself:
  Neo-Impressionism never calls itself post-Impressionist. Chronology does not
  settle this either way, since a retrospective umbrella does not require its
  members to come after it. Found in the visual pass review.
- **A citation supports a claim only if the source makes it.** `cited` means the
  page carries the sentence, not that the page was fetched. Before you set
  `cited`, find the sentence in the fetched text and keep it; if you cannot find
  it, change the sentence or change the source. This binds every claim you
  attribute to a source: a scope sentence naming a person, a date or a work, a
  broader link's explanation, a map membership, a manifestation, and a ledger row
  recording a merge, whose reference has to reach the cell it names. The loader
  proves a URL resolves and nothing further; only the writer can prove it
  supports the claim. Three branches broke this in one night by three different
  routes, the sharpest being a cell that credited Faraday at the Royal
  Institution to a page containing none of those words.
- **An explanation that names a vocabulary cites a source from that vocabulary.**
  "The Artsy Art Genome lists it in its Styles and Movements family" is a claim
  about Artsy, and citing a Wikipedia article for it cites nothing. This was
  written on 123 art cells and not one of them carried an artsy.net source; the
  words Styles and Movements appear in most Wikipedia articles, so the name check
  scored 104 of the 123 as supported and the boilerplate spread unseen. The rule
  is exact, because the vocabulary is the host of the URL, and the sweep now
  checks it. An absence is the one legitimate exception and says so: Regulated
  verse states that LCGFT has no heading for it and cites the page the name came
  from instead.
- Manifestations ride along: search `credits` across all record sets at every
  status and list what exists. Most new cells will have none on day one.

Per-source use, decided with the human on 2026-09-08:

| source | use | how |
|---|---|---|
| LCGFT Literature (646, public domain) | read-and-cite | first writing lane: genre and form terms as technique-style cells |
| Wikidata literary movements (416, CC0) | names-only | reading list for movement cells; it holds almost no edges |
| Wikipedia Category:Literary movements (89, CC-BY-SA) | read-and-cite | read, decide, write our own text, cite the page |
| Wikidata literary techniques (440, CC0) | with-care | many are figures of speech, expect a high decline rate |
| Artsy Art Genome (521, CC-BY-4.0) | read-and-cite | first visual lane; gene page cited on every cell |
| Getty AAT Styles and Periods (6,198, ODC-By) | backbone | never read end to end; every visual cell gains its AAT concept as a source when one exists |
| Wikidata art-movement influence (205 edges, CC0) | edges | reading list for relationships, each checked and cited |
| Aesthetics Wiki (1,241, CC-BY-SA) | read-never-copy | community coinage: a term with no dated body of work outside the wiki is declined or deferred |
| CARI | human-read-cite-only | refuses scripts; a human reads it in a browser, cites the page, marks the source verified |
| Britannica, Poetry Foundation, Princeton Encyclopedia, Oxford Dictionary of Literary Terms, Stanford Encyclopedia | cite-only | never opened by an agent; a human may cite and verify a page |

Two ledgers are cleanup passes over what existed before the sources were read
(`katagami-cells-2026-09`, `katagami-writing-styles-2026-09`); their decisions
are `keep` / `revise` / `merge` / `archive` (and `live` once a revision has been
written), made against the same sources. Cite-only sources have no ledger: they
are never processed, only cited.

**The tracker** is one file per source in `.agents/skills/encyclopedia/sources/`
(`source`, `name`, `url`, `licence`, `use`, `total`, `totalDerivedFrom`, `lane`,
`terms[]` with `term`, `ref`, `decision`, `batch`, `note`, optional `cellId`).
Coverage of a source is terms decided over its total; for the Getty backbone a
row is a cell that gained its AAT id, and the command reports the count. Render all of them with:

```bash
node scripts/encyclopedia-coverage.mjs
```

It validates every row and refuses a malformed ledger; `cd ui && npm test` runs
the same check. Write a row when you decide, not when you report.

## Working unattended

The approval discipline above is the default and it stands. The owner may
authorise a run that mints without waiting for her numbers — she did so on
2026-09-09 for an overnight build. When she does, these hold and are not
negotiable by the agent:

- **Draft only.** Nothing is published. Nothing is deleted. Archive is the only
  removal and it is reserved for the owner's morning decisions.
- **Everything minted is numbered and reported.** A run ends with a report that
  lists every cell, link and record it created, each with a number, its
  citation, and the one line of reasoning that put it there. Striking any of them
  must cost the owner one instruction.
- **Consent stays clean.** Corpora are public domain with the work and edition
  named, or authored by the pipeline in-register. No in-copyright text, no
  living author's prose, nothing that would need a permission we do not hold.
- **Uncertainty is recorded, not resolved.** A borderline cell is minted with its
  question in the document, or deferred. An agent working alone does not get to
  settle a question it would have asked; it writes the question down.
- **The ledgers stay true.** A row goes in when the decision is made, and the
  morning report's counts must equal what `encyclopedia-coverage.mjs` prints.

Autonomy is a change in when the human looks, never in what may be built.

## Maintaining

- **A pass that gives a cell children revisits that cell's questions.** `questions`
  is how a cell tells the owner what it does not know, so an entry the same pass
  has answered sends her to look at something already done. Re-read every parent
  you linked children to, in the same batch, and restate any count of children
  from production rather than from the plan (D49).
- **Archived rows are not absent rows.** A sweep that filters to live attested
  Drafts will report an archived cell as missing, and the two call for opposite
  actions: archive is final, so a link into an archived cell is dropped rather
  than a cell created. Read the status before reporting a cell as absent. The
  tell: two runs disagreeing about whether a row exists is usually two runs
  disagreeing about what exists means.
- **Integrity sweep**: every cell's attestation pair *and* that its document
  parses under the current contract (an attested cell written under an older
  version is not current); every `cellId` and manifestation pointer resolves;
  sources still answer. Dangling links are the
  failure this collection accumulates. The ledgers point the other way and are
  checked separately, because a `cellId` naming a cell that has never existed
  passes the format validator and stays green forever. Four did:

  ```bash
  node scripts/encyclopedia-cellids.mjs   # needs TEMPER_API_KEY; exits 1 on a dangling row
  ```
- **Claim support**: `cited` has to mean the page carries the sentence, not that
  the page was reachable. Before setting it, find the claim in the fetched text
  and keep it; if you cannot find it, change the sentence or change the source.
  Reading a lead section and writing the rest from memory produces prose that
  passes every other check. Measured on 2026-09-09, one live cell in nine
  asserted a name no cited source carried.

  ```bash
  TEMPER_API_KEY=... python3 scripts/encyclopedia_support.py
  ```

  Reporting only, never a build gate. It prints its own false-positive rate and
  what it does not check. It scores the description alone and then every sentence
  a reader sees, each explanation against the sources that explanation itself
  cites. It checks each parent link cited to a Library of Congress record against
  that record's own broader authority, and each explanation naming a vocabulary
  against the host of what it cites, which are the two exact halves.

  Read the field a flag came from before repairing it. A `questions` entry carries
  no citation and usually names another cell or a decision a pass made, which no
  external page will ever carry; a `manifestations` explanation is mostly a
  statement about the Katagami record, so the record is read alongside the cited
  sources. Neither is exempt, because the defect that produced this script lived
  in a manifestation explanation, but neither reads like a scope-text hit either.

  Repair by cutting the claim. Looking for a source that fits prose already
  written produces the same defect with better paperwork, and it passes every
  check here. Where the cell would then say too little, leave a `questions` entry
  naming what a better source would let it say.

- **Placement**: which records no cell holds. `encyclopedia-integrity.mjs` reports
  it per set, and per set is how to read it: the lanes are at different stages, so
  a combined total describes none of them. On 2026-09-09 WritingStyles had 1
  unplaced of 24 in scope and DesignLanguages had 784 of 881. Placed means a live
  cell names the record; in scope excludes Archived, so retiring a record never
  grows the number. `--unplaced` names every one.

- **Gap watch**: maps with no cells, cells with no manifestations, recollected
  cells that could now be cited, clusters of made work with no cell over them,
  broad cells whose only children are broad (the leaf layer is missing under
  them), and `broader` links that span a distance a reader would not accept in
  one step. These become the next proposal, not a quiet fix.
- **Revising a cell another run may also be revising.** `Define` replaces the
  whole document, so two runs changing different parts of one cell have no safe
  ordering: the second write wins and the first is lost, with no error on either
  side. A payload built from a document you read states `baseHash`, the sha256
  of the document as you read it, on each such cell. Declaring it is not
  optional: a payload that would replace the document of a cell that already
  holds one, and does not say which bytes it was built from, is refused. The
  loader refuses the write if the stored document has moved, both in the preflight and again
  immediately before writing, and tells you to re-read and rebuild. Rebuild
  from the document as production holds it now and re-apply only your own
  change; do not replay a payload built against the older bytes, or you undo
  the other run in the opposite direction.

- **Inserting a cell between a parent and a child.** The collection is expected
  to deepen: a pass discovers that something belongs between two cells that are
  already linked. Create the middle cell with `broader` naming the old parent,
  then `Define` the child with `broader` naming the middle cell. The child's old
  link to the grandparent is dropped, because the grandparent is still reached
  through the middle; keep both only when the grandparent is a genuinely
  separate parent for a separate reason, and say which reason. The new links
  need their own explanations and citations — a child's old explanation of why
  it sat under the grandparent does not describe why it now sits under the
  middle. Both operations go in one numbered batch so the graph is never
  approved half-rewired, and the same rule holds in the other direction: a new
  root over an existing root, or a leaf under an existing leaf.
- **Finding manifestations**: search records' `credits`, not their names. A
  record declares its lineage there (`{kind: "movement", name: "French
  Impressionism"}`), across every status — Draft, UnderReview, Published all
  count. A search on names alone misses most of them.
- **Stuck in `ValidatingDocument`** means an interrupted run — call
  `AbandonValidation`, re-`Define`, resubmit. No timer does this for you.
- **Archive, never delete.** Archived keeps identity and history and is final;
  the id cannot be reused.
- **A revision needs the same numbered approval as an addition.**
- `error` records the last validation run, not the current document: a
  successful run sets it empty, a failed one fills it, and `Define` leaves it
  alone. Read it with the attestation pair.

## Placing what Katagami makes

Anything the commons gains — a writing style, an art style, a design language, a
palette — belongs in the encyclopedia, and the encyclopedia is where a reader
finds out what it is an instance of. A record nobody placed is a record nobody
can reach except by knowing its name already.

**Placement is a periodic pass, not a step in creation.** A run that mints a
record does not have to stop and find it a home, and should not: finding the
right cell is judgement work, and a maker in the middle of making is the worst
person to do it quickly. The placement pass runs afterwards, over everything
unplaced, on its own schedule.

What the pass does, in order:

1. Read every record in the four sets and every live cell. A record is placed
   when some cell's `manifestations` names it, keyed on the entity set as well
   as the id, since ids are only unique within a set.
2. For each unplaced record, find the cell whose scope its credit actually
   names. The rule is the same one that governs everything here: what the
   record's own credit says, never what its name suggests.
3. **Where no cell fits, mint one** — from a source, under the same discipline
   as any other cell, cited and attested. Mint *from* a source; never go looking
   for a source that would justify a placement you have already decided on. That
   is the citation defect in another costume, and it passes every check here,
   because the resulting cell is cited and the resulting link resolves. The
   difference is a question you could have answered no to: *is this tradition
   named in the literature* is research, and *find me something that supports
   putting the record here* is not. A record that has no home is usually
   telling you the collection is missing a direction rather than that the record
   is wrong. Where the honest answer is that the record does not belong in the
   encyclopedia at all, say so in the pass's report rather than forcing it.
   And where a record cannot be placed, **write the question onto the cell a
   reader would look at** rather than only into a report. A cell carrying a
   `questions` entry that names the unplaced record, what its own credits claim,
   and what a source would have to say to settle it, is how the gap survives the
   run that found it. An ancestor is not a manifestation: a record that a cell's
   own sources call a precursor expresses the thing that came after only if
   something cited says so.
4. Where the record's credit names something the collection deliberately
   declined, leave it unplaced and record why. An unplaced record with a stated
   reason is a finding; an unplaced record with no reason is a gap.

The pass reports what it placed, what it minted, and what it left alone with the
reason. Its count of unplaced records is the number to watch: it should fall
after each population run and rise when one lands, and a run that leaves it
unchanged has either placed nothing or measured nothing.

## Two runtime defects you must not trip over

Temper defects — reported, contained here, not fixed:

1. **Undeclared parameters persist.** Any action writes a submitted string
   parameter matching a field name, even an action declaring no parameters.
   Contained: every transition clears `document_validated`, so injected content
   never lands attested. Never rely on an undeclared parameter; never assume a
   field was written by the action you called.
2. **A validation callback is not bound to its run.** Hence the attestation
   rule.

If either stops reproducing, the runtime was fixed and the regressions in
`scripts/verify-encyclopedia.mjs` fail loudly — the signal to tighten them,
not delete them.

## Never

- Publish a cell, or add a publication surface, without an approval saying so.
- Create, enrich, or link anything not approved by number.
- Mint a cell for a vibe, an attribute, a single artefact, or a Katagami
  language.
- Widen the cell policy or read cells with a non-curator identity.
- Present a generated study as historical evidence, or store any example
  without saying whether it is real or generated and where it came from.
- Claim a cell is validated on the boolean alone.
- Point an existing identifier at a different cell.

## Source material

The founding note: `encyclopedia-taste-pack/01-encyclopedia/encyclopedia.md`
(two graphs, gardener, verification axes, cross-modal). The effort record:
`docs/efforts/ARN-118/` — intent, spec, plan, and decisions D1–D26, which carry
the reasoning behind every rule above.
