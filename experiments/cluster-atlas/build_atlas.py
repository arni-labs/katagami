#!/usr/bin/env python3
"""Compute the explorable-atlas payload from cached taste vectors.

Per lane (design languages / palette systems / art styles):
  * 2D layout via t-SNE on L2-normalised vectors (UMAP won't build on py3.14;
    on normalised vectors Euclidean t-SNE preserves the same neighbourhoods).
  * a hierarchical Ward clustering cut at three nesting levels -> the zoom tree.
  * distinctive-tag labels per cluster (in-cluster frequency vs global frequency).
  * near-duplicate pairs (cosine) grouped into components via union-find.

Writes out/atlas_data.json (consumed by the HTML) and out/dedup_report.md.
Vectors are text embeddings of each entity's DESCRIPTION, so similarity here is
description-similarity, not rendered-image similarity (see stage 2).
"""
import json
import math
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.cluster.hierarchy import fcluster, linkage
from sklearn.manifold import TSNE

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
OUT = HERE / "out"
OUT.mkdir(parents=True, exist_ok=True)

LANE_LABEL = {
    "language": "Design Languages",
    "palette": "Palette Systems",
    "artstyle": "Art Styles",
    "artstyle_visual": "Art Styles (visual)",
}
SIM_KIND = {
    "language": "description text (MiniLM)",
    "palette": "description text (MiniLM)",
    "artstyle": "description text (MiniLM)",
    "artstyle_visual": "rendered image (SigLIP)",
}
# nesting cut levels (max clusters) as a fraction of lane size, clamped.
LEVELS = ["broad", "mid", "fine"]

# tags too generic to make a good cluster label
STOP_TAGS = {
    "no-borders", "spot-color", "flat", "clean", "minimal", "minimalist",
    "modern", "bright", "bold", "design", "palette", "art-style", "style",
}


