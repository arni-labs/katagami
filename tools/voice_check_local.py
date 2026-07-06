#!/usr/bin/env python3
"""Faithful Python mirror of the finalizer's voice-bands checker (v1+v2), for
pre-flight iteration of replicas. The prod finalizer stays the arbiter."""
import json
import math
import re
import statistics

FUNCTION_WORDS = ["the","a","an","and","or","but","if","then","so","of","to","in","on","at",
    "by","for","with","from","as","is","are","was","were","be","been","it","its",
    "this","that","these","those","i","you","we","they","he","she","not","no",
    "do","does","did","have","has","had","will","would","can"]
CONNECTIVES = {"however","moreover","furthermore","additionally","thus","therefore",
    "indeed","notably","importantly","crucially","consequently","nevertheless","nonetheless","ultimately"}


def words_of(t):
    return [w.lower() for w in re.split(r"[^0-9A-Za-z']+", t) if w]


def sentences_of(t):
    return [s.strip() for s in re.split(r"[.!?]", t) if s.strip()]


def fw_dist(words):
    counts = [0.0] * len(FUNCTION_WORDS)
    idx = {w: i for i, w in enumerate(FUNCTION_WORDS)}
    for w in words:
        if w in idx:
            counts[idx[w]] += 1.0
    total = sum(counts)
    return [c / total if total else 0.0 for c in counts]


def js(p, q):
    def kl(a, b):
        return sum(a[i] * math.log(a[i] / max(b[i], 1e-12)) for i in range(len(a)) if a[i] > 0)
    m = [(p[i] + q[i]) / 2 for i in range(len(p))]
    return max(0.5 * kl(p, m) + 0.5 * kl(q, m), 0.0)


def trigrams(t):
    clean = "".join(c if (c.isalnum() or c in " '") else " " for c in t.lower())
    counts = {}
    for i in range(len(clean) - 2):
        g = clean[i:i + 3]
        if len(g.strip()) >= 2:
            counts[g] = counts.get(g, 0) + 1.0
    total = sum(counts.values())
    return {g: c / total for g, c in counts.items()} if total else {}


def tri_js(p, q):
    keys = set(p) | set(q)
    def kl(a, b):
        return sum(a.get(k, 0.0) * math.log(a.get(k, 0.0) / max(b.get(k, 0.0), 1e-12)) for k in keys if a.get(k, 0.0) > 0)
    m = {k: (p.get(k, 0.0) + q.get(k, 0.0)) / 2 for k in keys}
    return max(0.5 * kl(p, m) + 0.5 * kl(q, m), 0.0)


def check(bands, reference_texts, texts):
    """Returns list of violation strings (empty = pass). Mirrors check_voice_bands_against."""
    violations = []
    min_words = int(bands.get("min_words_to_evaluate", 150))
    ref_words = [w for _, b in reference_texts for w in words_of(b)]
    ref_fw = fw_dist(ref_words)
    ref_tri = trigrams("\n\n".join(b for _, b in reference_texts))

    for label, body in texts:
        words = words_of(body)
        lower = body.lower()
        for phrase in bands.get("banned_phrases", []):
            if phrase.lower() in lower:
                violations.append(f"{label}: banned phrase '{phrase}'")
        for pat in bands.get("banned_patterns", []):
            if re.search(pat.replace("(?i)", ""), lower):
                violations.append(f"{label}: banned pattern '{pat}'")
        if len(words) < min_words:
            continue

        sl = bands.get("sentence_length") or {}
        lens = [len(words_of(s)) for s in sentences_of(body)]
        if lens and sl.get("mean"):
            m = statistics.mean(lens)
            lo, hi = sl["mean"]
            if not (lo <= m <= hi):
                violations.append(f"{label}: sentence mean {m:.1f} outside [{lo}, {hi}]")
        if lens and sl.get("stdev_min") is not None and statistics.pstdev(lens) < sl["stdev_min"]:
            violations.append(f"{label}: burstiness {statistics.pstdev(lens):.1f} below {sl['stdev_min']}")

        punct = bands.get("punctuation") or {}
        if "exclamations_per_1000_words" in punct:
            lo, hi = punct["exclamations_per_1000_words"]
            rate = body.count("!") * 1000 / len(words)
            if not (lo <= rate <= hi):
                violations.append(f"{label}: exclamations {rate:.1f}/1000 outside [{lo}, {hi}]")

        ttr = bands.get("type_token_ratio") or {}
        if ttr.get("min") is not None:
            window = int(ttr.get("window_words", 500))
            vals = [len(set(words[i:i+window])) / len(words[i:i+window]) for i in range(0, len(words), window)]
            v = statistics.mean(vals)
            if v < ttr["min"]:
                violations.append(f"{label}: windowed TTR {v:.2f} below {ttr['min']}")

        fw = bands.get("function_words") or {}
        if fw.get("max_distance") is not None:
            d = js(fw_dist(words), ref_fw)
            if d > fw["max_distance"]:
                violations.append(f"{label}: function-word divergence {d:.3f} above {fw['max_distance']}")

        tri = bands.get("char_trigrams") or {}
        if tri.get("max_distance") is not None:
            d = tri_js(trigrams(body), ref_tri)
            if d > tri["max_distance"]:
                violations.append(f"{label}: char-trigram divergence {d:.3f} above {tri['max_distance']}")

        so = bands.get("sentence_openers") or {}
        sents = sentences_of(body)
        if so.get("max_top_share") is not None and len(sents) >= 8:
            openers = [words_of(s)[0] for s in sents if words_of(s)]
            share = max(openers.count(o) for o in set(openers)) / len(sents)
            if share > so["max_top_share"]:
                violations.append(f"{label}: top opener share {share:.2f} above {so['max_top_share']}")

        if "connectives_per_1000_words" in bands:
            lo, hi = bands["connectives_per_1000_words"]
            rate = sum(1 for w in words if w in CONNECTIVES) * 1000 / len(words)
            if not (lo <= rate <= hi):
                violations.append(f"{label}: connective rate {rate:.1f}/1000 outside [{lo}, {hi}]")

        pl = bands.get("paragraph_length") or {}
        paras = [p for p in body.split("\n\n") if p.strip()]
        if pl.get("stdev_min") is not None and len(paras) >= 4:
            sd = statistics.pstdev([len(words_of(p)) for p in paras])
            if sd < pl["stdev_min"]:
                violations.append(f"{label}: paragraph stdev {sd:.1f} below {pl['stdev_min']}")

        hx = bands.get("hapax_ratio") or {}
        if hx.get("min") is not None:
            window = int(hx.get("window_words", 500))
            vals = []
            for i in range(0, len(words), window):
                chunk = words[i:i+window]
                counts = {}
                for w in chunk:
                    counts[w] = counts.get(w, 0) + 1
                vals.append(sum(1 for n in counts.values() if n == 1) / len(chunk))
            v = statistics.mean(vals)
            if v < hx["min"]:
                violations.append(f"{label}: windowed hapax {v:.2f} below {hx['min']}")
    return violations
