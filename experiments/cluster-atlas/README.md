# Cluster atlas + near-duplicate dedup (ARN-246)

An explorable map of Katagami's taste vectors, plus near-duplicate detection —
so you can zoom out to broad groups, drill into sub-groups and individual items,
and see which entities are basically the same.

## What it does

- Pulls the `taste_vector` (384-d) for every **Published** entity across the three
  lanes from the prod OData API: Design Languages, Palette Systems, Art Styles.
- Projects each lane to 2D (t-SNE on L2-normalised vectors) and clusters it
  hierarchically (Ward) cut at three nesting levels — the zoom tree.
- Finds near-duplicate pairs by cosine similarity and groups them, and flags
  exact same-name duplicates.
- Renders one self-contained, offline HTML atlas you open in a browser.

**Important:** `taste_vector` is a text embedding of each entity's *description*
(name + tags + philosophy/typography/palette for languages; name + tags + medium +
prompt for art styles), model `Xenova/all-MiniLM-L6-v2`. So this catches
**description**-level similarity, not rendered-image similarity. Stage 2 (image
embeddings) addresses the visual side — see below.

## Run it

```bash
python3 fetch_vectors.py   # -> data/entities.json   (needs TEMPER_API_KEY)
python3 build_atlas.py     # -> out/atlas_data.json + out/dedup_report.md
python3 build_html.py      # -> out/atlas.html (standalone) + out/atlas.artifact.html
open out/atlas.html
```

`TEMPER_API_KEY` is read from the environment or
`~/Development/katagami/.env.katagami-curator.local`.

## Files

| file | what |
|---|---|
| `fetch_vectors.py` | pull + cache all lane vectors (paged OData) |
| `build_atlas.py` | t-SNE layout, hierarchical clusters, dedup, labels -> `atlas_data.json` + `dedup_report.md` |
| `atlas_template.html` | the interactive atlas (canvas map, zoom tiers, dedup panel); `__ATLAS_DATA__` is injected |
| `build_html.py` | inject data -> standalone `atlas.html` + body-only `atlas.artifact.html` |
| `out/atlas.html` | the built atlas — open this |
| `out/dedup_report.md` | the near-duplicate + same-name report |

## Findings (text vectors)

Description embeddings are spread out for languages and art styles and much
tighter for palettes:

- **Art Styles** (156): top cosine 0.887; **0** pairs ≥ 0.90, 2 ≥ 0.85. Text
  descriptions are distinct even where the *look* may not be — the case for Stage 2.
- **Design Languages** (219): top cosine 0.848; nothing ≥ 0.85, but **14** exact
  same-name duplicate names (e.g. Phosphor ×4, Caliper ×3).
- **Palette Systems** (268): tightest — 16 pairs ≥ 0.90, 72 ≥ 0.85, and clear
  duplicate families (e.g. two "Soft Memory Future" at 0.961).

## Stage 2 — visual embeddings (art styles)

Text vectors miss visually-identical-but-differently-worded styles. Stage 2 embeds
the art styles' reference/proof images with a local open CLIP/SigLIP model
(no paid key), re-runs the dedup on image vectors, and shows the delta. Images are
served at `https://katagami.ai/api/file/<fileId>` (proof/reference ids are on each
ArtStyle). See `embed_images.py` for status.
