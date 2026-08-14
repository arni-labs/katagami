# Visual (image-vector) dedup — Art Styles

Model: `google/siglip2-base-patch16-224` on each art style's rendered thumbnail. 156 art styles embedded.
Compared against the text taste-vector cosine for the same pair.

- image-cosine ≥ 0.95: **1** pairs
- image-cosine ≥ 0.92: **3** pairs
- image-cosine ≥ 0.9: **5** pairs
- image-cosine ≥ 0.85: **36** pairs
- image-cosine ≥ 0.8: **158** pairs

## Visual duplicates the text vectors miss (image ≥ 0.85, text < 0.75)

| image cos | text cos | Δ | A | B |
|---|---|---|---|---|
| 0.868 | 0.396 | 0.471 | Margin Press | Quantize |
| 0.871 | 0.432 | 0.439 | Quantize | Leadline Atlas |
| 0.853 | 0.470 | 0.382 | Inlay | Hanga Cut |
| 0.863 | 0.492 | 0.370 | Vitrine Studio | Relievo |
| 0.860 | 0.490 | 0.369 | Toner | Relievo |
| 0.924 | 0.556 | 0.368 | Marl | Graticule |
| 0.897 | 0.533 | 0.364 | Margin Press | Lavis |
| 0.871 | 0.509 | 0.362 | Phosphor Ledger | Marl |
| 0.858 | 0.509 | 0.349 | Veil Optics | Silverpoint |
| 0.872 | 0.527 | 0.345 | Tellurit | Cathode |
| 0.897 | 0.556 | 0.341 | Graphite Plate | Veil Optics |
| 0.855 | 0.527 | 0.329 | Tincture | Vitrine |
| 0.853 | 0.552 | 0.301 | Salvage | Glacis Ink |
| 0.854 | 0.571 | 0.283 | Margin Press | Frostmark |
| 0.865 | 0.589 | 0.276 | Graticule | Relievo |
| 0.863 | 0.588 | 0.275 | Dawnvapor Cel | Lumiphor |
| 0.872 | 0.599 | 0.273 | Plakat | Hanga Cut |
| 0.855 | 0.585 | 0.271 | Reticle | Leadline Atlas |
| 0.854 | 0.598 | 0.256 | Hardline | Quoin |
| 0.851 | 0.599 | 0.252 | Stakeout Bureau | Downlink |
| 0.854 | 0.604 | 0.250 | Réglure | Silverpoint |
| 0.864 | 0.616 | 0.248 | Graphite Plate | Réglure |
| 0.884 | 0.637 | 0.247 | Toner Press | Silverpoint |
| 0.880 | 0.647 | 0.233 | Screentone Press | Splash |
| 0.857 | 0.630 | 0.227 | Phosphor | Bluework |
| 0.921 | 0.695 | 0.226 | Marginalia | Silverpoint |
| 0.885 | 0.662 | 0.223 | Suiboku | Feibai Brushwork |
| 0.913 | 0.699 | 0.214 | Kasanezuri | Knockout |
| 0.904 | 0.696 | 0.208 | Toner Press | Réglure |
| 0.884 | 0.687 | 0.196 | Collodion | Platine |

## Tightest visual pairs overall

| image cos | text cos | A | B |
|---|---|---|---|
| 0.952 | 0.759 | Graphite Plate | Silverpoint |
| 0.924 | 0.556 | Marl | Graticule |
| 0.921 | 0.695 | Marginalia | Silverpoint |
| 0.913 | 0.699 | Kasanezuri | Knockout |
| 0.904 | 0.696 | Toner Press | Réglure |
| 0.897 | 0.556 | Graphite Plate | Veil Optics |
| 0.897 | 0.533 | Margin Press | Lavis |
| 0.889 | 0.789 | Graphite Plate | Marginalia |
| 0.885 | 0.662 | Suiboku | Feibai Brushwork |
| 0.884 | 0.687 | Collodion | Platine |
| 0.884 | 0.637 | Toner Press | Silverpoint |
| 0.880 | 0.720 | Plakat | Werkblock |
| 0.880 | 0.647 | Screentone Press | Splash |
| 0.873 | 0.704 | Graphite Plate | Toner Press |
| 0.872 | 0.599 | Plakat | Hanga Cut |
| 0.872 | 0.527 | Tellurit | Cathode |
| 0.871 | 0.432 | Quantize | Leadline Atlas |
| 0.871 | 0.509 | Phosphor Ledger | Marl |
| 0.868 | 0.396 | Margin Press | Quantize |
| 0.865 | 0.589 | Graticule | Relievo |
| 0.864 | 0.616 | Graphite Plate | Réglure |
| 0.863 | 0.588 | Dawnvapor Cel | Lumiphor |
| 0.863 | 0.492 | Vitrine Studio | Relievo |
| 0.860 | 0.490 | Toner | Relievo |
| 0.859 | 0.678 | Marginalia | Toner Press |