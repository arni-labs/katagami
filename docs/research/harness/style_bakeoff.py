#!/usr/bin/env python3
"""Champion selection for the style-adherence scorer, on OUR data:
(a) AnnaWegmann/Style-Embedding (done: AUC .789, 3/17 retrieval)
(b) StyleDistance/styledistance
(c) Burrows's Delta over the 300 most frequent words (classical stylometry)"""
import json
import statistics
import numpy as np
import voice_check_local as vc

S = "/private/tmp/claude-501/-Users-seshendranalla-Development-katagami/7693e114-563a-4638-a7d2-7ec0edd87600/scratchpad"
index = json.load(open(f"{S}/voicemds/index.json"))

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
    voices[slug] = {"chunks": chunks_of(cache["corpus"]),
                    "replica": open(f"{S}/replicas/{slug}.md").read().strip()}

def evaluate(embed_fn, name):
    for v in voices.values():
        v["emb"] = embed_fn(v["chunks"])
        v["remb"] = embed_fn([v["replica"]])[0]
    def centroid(embs, exclude=None):
        rows = [e for i, e in enumerate(embs) if i != exclude]
        c = np.mean(rows, axis=0)
        n = np.linalg.norm(c)
        return c / n if n else c
    aucs, hits, overlaps = [], 0, 0
    for slug, v in voices.items():
        pos = [float(np.dot(v["emb"][i], centroid(v["emb"], exclude=i))) for i in range(len(v["emb"]))]
        cen = centroid(v["emb"])
        neg = [float(np.dot(e, cen)) for o, ov in voices.items() if o != slug for e in ov["emb"]]
        wins = sum(1 for p in pos for n_ in neg if p > n_) + 0.5 * sum(1 for p in pos for n_ in neg if p == n_)
        aucs.append(wins / (len(pos) * len(neg)))
        scores = {o: float(np.dot(v["remb"], centroid(ov["emb"]))) for o, ov in voices.items()}
        rank = [o for o, _ in sorted(scores.items(), key=lambda kv: -kv[1])].index(slug) + 1
        hits += rank == 1
        overlaps += max(neg) >= min(pos)
    print(f"{name:34} mean AUC {statistics.mean(aucs):.3f} | retrieval {hits}/17 | clean separations {17-overlaps}/17")
    return statistics.mean(aucs), hits

# (b) StyleDistance
try:
    from sentence_transformers import SentenceTransformer
    sd = SentenceTransformer("StyleDistance/styledistance")
    evaluate(lambda texts: sd.encode(texts, normalize_embeddings=True), "StyleDistance/styledistance")
except Exception as e:
    print("StyleDistance failed to load:", str(e)[:140])

# (c) Burrows's Delta over top-300 MFW, cosine over z-vectors
all_words = []
for v in voices.values():
    for c in v["chunks"]:
        all_words.extend(vc.words_of(c))
from collections import Counter
mfw = [w for w, _ in Counter(all_words).most_common(300)]
mfw_idx = {w: i for i, w in enumerate(mfw)}

def freq_vec(text):
    ws = vc.words_of(text)
    v_ = np.zeros(len(mfw))
    for w in ws:
        i = mfw_idx.get(w)
        if i is not None:
            v_[i] += 1
    return v_ / max(len(ws), 1)

sample_vecs = []
for v in voices.values():
    for c in v["chunks"]:
        sample_vecs.append(freq_vec(c))
M = np.array(sample_vecs)
mu, sigma = M.mean(axis=0), M.std(axis=0) + 1e-9

def delta_embed(texts):
    out = []
    for t in texts:
        z = (freq_vec(t) - mu) / sigma
        n = np.linalg.norm(z)
        out.append(z / n if n else z)
    return np.array(out)

evaluate(delta_embed, "Burrows-Delta z-cosine (300 MFW)")

# (d) Delta variants: 500 MFW; and word+char-trigram hybrid
mfw500 = [w for w, _ in Counter(all_words).most_common(500)]
idx500 = {w: i for i, w in enumerate(mfw500)}
def freq_vec_n(text, idx, n):
    ws = vc.words_of(text)
    v_ = np.zeros(n)
    for w in ws:
        i = idx.get(w)
        if i is not None:
            v_[i] += 1
    return v_ / max(len(ws), 1)
Mv = np.array([freq_vec_n(c, idx500, 500) for v in voices.values() for c in v["chunks"]])
mu5, sig5 = Mv.mean(axis=0), Mv.std(axis=0) + 1e-9
def delta500(texts):
    out = []
    for t in texts:
        z = (freq_vec_n(t, idx500, 500) - mu5) / sig5
        n = np.linalg.norm(z)
        out.append(z / n if n else z)
    return np.array(out)
evaluate(delta500, "Delta 500 MFW")

# char 3-gram top-500 hybrid with 300 MFW
tri_counts = Counter()
for v in voices.values():
    for c in v["chunks"]:
        cl = "".join(ch if (ch.isalnum() or ch in " '") else " " for ch in c.lower())
        for i in range(len(cl) - 2):
            g = cl[i:i+3]
            if len(g.strip()) >= 2:
                tri_counts[g] += 1
top_tri = [g for g, _ in tri_counts.most_common(500)]
tri_idx = {g: i for i, g in enumerate(top_tri)}
def tri_vec(text):
    cl = "".join(ch if (ch.isalnum() or ch in " '") else " " for ch in text.lower())
    v_ = np.zeros(500)
    tot = 0
    for i in range(len(cl) - 2):
        g = cl[i:i+3]
        j = tri_idx.get(g)
        tot += 1
        if j is not None:
            v_[j] += 1
    return v_ / max(tot, 1)
Mt = np.array([tri_vec(c) for v in voices.values() for c in v["chunks"]])
mut, sigt = Mt.mean(axis=0), Mt.std(axis=0) + 1e-9
def hybrid(texts):
    out = []
    for t in texts:
        z1 = (freq_vec(t) - mu) / sigma
        z2 = (tri_vec(t) - mut) / sigt
        z = np.concatenate([z1, z2])
        n = np.linalg.norm(z)
        out.append(z / n if n else z)
    return np.array(out)
evaluate(hybrid, "Hybrid 300 MFW + 500 char-3gram")
