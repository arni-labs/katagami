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
media stays legal because medium was never a wall.

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
  "version": 2,
  "name": "Impressionism",
  "description": "Light and colour relationships, broken brushwork, and fleeting observation.",
  "provenance": {"basis": "cited"},
  "maps": ["art"],
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

- **Every link cites evidence.** `broader`, `relations`, and `manifestations`
  each require `sourceIds` resolving into this cell's `sources`. Sources are
  citations — title plus HTTPS URL — not reproduced material. The apply script
  fetches every source URL and resolves every link target before writing.
- Maps are `art`, `writing`, `palettes`, `design`; a cell may wear several.
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

## Maintaining

- **Integrity sweep**: every cell's attestation pair *and* that its document
  parses under the current contract (an attested cell written under an older
  version is not current); every `cellId` and manifestation pointer resolves;
  sources still answer. Dangling links are the
  failure this collection accumulates.
- **Gap watch**: maps with no cells, cells with no manifestations, recollected
  cells that could now be cited, clusters of made work with no cell over them.
  These become the next proposal, not a quiet fix.
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
