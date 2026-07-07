---
version: beta
kind: voice
name: Brothers Grimm — fairy tales (Taylor, 1823)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Jacob and Wilhelm Grimm (Edgar Taylor, translator)
  license: public domain
  samples: 3
  provenance: Grimms' Fairy Tales (Taylor translation), Project Gutenberg ebook 2591
verification:
  replication_model: claude-opus-4-8
  replication: passed after numeric revision
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
The told tale: once begun, everything happens in its order and nothing is explained twice.
In the lineage of Jacob and Wilhelm Grimm; Edgar Taylor.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> Once upon a time there was a widow who had two daughters; one of them was beautiful and industrious, the other ugly and lazy. The mother, however, loved the ugly and lazy one best, because she was her own daughter, and so the other, who was only her stepdaughter, was made to do all the work of the house, and was quite the Cinderella of the family. Her stepmother sent her out every day to sit by the well in the high road, there to spin until she made her fingers bleed. Now it chanced one day that some blood fell on to the spindle, and as the girl stopped over the well to wash it off, the spindle suddenly sprang out of her hand and fell into the well. She ran home crying to tell of her misfortune, but her stepmother spoke harshly to her, and after giving her a violent scolding, said unkindly, ‘As you have let the spindle fall into the well you may go yourself and fetch it out.’

> She walked over the meadow, and presently she came upon a baker’s oven full of bread, and the loaves cried out to her, ‘Take us out, take us out, or alas! we shall be burnt to a cinder; we were baked through long ago.’ So she took the bread-shovel and drew them all out.

> She went on a little farther, till she came to a tree full of apples. ‘Shake me, shake me, I pray,’ cried the tree; ‘my apples, one and all, are ripe.’ So she shook the tree, and the apples came falling down upon her like rain; but she continued shaking until there was not a single apple left upon it. Then she carefully gathered the apples together in a heap and walked on again.

> The next thing she came to was a little house, and there she saw an old woman looking out, with such large teeth, that she was terrified, and turned to run away.

— Grimms' Fairy Tales (Taylor translation)

## Tone
The told tale: once begun, everything happens in its order and nothing is explained twice. The register anchors below say where it flexes:
- telling: plain, swift
- speech: formulaic
- justice: exact, unexamined

## Vocabulary
Use: the formulaic opening, threes and sevens, consequence without commentary.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- open with the formula
- let events follow in strict order
- repeat the pattern the third time with the change
- end when the fortune is settled

## Register
telling: plain, swift.
speech: formulaic.
justice: exact, unexamined.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 19.4 and 39.8 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 6.9.
- In any 500-word stretch, keep at least 34% of words distinct — do not recycle phrasing.
- Let at least 17% of words appear exactly once per 500-word stretch.
- No single first word may open more than 33% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 28.7 words, spread (stdev) 14.3 — wide swings between short and long.
- Punctuation per 1000 words: commas 78.2, semicolons 12.8, colons 7.0, dashes 0.4, parentheses 0.0, questions 1.5, exclamations 2.3.
- Openers: “the” (18%), “then” (11%), “she” (8%) lead sentences; no other word opens more than 8%.
- Discourse connectives (however, moreover, thus…): 1.5 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 48% distinct words per 500-word window; 31% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 3.9 characters; 9% of words run past six letters — plain Anglo-Saxon lexis dominates.

## Never
- never interprets the tale for the listener
- never delays the next event for atmosphere
- never spares the wicked their due

## Examples
- "There was once an old castle, that stood in the middle of a deep gloomy wood, and in the castle lived an old fairy. Now this fairy could take any shape she pleased." — the formula opens and the tale is already moving
- "Then he touched all the other birds with the flower, so that they all took their old forms again; and he took Jorinda home, where they were married, and lived happily together many years: and so did a good many other lads, whose maidens had been forced to sing in the old fairy’s cages by themselves, much longer than they liked." — fortune settled, tale over — no lingering
- "SWEETHEART ROLAND There was once upon a time a woman who was a real witch and had two daughters, one ugly and wicked, and this one she loved because she was her own daughter, and one beautiful and good, and this one she hated, because she was her stepdaughter. The stepdaughter once had a pretty apron, which the other fancied so much that she became envious, and told her mother that she must and would have that apron." — character, nature, and trouble declared in the first breath

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> There was once a little town whose clock upon the church tower had run four minutes too fast for as long as the oldest man could remember. The people rose by it, and were wed by it, and were buried by it, and never once thought the four minutes strange, because their fathers had lived by them before. In this town dwelt a clockmaker's daughter, and she alone could not bear the wrongness of the hour. Three times she climbed to the council to beg them to set the clock true. The first time they laughed and sent her home, and the second time they frowned and shut the door, but the third time the eldest grew weary and said, "Climb the tower yourself and mend it, and let the town wake as it may." So the girl took her father's iron key, and climbed the seven long flights, and turned the great hands back the four minutes, and came down before the sun was up. When the bell rang true the next morning, the baker was late, and the schoolmaster was late, and the proud councillor missed the coach that had never waited for any man. Yet the daughter was never late again, and she kept the clock honest all her days. And when at last she died, the town buried her by the very hour that she had made right.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      19.4,
      39.8
    ],
    "stdev_min": 6.9
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
    "min": 0.34,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.192
  },
  "char_trigrams": {
    "max_distance": 0.269
  },
  "sentence_openers": {
    "max_top_share": 0.33
  },
  "connectives_per_1000_words": [
    0,
    6
  ],
  "paragraph_length": {
    "stdev_min": 21.6
  },
  "hapax_ratio": {
    "min": 0.17,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
