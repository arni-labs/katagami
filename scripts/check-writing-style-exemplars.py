#!/usr/bin/env python3
"""Hold every live writing style to the exemplar contract.

An exemplar is the evidence a reader judges a voice by, so a sentence cannot be
one. The rule this script enforces has three parts, and each one failed silently
before it was written down:

  1. Every live style carries one to three exemplars, each between 150 and 400
     words. The floor is not decoration: the bands checker skips any text under
     `min_words_to_evaluate`, which every style sets to 150, so an exemplar of
     twenty words was only ever scanned for banned phrases and was never held to
     the voice it claims to demonstrate.
  2. Every exemplar passes its own style's mechanical bands, checked against
     that style's corpus as the reference. This is the check the floor unlocks.
  3. On a public-domain style, every exemplar appears verbatim in that style's
     own corpus. Exemplars and corpus are evidence and nobody edits them, so an
     exemplar that has drifted from the corpus by a word is a defect even when
     the drift reads better.

    python3 scripts/check-writing-style-exemplars.py [--snapshot styles.json]

Without a snapshot it reads the deployment named by TEMPER_API_URL using
TEMPER_API_KEY, and it writes nothing anywhere. The bands checker is the mirror
in docs/research/harness/voice_check_local.py; the deployment's finalizer stays
the arbiter, and a disagreement between the two is a bug in the mirror.
"""
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "docs/research/harness"))
from voice_check_local import check, words_of  # noqa: E402

FLOOR, CEILING = 150, 400
MOST_EXEMPLARS = 3
LIVE = ("Draft", "UnderReview", "Published")


def get(path):
    origin = os.environ.get("TEMPER_API_URL", "https://openpaw-production.up.railway.app")
    key = os.environ["TEMPER_API_KEY"]
    request = urllib.request.Request(
        origin + path,
        headers={"Authorization": f"Bearer {key}", "X-Tenant-Id": os.environ.get("TEMPER_TENANT", "default")},
    )
    return json.load(urllib.request.urlopen(request, timeout=120))


def styles_and_corpora(snapshot):
    """Returns [(fields, [(name, text), ...])] for every live style."""
    if snapshot:
        loaded = json.load(open(snapshot))
        rows, cached = loaded["value"], loaded.get("corpora", {})
    else:
        rows, cached = get("/tdata/WritingStyles?$top=200")["value"], {}
    out = []
    for row in rows:
        fields = row["fields"]
        if fields["Status"] not in LIVE:
            continue
        slug = fields["slug"]
        if slug in cached:
            corpus = [(name, body) for name, body in cached[slug]]
        else:
            corpus = []
            for n, file_id in enumerate(fields.get("corpus_file_ids") or [], 1):
                url = f"{os.environ.get('TEMPER_API_URL')}/tdata/Files('{file_id}')/$value"
                request = urllib.request.Request(
                    url,
                    headers={"Authorization": f"Bearer {os.environ['TEMPER_API_KEY']}",
                             "X-Tenant-Id": os.environ.get("TEMPER_TENANT", "default")},
                )
                corpus.append((f"corpus-{n}.md", urllib.request.urlopen(request, timeout=120).read().decode("utf-8")))
        out.append((fields, corpus))
    return out


def flat(text):
    """Whitespace-insensitive form, so a re-emitted paragraph break is not drift."""
    return re.sub(r"\s+", " ", text).strip()


def problems_with(fields, corpus):
    found = []
    name = fields["name"]
    exemplars = json.loads(fields.get("exemplars") or "[]")
    if not 1 <= len(exemplars) <= MOST_EXEMPLARS:
        found.append(f"{name}: carries {len(exemplars)} exemplars, outside 1 to {MOST_EXEMPLARS}")
    for i, exemplar in enumerate(exemplars, 1):
        n = len(words_of(exemplar.get("text", "")))
        if not FLOOR <= n <= CEILING:
            found.append(f"{name}: exemplar {i} is {n} words, outside {FLOOR} to {CEILING}")
        if not (exemplar.get("annotation") or "").strip():
            found.append(f"{name}: exemplar {i} carries no annotation")
    if not corpus:
        found.append(f"{name}: has no corpus to check its exemplars against")
        return found
    bands = json.loads(fields.get("mechanical_bands") or "{}")
    for violation in check(bands, corpus, [(f"{name} exemplar {i}", e.get("text", "")) for i, e in enumerate(exemplars, 1)]):
        found.append(violation)
    basis = (json.loads(fields.get("consent") or "{}")).get("basis")
    if basis == "public_domain":
        haystack = " ".join(flat(body) for _, body in corpus)
        for i, exemplar in enumerate(exemplars, 1):
            if flat(exemplar.get("text", "")) not in haystack:
                found.append(f"{name}: exemplar {i} is not a verbatim run of its own corpus")
    return found


def main():
    snapshot = None
    if "--snapshot" in sys.argv:
        snapshot = sys.argv[sys.argv.index("--snapshot") + 1]
    everything = styles_and_corpora(snapshot)
    problems = []
    for fields, corpus in everything:
        found = problems_with(fields, corpus)
        mark = "ok" if not found else f"{len(found)} problem(s)"
        print(f"{fields['name'][:44]:<45} {fields['Status']:<12} {mark}")
        problems += found
    print()
    for problem in problems:
        print(f"  {problem}")
    print(f"\n{len(everything)} live writing styles, {len(problems)} problems")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
