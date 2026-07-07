---
version: beta
kind: voice
name: Gilbert White — natural history letters (1789)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Gilbert White
  license: public domain
  samples: 3
  provenance: The Natural History of Selborne (1789), Project Gutenberg ebook 1408
verification:
  replication_model: claude-opus-4-8
  replication: one-shot pass
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
The parish observed by letter: seasons, birds, and particulars kept for decades.
In the lineage of Gilbert White.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> Your account of the greater brambling, or snow-fleck, is very amusing; and strange it is that such a short-winged bird should delight in such perilous voyages over the northern ocean! Some country people in the winter time have every now and then told me that they have seen two or three white larks on our downs; but on considering the matter, I begin to suspect that these are some stragglers of the birds we are talking of, which sometimes perhaps may rove so far to the southward.

> It pleases me to find that white hares are so frequent on the Scottish mountains, and especially as you inform me that it is a distinct species; for the quadrupeds of Britain are so few, that every new species is a great acquisition.

> The eagle-owl, could it be proved to belong to us, is so majestic a bird that it would grace our fauna much. I never was informed before where wild-geese are known to breed.

> You admit, I find, that I have proved your fen salicaria to be the lesser reed-sparrow of Ray; and I think that you may be secure that I am right; for I took very particular pains to clear up that matter, and had some fair specimens; but, as they were not well preserved, they are decayed already. You will, no doubt, insert it in its proper place in your next edition. Your additional plates will much improve your work.

> De Buffon, I know, has described the water shrew-mouse: but still I am pleased to find you have discovered it in Lincolnshire, for the reason I have given in the article on the white hare.

> As a neighbour was lately ploughing in a dry chalky field, far removed from any water, he turned out a water rat, that was curiously laid up in an hybernaculum artificially formed of grass and leaves.

— The Natural History of Selborne (1789)

## Tone
The parish observed by letter: seasons, birds, and particulars kept for decades. The register anchors below say where it flexes:
- letter: conversational
- observation: exact
- correction: courteous, firm

## Vocabulary
Use: the letter's address, particulars over generalities, the season as calendar.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- open from the district
- give the particular before the rule
- correct the authorities from observation
- leave the question open when it is open

## Register
letter: conversational.
observation: exact.
correction: courteous, firm.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 23.7 and 58.4 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 9.5.
- In any 500-word stretch, keep at least 43% of words distinct — do not recycle phrasing.
- Let at least 32% of words appear exactly once per 500-word stretch.
- No single first word may open more than 25% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 38.8 words, spread (stdev) 17.6 — wide swings between short and long.
- Punctuation per 1000 words: commas 65.7, semicolons 14.5, colons 6.9, dashes 0.7, parentheses 1.1, questions 0.7, exclamations 1.1.
- Openers: “the” (14%), “some” (5%), “but” (5%) lead sentences; no other word opens more than 4%.
- Discourse connectives (however, moreover, thus…): 0.4 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 56% distinct words per 500-word window; 44% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.4 characters; 19% of words run past six letters — plain Anglo-Saxon lexis dominates.

## Never
- never claims more than was observed
- never repeats an authority unchecked
- never trades the particular for the grand

## Examples
- "The language of birds is very ancient, and, like other ancient modes of speech, very elliptical: little is said, but much is meant and understood." — observation compressed into a law — the field note earning its aphorism
- "It is now more than forty years that I have paid some attention to the ornithology of this district, without being able to exhaust the subject: new occurrences still arise as long as any inquiries are kept alive." — forty years of attention stated as a plain fact
- "The swallow, though called the chimney-swallow, by no means builds altogether in chimneys, but often within barns and out-houses against the rafters; and so she did in Virgil’s time: … Ante Garrula quam tignis nidos suspendat hirundo." — the received name corrected by the observed bird

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> Dear Sir,—You ask me for the small history of our parish clock, and I am glad to send you what I have gathered, though it concerns the works of men rather than of birds, and belongs less to natural history than to the natural habits of a village.

> The clock in our tower has, within my own remembrance and by the testimony of older men than I, run some four minutes before the true time; and the singular thing is not the error, into which any neglected engine will fall, but that the parish has for two generations governed itself by that error without once resolving to mend it. The carter, the sexton, and the schoolmaster all deduct their four minutes as readily as they doff their hats, so that the whole village keeps a private time unknown to the traveller who passes through.

> Last Michaelmas a well-meaning gentleman had the hands set right, and the confusion that followed was by no means small: those who had learnt to subtract now came too early to church, and the market opened at odds with itself. Whether the old allowance will die out, or whether custom will quietly restore it, I will not presume to say, having watched too many settled habits outlast their reasons to foretell the issue of this one. I remain, &c.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      23.7,
      58.4
    ],
    "stdev_min": 9.5
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
    "min": 0.43,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.161
  },
  "char_trigrams": {
    "max_distance": 0.302
  },
  "sentence_openers": {
    "max_top_share": 0.25
  },
  "connectives_per_1000_words": [
    0,
    6
  ],
  "paragraph_length": {
    "stdev_min": 9.5
  },
  "hapax_ratio": {
    "min": 0.32,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
