# Katagami taste-vector dedup report (text embeddings)

Similarity = cosine of the 384-d text embedding of each entity's description (name + tags + philosophy/medium/palette). This catches **description**-level duplication, not rendered-image duplication.

## Art Styles  (156 published)

- pairs with cosine ≥ 0.95: **0**
- pairs with cosine ≥ 0.92: **0**
- pairs with cosine ≥ 0.9: **0**
- pairs with cosine ≥ 0.85: **2**
- pairs with cosine ≥ 0.8: **20**

### Exact same-name duplicates — 4 names, 6 redundant entities

- **Overprint** ×3
- **Misprint** ×3
- **Sumi** ×2
- **Kasumi** ×2

### Near-duplicate clusters (cosine ≥ 0.87) — 1 groups

- **2** items: Overprint · Overprint

### Strongest pairs (top 15 by cosine, any threshold)

| cosine | A | B |
|---|---|---|
| 0.887 | Overprint | Overprint |
| 0.854 | Overprint | Misprint |
| 0.849 | Pasteboard | Pasteup |
| 0.849 | Overprint | Overprint |
| 0.848 | Lumiphor | Lumiphore |
| 0.840 | Cinnabar Seal | Cinnabar |
| 0.834 | Quoin | Misprint |
| 0.827 | Découpage | Pasteup |
| 0.826 | Overprint | Overprint |
| 0.825 | Tearline | Pasteboard |
| 0.819 | Sumi | Sumi |
| 0.812 | Tellurit | Downlink |
| 0.811 | Cathode Hush | Cathode |
| 0.808 | Loam | Terrableed |
| 0.808 | Suiboku | Sumi |

## Art Styles (visual)  (156 published)

- pairs with cosine ≥ 0.95: **1**
- pairs with cosine ≥ 0.92: **3**
- pairs with cosine ≥ 0.9: **5**
- pairs with cosine ≥ 0.85: **36**
- pairs with cosine ≥ 0.8: **158**

### Exact same-name duplicates — 4 names, 6 redundant entities

- **Overprint** ×3
- **Misprint** ×3
- **Sumi** ×2
- **Kasumi** ×2

### Near-duplicate clusters (cosine ≥ 0.9) — 4 groups

- **3** items: Graphite Plate · Marginalia · Silverpoint
- **2** items: Toner Press · Réglure
- **2** items: Kasanezuri · Knockout
- **2** items: Marl · Graticule

### Strongest pairs (top 15 by cosine, any threshold)

| cosine | A | B |
|---|---|---|
| 0.952 | Graphite Plate | Silverpoint |
| 0.924 | Marl | Graticule |
| 0.921 | Marginalia | Silverpoint |
| 0.913 | Kasanezuri | Knockout |
| 0.904 | Toner Press | Réglure |
| 0.897 | Graphite Plate | Veil Optics |
| 0.897 | Margin Press | Lavis |
| 0.889 | Graphite Plate | Marginalia |
| 0.885 | Suiboku | Feibai Brushwork |
| 0.884 | Collodion | Platine |
| 0.884 | Toner Press | Silverpoint |
| 0.880 | Plakat | Werkblock |
| 0.880 | Screentone Press | Splash |
| 0.873 | Graphite Plate | Toner Press |
| 0.872 | Plakat | Hanga Cut |

## Design Languages  (219 published)

- pairs with cosine ≥ 0.95: **0**
- pairs with cosine ≥ 0.92: **0**
- pairs with cosine ≥ 0.9: **0**
- pairs with cosine ≥ 0.85: **0**
- pairs with cosine ≥ 0.8: **7**

### Exact same-name duplicates — 14 names, 17 redundant entities

- **Phosphor** ×4
- **Caliper** ×3
- **Marquee** ×2
- **Quire** ×2
- **Greenbar** ×2
- **Glaze** ×2
- **Tidemark** ×2
- **Meridian** ×2
- **Reticle** ×2
- **Vitrine** ×2
- **Tessera** ×2
- **Fathom** ×2
- **Galley** ×2
- **Tincture** ×2

### Near-duplicate clusters (cosine ≥ 0.83) — 3 groups

- **2** items: Sōma · Litmus
- **2** items: Folio · Ephemeris
- **2** items: Yìn · Zhóu

### Strongest pairs (top 15 by cosine, any threshold)

| cosine | A | B |
|---|---|---|
| 0.848 | Yìn | Zhóu |
| 0.847 | Sōma | Litmus |
| 0.834 | Folio | Ephemeris |
| 0.828 | Phosphor | Cathode |
| 0.817 | Passer | Raster |
| 0.812 | Phosphor | Phosphor |
| 0.806 | Rubric | Filament |

## Palette Systems  (268 published)

- pairs with cosine ≥ 0.95: **1**
- pairs with cosine ≥ 0.92: **3**
- pairs with cosine ≥ 0.9: **16**
- pairs with cosine ≥ 0.85: **72**
- pairs with cosine ≥ 0.8: **406**

### Exact same-name duplicates — 10 names, 12 redundant entities

- **Phosphor** ×4
- **Polished Pop Heritage Katagami** ×2
- **Soft Memory Future** ×2
- **Album Transit Fruit Market Katagami** ×2
- **Soft Memory Trust Ramps** ×2
- **Greenbar** ×2
- **Meridian** ×2
- **Sounding** ×2
- **Klieg** ×2
- **Vernier** ×2

### Near-duplicate clusters (cosine ≥ 0.9) — 9 groups

- **4** items: Soft Memory Future · Soft Memory Trust Ramps · Soft Memory Future · Soft Memory Trust Ramps
- **3** items: Phosphor Void · Phosphor · Phosphor Deck
- **3** items: Klieg · Hatobue · Riverlight
- **2** items: Stratum Harbor Enterprise · Stratified Harbor Enterprise 2026
- **2** items: Polished Pop Heritage Katagami · Polished Pop Heritage Katagami
- **2** items: Album Transit Fruit Market Katagami · Album Transit Fruit Market Katagami
- **2** items: Tonbo · Crossfield Press
- **2** items: Gust Highlighter · Koizome
- **2** items: Caustic · Prism Spectrum

### Strongest pairs (top 15 by cosine, any threshold)

| cosine | A | B |
|---|---|---|
| 0.961 | Soft Memory Future | Soft Memory Future |
| 0.926 | Soft Memory Trust Ramps | Soft Memory Trust Ramps |
| 0.926 | Stratum Harbor Enterprise | Stratified Harbor Enterprise 2026 |
| 0.919 | Soft Memory Future | Soft Memory Trust Ramps |
| 0.912 | Caustic | Prism Spectrum |
| 0.912 | Soft Memory Future | Soft Memory Trust Ramps |
| 0.909 | Klieg | Hatobue |
| 0.909 | Soft Memory Trust Ramps | Soft Memory Future |
| 0.908 | Polished Pop Heritage Katagami | Polished Pop Heritage Katagami |
| 0.906 | Album Transit Fruit Market Katagami | Album Transit Fruit Market Katagami |
| 0.906 | Soft Memory Future | Soft Memory Trust Ramps |
| 0.906 | Gust Highlighter | Koizome |
| 0.903 | Phosphor Void | Phosphor Deck |
| 0.903 | Hatobue | Riverlight |
| 0.901 | Phosphor Void | Phosphor |
