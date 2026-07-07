#!/usr/bin/env python3
"""E8 — instrument fusion: Delta + neural style embeddings on the known-answer
protocol (genuine held-out vs impostors). Rules tested: each instrument alone,
AND-fusion (both accept), and OR-abstain (disagreement -> abstain)."""
import json, statistics
import numpy as np
from sentence_transformers import SentenceTransformer
import voice_check_local as vc
from e1_scorer_validity import HELD_OUT, passage

S = "/private/tmp/claude-501/-Users-seshendranalla-Development-katagami/7693e114-563a-4638-a7d2-7ec0edd87600/scratchpad"
index = json.load(open(f"{S}/voicemds/index.json"))
bg = json.load(open(f"{S}/style-background-v1.json"))
MFW, MU, SIG = bg["mfw"], np.array(bg["mu"]), np.array(bg["sigma"])
IDX = {w: i for i, w in enumerate(MFW)}
def zvec(text):
    ws = vc.words_of(text)
    v = np.zeros(len(MFW))
    for w in ws:
        j = IDX.get(w)
        if j is not None: v[j] += 1
    v = (v / max(len(ws), 1) - MU) / SIG
    n = np.linalg.norm(v)
    return v / n if n else v

def chunks_of(corpus, size=220):
    out = []
    for _, body in corpus:
        ws = body.split()
        for i in range(0, len(ws), size):
            c = ws[i:i + size]
            if len(c) >= 140: out.append(" ".join(c))
    return out

corpora = {s: json.load(open(f"{S}/bandcache-{s}.json"))["corpus"] for s in HELD_OUT}
chunks = {s: chunks_of(c) for s, c in corpora.items()}
held = {s: [passage(g, f) for g, f in HELD_OUT[s]] for s in HELD_OUT}

def build_instrument(embed):
    prof = {}
    for s, chs in chunks.items():
        Z = np.array(embed(chs))
        cen = Z.mean(axis=0); cen /= np.linalg.norm(cen)
        loo = []
        for i in range(len(Z)):
            c2 = np.delete(Z, i, axis=0).mean(axis=0); c2 /= np.linalg.norm(c2)
            loo.append(float(np.dot(Z[i], c2)))
        prof[s] = (cen, min(loo))
    def accept(s, text_emb):
        cen, fl = prof[s]
        return float(np.dot(text_emb, cen)) >= fl
    return prof, accept

delta_prof, delta_acc = build_instrument(lambda ts: [zvec(t) for t in ts])
wg = SentenceTransformer("AnnaWegmann/Style-Embedding")
wg_prof, wg_acc = build_instrument(lambda ts: wg.encode(ts, normalize_embeddings=True))

def eval_rule(name, decide):
    g_acc = g_abs = i_acc = i_abs = 0
    g_n = i_n = 0
    for s in HELD_OUT:
        d_g = [zvec(t) for t in held[s]]
        w_g = wg.encode(held[s], normalize_embeddings=True)
        for dz, wz in zip(d_g, w_g):
            r = decide(s, dz, wz)
            g_n += 1
            g_acc += r == "accept"; g_abs += r == "abstain"
        for o in HELD_OUT:
            if o == s: continue
            d_i = [zvec(t) for t in held[o]]
            w_i = wg.encode(held[o], normalize_embeddings=True)
            for dz, wz in zip(d_i, w_i):
                r = decide(s, dz, wz)
                i_n += 1
                i_acc += r == "accept"; i_abs += r == "abstain"
    print(f"{name:26} genuine: {g_acc}/{g_n} accept, {g_abs} abstain | impostor: {i_acc}/{i_n} falsely accepted, {i_abs} abstain")

eval_rule("Delta alone", lambda s, dz, wz: "accept" if delta_acc(s, dz) else "reject")
eval_rule("Wegmann alone", lambda s, dz, wz: "accept" if wg_acc(s, wz) else "reject")
eval_rule("AND fusion", lambda s, dz, wz: "accept" if (delta_acc(s, dz) and wg_acc(s, wz)) else "reject")
eval_rule("agree-or-abstain", lambda s, dz, wz: ("accept" if delta_acc(s, dz) else "reject") if delta_acc(s, dz) == wg_acc(s, wz) else "abstain")
