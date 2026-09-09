#!/usr/bin/env python3
"""Hold every live writing style to the exemplar contract.

An exemplar is the evidence a reader judges a voice by, so a sentence cannot be
one. The rule this script enforces has four parts, and each one failed silently
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
  4. The same rule applied to the VOICE.md, which quotes whole corpus passages
     inside itself. VOICE.md is the copy that travels: it is the file handed to
     another agent as a prompt, so it is the one most likely to be read and
     reused. A style whose corpus is replaced without its VOICE.md being rebuilt
     goes on serving the old passages under the new name, and every entity field
     looks correct the whole time. This is what catches that without anyone
     opening the file by hand. The replica section is exempt, because a replica
     is written from the contract and is never claimed to be corpus.

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
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from voice_check_local import check, words_of  # noqa: E402
from writing_style_voice_md import quoted_from  # noqa: E402

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


def file_text(file_id):
    origin = os.environ.get("TEMPER_API_URL", "https://openpaw-production.up.railway.app")
    request = urllib.request.Request(
        f"{origin}/tdata/Files('{file_id}')/$value",
        headers={"Authorization": f"Bearer {os.environ['TEMPER_API_KEY']}",
                 "X-Tenant-Id": os.environ.get("TEMPER_TENANT", "default")},
    )
    return urllib.request.urlopen(request, timeout=120).read().decode("utf-8")


def styles_and_corpora(snapshot):
    """Returns [(fields, [(name, text), ...], voice_md)] for every live style."""
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
            corpus, voice_md = [(name, body) for name, body in cached[slug]], cached.get(f"{slug}:voice")
        else:
            corpus = [(f"corpus-{n}.md", file_text(file_id))
                      for n, file_id in enumerate(fields.get("corpus_file_ids") or [], 1)]
            voice_md = file_text(fields["voice_md_file_id"]) if fields.get("voice_md_file_id") else None
        out.append((fields, corpus, voice_md))
    return out


def flat(text):
    """Whitespace-insensitive form, so a re-emitted paragraph break is not drift."""
    return re.sub(r"\s+", " ", text).strip()


def problems_with(fields, corpus, voice_md=None):
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
    haystack = " ".join(flat(body) for _, body in corpus)
    if basis == "public_domain":
        for i, exemplar in enumerate(exemplars, 1):
            if flat(exemplar.get("text", "")) not in haystack:
                found.append(f"{name}: exemplar {i} is not a verbatim run of its own corpus")
    if voice_md:
        passages = quoted_from(voice_md)
        # A file that quotes nothing would satisfy the rule below by having no
        # passages to fail it, which is the same exemption the word floor taught
        # us about. Every VOICE.md format the collection uses quotes the corpus,
        # so none is the wrong answer rather than a clean one.
        if not passages:
            found.append(f"{name}: VOICE.md quotes no corpus passage, so nothing here was checked")
        for i, passage in enumerate(passages, 1):
            if flat(passage) not in haystack:
                found.append(f"{name}: VOICE.md passage {i} is not in the style's own corpus "
                             f"(\"{flat(passage)[:60]}…\")")
    return found


def main():
    snapshot = None
    if "--snapshot" in sys.argv:
        snapshot = sys.argv[sys.argv.index("--snapshot") + 1]
    everything = styles_and_corpora(snapshot)
    problems = []
    for fields, corpus, voice_md in everything:
        found = problems_with(fields, corpus, voice_md)
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
