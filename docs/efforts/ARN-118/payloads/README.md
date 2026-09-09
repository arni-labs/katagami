# Visual-map nesting payloads (ART-1, ART-2) — built, dry-run clean, NOT applied

These two payloads add `broader` links to the art lane of the encyclopedia and
create the two parent cells those links land on. They were built on 2026-09-09
and never written, because this session's command classifier refused `--apply`
on the loader. The same command without `--apply` runs clean and both batches
pass the dry run.

To apply:

```
node --env-file=<repo>/.env.katagami-curator.local scripts/create-encyclopedia-cells.mjs \
  docs/efforts/ARN-118/payloads/batch-art-1.json --expect 7 --apply
node --env-file=<repo>/.env.katagami-curator.local scripts/create-encyclopedia-cells.mjs \
  docs/efforts/ARN-118/payloads/batch-art-2.json --expect 38 --apply
```

Do not apply them as they stand. Every revising cell carries a `baseHash` taken
on 2026-09-09, and another run was writing the same lane at the same time, so
the loader will refuse any cell that has moved since. Rebuild first:

```
node --env-file=... <this dir>/../../../../fetch-cells.mjs   # or any fresh GET of EncyclopediaCells
node mkbatch.mjs                                             # rebuilds both payloads from plan.json
```

`plan.json` is the source these are generated from: the parent for each cell,
the one-line explanation, and the `sourceIds` that explanation cites. It also
carries the links another run had already written by the time this one built,
which `mkbatch.mjs` skips. Editing `plan.json` and regenerating is the way to
change what gets written.

Batch ART-1 creates Performance art and Information design and links the five
cells that sit under them. Batch ART-2 holds the 38 remaining revisions and
depends on nothing in ART-1, so the two can go in either order.
