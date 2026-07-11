# ARN-246 — Free image-embedding upgrade experiment

Six art styles Rita reads as near-identical: **Misprint, Serigraph, Quoin, Inlay, Toner Press, Réglure**. A good visual embedding should make them each other's nearest neighbors. The baseline scatters them and points several *outward* to unrelated styles.

**Key metric — NN-in-6:** of the 6 styles, how many have their nearest neighbor (over all 156 styles) inside the 6. Baseline single-thumb = the bar to beat. `mean`/`min` = intra-6 cosine among the 15 pairs.

`margin` = mean over the 6 of (closest of the other 5) − (closest outside style). Positive means the 6 are, on average, each other's nearest neighbors; bigger = more robust separation.

## Scoreboard

| Model | dim | variant | NN-in-6 | mean margin | intra-6 mean | intra-6 min | global mean cos (collapse check) |
|---|---|---|---|---|---|---|---|
| SigLIP2 base / 224px (baseline model) | 768 | single | **2/6** | -0.046 | 0.689 | 0.558 | 0.566 (p95 0.729) |
| SigLIP2 base / 224px (baseline model) | 768 | multi | **5/6** | +0.013 | 0.819 | 0.723 | 0.731 (p95 0.839) |
| SigLIP2 large / 384px | 1024 | single | **1/6** | -0.039 | 0.665 | 0.487 | 0.531 (p95 0.699) |
| SigLIP2 large / 384px | 1024 | multi | **4/6** | +0.009 | 0.793 | 0.676 | 0.692 (p95 0.820) |
| SigLIP2 so400m / 512px | 1152 | single | **1/6** | -0.032 | 0.672 | 0.504 | 0.543 (p95 0.702) |
| SigLIP2 so400m / 512px | 1152 | multi | **3/6** | +0.016 | 0.803 | 0.689 | 0.700 (p95 0.823) |
| nomic-embed-vision-v1.5 / 768d | 768 | single | **2/6** | -0.011 | 0.847 | 0.775 | 0.745 (p95 0.861) |
| nomic-embed-vision-v1.5 / 768d | 768 | multi | **2/6** | -0.012 | 0.908 | 0.862 | 0.848 (p95 0.925) |
| DINOv2 large (self-supervised) | 1024 | single | **2/6** | -0.092 | 0.335 | 0.044 | 0.091 (p95 0.390) |
| DINOv2 large (self-supervised) | 1024 | multi | **2/6** | -0.008 | 0.417 | 0.217 | 0.233 (p95 0.452) |

## SigLIP2 base / 224px (baseline model) (dim 768)

### single — NN-in-6 **2/6**, intra-6 mean 0.689 (min 0.558)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Plinth | 0.750 | ❌ outward | Serigraph | 0.733 |
| Serigraph | Lavis | 0.840 | ❌ outward | Misprint | 0.733 |
| Quoin | Hardline | 0.854 | ❌ outward | Inlay | 0.720 |
| Inlay | Hanga Cut | 0.853 | ❌ outward | Réglure | 0.770 |
| Toner Press | Réglure | 0.904 | ✅ | Réglure | 0.904 |
| Réglure | Toner Press | 0.904 | ✅ | Toner Press | 0.904 |

15 pairwise cosines among the 6: Misp·Seri 0.733, Misp·Quoi 0.586, Misp·Inla 0.715, Misp·Tone 0.628, Misp·Régl 0.649, Seri·Quoi 0.598, Seri·Inla 0.720, Seri·Tone 0.706, Seri·Régl 0.720, Quoi·Inla 0.720, Quoi·Tone 0.558, Quoi·Régl 0.580, Inla·Tone 0.741, Inla·Régl 0.770, Tone·Régl 0.904

### multi — NN-in-6 **5/6**, intra-6 mean 0.819 (min 0.723)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Serigraph | 0.901 | ✅ | Serigraph | 0.901 |
| Serigraph | Misprint | 0.901 | ✅ | Misprint | 0.901 |
| Quoin | Plakat | 0.919 | ❌ outward | Inlay | 0.911 |
| Inlay | Quoin | 0.911 | ✅ | Quoin | 0.911 |
| Toner Press | Réglure | 0.920 | ✅ | Réglure | 0.920 |
| Réglure | Toner Press | 0.920 | ✅ | Toner Press | 0.920 |

15 pairwise cosines among the 6: Misp·Seri 0.901, Misp·Quoi 0.822, Misp·Inla 0.853, Misp·Tone 0.778, Misp·Régl 0.808, Seri·Quoi 0.812, Seri·Inla 0.824, Seri·Tone 0.764, Seri·Régl 0.806, Quoi·Inla 0.911, Quoi·Tone 0.723, Quoi·Régl 0.765, Inla·Tone 0.787, Inla·Régl 0.804, Tone·Régl 0.920

