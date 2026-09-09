"""Assemble the approved payload from the located corpus and the authored layer."""
import json
import sys

import re
import lib
import sources

BAN = ["delve", "leverage", "seamless", "game-changer", "robust", "cutting-edge",
       "in today's fast-paced", "it's worth noting", "at the end of the day"]


def exemplar_text(corpus, passage, lo, hi):
    return "\n\n".join(corpus[passage - 1][1].split("\n\n")[lo:hi])


def build(slug, spec, replica=None, replica_model=None):
    passages = sources.corpus(slug)
    corpus = [(f"corpus-{i}.md", body) for i, (_, body) in enumerate(passages, 1)]
    bands = lib.derive(corpus, extra_bans=spec.get("extra_bans", ()))
    exemplars = [
        {"text": exemplar_text(corpus, p, lo, hi), "annotation": note, "kind": "corpus"}
        for p, lo, hi, note in spec["exemplars"]
    ]
    return {
        "number": spec["number"],
        "slug": slug,
        "name": spec["name"],
        "persona": spec["persona"],
        "tone_scales": {},
        "vocabulary": {"use": spec["vocabulary_use"], "ban": BAN},
        "habits": spec["habits"],
        "moves": spec["moves"],
        "register": spec["register"],
        "refusals": spec["refusals"],
        "mechanical_bands": bands,
        "corpus": [{"file": f"corpus-{i}.md", "source": label, "text": body,
                    "words": len(lib.words_of(body))}
                   for i, (label, body) in enumerate(passages, 1)],
        "exemplars": exemplars,
        "consent": {
            "basis": "public_domain",
            "author": spec["consent_author"],
            "license": spec["consent_license"],
            "samples": len(passages),
            "provenance": spec["provenance"],
        },
        "credits": spec["credits"],
        "model_provenance": {
            "style": {"model": "claude-opus-5"},
            "extraction": {"model": "claude-opus-5",
                           "tool": ".build/sources.py + .build/lib.py, bands checked with "
                                   "docs/research/harness/voice_check_local.py"},
        },
        "tags": spec["tags"],
        "curator_notes": spec["curator_notes"],
        "parent_slugs": spec.get("parent_slugs", []),
        "lineage_type": spec.get("lineage_type", "original"),
        "generation_number": spec.get("generation_number", "0"),
        "replica": replica or "",
        "replica_model": replica_model or "claude-opus-5",
    }


def verify(entry, *, want_replica=True):
    corpus = [(c["file"], c["text"]) for c in entry["corpus"]]
    bands = entry["mechanical_bands"]
    found = [f"corpus: {v}" for v in lib.check(bands, corpus, corpus)]
    haystack = " ".join(re.sub(r"\s+", " ", b).strip() for _, b in corpus)
    for i, ex in enumerate(entry["exemplars"], 1):
        n = len(lib.words_of(ex["text"]))
        if not 150 <= n <= 400:
            found.append(f"exemplar {i} is {n} words")
        if re.sub(r"\s+", " ", ex["text"]).strip() not in haystack:
            found.append(f"exemplar {i} is not a verbatim run of the corpus")
    found += lib.check(bands, corpus, [(f"exemplar {i}", e["text"])
                                       for i, e in enumerate(entry["exemplars"], 1)])
    if want_replica:
        n = len(lib.words_of(entry["replica"]))
        if n < 150:
            found.append(f"replica is {n} words")
        else:
            found += [f"replica: {v}" for v in lib.check(bands, corpus, [("replica", entry["replica"])])]
    return found


if __name__ == "__main__":
    import entries_a
    for slug, spec in entries_a.ENTRIES.items():
        entry = build(slug, spec)
        problems = verify(entry, want_replica=False)
        sizes = [len(lib.words_of(e["text"])) for e in entry["exemplars"]]
        print(f"{slug:<36} exemplars {sizes} {'OK' if not problems else problems}")
