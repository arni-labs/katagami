---
name: encyclopedia
description: Build and maintain the Katagami encyclopedia — cells, their relationships, and their links to made work. Use when adding, enriching, revising, or auditing encyclopedia cells.
---

# The Katagami encyclopedia

A map of creative directions. Each region of the map is a **cell**: a name, a
scope, and — as it grows — links to neighbouring cells and to work that
manifests it. The map is recursive and incomplete by design. A cell with only a
name is valid; a cell with no neighbours is valid.

Cells live in Katagami commons as `EncyclopediaCells` and are private.

## The three kinds of thing, and why they stay separate

- **Cell** — a direction or family. "Impressionism". "Ligne claire illustration".
  Revisable. Can sit under several broader cells at once.
- **Manifestation** — a reusable Katagami record that expresses the cell: an
  `ArtStyles`, `WritingStyles`, `PaletteSystems`, or `DesignLanguages` entry.
  A pointer, never a copy.
- **Study** — a direct example: an image, a text sample, a palette. Historical
  source, original demonstration, or generated study, and it says which.

A study is not a manifestation. Do not promote one to the other. A cell's theory
claims stay separate from the things that manifest them, with the connection
stated explicitly, because a claim about a movement and a made artefact fail
differently.

## Identity

```
$TEMPER_API_URL/tdata          # https://openpaw-production.up.railway.app
X-Tenant-Id: default
Authorization: Bearer $TEMPER_API_KEY
```

Cells are curator-owned. Only System, Admin, an `operator` or
`curation-service` agent, or a Customer whose role is `owner` or `curator` may
read, list, or act on one. A contributor identity is refused everything. Do not
try to widen this; a public reader needs its own authorized projection, which
does not exist yet.

## The lifecycle you actually have

`Draft` → `ValidatingDocument` → `Draft`, and `Archived` as a final exit.

| Action | From | What it does |
|---|---|---|
| `create` | — | Empty cell at a stable id |
| `Define` | Draft | Writes the document, counts a revision, clears validation |
| `SubmitForValidation` | Draft | Runs the format validator |
| `AbandonValidation` | ValidatingDocument | Recovery for an interrupted run |
| `Archive` | Draft, ValidatingDocument | Final. Nothing follows |

**There is no publication.** No `Publish`, no review states, no `review_*`
fields. That is deliberate: a published state asserts a curator reviewed the
content, and nothing here performs that review. Adding it back is a
specification change, a policy change, and its own review round — a contract
test fails until then. Never reintroduce it to "unblock" a page.

Validation checks *format*, not truth. It says the document parses and its
internal references resolve. It never says a rights claim or a historical claim
is correct.

## The attestation rule

A cell is validated when **both** hold:

```
document_validated == true    AND    sha256(document) == document_hash
```

The boolean alone is not enough. An abandoned validation run keeps executing and
its callback can set the gate while naming the bytes it read rather than the
bytes now stored. Check the pair on every read. A document large enough to be
returned as a blob reference cannot be checked this way — treat it as
unattested rather than assuming.

## Building: the approval discipline

**Every content operation needs the user's numbered approval before it runs.**
This is the rule the whole thing rests on. An agent proposes; a human selects.

1. **Propose.** A numbered batch: batch id, a fixed number per item, the exact
   operation, the target, supporting evidence, the expected result, and any
   dependency on another item. Include uncertain placements and say why they are
   uncertain. Preparing a proposal must not write anything.
2. **Wait.** The user accepts or rejects **by number**. Unselected items stay
   pending. Do not reuse a rejected number for a replacement. Do not run an item
   whose prerequisite was rejected. A repeated approval message is not a licence
   to rerun completed work.
3. **Execute only what was selected**, then record the result separately from
   the approval.

Permission to *generate* is not approval of the *generated result*. Bring
results back for selection before attaching them.

Scope creep to watch for: a batch approving names and scopes does not authorize
relationships; one approving relationships does not authorize studies; none of
them authorize publication.

## Writing a cell document

One JSON document per cell, validated against
`ui/src/lib/encyclopedia-schema.ts` and the WASM validator, which agree:

```json
{
  "version": 1,
  "name": "Impressionism",
  "description": "Light and colour relationships, broken brushwork, and fleeting observation.",
  "maps": ["art"],
  "broader": [{"cellId": "...", "explanation": "...", "sourceIds": ["..."]}],
  "relations": [{"cellId": "...", "label": "influenced", "explanation": "...", "sourceIds": ["..."]}],
  "questions": ["..."],
  "sources": [{"id": "...", "title": "...", "url": "https://..."}],
  "manifestations": [{"entitySet": "ArtStyles", "entityId": "...", "explanation": "...", "sourceIds": ["..."]}],
  "studies": [{"id": "...", "title": "...", "kind": "historical|original|generated", "description": "...", "representations": [...]}]
}
```

Rules the contract enforces, so plan for them:

- **Every link needs evidence.** `broader`, `relations`, and `manifestations`
  each require at least one `sourceIds` entry that exists in this cell's
  `sources`. You cannot assert a relationship without citing something. Sources
  are citations — a title and an HTTPS URL — not reproduced material.
- Maps are `art`, `writing`, `palettes`, `design`. A cell may sit in several.
- Ids are stable and derived from the approved name. Identifiers are the cell's
  identity: never repoint one at a different cell.
- Identifiers are unique within each list; the whole document is capped at
  2,000,000 UTF-8 bytes and each text field at 100,000 code points.
- `description` may be empty. A name and a scope is a complete cell.

Rules the contract cannot enforce, which are yours to hold:

- **Rights belong to study representations**, and each one records its basis,
  evidence URL, jurisdiction, permitted uses, and attribution. Check rights per
  source, individually, before adding a representation.
- **No imitation of living creators**, including under a renamed style.
- **Writing examples are English-only** for now. That is the approved scope of
  the initial writing collection, not a rule about the format: non-English text
  is legitimate in art cells and elsewhere.
- **A scope is descriptive, not a generation rule.** Do not turn a cell's
  description into instructions for a generator, and do not claim a movement has
  a correct or measurable definition.
- Prefer the cell's own vocabulary. Do not force every direction through a
  national or ethnic frame; movements, techniques, and attitudes are categories
  too.

## Doing the work

```bash
# Propose (writes nothing), then apply only what was approved.
node scripts/create-encyclopedia-cells.mjs <approved.json> --expect <n>
node scripts/create-encyclopedia-cells.mjs <approved.json> --expect <n> --apply
```

`--expect` is your own count of what was approved, checked against the payload,
so a swapped or truncated file stops before anything is written. The script
refuses a payload that authorizes anything but creation, attempts every cell so
one failure does not strand the batch, recovers a cell left mid-validation,
refuses an identifier already holding a different cell, and reads every record
back afterwards.

To enrich an existing cell, `Define` the full document — it replaces, it does
not merge — then `SubmitForValidation`, then read back and check the
attestation pair. Revision keeps the cell's id and history.

Verify against a local fixture before touching production. See
`.agents/skills/verify-katagami/features/encyclopedia-cells.md` for the fixture
setup and `scripts/verify-encyclopedia.mjs` for the lifecycle harness.

## Maintaining

- **Integrity sweep.** List the cells and check each one's attestation pair,
  that its links resolve to cells and records that exist, and that its sources
  still answer. A dangling `cellId` or a dead manifestation pointer is the
  failure this collection accumulates.
- **A cell stuck in `ValidatingDocument`** means a validation run was
  interrupted, usually by a restart. Call `AbandonValidation`, then re-`Define`
  and resubmit. There is no timer that will do this for you.
- **An unwanted cell is archived, never deleted.** `Archive` keeps its identity
  and history. Archived is final: its identifier cannot be reused.
- **A revision needs the same approval discipline as an addition.** Rewriting a
  scope is a content change.
- `error` describes the last validation run, not the current document — no
  action can clear it, so read it together with the attestation pair.

## Two runtime defects you must not trip over

Both are Temper defects, reported, contained here, not fixed:

1. **Undeclared parameters are persisted.** Any action writes a submitted string
   parameter whose name matches a field, even an action declaring no parameters.
   Contained because every transition clears `document_validated`, so injected
   content can never land attested. Never rely on a parameter an action does not
   declare, and never assume a field was written by the action you called.
2. **A validation callback is not bound to its run.** See the attestation rule.

If either stops reproducing, the runtime was fixed and the regressions in
`scripts/verify-encyclopedia.mjs` will fail loudly. That failure is the signal
to tighten them, not to delete them.

## Never

- Publish a cell, or add a publication surface, without an approval that says so.
- Create, enrich, or link anything that was not approved by number.
- Widen the cell policy, or read cells with a non-curator identity.
- Present a generated study as historical evidence.
- Claim a cell is validated on the boolean alone.
- Point an existing identifier at a different cell.
