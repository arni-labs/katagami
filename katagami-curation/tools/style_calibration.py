#!/usr/bin/env python3
"""Calibration of the neural style-embedding layer (AnnaWegmann/Style-Embedding)
on the 17 production voices. Leave-one-out positives, cross-voice negatives,
17-way replica retrieval, per-voice thresholds with an abstain band."""
import json
import statistics
import numpy as np
from sentence_transformers import SentenceTransformer
import voice_check_local as vc

S = "/private/tmp/claude-501/-Users-seshendranalla-Development-katagami/7693e114-563a-4638-a7d2-7ec0edd87600/scratchpad"
index = json.load(open(f"{S}/voicemds/index.json"))
model = SentenceTransformer("AnnaWegmann/Style-Embedding")

def chunks_of(corpus, size=220):
    out = []
    for _, body in corpus:
        ws = body.split()
        for i in range(0, len(ws), size):
            c = ws[i:i + size]
            if len(c) >= 140:
                out.append(" ".join(c))
    return out

voices = {}
for slug in sorted(index):
    cache = json.load(open(f"{S}/bandcache-{slug}.json"))
    voices[slug] = {
        "chunks": chunks_of(cache["corpus"]),
        "replica": open(f"{S}/replicas/{slug}.md").read().strip(),
    }

# Embed everything (normalized so dot = cosine).
for slug, v in voices.items():
    v["emb"] = model.encode(v["chunks"], normalize_embeddings=True)
    v["remb"] = model.encode([v["replica"]], normalize_embeddings=True)[0]

def centroid(embs, exclude=None):
    rows = [e for i, e in enumerate(embs) if i != exclude]
    c = np.mean(rows, axis=0)
    return c / np.linalg.norm(c)

report = {}
retrieval_hits = 0
for slug, v in voices.items():
    # positives: leave-one-out
    pos = [float(np.dot(v["emb"][i], centroid(v["emb"], exclude=i))) for i in range(len(v["emb"]))]
    cen = centroid(v["emb"])
    # negatives: every other voice's chunks vs this centroid
    neg = []
    for other, ov in voices.items():
        if other == slug:
            continue
        neg.extend(float(np.dot(e, cen)) for e in ov["emb"])
    # replica scores vs all centroids -> retrieval
    scores = {o: float(np.dot(v["remb"], centroid(ov["emb"]))) for o, ov in voices.items()}
    own = scores[slug]
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    rank = [o for o, _ in ranked].index(slug) + 1
    retrieval_hits += rank == 1
    # AUC (Mann-Whitney)
    wins = sum(1 for p in pos for n in neg if p > n) + 0.5 * sum(1 for p in pos for n in neg if p == n)
    auc = wins / (len(pos) * len(neg))
    lo_thr = max(neg)          # below this: definitely not-match territory overlaps
    hi_thr = min(pos)          # above this: inside the voice's own out-of-sample range
    report[slug] = {
        "chunks": len(v["chunks"]),
        "pos_min": round(min(pos), 3), "pos_mean": round(statistics.mean(pos), 3),
        "neg_max": round(max(neg), 3), "neg_mean": round(statistics.mean(neg), 3),
        "auc": round(auc, 3),
        "replica_score": round(own, 3),
        "replica_rank_of_17": rank,
        "thresholds": {
            "match_at": round(min(hi_thr, (hi_thr + lo_thr) / 2 + abs(hi_thr - lo_thr) * 0), 3) if hi_thr > lo_thr else round(hi_thr, 3),
            "abstain_below": round(min(hi_thr, lo_thr), 3),
            "note": "match >= pos_min; abstain in [neg_max, pos_min) when ranges overlap; no_match below",
        },
        "separated": hi_thr > lo_thr,
    }
    print(f"{slug:32} auc {auc:.3f} | pos [{min(pos):.3f}..] neg [..{max(neg):.3f}] | replica {own:.3f} rank {rank}/17 | {'CLEAN SEP' if hi_thr > lo_thr else 'OVERLAP'}")

print(f"\nreplica 17-way retrieval: {retrieval_hits}/17 rank-1")
print(f"mean AUC: {statistics.mean(r['auc'] for r in report.values()):.3f}")
json.dump(report, open(f"{S}/style-calibration.json", "w"), indent=1)