## SigLIP2 large / 384px (dim 1024)

### single — NN-in-6 **1/6**, intra-6 mean 0.665 (min 0.487)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Copyshop Scratch | 0.731 | ❌ outward | Serigraph | 0.721 |
| Serigraph | Lavis | 0.826 | ❌ outward | Inlay | 0.734 |
| Quoin | Hardline | 0.794 | ❌ outward | Inlay | 0.706 |
| Inlay | Hanga Cut | 0.850 | ❌ outward | Réglure | 0.794 |
| Toner Press | Réglure | 0.862 | ✅ | Réglure | 0.862 |
| Réglure | Silverpoint | 0.875 | ❌ outward | Toner Press | 0.862 |

15 pairwise cosines among the 6: Misp·Seri 0.721, Misp·Quoi 0.530, Misp·Inla 0.674, Misp·Tone 0.602, Misp·Régl 0.689, Seri·Quoi 0.523, Seri·Inla 0.734, Seri·Tone 0.662, Seri·Régl 0.729, Quoi·Inla 0.706, Quoi·Tone 0.487, Quoi·Régl 0.544, Inla·Tone 0.724, Inla·Régl 0.794, Tone·Régl 0.862

### multi — NN-in-6 **4/6**, intra-6 mean 0.793 (min 0.676)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Serigraph | 0.895 | ✅ | Serigraph | 0.895 |
| Serigraph | Overprint | 0.895 | ❌ outward | Misprint | 0.895 |
| Quoin | Inlay | 0.911 | ✅ | Inlay | 0.911 |
| Inlay | Quoin | 0.911 | ✅ | Quoin | 0.911 |
| Toner Press | Réglure | 0.881 | ✅ | Réglure | 0.881 |
| Réglure | Silverpoint | 0.908 | ❌ outward | Toner Press | 0.881 |

15 pairwise cosines among the 6: Misp·Seri 0.895, Misp·Quoi 0.803, Misp·Inla 0.822, Misp·Tone 0.741, Misp·Régl 0.782, Seri·Quoi 0.792, Seri·Inla 0.808, Seri·Tone 0.737, Seri·Régl 0.793, Quoi·Inla 0.911, Quoi·Tone 0.676, Quoi·Régl 0.737, Inla·Tone 0.735, Inla·Régl 0.778, Tone·Régl 0.881

## SigLIP2 so400m / 512px (dim 1152)

### single — NN-in-6 **1/6**, intra-6 mean 0.672 (min 0.504)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Plinth | 0.782 | ❌ outward | Serigraph | 0.749 |
| Serigraph | Lavis | 0.809 | ❌ outward | Misprint | 0.749 |
| Quoin | Hardline | 0.839 | ❌ outward | Inlay | 0.706 |
| Inlay | Plakat | 0.793 | ❌ outward | Réglure | 0.763 |
| Toner Press | Réglure | 0.857 | ✅ | Réglure | 0.857 |
| Réglure | Silverpoint | 0.867 | ❌ outward | Toner Press | 0.857 |

15 pairwise cosines among the 6: Misp·Seri 0.749, Misp·Quoi 0.582, Misp·Inla 0.660, Misp·Tone 0.598, Misp·Régl 0.674, Seri·Quoi 0.594, Seri·Inla 0.711, Seri·Tone 0.650, Seri·Régl 0.747, Quoi·Inla 0.706, Quoi·Tone 0.504, Quoi·Régl 0.556, Inla·Tone 0.728, Inla·Régl 0.763, Tone·Régl 0.857

### multi — NN-in-6 **3/6**, intra-6 mean 0.803 (min 0.689)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Serigraph | 0.906 | ✅ | Serigraph | 0.906 |
| Serigraph | Overprint | 0.906 | ❌ outward | Misprint | 0.906 |
| Quoin | Plakat | 0.912 | ❌ outward | Inlay | 0.908 |
| Inlay | Quoin | 0.908 | ✅ | Quoin | 0.908 |
| Toner Press | Réglure | 0.885 | ✅ | Réglure | 0.885 |
| Réglure | Silverpoint | 0.901 | ❌ outward | Toner Press | 0.885 |

15 pairwise cosines among the 6: Misp·Seri 0.906, Misp·Quoi 0.816, Misp·Inla 0.836, Misp·Tone 0.737, Misp·Régl 0.803, Seri·Quoi 0.807, Seri·Inla 0.819, Seri·Tone 0.734, Seri·Régl 0.808, Quoi·Inla 0.908, Quoi·Tone 0.689, Quoi·Régl 0.752, Inla·Tone 0.749, Inla·Régl 0.790, Tone·Régl 0.885

## nomic-embed-vision-v1.5 / 768d (dim 768)

