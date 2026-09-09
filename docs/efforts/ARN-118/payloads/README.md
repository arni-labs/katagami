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

## Say which root count you mean

`depth.mjs` counts a cell as a root when no parent of it is **on the same map**.
Counting instead by whether a cell has any `broader` link at all gives a
different number, and after this pass the two are 133 and 131. Both are right.
The two cells between them are `afrofuturism`, whose parent is
`science-fiction`, and `gekiga`, whose parent is `manga`; both parents are on
the writing map only, so a reader browsing the art map cannot walk up from
either child and meets it as a top-level entry.

133 is the number this effort reports, because the thing being fixed is what a
reader meets when they open the visual map. Whichever you use, name it and give
the time of the read.
