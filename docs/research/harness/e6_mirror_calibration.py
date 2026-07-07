#!/usr/bin/env python3
"""E6 — mirror-negative calibration (Pangram's hard-negative discipline).
For each voice, the mirror set = same-topic texts NOT in its voice: its own
numbers-only (gamed) text + every other voice's texts from all conditions.
Measures: mirror-FPR at the current noise floor, the mirror-calibrated
threshold (no mirror passes), and whether the voice's true replica clears it."""
import json, statistics
import numpy as np
import voice_check_local as vc

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
        if j is not None:
            v[j] += 1
    v = (v / max(len(ws), 1) - MU) / SIG
    n = np.linalg.norm(v)
    return v / n if n else v

cent, floor = {}, {}
for slug in sorted(index):
    cache = json.load(open(f"{S}/bandcache-{slug}.json"))
    chunks = []
    for _, body in cache["corpus"]:
        ws = body.split()
        for i in range(0, len(ws), 220):
            c = ws[i:i + 220]
            if len(c) >= 140:
                chunks.append(" ".join(c))
    Z = np.array([zvec(c) for c in chunks])
    cen = Z.mean(axis=0); cen /= np.linalg.norm(cen)
    cent[slug] = cen
    loo = []
    for i in range(len(Z)):
        c2 = np.delete(Z, i, axis=0).mean(axis=0); c2 /= np.linalg.norm(c2)
        loo.append(float(np.dot(Z[i], c2)))
    floor[slug] = min(loo)

CONDS = ["replicas-beta", "replicas-checklist", "replicas-excerpt", "replicas-e2b"]
FAMILY = {"naturalist-field-notes": {"darwin-voyage-journal", "white-selborne-letters"},
          "ships-log": {"dana-sea-narrative", "slocum-voyage-narrative"}}
texts = {d: {s: open(f"{S}/{d}/{s}.md").read().strip() for s in sorted(index)} for d in CONDS}

print(f"{'voice':32} {'floor':>7} {'mirrors':>7} {'FPR@floor':>9} {'mirror-thr':>10} {'replica':>8} {'clears?':>7}")
rows = []
fpr_total = mir_total = clears = 0
for slug in sorted(index):
    fam = FAMILY.get(slug, set()) | {k for k, v in FAMILY.items() if slug in v}
    mirrors = [texts["replicas-checklist"][slug]]  # its own gamed text
    for d in CONDS:
        for o in sorted(index):
            if o != slug and o not in fam:
                mirrors.append(texts[d][o])
    scores = [float(np.dot(zvec(m), cent[slug])) for m in mirrors]
    fpr = sum(1 for x in scores if x >= floor[slug])
    thr = max(scores) + 0.005
    replica = float(np.dot(zvec(texts["replicas-beta"][slug]), cent[slug]))
    ok = replica > thr
    rows.append({"slug": slug, "floor": floor[slug], "mirror_threshold": thr,
                 "mirror_fpr_at_floor": [fpr, len(scores)], "replica": replica, "clears_mirror_thr": ok})
    fpr_total += fpr; mir_total += len(scores); clears += ok
    print(f"{slug:32} {floor[slug]:>+7.3f} {len(scores):>7} {fpr:>6}/{len(scores):<3} {thr:>+10.3f} {replica:>+8.3f} {'YES' if ok else 'no':>7}")
print(f"\nmirror FPR at old floors: {fpr_total}/{mir_total} ({fpr_total/mir_total*100:.0f}%) | replicas clearing the mirror-calibrated threshold: {clears}/17")
json.dump(rows, open(f"{S}/e6-mirror-calibration.json", "w"), indent=1, default=float)