### single — NN-in-6 **2/6**, intra-6 mean 0.847 (min 0.775)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Serigraph | 0.938 | ✅ | Serigraph | 0.938 |
| Serigraph | Misprint | 0.938 | ✅ | Misprint | 0.938 |
| Quoin | Foldspring | 0.910 | ❌ outward | Inlay | 0.867 |
| Inlay | Misprint | 0.954 | ❌ outward | Réglure | 0.899 |
| Toner Press | Silverpoint | 0.941 | ❌ outward | Réglure | 0.924 |
| Réglure | Mill Proof | 0.939 | ❌ outward | Toner Press | 0.924 |

15 pairwise cosines among the 6: Misp·Seri 0.938, Misp·Quoi 0.775, Misp·Inla 0.887, Misp·Tone 0.797, Misp·Régl 0.798, Seri·Quoi 0.796, Seri·Inla 0.879, Seri·Tone 0.803, Seri·Régl 0.824, Quoi·Inla 0.867, Quoi·Tone 0.811, Quoi·Régl 0.823, Inla·Tone 0.878, Inla·Régl 0.899, Tone·Régl 0.924

### multi — NN-in-6 **2/6**, intra-6 mean 0.908 (min 0.862)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Serigraph | 0.974 | ✅ | Serigraph | 0.974 |
| Serigraph | Misprint | 0.974 | ✅ | Misprint | 0.974 |
| Quoin | Werkblock | 0.970 | ❌ outward | Serigraph | 0.938 |
| Inlay | Misprint | 0.953 | ❌ outward | Misprint | 0.952 |
| Toner Press | Silverpoint | 0.951 | ❌ outward | Réglure | 0.926 |
| Réglure | Graphite Plate | 0.953 | ❌ outward | Toner Press | 0.926 |

15 pairwise cosines among the 6: Misp·Seri 0.974, Misp·Quoi 0.928, Misp·Inla 0.952, Misp·Tone 0.887, Misp·Régl 0.891, Seri·Quoi 0.938, Seri·Inla 0.932, Seri·Tone 0.862, Seri·Régl 0.877, Quoi·Inla 0.935, Quoi·Tone 0.874, Quoi·Régl 0.895, Inla·Tone 0.869, Inla·Régl 0.874, Tone·Régl 0.926

## DINOv2 large (self-supervised) (dim 1024)

### single — NN-in-6 **2/6**, intra-6 mean 0.335 (min 0.044)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Plinth | 0.487 | ❌ outward | Réglure | 0.256 |
| Serigraph | Lumiphore | 0.684 | ❌ outward | Toner Press | 0.651 |
| Quoin | Hardline | 0.586 | ❌ outward | Inlay | 0.243 |
| Inlay | Hanga Cut | 0.594 | ❌ outward | Toner Press | 0.519 |
| Toner Press | Réglure | 0.817 | ✅ | Réglure | 0.817 |
| Réglure | Toner Press | 0.817 | ✅ | Toner Press | 0.817 |

15 pairwise cosines among the 6: Misp·Seri 0.222, Misp·Quoi 0.044, Misp·Inla 0.142, Misp·Tone 0.254, Misp·Régl 0.256, Seri·Quoi 0.104, Seri·Inla 0.443, Seri·Tone 0.651, Seri·Régl 0.593, Quoi·Inla 0.243, Quoi·Tone 0.124, Quoi·Régl 0.136, Inla·Tone 0.519, Inla·Régl 0.469, Tone·Régl 0.817

### multi — NN-in-6 **2/6**, intra-6 mean 0.417 (min 0.217)

Per style: its nearest neighbor over all 156, and whether it lands inside the 6 or points outward.

| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |
|---|---|---|---|---|---|
| Misprint | Cinnabar Seal | 0.457 | ❌ outward | Serigraph | 0.406 |
| Serigraph | Lumiphore | 0.561 | ❌ outward | Réglure | 0.508 |
| Quoin | Plakat | 0.652 | ❌ outward | Inlay | 0.609 |
| Inlay | Almanac | 0.641 | ❌ outward | Quoin | 0.609 |
| Toner Press | Réglure | 0.712 | ✅ | Réglure | 0.712 |
| Réglure | Toner Press | 0.712 | ✅ | Toner Press | 0.712 |

15 pairwise cosines among the 6: Misp·Seri 0.406, Misp·Quoi 0.217, Misp·Inla 0.278, Misp·Tone 0.334, Misp·Régl 0.348, Seri·Quoi 0.312, Seri·Inla 0.385, Seri·Tone 0.492, Seri·Régl 0.508, Quoi·Inla 0.609, Quoi·Tone 0.308, Quoi·Régl 0.349, Inla·Tone 0.535, Inla·Régl 0.458, Tone·Régl 0.712
