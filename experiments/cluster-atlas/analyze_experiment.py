#!/usr/bin/env python3
"""Analyze the embedding experiment: for each model x {single, multi} variant,
score how tightly the 6 look-alike art styles cluster.

Reads data/imgvecs_<tag>.json (per-image vectors) + data/style_images.json.
Builds style vectors two ways:
  single = the one representative thumbnail's vector (the baseline method)
  multi  = mean of every proof/ref image's vector for the style (L2-normed, renormed)

Key metrics on the 6 targets, computed over ALL 156 styles:
  * 15 pairwise cosines among the 6
  * mean / min intra-6 cosine
  * for each of the 6: its global nearest neighbor over all 155 others --
    is the NN one of the other 5 (good) or an outside style (baseline's failure)?
  * intra-6 NN count = how many of the 6 have their nearest neighbor inside the 6
Plus a collapse sanity check: global mean + p95 pairwise cosine over all 156.

Writes data/experiment_results.json and out/embed_experiment_report.md.
"""
import itertools
import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
IMG = HERE / "multi_image_data"
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)

TARGETS = [
    ("Misprint",    "en-019efd20-27ed-7ec3-9d1a-ba1553784762"),
    ("Serigraph",   "en-019efc00-2c2c-7d53-9b11-374005ff0da2"),
    ("Quoin",       "en-019ef95b-4e19-7eb3-86c3-a2dbcda9b2bf"),
    ("Inlay",       "en-019ef95b-b23d-74d1-aca7-923e8bf2fb1e"),
    ("Toner Press", "en-019ef8ab-e01d-71c2-9a32-cd0f2f4424d2"),
    ("Réglure",     "en-019ef8ac-b59f-7d51-882c-8c0dbe5644fc"),
]
TARGET_IDS = [t[1] for t in TARGETS]
TARGET_SET = set(TARGET_IDS)

# display order matters; keep tags in this order in the report
TAG_ORDER = ["siglip2_base_224", "siglip2_large_384", "siglip2_so400m_512",
             "nomic_vision_15", "dinov2_large"]
TAG_LABEL = {
    "siglip2_base_224":  "SigLIP2 base / 224px (baseline model)",
    "siglip2_large_384": "SigLIP2 large / 384px",
    "siglip2_so400m_512": "SigLIP2 so400m / 512px",
    "nomic_vision_15":   "nomic-embed-vision-v1.5 / 768d",
    "dinov2_large":      "DINOv2 large (self-supervised)",
}


def l2(x):
    n = np.linalg.norm(x, axis=-1, keepdims=True)
    n[n == 0] = 1
    return x / n


def build_style_vectors(imgvecs, manifest, variant):
    """Return (ids, names, matrix) of L2-normed style vectors."""
    ids, names, vecs = [], [], []
    for sid, st in manifest.items():
        if variant == "single":
            fid = st["thumb"]
            if fid and fid in imgvecs:
                v = np.array(imgvecs[fid], dtype=np.float64)
            else:  # fallback: first available image
                avail = [imgvecs[f] for f in st["images"] if f in imgvecs]
                if not avail:
                    continue
                v = np.array(avail[0], dtype=np.float64)
        else:  # multi
            avail = [np.array(imgvecs[f], dtype=np.float64)
                     for f in st["images"] if f in imgvecs]
            if not avail:
                continue
            m = l2(np.array(avail))          # renorm each image vector
            v = m.mean(axis=0)               # average
        ids.append(sid)
        names.append(st["name"])
        vecs.append(v)
    X = l2(np.array(vecs))                    # renorm the style vector
    return ids, names, X


def score(imgvecs, manifest, variant):
    ids, names, X = build_style_vectors(imgvecs, manifest, variant)
    idx = {sid: i for i, sid in enumerate(ids)}
    S = X @ X.T
    np.fill_diagonal(S, -1.0)

    # 15 pairwise cosines among the 6
    pw = []
    present = [tid for tid in TARGET_IDS if tid in idx]
    for a, b in itertools.combinations(present, 2):
        pw.append({"a": TAG_NAME[a], "b": TAG_NAME[b],
                   "cos": round(float(S[idx[a], idx[b]]), 4)})
    intra = [p["cos"] for p in pw]

    # per-target global nearest neighbor over all 155 others
    per = []
    nn_in6 = 0
    for tid in present:
        i = idx[tid]
        row = S[i].copy()
        j = int(np.argmax(row))
        nn_id = ids[j]
        in6 = nn_id in TARGET_SET
        nn_in6 += 1 if in6 else 0
        # closest other target + closest outsider (to show baseline's "points outward")
        best_in6 = max((float(S[i, idx[t]]), t) for t in present if t != tid)
        out_idx = [k for k in range(len(ids)) if ids[k] not in TARGET_SET]
        ko = out_idx[int(np.argmax(row[out_idx]))]
        margin = float(best_in6[0]) - float(row[ko])  # >0 iff NN points inward
        per.append({
            "name": TAG_NAME[tid],
            "nn_name": names[j], "nn_cos": round(float(row[j]), 4), "nn_in6": in6,
            "best_in6_cos": round(best_in6[0], 4), "best_in6_name": TAG_NAME[best_in6[1]],
            "closest_out_name": names[ko], "closest_out_cos": round(float(row[ko]), 4),
            "margin": round(margin, 4),
        })

    # collapse sanity: global pairwise cosine distribution over all styles
    iu = np.triu_indices(len(ids), 1)
    allc = (X @ X.T)[iu]
    sanity = {
        "n_styles": len(ids),
        "global_mean_cos": round(float(allc.mean()), 4),
        "global_p95_cos": round(float(np.percentile(allc, 95)), 4),
        "global_p99_cos": round(float(np.percentile(allc, 99)), 4),
    }
    return {
        "variant": variant,
        "pairwise": pw,
        "intra6_mean": round(float(np.mean(intra)), 4),
        "intra6_min": round(float(np.min(intra)), 4),
        "intra6_max": round(float(np.max(intra)), 4),
        "nn_in6_count": nn_in6,
        "mean_margin": round(float(np.mean([t["margin"] for t in per])), 4),
        "min_margin": round(float(np.min([t["margin"] for t in per])), 4),
        "per_target": per,
        "sanity": sanity,
    }