def l2norm(x: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(x, axis=1, keepdims=True)
    n[n == 0] = 1.0
    return x / n


def choose_ks(n: int) -> dict:
    broad = max(3, min(6, round(n / 40)))
    mid = max(broad + 2, min(16, round(n / 14)))
    fine = max(mid + 4, min(40, round(n / 6)))
    return {"broad": broad, "mid": mid, "fine": fine}


def tsne_layout(xn: np.ndarray) -> np.ndarray:
    n = len(xn)
    perp = max(5, min(35, n // 12))
    ts = TSNE(
        n_components=2,
        perplexity=perp,
        init="pca",
        learning_rate="auto",
        metric="euclidean",
        random_state=42,
        max_iter=1500,
    )
    xy = ts.fit_transform(xn)
    # normalise into a stable [-1, 1] box for the viewer
    xy = xy - xy.mean(axis=0)
    span = np.abs(xy).max()
    if span > 0:
        xy = xy / span
    return xy


def distinctive_labels(members, records, global_tag_freq, n_total, k=3):
    """Pick up to k tags that are frequent inside the cluster and rare globally."""
    local = Counter()
    for i in members:
        for t in records[i]["tags"]:
            if t and t.lower() not in STOP_TAGS:
                local[t] += 1
    if not local:
        return []
    m = len(members)
    floor = max(2, round(m * 0.08))
    scored = []
    for tag, c in local.items():
        in_frac = c / m
        glob = global_tag_freq.get(tag, 1) / n_total
        score = in_frac * math.log(1 + 1.0 / max(glob, 1e-6))
        scored.append((score, c, tag))
    scored.sort(reverse=True)
    picked = [t for _, c, t in scored[:k] if c >= floor]
    if not picked and scored and scored[0][1] >= 2:
        picked = [scored[0][2]]  # at least the single strongest tag
    return picked


def union_find(n):
    parent = list(range(n))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    return find, union


def process_lane(records):
    n = len(records)
    x = np.array([r["vec"] for r in records], dtype=np.float64)
    xn = l2norm(x)
    sim = xn @ xn.T  # cosine similarity matrix
    np.fill_diagonal(sim, -1.0)

    xy = tsne_layout(xn)

    # hierarchical clustering (Ward on normalised vectors)
    Z = linkage(xn, method="ward")
    ks = choose_ks(n)
    level_assign = {}
    for lvl, k in ks.items():
        labels = fcluster(Z, t=k, criterion="maxclust")
        level_assign[lvl] = labels

    global_tag_freq = Counter()
    for r in records:
        for t in set(r["tags"]):
            global_tag_freq[t] += 1

    clusters = {}
    for lvl in LEVELS:
        labels = level_assign[lvl]
        lvl_clusters = []
        for cid in sorted(set(labels)):
            members = [i for i in range(n) if labels[i] == cid]
            pts = xy[members]
            cx, cy = float(pts[:, 0].mean()), float(pts[:, 1].mean())
            lab = distinctive_labels(members, records, global_tag_freq, n)
            # representative = member closest to cluster centroid in vector space
            centroid = xn[members].mean(axis=0)
            rep_i = members[int(np.argmax(xn[members] @ centroid))]
            lvl_clusters.append({
                "id": int(cid),
                "size": len(members),
                "cx": cx,
                "cy": cy,
                "tags": lab,
                "label": " / ".join(lab) if lab else records[rep_i]["name"],
                "rep": records[rep_i]["name"],
            })
        clusters[lvl] = lvl_clusters

    points = []
    for i, r in enumerate(records):
        points.append({
            "id": r["id"],
            "name": r["name"],
            "x": float(xy[i, 0]),
            "y": float(xy[i, 1]),
            "tags": r["tags"][:6],
            "medium": r.get("medium"),
            "url": r["page_url"],
            "thumb": r.get("thumb_url"),
            "cl": {lvl: int(level_assign[lvl][i]) for lvl in LEVELS},
        })

    # every pair above a low floor, sorted desc -> the viewer's threshold slider
    # filters this list live, and the dedup report reads the top of it.
    FLOOR = 0.80
    iu = np.triu_indices(n, k=1)
    pair_sims = sim[iu]
    idx = np.where(pair_sims >= FLOOR)[0]
    pairs = [
        {"a": int(iu[0][k2]), "b": int(iu[1][k2]), "sim": round(float(pair_sims[k2]), 4)}
        for k2 in idx
    ]
    pairs.sort(key=lambda p: -p["sim"])
    pairs = pairs[:2000]

    def count_at(t):
        return sum(1 for p in pairs if p["sim"] >= t)

    bucket_counts = {str(t): count_at(t) for t in (0.95, 0.92, 0.90, 0.85, 0.80)}

    # adaptive grouping threshold: the highest of these that actually links pairs,
    # so lanes whose descriptions never reach 0.90 (art styles) still form groups.
    primary_t = 0.90
    for t in (0.90, 0.87, 0.85, 0.83):
        if count_at(t) > 0:
            primary_t = t
            break
    find, union = union_find(n)
    for p in pairs:
        if p["sim"] >= primary_t:
            union(p["a"], p["b"])
    comp = {}
    for i in range(n):
        comp.setdefault(find(i), []).append(i)
    groups = [sorted(v) for v in comp.values() if len(v) > 1]
    groups.sort(key=len, reverse=True)

    # exact same-name entities (a strong dedup signal independent of cosine)
    by_name = {}
    for i, r in enumerate(records):
        by_name.setdefault((r["name"] or "").strip().lower(), []).append(i)
    samename = sorted(
        (sorted(v) for v in by_name.values() if len(v) > 1),
        key=len, reverse=True,
    )

    # per-point nearest neighbour (for "most similar" on click)
    nn = []
    for i in range(n):
        j = int(np.argmax(sim[i]))
        nn.append({"j": j, "sim": round(float(sim[i][j]), 4)})

    return {
        "n": n,
        "ks": ks,
        "points": points,
        "clusters": clusters,
        "pairs": pairs,
        "bucket_counts": bucket_counts,
        "primary_t": primary_t,
        "groups": groups,
        "samename": samename,
        "nn": nn,
    }


def load_image_vectors():
    """Return (id -> vec, human label) for the art-style visual lane.

    Prefers the multi-proof-averaged SigLIP vectors (dict keyed by id -> {name, vec})
    exported by the task-#18 experiment; falls back to the single-thumbnail vectors.
    """
    multi = DATA / "style_vectors_siglip2_base_224_multi.json"
    if multi.exists():
        d = json.loads(multi.read_text())
        return {k: v["vec"] for k, v in d.items()}, "rendered image (multi-proof SigLIP2)"
    single = DATA / "image_vectors.json"
    if single.exists():
        return ({r["id"]: r["vec"] for r in json.loads(single.read_text())},
                "rendered image (SigLIP, single thumbnail)")
    return None, None


def main():
    records_all = json.loads((DATA / "entities.json").read_text())
    by_lane = {"language": [], "palette": [], "artstyle": []}
    for r in records_all:
        by_lane[r["lane"]].append(r)

    # optional 4th lane: art styles laid out by their *image* vectors, so the atlas
    # carries both the text map and the visual map. Prefer the multi-proof-averaged
    # SigLIP vectors (task #18 winning config: 2/6 -> 5/6 in-group NN on the hard
    # benchmark) and fall back to the single-thumbnail vectors.
    img_by_id, visual_kind = load_image_vectors()
    if img_by_id:
        visual_recs = []
        for r in by_lane["artstyle"]:
            v = img_by_id.get(r["id"])
            if v and len(v) > 2:
                vr = dict(r)
                vr["vec"] = v
                vr["lane"] = "artstyle_visual"
                visual_recs.append(vr)
        if visual_recs:
            by_lane["artstyle_visual"] = visual_recs
            SIM_KIND["artstyle_visual"] = visual_kind

    lane_order = ["artstyle", "language", "palette"]
    if "artstyle_visual" in by_lane:
        lane_order.insert(1, "artstyle_visual")

    payload = {"lanes": {}, "lane_order": lane_order}
    for lane in lane_order:
        recs = by_lane[lane]
        print(f"[{lane}] n={len(recs)} ...")
        payload["lanes"][lane] = {
            "label": LANE_LABEL[lane],
            "sim_kind": SIM_KIND[lane],
            **process_lane(recs),
        }
        lp = payload["lanes"][lane]
        print(f"    ks={lp['ks']}  primary_t={lp['primary_t']}  "
              f"dup-groups={len(lp['groups'])}  buckets={lp['bucket_counts']}")

    (OUT / "atlas_data.json").write_text(json.dumps(payload))
    print(f"wrote {OUT / 'atlas_data.json'} "
          f"({(OUT / 'atlas_data.json').stat().st_size // 1024} KB)")
    write_dedup_report(payload, records_all)


def write_dedup_report(payload, records_all):
    lines = ["# Katagami taste-vector dedup report (text embeddings)", ""]
    lines.append("Similarity = cosine of the 384-d text embedding of each entity's "
                 "description (name + tags + philosophy/medium/palette). This catches "
                 "**description**-level duplication, not rendered-image duplication.")
    lines.append("")
    for lane in payload["lane_order"]:
        lp = payload["lanes"][lane]
        pts = lp["points"]
        lines.append(f"## {lp['label']}  ({lp['n']} published)")
        lines.append("")
        for t in ["0.95", "0.92", "0.9", "0.85", "0.8"]:
            lines.append(f"- pairs with cosine ≥ {t}: **{lp['bucket_counts'][t]}**")
        lines.append("")
        same = lp["samename"]
        if same:
            n_extra = sum(len(g) - 1 for g in same)
            lines.append(f"### Exact same-name duplicates — {len(same)} names, "
                         f"{n_extra} redundant entities")
            lines.append("")
            for g in same:
                lines.append(f"- **{pts[g[0]]['name']}** ×{len(g)}")
            lines.append("")
        groups = lp["groups"]
        if groups:
            lines.append(f"### Near-duplicate clusters (cosine ≥ {lp['primary_t']}) — "
                         f"{len(groups)} groups")
            lines.append("")
            for g in groups[:25]:
                names = [pts[i]["name"] for i in g]
                lines.append(f"- **{len(g)}** items: " + " · ".join(names))
            lines.append("")
        top = lp["pairs"][:15]
        if top:
            lines.append("### Strongest pairs (top 15 by cosine, any threshold)")
            lines.append("")
            lines.append("| cosine | A | B |")
            lines.append("|---|---|---|")
            for p in top:
                lines.append(f"| {p['sim']:.3f} | {pts[p['a']]['name']} | "
                             f"{pts[p['b']]['name']} |")
            lines.append("")
    (OUT / "dedup_report.md").write_text("\n".join(lines))
    print(f"wrote {OUT / 'dedup_report.md'}")


if __name__ == "__main__":
    main()
