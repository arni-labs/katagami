#!/usr/bin/env python3
"""VOICE.md format beta: everything derivable is derived from the corpus —
a full excerpt (the strongest conditioning signal), the bands translated into
writer-facing rhythm instructions, a computed linguistic profile, and the
verified replica as a known-good rendering. Authored judgment stays clearly
authored (persona, moves, never); measurement stays measured."""
import json
import re
import statistics

import voice_check_local as vc

ONE_SHOT = {"austen-novels", "chesterfield-letters", "dana-sea-narrative",
            "naturalist-field-notes", "pepys-diary", "post-etiquette",
            "ships-log", "twain-travel-letters", "white-selborne-letters"}


def excerpt_of(corpus_texts, max_words=340):
    body = corpus_texts[0][1].strip()
    sents = re.split(r"(?<=[.!?]) ", body.replace("\n\n", " ¶ "))
    out, count = [], 0
    for s in sents:
        w = len(s.split())
        if count + w > max_words and count > 150:
            break
        out.append(s)
        count += w
    return " ".join(out).replace(" ¶ ", "\n\n").strip()


def punct_per_1000(text, words):
    n = max(len(words), 1)
    def rate(chars):
        return round(sum(text.count(c) for c in chars) * 1000 / n, 1)
    return {
        "commas": rate(","), "semicolons": rate(";"), "colons": rate(":"),
        "dashes": rate("—–") + rate(["--"][0:0] or []) if False else round((text.count("—") + text.count("–") + text.count("--")) * 1000 / n, 1),
        "parentheses": rate("("), "question marks": rate("?"), "exclamations": rate("!"),
    }


def linguistic_profile(corpus_texts):
    full = "\n\n".join(b for _, b in corpus_texts)
    words = vc.words_of(full)
    sents = vc.sentences_of(full)
    lens = [len(vc.words_of(s)) for s in sents]
    openers = [vc.words_of(s)[0] for s in sents if vc.words_of(s)]
    top = sorted(((openers.count(o), o) for o in set(openers)), reverse=True)[:5]
    conn = sum(1 for w in words if w in vc.CONNECTIVES) * 1000 / len(words)
    window = 500
    ttrs, hapaxes = [], []
    for i in range(0, len(words), window):
        chunk = words[i:i + window]
        counts = {}
        for w in chunk:
            counts[w] = counts.get(w, 0) + 1
        ttrs.append(len(set(chunk)) / len(chunk))
        hapaxes.append(sum(1 for n in counts.values() if n == 1) / len(chunk))
    wl = statistics.mean(len(w) for w in words)
    heavy = sum(1 for w in words if len(w) > 6) / len(words)
    dialog = sum(1 for s in sents if '"' in s or "'" in s and s.count("'") >= 2) / max(len(sents), 1)
    p = punct_per_1000(full, words)
    lines = [
        f"- Sentences: mean {statistics.mean(lens):.1f} words, spread (stdev) {statistics.pstdev(lens):.1f} — "
        + ("wide swings between short and long." if statistics.pstdev(lens) > 9 else "moderate variation."),
        f"- Punctuation per 1000 words: commas {p['commas']}, semicolons {p['semicolons']}, colons {p['colons']}, "
        f"dashes {p['dashes']}, parentheses {p['parentheses']}, questions {p['question marks']}, exclamations {p['exclamations']}.",
        f"- Openers: {', '.join(f'“{o}” ({c*100//len(openers)}%)' for c, o in top[:3])} lead sentences; "
        f"no other word opens more than {top[3][0]*100//len(openers) if len(top) > 3 else 0}%.",
        f"- Discourse connectives (however, moreover, thus…): {conn:.1f} per 1000 words — "
        + ("sparse; the argument moves by content, not signposts." if conn < 4 else "present but measured."),
        f"- Vocabulary: {statistics.mean(ttrs)*100:.0f}% distinct words per 500-word window; "
        f"{statistics.mean(hapaxes)*100:.0f}% of words appear exactly once — "
        + ("high renewal, little phrase recycling." if statistics.mean(hapaxes) > 0.5 else "recycles key terms deliberately."),
        f"- Lexis: mean word length {wl:.1f} characters; {heavy*100:.0f}% of words run past six letters"
        + (" — plain Anglo-Saxon lexis dominates." if heavy < 0.2 else "; Latinate vocabulary carries weight."),
    ]
    if dialog > 0.12:
        lines.append(f"- Speech: roughly {dialog*100:.0f}% of sentences carry quoted dialogue.")
    return "\n".join(lines)


