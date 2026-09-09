# Visual-map nesting payloads (ART-1, ART-2) — applied 2026-09-09

These two payloads add `broader` links to the art lane of the encyclopedia and
create the two parent cells those links land on. They were rebuilt on 2026-09-09
against a fresh read of production and applied the same day. Read back at
16:42Z: 763 rows, 746 live, 746 attested, no dangling links, and all 42 cells
shaped exactly as the payloads specify.

They are kept because they are the record of what was written, and because the
rebuild step below is how the next nesting pass starts.

## If a note here contradicts what you are seeing, believe the machine

An earlier version of this file said the classifier refused only `--apply`. It
refused the dry run too, and the person who hit that read this file first and
lost time to it. The same class of thing put three merge-conflict markers into
`decisions.md` and left every check green, because the checks matched
`## D<n>` headings and no longer described the whole file. A document describing
a state that has changed underneath it is worse than no document, because it is
believed. Re-read the paragraph you are about to rely on against the thing it
describes, and correct it in the same commit as the work.

To apply, from the repo root:

```
node --env-file=<repo>/.env.katagami-curator.local scripts/create-encyclopedia-cells.mjs \
  docs/efforts/ARN-118/payloads/batch-art-1.json --expect 7 --apply
node --env-file=<repo>/.env.katagami-curator.local scripts/create-encyclopedia-cells.mjs \
  docs/efforts/ARN-118/payloads/batch-art-2.json --expect 35 --apply
```

Rebuild first if any time has passed. Every revising cell carries a `baseHash`
of the document as it was read, and other runs write the same lane, so the
loader refuses any cell that has moved since. From this directory:

```
node --env-file=<repo>/.env.katagami-curator.local fetch-cells.mjs   # writes cells-raw.json
node mkbatch.mjs                                                     # rebuilds both payloads
node depth.mjs                                                       # root count, before and after
```

`plan.json` is the source these are generated from: the parent for each cell,
the one-line explanation, and the `sourceIds` that explanation cites. It holds
61 edges, more than the payloads write, because `mkbatch.mjs` skips every link
another run has already written and reports it. Editing `plan.json` and
regenerating is the way to change what gets written.

Batch ART-1 creates Performance art and Information design and links the five
cells that sit under them. Batch ART-2 holds the 35 remaining revisions and
depends on nothing in ART-1, so the two can go in either order.

## What the rebuild found already done

Four insertion moves this plan had designed were carried out in production by
another run before the rebuild: `ashcan-school` under American realism,
`die-brucke` under German Expressionism, `precisionism` under American
modernism, and `american-impressionism` under Impressionism. In each case the
grandparent link was dropped there too, so the shape is already right and
`mkbatch.mjs` skipped all four rather than rewriting them.

The link from `safavid-manuscript-painting` to `persian-miniature` is not in
`plan.json` and must stay out. That cell exists but its row `status` is
`Archived`, and archive is final.

## Say which root count you mean, and never mix the two

There are two root counts for the art lane and they differ by two. Both are
correct. `depth.mjs` counts a cell as a root when no parent of it is **on the
same map**; counting instead by whether a cell carries any `broader` link at all
gives the other. The two cells between them are `afrofuturism`, whose parent is
`science-fiction`, and `gekiga`, whose parent is `manga`. Both parents are on
the writing map only, so each child has a parent and a reader browsing the art
map still meets it at the top with nowhere to walk up to.

| read | art cells | no `broader` link at all | no parent on the art map |
|---|---|---|---|
| 2026-09-09 01:49, before the pass | 214 | 165 | 168 |
| 2026-09-09 16:47Z, after the pass | 216 | 131 | 133 |

Read a row across, never a diagonal. **The first report of this pass gave its
result as "168 to 131", which is the map-parent count before and the any-link
count after — one number from each column.** Nothing downstream reconciled,
because nothing could: the two figures never described the same measurement. It
cost a later session a snapshot diff to find, and it was then mistaken a second
time for a timing difference, which it is not. 131 and 133 come from one read at
one instant.

Both deltas are honest and they are nearly the same size: 168 to 133 by map
parent, 165 to 131 by any link. Pick a column, say which one, and give the time
of the read.

The gap is also a defect worth someone's attention rather than only a counting
quirk, though the two sets are not the same. A cell whose only parent shares no
map with it has a link neither map can draw. A sweep of all 746 live cells finds
exactly two, one in each lane: `gekiga`, on the art map only, under `manga` on
the writing map only; and `wordless-novels`, on the writing map only, under
`relief-printing` on the art map only.

`afrofuturism` is not one of them. It sits on both maps, so its link to
`science-fiction` is traversable on the writing map and merely invisible from
the art side. The root gap and the untraversable-link defect overlap in one cell
and are different sets. No cross-map rule is written; see D71.

## Batch ART-3 (Modernism) — applied 2026-09-09

`mkmodernism.mjs` builds `batch-art-3.json`: the new `modernism` cell and nine
`broader` links onto it. It reads `cells-raw.json`, takes each child's document
exactly as production returned it, appends one `broader` entry and the source
that entry cites, and leaves every other field alone. Rebuild before applying,
the same as the two batches above:

```
node --env-file=<repo>/.env.katagami-curator.local fetch-cells.mjs
node mkmodernism.mjs
node --env-file=<repo>/.env.katagami-curator.local ../../../../scripts/create-encyclopedia-cells.mjs \
  docs/efforts/ARN-118/payloads/batch-art-3.json --expect 10 --apply   # from the repo root
```

Applied at 2026-09-09T20:27Z; all ten written and attested. The loader needs
`ui/node_modules` present, because it imports the shared contract from
`ui/src/lib/encyclopedia-schema.ts` and that file wants zod 4. In a fresh
worktree it fails with `z.url is not a function` until `npm ci` has run in `ui`.

Read the counts down a column, never across two:

| read | art cells | no `broader` link at all | no parent on the art map |
|---|---|---|---|
| 2026-09-09 20:05:47Z, before ART-3 | 219 | 117 | 119 |
| 2026-09-09 20:27:44Z, after ART-3 | 220 | 109 | 111 |

Nine children placed and one new root created, so each root count falls by
eight rather than nine. Modernism is on the writing and design maps as well,
where it is a root with no children: 123 writing roots and 14 design roots at
the same read, each one higher than before this batch.

## Batch ART-4 (Modernism questions) — applied 2026-09-09

`mkmodernism-q.mjs` adds one `questions` entry to the `modernism` cell, naming
the archived `early-modernist-european-painting` row and why it was not reused.
It is a separate batch because the finding came from the owner's review of the
ART-3 report and not from the placement work.

The builder is also the re-check that a pass giving a cell children owes that
cell's `questions`. Before it writes anything it confirms against the same read
that `early-modernist-european-painting` really is archived, that `modernism`
has exactly nine children, and that the sixteen cells the questions name as
non-children are still non-children. It throws rather than writing if any of
those has moved, so a question cannot outlive the fact it describes.

```
node --env-file=<repo>/.env.katagami-curator.local fetch-cells.mjs
node mkmodernism-q.mjs
node --env-file=<repo>/.env.katagami-curator.local ../../../../scripts/create-encyclopedia-cells.mjs \
  docs/efforts/ARN-118/payloads/batch-art-4.json --expect 1 --apply   # from the repo root
```

Applied at 2026-09-09T20:36Z. Read back: 771 rows, 754 live, 754 attested, eight
questions on the cell, and the art root counts unchanged at 111 by map parent
and 109 by any link.
