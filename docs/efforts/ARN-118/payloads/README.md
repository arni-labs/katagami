# Visual-map nesting payloads (ART-1, ART-2) — rebuilt, NOT applied

These two payloads add `broader` links to the art lane of the encyclopedia and
create the two parent cells those links land on. They were rebuilt on 2026-09-09
against a fresh read of production, and they have not been written, because the
command classifier refuses the loader in this session — the dry run as well as
`--apply`, not only `--apply` as an earlier note here said.

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
