---
version: beta
kind: voice
name: Mark Twain — travel letters (1869)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Mark Twain
  license: public domain
  samples: 3
  provenance: The Innocents Abroad (1869), Project Gutenberg ebook 3176
verification:
  replication_model: claude-opus-4-8
  replication: one-shot pass
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
Travel written by the unimpressed: the guidebook's claims, the traveler's evidence, and the gap played straight.
In the lineage of Mark Twain.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> How poor, and cheap, and trivial these gew-gaws seemed in presence of the solemnity, the grandeur, the awful majesty of Death! Think of Milton, Shakespeare, Washington, standing before a reverent world tricked out in the glass beads, the brass ear-rings and tin trumpery of the savages of the plains!

> Dead Bartolomeo preached his pregnant sermon, and its burden was: You that worship the vanities of earth--you that long for worldly honor, worldly wealth, worldly fame--behold their worth!

> To us it seemed that so good a man, so kind a heart, so simple a nature, deserved rest and peace in a grave sacred from the intrusion of prying eyes, and believed that he himself would have preferred to have it so, but peradventure our wisdom was at fault in this regard.

> What, more? The furniture of the narrow chamber of death we had just visited weighed six millions of francs in ounces and carats alone, without a penny thrown into the account for the costly workmanship bestowed upon them! But we followed into a large room filled with tall wooden presses like wardrobes. He threw them open, and behold, the cargoes of “crude bullion” of the assay offices of Nevada faded out of my memory. There were Virgins and bishops there, above their natural size, made of solid silver, each worth, by weight, from eight hundred thousand to two millions of francs, and bearing gemmed books in their hands worth eighty thousand; there were bas-reliefs that weighed six hundred pounds, carved in solid silver; croziers and crosses, and candlesticks six and eight feet high, all of virgin gold, and brilliant with precious stones; and beside these were all manner of cups and vases, and such things, rich in proportion. It was an Aladdin's palace. The treasures here, by simple weight, without counting workmanship, were valued at fifty millions of francs!

— The Innocents Abroad (1869)

## Tone
Travel written by the unimpressed: the guidebook's claims, the traveler's evidence, and the gap played straight. The register anchors below say where it flexes:
- description: deadpan
- aside: confiding
- verdict: dry

## Vocabulary
Use: the deadpan report, the guidebook quoted against itself, exact figures for comic effect.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- report the marvel as advertised
- supply the observed facts
- let the gap do the work
- confess the traveler's own folly evenly

## Register
description: deadpan.
aside: confiding.
verdict: dry.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 15.4 and 31.3 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 10.
- In any 500-word stretch, keep at least 42% of words distinct — do not recycle phrasing.
- Let at least 32% of words appear exactly once per 500-word stretch.
- No single first word may open more than 38% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 23.0 words, spread (stdev) 17.5 — wide swings between short and long.
- Punctuation per 1000 words: commas 63.1, semicolons 5.1, colons 1.6, dashes 5.1, parentheses 2.4, questions 1.6, exclamations 2.0.
- Openers: “i” (11%), “the” (10%), “we” (6%) lead sentences; no other word opens more than 5%.
- Discourse connectives (however, moreover, thus…): 0.4 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 58% distinct words per 500-word window; 45% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.4 characters; 19% of words run past six letters — plain Anglo-Saxon lexis dominates.

## Never
- never signals the joke
- never spares the narrator
- never mistakes reverence for observation

## Examples
- "The gentle reader will never, never know what a consummate ass he can become, until he goes abroad." — the confession aimed at the mirror — deadpan folded back on the narrator
- "They spell it Vinci and pronounce it Vinchy; foreigners always spell better than they pronounce." — the observed fact and the verdict in one breath
- "We wish to learn all the curious, outlandish ways of all the different countries, so that we can “show off” and astonish people when we get home. We wish to excite the envy of our untraveled friends with our strange foreign fashions which we can't shake off." — the tourist's motive confessed without mercy

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> The guidebook is warm upon the subject of the town clock. It calls the tower a marvel of civic pride and assures us the hour is struck with a precision that has never once been questioned in living memory. We took rooms across the square expressly to be near this paragon, and we set our watches by it the first morning, as reverent as pilgrims.

> By noon we had missed the coach. The clock, it develops, has run four minutes fast for upwards of thirty years, and every soul in the place knows it, and every soul in the place has quietly agreed to subtract the four minutes and say nothing to strangers. They do not correct the clock; they correct themselves. A stranger is left to correct nothing, because the stranger has been assured the machine is infallible.

> Last week a conscientious young man from the county seat climbed up and set the hands right. The town has not forgiven him. The bakers open late now by their own reckoning, the trains are met too early, and three weddings are said to have gone off in some confusion. I made my own apologies to the young man, having admired the clock a great deal more than I ever troubled to understand it, which is the entire art of the tourist.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      15.4,
      31.3
    ],
    "stdev_min": 10.0
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
    "max_distance": 0.147
  },
  "char_trigrams": {
    "max_distance": 0.282
  },
  "sentence_openers": {
    "max_top_share": 0.38
  },
  "connectives_per_1000_words": [
    0,
    6
  ],
  "paragraph_length": {
    "stdev_min": 22.5
  },
  "hapax_ratio": {
    "min": 0.32,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
