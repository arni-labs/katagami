#!/usr/bin/env python3
"""A5 implemented: symbolic per-feature attribution. Given a voice's corpus,
bands, and a candidate text, emit a fully derived feedback report — every
directional statement computed, none interpreted."""
import json, math, statistics
import voice_check_local as vc

def js_contribs(p, q):
    keys = set(p) | set(q)
    out = []
    for k in keys:
        a, b = p.get(k, 0.0), q.get(k, 0.0)
        m = (a + b) / 2
        c = 0.0
        if a > 0: c += 0.5 * a * math.log(a / m)
        if b > 0: c += 0.5 * b * math.log(b / m)
        out.append((c, k, a, b))
    out.sort(reverse=True)
    return out

def word_freqs(words):
    d = {}
    for w in words:
        d[w] = d.get(w, 0) + 1
    n = max(len(words), 1)
    return {w: c / n for w, c in d.items()}

def attributed_feedback(bands, corpus, text):
    """Returns (violations, attribution_lines) — all computed."""
    violations = vc.check(bands, corpus, [("text", text)])
    lines = []
    corpus_all = "\n\n".join(b for _, b in corpus)
    cw, tw = vc.words_of(corpus_all), vc.words_of(text)

    # Function-word attribution (always informative, even without violation)
    fw_c = {w: 0 for w in vc.FUNCTION_WORDS}
    fw_t = {w: 0 for w in vc.FUNCTION_WORDS}
    for w in cw:
        if w in fw_c: fw_c[w] += 1
    for w in tw:
        if w in fw_t: fw_t[w] += 1
    nc, nt = max(len(cw), 1), max(len(tw), 1)
    diffs = sorted(((fw_t[w]/nt - fw_c[w]/nc) * 1000, w) for w in vc.FUNCTION_WORDS)
    under = [f"'{w}' ({d:+.1f}/1000)" for d, w in diffs[:4] if d < -1.5]
    over = [f"'{w}' ({d:+.1f}/1000)" for d, w in sorted(diffs, reverse=True)[:4] if d > 1.5]
    if under: lines.append(f"UNDERUSED function words vs the corpus: {', '.join(under)} — work these joints back in naturally.")
    if over: lines.append(f"OVERUSED function words vs the corpus: {', '.join(over)} — reduce reliance on these.")

    # Content-word habit gaps: corpus's frequent non-function words missing from text
    from collections import Counter
    cfreq = Counter(w for w in cw if w not in fw_c and len(w) > 3)
    tset = set(tw)
    missing = [w for w, _ in cfreq.most_common(60) if w not in tset][:6]
    if missing:
        lines.append(f"CORPUS-CHARACTERISTIC words absent from your text: {', '.join(missing)} — not required verbatim, but their register is.")

    # Trigram attribution
    tri_c, tri_t = vc.trigrams(corpus_all), vc.trigrams(text)
    contribs = js_contribs(tri_t, tri_c)
    over_t = [k for c, k, a, b in contribs[:30] if a > b][:6]
    under_t = [k for c, k, a, b in contribs[:30] if a < b][:6]
    if over_t: lines.append(f"CHARACTER-LEVEL: your text over-produces {', '.join(repr(k) for k in over_t)} relative to the corpus.")
    if under_t: lines.append(f"CHARACTER-LEVEL: corpus habits your text lacks: {', '.join(repr(k) for k in under_t)}.")

    # Sentence rhythm deltas
    cs = [len(vc.words_of(s)) for s in vc.sentences_of(corpus_all)]
    ts = [len(vc.words_of(s)) for s in vc.sentences_of(text)]
    if ts:
        lines.append(f"RHYTHM: your sentences mean {statistics.mean(ts):.1f} / spread {statistics.pstdev(ts):.1f}; the corpus runs {statistics.mean(cs):.1f} / {statistics.pstdev(cs):.1f}.")
    # Punctuation deltas per 1000
    for mark, name in [(",", "commas"), (";", "semicolons"), (":", "colons"), ("?", "questions")]:
        rc = corpus_all.count(mark) * 1000 / max(len(cw), 1)
        rt = text.count(mark) * 1000 / max(len(tw), 1)
        if abs(rt - rc) > max(rc * 0.4, 3):
            lines.append(f"PUNCTUATION: {name} {rt:.0f}/1000 vs corpus {rc:.0f}/1000 — {'reduce' if rt > rc else 'increase'}.")
    return violations, lines

if __name__ == "__main__":
    import sys
    slug, textpath, outpath = sys.argv[1], sys.argv[2], sys.argv[3]
    S = "/private/tmp/claude-501/-Users-seshendranalla-Development-katagami/7693e114-563a-4638-a7d2-7ec0edd87600/scratchpad"
    cache = json.load(open(f"{S}/bandcache-{slug}.json"))
    text = open(textpath).read().strip()
    v, lines = attributed_feedback(cache["bands"], cache["corpus"], text)
    report = "MECHANICAL VERIFIER REPORT (all statements computed from the corpus, none interpreted)\n\n"
    report += ("VIOLATIONS:\n" + "\n".join("- " + x for x in v) + "\n\n") if v else "VIOLATIONS: none — all 13 disclosed bands pass.\n\n"
    report += "MEASURED DEVIATIONS (fix the largest first):\n" + "\n".join("- " + l for l in lines)
    open(outpath, "w").write(report)
    print(f"{slug}: {len(v)} violations, {len(lines)} attribution lines")
