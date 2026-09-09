"""Propose exemplar passages: verbatim runs of a corpus that pass its own bands.

An exemplar is a contiguous run of one corpus passage, cut at paragraph
boundaries so it starts and ends where the source does. Every proposal here is
checked against the style's bands before a human reads it, because a passage
that fails them is not a candidate whatever it demonstrates.
"""
import sys

import lib
import sources


def windows(body, lo=150, hi=400):
    """Every paragraph-aligned run of the passage inside the word range."""
    paras = body.split("\n\n")
    out = []
    for i in range(len(paras)):
        for j in range(i + 1, len(paras) + 1):
            run = "\n\n".join(paras[i:j])
            n = len(run.split())
            if n > hi:
                break
            if n >= lo:
                out.append((i, j, n, run))
    return out


def propose(slug, show=3):
    corpus = [(f"corpus-{i}.md", b) for i, (_, b) in enumerate(sources.corpus(slug), 1)]
    bands = lib.derive(corpus)
    print(f"\n===== {slug}")
    for name, body in corpus:
        candidates = windows(body)
        # One check call for the whole passage: the reference distributions are
        # computed once instead of once per window.
        failed = {v.split(":")[0] for v in
                  lib.check(bands, corpus, [(str(k), w[3]) for k, w in enumerate(candidates)])}
        good = [w for k, w in enumerate(candidates) if str(k) not in failed]
        print(f"  {name}: {len(good)} of {len(candidates)} windows pass")
        for i, j, n, run in good[:show]:
            print(f"    [{i}:{j}] {n}w  {run[:90]!r} … {run[-70:]!r}")


if __name__ == "__main__":
    for slug in sys.argv[1:] or sources.SPANS:
        propose(slug, show=int(2))
