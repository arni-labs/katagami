"""Build a style's VOICE.md in the format the collection already uses (v3.3-lean).

VOICE.md is the portable projection: the file at /voice/<id>/VOICE.md that gets
handed to another agent as a prompt. It quotes whole corpus passages inside
itself, which is why it has to be rebuilt whenever the corpus changes. A style
whose corpus is replaced without this file being rebuilt goes on serving the old
passages under the new name, and every entity field reads correct the whole time.

Everything measurable here is measured from the corpus that is actually attached.
The authored parts — persona, refusals, moves, register, the vocabulary lists —
come from the payload the owner approved, and this file does not compose any of
them.
"""
import json
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "docs/research/harness"))
from voice_check_local import CONNECTIVES, sentences_of, words_of  # noqa: E402

FORMAT_VERSION = "v3.3-lean"


def fingerprint(corpus):
    """The 'Measured fingerprint' paragraph, computed rather than asserted."""
    texts = [body for _, body in corpus]
    everything = "\n\n".join(texts)
    words = words_of(everything)
    per_text = [[len(words_of(s)) for s in sentences_of(t)] for t in texts]
    means = [statistics.mean(x) for x in per_text]
    stdevs = [statistics.pstdev(x) for x in per_text]
    ttrs = []
    for t in texts:
        w = words_of(t)
        ttrs.append(statistics.mean([len(set(w[i:i + 500])) / len(w[i:i + 500]) for i in range(0, len(w), 500)]))
    per_thousand = lambda n: n * 1000 / len(words)  # noqa: E731
    connectives = sum(1 for w in words if w in CONNECTIVES)
    openers = [words_of(s)[0] for s in sentences_of(everything) if words_of(s)]
    top = sorted(((openers.count(o), o) for o in set(openers)), reverse=True)[:5]
    return (
        f"Measured over {len(texts)} passages and {len(words)} words. Sentence means run from "
        f"{min(means):.1f} to {max(means):.1f} words, with a standard deviation inside each passage of "
        f"{min(stdevs):.1f} to {max(stdevs):.1f}, so the length varies as much as it averages. Windowed "
        f"type-token ratio over 500 words sits between {min(ttrs):.2f} and {max(ttrs):.2f}. Per thousand "
        f"words the corpus carries {per_thousand(everything.count(';')):.1f} semicolons, "
        f"{per_thousand(everything.count('!')):.1f} exclamation marks and {per_thousand(connectives):.1f} of "
        f"the fourteen connectives the checker counts (however, moreover, thus and the rest). The commonest "
        f"sentence openers are {', '.join(f'{word} ({count})' for count, word in top)}."
    )


# The sections of a VOICE.md that quote the corpus. Every VOICE.md format the
# collection has used calls them one of these. "Known-good replica" is left out
# on purpose: a replica is written from the contract and is labelled a replica.
QUOTING_SECTIONS = ("Gold standard samples", "How it reads")
SCAFFOLDING = re.compile(r"^(Source:|The voice is these passages|Each numbered entry|The strongest guide|—\s)")


def quoted_from(voice_md):
    """Every block of prose a VOICE.md presents as corpus, in any of its formats.

    The older format puts one whole passage per line as `N. "..."`. The beta
    format numbers a `Source:` label and indents the passage under it, and its
    "How it reads" excerpt is a blockquote. All three reduce to the same thing:
    contiguous lines of quoted prose."""
    passages, block, inside = [], [], False
    for line in voice_md.split("\n") + ["## end"]:
        if line.startswith("## "):
            if block:
                passages.append("\n".join(block))
                block = []
            inside = line[3:].strip() in QUOTING_SECTIONS
            continue
        if not inside:
            continue
        numbered = re.match(r'^\d+\.\s+"(.*)"\s*$', line)
        if numbered:
            passages.append(numbered.group(1))
            continue
        stripped = line[2:] if line.startswith("> ") else (line[3:] if line.startswith("   ") else None)
        if stripped is None or SCAFFOLDING.match(stripped.strip()) or not stripped.strip():
            if block:
                passages.append("\n".join(block))
                block = []
            continue
        block.append(stripped)
    return [p for p in passages if len(words_of(p)) >= 12]


def indent(passage, spaces=3):
    return "\n\n".join("\n".join(" " * spaces + line for line in block.split("\n"))
                       for block in passage.split("\n\n"))


def sentence_case(line):
    return line[0].upper() + line[1:] if line else line


def build(entry, file_ids, corpus):
    """entry is one style from the approved payload; corpus is [(name, text)]."""
    consent = entry["consent"]
    labels = [passage["source"] for passage in entry["corpus"]]
    manifest_lines = "\n".join(
        f'    - {{file_id: {file_id}, source: "{label}", words: {len(words_of(body))}}}'
        for file_id, label, (_, body) in zip(file_ids, labels, corpus))
    samples = "\n\n".join(
        f"{n}. Source: {label}, {len(words_of(body))} words.\n\n{indent(body.strip())}"
        for n, (label, (_, body)) in enumerate(zip(labels, corpus), 1))
    corpus_index = "\n".join(
        f"- Passage {n}: /api/file/{file_id} ({label}, {len(words_of(body))} words)"
        for n, (file_id, label, (_, body)) in enumerate(zip(file_ids, labels, corpus), 1))
    bans = ", ".join(entry["mechanical_bands"]["banned_phrases"])
    return f"""---
version: {FORMAT_VERSION}
kind: voice
name: {entry['name']}
slug: {entry['slug']}
corpus:
  consent: {consent['basis']}
  author: {consent['author']}
  license: {consent['license']}
  samples: {consent['samples']}
  provenance: {json.dumps(consent['provenance'], ensure_ascii=False)}
  files:
{manifest_lines}
---

# {entry['name']}

{entry['persona']}

## Never

{chr(10).join('- ' + sentence_case(r) for r in entry['refusals'])}

## Gold standard samples

Each numbered entry is one complete corpus passage, quoted as it stands.

{samples}

## Signature vocabulary

Reach for these:

{chr(10).join('- ' + u for u in entry['vocabulary']['use'])}

These {len(entry['habits'])} habits identify the register faster than anything else:

{chr(10).join('- ' + h for h in entry['habits'])}

Words and constructions this voice refuses:

{bans}.

## Moves

{chr(10).join('- ' + sentence_case(m) for m in entry['moves'])}

## Register

{chr(10).join(f'- {channel}: {description}' for channel, description in entry['register'].items())}

## Measured fingerprint

{fingerprint(corpus)}

Write to these numbers. The checker below reads them from the corpus and
applies them to anything written in this voice.

```json
{json.dumps(entry['mechanical_bands'], indent=2)}
```

## Corpus

The full text of every passage above:

{corpus_index}
"""
