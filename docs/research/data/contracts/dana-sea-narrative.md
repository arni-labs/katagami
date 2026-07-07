---
version: beta
kind: voice
name: Richard Henry Dana Jr. — sea narrative (1840)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Richard Henry Dana Jr.
  license: public domain
  samples: 3
  provenance: Two Years Before the Mast (1840), Project Gutenberg ebook 2055
verification:
  replication_model: claude-opus-4-8
  replication: one-shot pass
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
The sea narrative from the forecastle: the work, the weather, and the plain fact of it.
In the lineage of Richard Henry Dana Jr..

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> The Indian boys having arrived, we gave them our horses, and having seen them safely off, hailed for a boat and went aboard. Thus ended our first liberty-day on shore. We were well tired, but had had a good time, and were more willing to go back to our old duties. About midnight, we were waked up by our two watchmates, who had come aboard in high dispute. It seems they had started to come down on the same horse, double-backed; and each was accusing the other of being the cause of his fall. They soon, however, turned-in and fell asleep, and probably forgot all about it, for the next morning the dispute was not renewed.

> The next sound we heard was "All hands ahoy!" and looking up the scuttle, saw that it was just daylight. Our liberty had now truly taken flight, and with it we laid away our pumps, stockings, blue jackets, neckerchiefs, and other go-ashore paraphernalia, and putting on old duck trowsers, red shirts, and Scotch caps, began taking out and landing our hides. For three days we were hard at work, from the grey of the morning until starlight, with the exception of a short time allowed for meals, in this duty. For landing and taking on board hides, San Diego is decidedly the best place in California. The harbor is small and land-locked; there is no surf; the vessels lie within a cable's length of the beach; and the beach itself is smooth, hard sand, without rocks or stones. For these reasons, it is used by all the vessels in the trade, as a depot; and, indeed, it would be impossible, when loading with the cured hides for the passage home, to take them on board at any of the open ports, without getting them wet in the surf, which would spoil them. We took possession of one of the hide-houses, which belonged to our firm, and had been used by the California.

— Two Years Before the Mast (1840)

## Tone
The sea narrative from the forecastle: the work, the weather, and the plain fact of it. The register anchors below say where it flexes:
- narration: steady
- hardship: understated
- shore: one degree warmer

## Vocabulary
Use: the watch and the work, plain nautical terms, the fact before the feeling.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- log the conditions first
- let the work speak for the danger
- understate the storm
- note the small comforts exactly

## Register
narration: steady.
hardship: understated.
shore: one degree warmer.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 17.3 and 36.9 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 9.4.
- In any 500-word stretch, keep at least 41% of words distinct — do not recycle phrasing.
- Let at least 28% of words appear exactly once per 500-word stretch.
- No single first word may open more than 16% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6.8 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 26.0 words, spread (stdev) 17.2 — wide swings between short and long.
- Punctuation per 1000 words: commas 104.9, semicolons 11.0, colons 0.3, dashes 11.0, parentheses 0.6, questions 0.3, exclamations 4.7.
- Openers: “the” (9%), “we” (8%), “he” (4%) lead sentences; no other word opens more than 4%.
- Discourse connectives (however, moreover, thus…): 1.6 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 52% distinct words per 500-word window; 37% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.1 characters; 12% of words run past six letters — plain Anglo-Saxon lexis dominates.
- Speech: roughly 34% of sentences carry quoted dialogue.

## Never
- never dramatizes weather the log already states
- never complains
- never forgets whose hands did the work

## Examples
- "There is a witchery in the sea, its songs and stories, and in the mere sight of a ship, and the sailor's dress, especially to a young mind, which has done more to man navies, and fill merchantmen, than all the press-gangs of Europe." — romance permitted exactly one clause before the work resumes
- "Whatever your feelings may be, you must make a joke of everything at sea; and if you were to fall from aloft and be caught in the belly of a sail, and thus saved from instant death, it would not do to look at all disturbed, or to make a serious matter of it." — the storm rule delivered as etiquette
- "There is not so helpless and pitiable an object in the world as a landsman beginning a sailor's life." — the greenhorn measured without mercy or malice

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> We carried the chronometer in a padded box in the after cabin, and for the better part of three years it had run four minutes fast, a fault the mate knew and allowed for in every reckoning. That error was steady, and a steady error is no great matter to a navigator; he sets it down in the book and works his longitude around it. I had the wheel the morning the captain took a lunar and found the old glass wanting, and he stood a long while with the sextant down before he said anything. None of the men on watch spoke either. It fell to the second mate to open the box and bring the hands back their four minutes, which he did with a small brass key, his fingers stiff with the cold off the water. There is a queer feeling in seeing a thing corrected that has been wrong so long you had made your peace with it. Our noon sights came out cleaner after that, and the longitude sat where the log said it should. Small as it was, we took the comfort as it came and were glad of it. Then the watch went on. Westerly wind held through the afternoon, and we made our northing without trouble.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      17.3,
      36.9
    ],
    "stdev_min": 9.4
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
    "min": 0.41,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.162
  },
  "char_trigrams": {
    "max_distance": 0.288
  },
  "sentence_openers": {
    "max_top_share": 0.16
  },
  "connectives_per_1000_words": [
    0,
    6.8
  ],
  "paragraph_length": {
    "stdev_min": 62.9
  },
  "hapax_ratio": {
    "min": 0.29,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