TAG_NAME = {tid: nm for nm, tid in TARGETS}


def main():
    manifest = json.loads((DATA / "style_images.json").read_text())
    # every image id belonging to the 6 targets must be embedded, else the file is
    # mid-write / incomplete and we skip it (avoids racing a live embedding run)
    target_img_ids = set()
    for tid in TARGET_IDS:
        target_img_ids.update(manifest[tid]["images"])

    results = {}
    for tag in TAG_ORDER:
        p = DATA / f"imgvecs_{tag}.json"
        if not p.exists():
            continue
        try:
            imgvecs = json.loads(p.read_text())
        except json.JSONDecodeError:
            print(f"[{tag}] skipped: file mid-write", flush=True)
            continue
        missing = [i for i in target_img_ids if i not in imgvecs
                   and (IMG / (i + ".img")).exists()]
        if missing or not imgvecs:
            print(f"[{tag}] skipped: incomplete ({len(missing)} target images not "
                  f"embedded yet)", flush=True)
            continue
        dim = len(next(iter(imgvecs.values())))
        results[tag] = {
            "label": TAG_LABEL[tag], "dim": dim,
            "single": score(imgvecs, manifest, "single"),
            "multi": score(imgvecs, manifest, "multi"),
        }
        print(f"[{tag}] dim={dim} "
              f"single NN-in6={results[tag]['single']['nn_in6_count']}/6 "
              f"mean={results[tag]['single']['intra6_mean']} | "
              f"multi NN-in6={results[tag]['multi']['nn_in6_count']}/6 "
              f"mean={results[tag]['multi']['intra6_mean']}", flush=True)

    (DATA / "experiment_results.json").write_text(json.dumps(results, indent=2))
    write_report(results)


def write_report(results):
    L = ["# ARN-246 — Free image-embedding upgrade experiment", "",
         "Six art styles Rita reads as near-identical: **Misprint, Serigraph, "
         "Quoin, Inlay, Toner Press, Réglure**. A good visual embedding should make "
         "them each other's nearest neighbors. The baseline scatters them and points "
         "several *outward* to unrelated styles.", "",
         "**Key metric — NN-in-6:** of the 6 styles, how many have their nearest "
         "neighbor (over all 156 styles) inside the 6. Baseline single-thumb = the "
         "bar to beat. `mean`/`min` = intra-6 cosine among the 15 pairs.", ""]
    L += ["`margin` = mean over the 6 of (closest of the other 5) − (closest outside "
          "style). Positive means the 6 are, on average, each other's nearest "
          "neighbors; bigger = more robust separation.", "",
          "## Scoreboard", "",
          "| Model | dim | variant | NN-in-6 | mean margin | intra-6 mean | intra-6 min | global mean cos (collapse check) |",
          "|---|---|---|---|---|---|---|---|"]
    for tag in TAG_ORDER:
        if tag not in results:
            continue
        r = results[tag]
        for variant in ("single", "multi"):
            s = r[variant]
            L.append(f"| {r['label']} | {r['dim']} | {variant} | "
                     f"**{s['nn_in6_count']}/6** | {s['mean_margin']:+.3f} | "
                     f"{s['intra6_mean']:.3f} | "
                     f"{s['intra6_min']:.3f} | {s['sanity']['global_mean_cos']:.3f} "
                     f"(p95 {s['sanity']['global_p95_cos']:.3f}) |")
    L.append("")

    for tag in TAG_ORDER:
        if tag not in results:
            continue
        r = results[tag]
        L += [f"## {r['label']} (dim {r['dim']})", ""]
        for variant in ("single", "multi"):
            s = r[variant]
            L += [f"### {variant} — NN-in-6 **{s['nn_in6_count']}/6**, "
                  f"intra-6 mean {s['intra6_mean']:.3f} (min {s['intra6_min']:.3f})", "",
                  "Per style: its nearest neighbor over all 156, and whether it lands "
                  "inside the 6 or points outward.", "",
                  "| style | nearest neighbor | cos | in 6? | best of the other 5 | cos |",
                  "|---|---|---|---|---|---|"]
            for t in s["per_target"]:
                flag = "✅" if t["nn_in6"] else "❌ outward"
                L.append(f"| {t['name']} | {t['nn_name']} | {t['nn_cos']:.3f} | {flag} | "
                         f"{t['best_in6_name']} | {t['best_in6_cos']:.3f} |")
            L.append("")
            L.append("15 pairwise cosines among the 6: " +
                     ", ".join(f"{p['a'][:4]}·{p['b'][:4]} {p['cos']:.3f}"
                               for p in s["pairwise"]))
            L.append("")
    (OUT / "embed_experiment_report.md").write_text("\n".join(L))
    print(f"wrote {OUT/'embed_experiment_report.md'}")


if __name__ == "__main__":
    main()
