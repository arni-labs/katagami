# Language exports

## Sub-features
Per-language export routes under `/language/[id]/`: `DESIGN.md`, `DESIGN.with-shadcn.md`, `KATAGAMI.MD`, `SHADCN-DESIGN.md`, `shadcn.json`, `shadcn-components.md`, `shadcn-shots.json`.

## How to get to it (user POV)
Someone building a UI copies the Katagami spec for rich prompting, or copies / downloads `DESIGN.md` for tools that speak Google's portable format.

## Driving it
```bash
for f in DESIGN.md KATAGAMI.MD shadcn.json; do
  curl -s -o "/tmp/verify-katagami/<date>/$ID.$f" -w "$f %{http_code}\n" \
    "http://localhost:3500/language/$ID/$f"
done
head -40 "/tmp/verify-katagami/<date>/$ID.DESIGN.md"
```

## What proves it
`DESIGN.md` comes back with YAML front matter carrying the machine-readable tokens and the canonical sections (Overview, Colors, Typography, Layout, Elevation and Depth, Shapes, Components, Do's and Don'ts), and its token values match `fields.tokens` on the entity. For a published language the route must serve the stored validated artifact, and that artifact passed `katagami-design-md-contract` with zero errors and zero warnings; a generated preview is only correct for drafts and un-backfilled languages.

## Gotchas
`fields.tokens` and the other spec fields are JSON strings on the entity, so parse before comparing. `fields.design_md_lint_result` holds the linter output and is the fastest way to see why a language should not be published. The native Katagami spec is the source of truth; if the two disagree, the projection is what is wrong.