def rhythm_instructions(bands):
    lines = []
    sl = bands.get("sentence_length") or {}
    if sl.get("mean"):
        lo, hi = sl["mean"]
        lines.append(f"- Keep the average sentence between {lo:g} and {hi:g} words.")
    if sl.get("stdev_min"):
        lines.append(f"- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least {sl['stdev_min']:g}.")
    p = bands.get("punctuation") or {}
    if "exclamations_per_1000_words" in p:
        lo, hi = p["exclamations_per_1000_words"]
        lines.append("- No exclamation marks." if hi == 0 else f"- Exclamation marks: at most {hi:g} per 1000 words.")
    ttr = bands.get("type_token_ratio") or {}
    if ttr.get("min"):
        lines.append(f"- In any {int(ttr.get('window_words', 500))}-word stretch, keep at least {int(ttr['min']*100)}% of words distinct — do not recycle phrasing.")
    hx = bands.get("hapax_ratio") or {}
    if hx.get("min"):
        lines.append(f"- Let at least {int(hx['min']*100)}% of words appear exactly once per {int(hx.get('window_words', 500))}-word stretch.")
    so = bands.get("sentence_openers") or {}
    if so.get("max_top_share"):
        lines.append(f"- No single first word may open more than {int(so['max_top_share']*100)}% of sentences.")
    if "connectives_per_1000_words" in bands:
        lo, hi = bands["connectives_per_1000_words"]
        lines.append(f"- Discourse connectives (however, moreover, therefore…): at most {hi:g} per 1000 words.")
    if bands.get("banned_phrases"):
        lines.append(f"- Banned outright: {', '.join(bands['banned_phrases'][:8])}.")
    lines.append("- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.")
    return "\n".join(lines)


def build_voice_md(slug, fields, bands, corpus_texts, replica_text):
    name = fields.get("name") or slug
    persona = fields.get("persona") or ""
    consent = json.loads(fields.get("consent") or "{}")
    credits = json.loads(fields.get("credits") or "[]")
    vocab = json.loads(fields.get("vocabulary") or "{}")
    moves = json.loads(fields.get("moves") or "[]")
    register = json.loads(fields.get("register") or "{}")
    refusals = json.loads(fields.get("refusals") or "[]")
    exemplars = json.loads(fields.get("exemplars") or "[]")
    parents = fields.get("parent_ids") or []
    if isinstance(parents, str):
        parents = json.loads(parents or "[]")
    gen = fields.get("generation_number") or "0"
    source = "; ".join(c.get("name", "") for c in credits if c.get("kind") in ("writer", "translator"))

    excerpt = excerpt_of(corpus_texts)
    src_label = ""
    # First corpus source from manifest if present
    manifest = json.loads(fields.get("corpus_manifest") or "{}")
    items = manifest.get("items") or []
    if items and items[0].get("source"):
        src_label = items[0]["source"]

    return f"""---
version: beta
kind: voice
name: {name}
lineage:
  parents: {json.dumps(parents)}
  generation: {gen}
corpus:
  consent: {consent.get('basis', '')}
  author: {consent.get('author', '')}
  license: {consent.get('license', '')}
  samples: {consent.get('samples', '')}
  provenance: {consent.get('provenance', '')}
verification:
  replication_model: claude-opus-4-8
  replication: {"one-shot pass" if slug in ONE_SHOT else "passed after numeric revision"}
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
{persona[0].upper() + persona[1:] if persona else name}.
{"In the lineage of " + source + "." if source else ""}

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> {excerpt.replace(chr(10) + chr(10), chr(10) + chr(10) + "> ")}

{f"— {src_label}" if src_label else ""}

## Tone
{persona[0].upper() + persona[1:] if persona else ""}. The register anchors below say where it flexes:
{chr(10).join(f"- {k}: {v}" for k, v in register.items())}

## Vocabulary
Use: {", ".join(vocab.get("use", []))}.
Ban: {", ".join(vocab.get("ban", []))}.

## Moves
{chr(10).join("- " + m for m in moves)}

## Register
{chr(10).join(f"{k}: {v}." for k, v in register.items())}

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
{rhythm_instructions(bands)}

## Linguistic profile
Measured from the corpus, not asserted:
{linguistic_profile(corpus_texts)}

## Never
{chr(10).join("- " + r for r in refusals)}

## Examples
{chr(10).join('- "' + e.get("text", "") + '" — ' + e.get("annotation", "") for e in exemplars)}

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> {replica_text.strip().replace(chr(10) + chr(10), chr(10) + chr(10) + "> ")}

## Bands (the machine contract)
```json
{json.dumps(bands, indent=2)}
```
"""
