#!/usr/bin/env python3
"""Check one replica against its style's own bands.

    python3 check_replica.py <slug> <path-to-replica.md>

Prints every violation and the measurements behind them, then exits non-zero.
The bands are the ones in the style's VOICE.md and the reference is the style's
corpus, which is what the deployment's finalizer will use.
"""
import statistics
import sys

import assemble
import entries_a
import entries_b
import lib

SPECS = {**entries_a.ENTRIES, **entries_b.ENTRIES}


def main():
    slug, path = sys.argv[1], sys.argv[2]
    entry = assemble.build(slug, SPECS[slug])
    corpus = [(c["file"], c["text"]) for c in entry["corpus"]]
    bands = entry["mechanical_bands"]
    text = open(path, encoding="utf-8").read()
    words = lib.words_of(text)
    lens = [len(lib.words_of(s)) for s in lib.sentences_of(text)]
    print(f"{slug}: {len(words)} words, {len(lens)} sentences")
    if len(words) < 150:
        print("FAIL: under the 150-word floor the contract requires")
        sys.exit(1)
    print(f"  sentence mean {statistics.mean(lens):.1f}  band {bands['sentence_length']['mean']}")
    print(f"  burstiness    {statistics.pstdev(lens):.1f}  floor {bands['sentence_length']['stdev_min']}")
    ttr = statistics.mean([len(set(words[i:i + 500])) / len(words[i:i + 500])
                           for i in range(0, len(words), 500)])
    print(f"  distinct words {ttr:.2f}  floor {bands['type_token_ratio']['min']}")
    fw = lib.js(lib.fw_dist(words), lib.fw_dist([w for _, b in corpus for w in lib.words_of(b)]))
    tri = lib.tri_js(lib.trigrams(text), lib.trigrams("\n\n".join(b for _, b in corpus)))
    print(f"  function-word divergence {fw:.3f}  ceiling {bands['function_words']['max_distance']}")
    print(f"  char-trigram divergence  {tri:.3f}  ceiling {bands['char_trigrams']['max_distance']}")
    violations = lib.check(bands, corpus, [("replica", text)])
    for v in violations:
        print(f"  VIOLATION {v}")
    print("PASS" if not violations else f"FAIL: {len(violations)} violation(s)")
    sys.exit(1 if violations else 0)


if __name__ == "__main__":
    main()
