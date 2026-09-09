"""Corpus extraction and band derivation for the writing-style build.

Nothing here composes text. It locates a contiguous run inside a source file,
carries it out verbatim, and computes numbers from what it carried.
"""
import json
import os
import re
import statistics
import sys
import unicodedata

ROOT = "/private/tmp/ws-build"
sys.path.insert(0, os.path.join(ROOT, "docs/research/harness"))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from voice_check_local import check, words_of, sentences_of, fw_dist, js, trigrams, tri_js  # noqa: E402

CORPUS = os.path.join(ROOT, ".build/corpus")

# The margins the collection already uses, measured off the Austen and Aphorism
# styles and recorded in docs/efforts/ARN-118/corpus-sources.md.
MEAN_LO, MEAN_HI = 0.70, 1.35
BURST_FLOOR = 0.55
TTR_FLOOR = 0.80
DIVERGENCE = 2.75

BANNED = ["delve", "leverage", "seamless", "game-changer", "robust", "cutting-edge",
          "in today's fast-paced", "it's worth noting", "at the end of the day"]


def load(name):
    return open(os.path.join(CORPUS, name), encoding="utf-8", errors="strict").read()


def unligature(text):
    """Decode the fi/fl ligature codepoints to the letters they are.

    A PDF that stores U+FB01 has not lost anything: the glyph is the two
    letters. NFKC on those codepoints alone is a decoding step, not an edit,
    and it is applied only where the source stores them.
    """
    for lig in "ﬀﬁﬂﬃﬄﬅﬆ":
        text = text.replace(lig, unicodedata.normalize("NFKC", lig))
    return text


def gutenberg_body(text):
    """The work itself, between Project Gutenberg's own start and end markers."""
    start = re.search(r"\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", text)
    end = re.search(r"\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK", text)
    return text[start.end():end.start()]


def span(text, first, last, *, occurrence=1, tail=0):
    """The contiguous run from the `first` marker to the end of the `last` one.

    Both markers are literal text from the source. Nothing between them is
    touched, so what comes back is a verbatim run or the call fails.
    """
    at = -1
    for _ in range(occurrence):
        at = text.index(first, at + 1)
    stop = text.index(last, at) + len(last) + tail
    return text[at:stop]


def clean(passage):
    """Whitespace only: collapse a hard-wrapped paragraph into one line.

    Line breaks inside a paragraph are the typesetting of the source file and
    not the author's, and every band the checker computes is unaffected by
    them. No character of the prose is changed.
    """
    passage = passage.replace("\r\n", "\n").replace("\r", "\n")
    paras = re.split(r"\n\s*\n", passage.strip())
    out = []
    for para in paras:
        joined = re.sub(r"[ \t]*\n[ \t]*", " ", para.strip())
        joined = re.sub(r"[ \t]{2,}", " ", joined)
        if joined:
            out.append(joined)
    return "\n\n".join(out)


def stats(text):
    lens = [len(words_of(s)) for s in sentences_of(text)]
    w = words_of(text)
    ttr = statistics.mean([len(set(w[i:i + 500])) / len(w[i:i + 500]) for i in range(0, len(w), 500)])
    return {"words": len(w), "mean": statistics.mean(lens), "stdev": statistics.pstdev(lens), "ttr": ttr}


def derive(corpus, *, extra_bans=(), exclamations=None):
    """Bands computed from this corpus, with the collection's standard margins.

    Only the keys the checker evaluates are emitted. A band nothing checks is a
    band nothing proves.
    """
    texts = [body for _, body in corpus]
    per = [stats(t) for t in texts]
    ref_words = [w for t in texts for w in words_of(t)]
    ref_fw = fw_dist(ref_words)
    ref_tri = trigrams("\n\n".join(texts))
    fw_far = max(js(fw_dist(words_of(t)), ref_fw) for t in texts)
    tri_far = max(tri_js(trigrams(t), ref_tri) for t in texts)
    if exclamations is None:
        loudest = max(t.count("!") * 1000 / len(words_of(t)) for t in texts)
        exclamations = [0, max(2, int(loudest) + 1)]
    return {
        "schema": "katagami:voice-bands/v1",
        "sentence_length": {
            "mean": [round(min(p["mean"] for p in per) * MEAN_LO, 1),
                     round(max(p["mean"] for p in per) * MEAN_HI, 1)],
            "stdev_min": round(min(p["stdev"] for p in per) * BURST_FLOOR, 1),
        },
        "banned_phrases": BANNED + list(extra_bans),
        "punctuation": {"exclamations_per_1000_words": exclamations},
        "type_token_ratio": {"min": round(min(p["ttr"] for p in per) * TTR_FLOOR, 2),
                             "window_words": 500},
        "function_words": {"max_distance": round(fw_far * DIVERGENCE, 3)},
        "char_trigrams": {"max_distance": round(tri_far * DIVERGENCE, 3)},
        "min_words_to_evaluate": 150,
    }


def report(slug, corpus, bands, exemplars=()):
    print(f"\n{slug}")
    for name, body in corpus:
        s = stats(body)
        print(f"  {name:<14} {s['words']:>5}w  mean {s['mean']:>5.1f}  sd {s['stdev']:>5.1f}  ttr {s['ttr']:.2f}")
    print(f"  bands mean {bands['sentence_length']['mean']}  sd>={bands['sentence_length']['stdev_min']}  "
          f"ttr>={bands['type_token_ratio']['min']}  fw<={bands['function_words']['max_distance']}  "
          f"tri<={bands['char_trigrams']['max_distance']}")
    problems = check(bands, corpus, corpus)
    problems += check(bands, corpus, [(f"exemplar {i}", e) for i, e in enumerate(exemplars, 1)])
    haystack = " ".join(re.sub(r"\s+", " ", b).strip() for _, b in corpus)
    for i, e in enumerate(exemplars, 1):
        n = len(words_of(e))
        if not 150 <= n <= 400:
            problems.append(f"exemplar {i} is {n} words, outside 150 to 400")
        if re.sub(r"\s+", " ", e).strip() not in haystack:
            problems.append(f"exemplar {i} is not a verbatim run of the corpus")
        else:
            print(f"  exemplar {i}: {n}w verbatim")
    for p in problems:
        print(f"  PROBLEM {p}")
    return problems
