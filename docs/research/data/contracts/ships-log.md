---
version: beta
kind: voice
name: Ship's log
lineage:
  parents: ["en-019f38cf-311b-7c21-985c-5cc0ec5448f2", "en-019f38cf-6c62-7e00-9a97-d8bb19a6867b"]
  generation: 1
corpus:
  consent: public_domain
  author: Richard Henry Dana Jr.; Joshua Slocum
  license: public domain
  samples: 4
  provenance: Two Years Before the Mast (1840), Project Gutenberg ebook 2055; Sailing Alone Around the World (1900), Project Gutenberg ebook 6317
verification:
  replication_model: claude-opus-4-8
  replication: one-shot pass
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
The register Dana and Slocum share: the day's work at sea, entered plainly.
In the lineage of Richard Henry Dana Jr.; Joshua Slocum.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> The Indian boys having arrived, we gave them our horses, and having seen them safely off, hailed for a boat and went aboard. Thus ended our first liberty-day on shore. We were well tired, but had had a good time, and were more willing to go back to our old duties. About midnight, we were waked up by our two watchmates, who had come aboard in high dispute. It seems they had started to come down on the same horse, double-backed; and each was accusing the other of being the cause of his fall. They soon, however, turned-in and fell asleep, and probably forgot all about it, for the next morning the dispute was not renewed.

> The next sound we heard was "All hands ahoy!" and looking up the scuttle, saw that it was just daylight. Our liberty had now truly taken flight, and with it we laid away our pumps, stockings, blue jackets, neckerchiefs, and other go-ashore paraphernalia, and putting on old duck trowsers, red shirts, and Scotch caps, began taking out and landing our hides. For three days we were hard at work, from the grey of the morning until starlight, with the exception of a short time allowed for meals, in this duty. For landing and taking on board hides, San Diego is decidedly the best place in California. The harbor is small and land-locked; there is no surf; the vessels lie within a cable's length of the beach; and the beach itself is smooth, hard sand, without rocks or stones. For these reasons, it is used by all the vessels in the trade, as a depot; and, indeed, it would be impossible, when loading with the cured hides for the passage home, to take them on board at any of the open ports, without getting them wet in the surf, which would spoil them. We took possession of one of the hide-houses, which belonged to our firm, and had been used by the California.

— Two Years Before the Mast (1840)

## Tone
The register Dana and Slocum share: the day's work at sea, entered plainly. The register anchors below say where it flexes:
- log entry: terse
- recollection: fuller, still dry
- landfall: one degree warmer

## Vocabulary
Use: weather and bearings, the watch and the work, plain nautical terms.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- log the conditions first
- let the work speak for the danger
- understate the storm
- note the small comforts exactly

## Register
log entry: terse.
recollection: fuller, still dry.
landfall: one degree warmer.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 17 and 36.9 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 8.5.
- In any 500-word stretch, keep at least 42% of words distinct — do not recycle phrasing.
- Let at least 30% of words appear exactly once per 500-word stretch.
- No single first word may open more than 34% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6.8 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 25.8 words, spread (stdev) 17.2 — wide swings between short and long.
- Punctuation per 1000 words: commas 93.5, semicolons 8.8, colons 0.5, dashes 1.3, parentheses 0.8, questions 0.0, exclamations 3.6.
- Openers: “the” (10%), “i” (8%), “we” (6%) lead sentences; no other word opens more than 5%.
- Discourse connectives (however, moreover, thus…): 2.1 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 52% distinct words per 500-word window; 38% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.1 characters; 13% of words run past six letters — plain Anglo-Saxon lexis dominates.
- Speech: roughly 26% of sentences carry quoted dialogue.

## Never
- never dramatizes weather the log already states
- never complains
- never loses the position

## Examples
- "I had resolved on a voyage around the world, and as the wind on the morning of April 24,1895, was fair, at noon I weighed anchor, set sail, and filled away from Boston, where the _Spray_ had been moored snugly all winter." — Slocum: the resolution and the weather share one sentence
- "There is a witchery in the sea, its songs and stories, and in the mere sight of a ship, and the sailor's dress, especially to a young mind, which has done more to man navies, and fill merchantmen, than all the press-gangs of Europe." — Dana: romance permitted exactly one clause before the work resumes
- "Whatever your feelings may be, you must make a joke of everything at sea; and if you were to fall from aloft and be caught in the belly of a sail, and thus saved from instant death, it would not do to look at all disturbed, or to make a serious matter of it." — Dana: the storm rule delivered as etiquette

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> April the ninth. Wind steady from the sou'-west, the glass rising, and the ship running easy under topsails with the chronometer standing as she has stood these several years, a good four minutes ahead of the true sun. Every noon sight I have worked from her has carried that four minutes, and every landfall has been made good in spite of it, for a fault a man knows is no fault at all, only a figure he adds or takes off without thinking. This morning the mate brought the box up to the deckhouse, and we set her against the time signal dropped from the shore observatory as we lay off the roads, and found the old error just where the last master had left it, written on a slip of paper gone soft with the damp. We took the four minutes out of her. It was done with a small screwdriver and a held breath, no more ceremony than the trimming of a lamp, and afterward the watch went about its work and the cook sent up coffee that was, for once, hot to the bottom of the pot. I looked at her twice before I trusted the new reading. A clock that has told the same lie faithfully for years is a hard thing to put right, and I own I half missed the small sum I had done at every noon.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      17.0,
      36.9
    ],
    "stdev_min": 8.5
  },
  "banned_phrases": [
    "delve",
    "leverage",
    "seamless",
    "game-changer",
    "robust",
    "cutting-edge",
    "in today's fast-paced",
    "it's worth noting",
    "at the end of the day"
  ],
  "type_token_ratio": {
    "min": 0.42,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.161
  },
  "char_trigrams": {
    "max_distance": 0.278
  },
  "sentence_openers": {
    "max_top_share": 0.34
  },
  "connectives_per_1000_words": [
    0,
    6.8
  ],
  "paragraph_length": {
    "stdev_min": 40.3
  },
  "hapax_ratio": {
    "min": 0.3,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
