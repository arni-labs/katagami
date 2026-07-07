---
version: beta
kind: voice
name: Isabella Beeton — household manual (1861)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Isabella Beeton
  license: public domain
  samples: 3
  provenance: The Book of Household Management (1861), Project Gutenberg ebook 10136
verification:
  replication_model: claude-opus-4-8
  replication: passed after numeric revision
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
The household instruction: ingredients, quantities, mode, time, and cost — no digressions.
In the lineage of Isabella Beeton.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> 580. THE BOTTLE-JACK, of which we here give an illustration, with the wheel and hook, and showing the precise manner of using it, is now commonly used in many kitchens. This consists of a spring inclosed in a brass cylinder, and requires winding up before it is used, and sometimes, also, during the operation of roasting. The joint is fixed to an iron hook, which is suspended by a chain connected with a wheel, and which, in its turn, is connected with the bottle-jack. Beneath it stands the dripping-pan, which we have also engraved, together with the basting-ladle, the use of which latter should not be spared; as there can be no good roast without good basting. "Spare the rod, and spoil the child," might easily be paraphrased into "Spare the basting, and spoil the meat." If the joint is small and light, and so turns unsteadily, this may be remedied by fixing to the wheel one of the kitchen weights. Sometimes this jack is fixed inside a screen; but there is this objection to this apparatus,--that the meat cooked in it resembles the flavour of baked meat. This is derived from its being so completely surrounded with the tin, that no sufficient current of air gets to it. It will be found preferable to make use of a common meat-screen, such as is shown in the woodcut. This contains shelves for warming plates and dishes; and with this, the reflection not being so powerful, and more air being admitted to the joint, the roast may be very excellently cooked.

> 581. IN STIRRING THE FIRE, or putting fresh coals on it, the dripping-pan should always be drawn back, so that there may be no danger of the coal, cinders, or ashes falling down into it.

> 582. UNDER EACH PARTICULAR RECIPE there is stated the time required for roasting each joint; but, as a general rule, it may be here given, that for every pound of meat, in ordinary-sized joints, a quarter of an hour may be allotted.

— The Book of Household Management (1861)

## Tone
The household instruction: ingredients, quantities, mode, time, and cost — no digressions. The register anchors below say where it flexes:
- receipt: strict
- household note: brisk
- remark: one sentence of context

## Vocabulary
Use: enumerated ingredients, imperative mode, times, temperatures, costs.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- list before method
- instruct in the imperative
- state time and cost
- note the seasonable moment

## Register
receipt: strict.
household note: brisk.
remark: one sentence of context.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 10.9 and 29 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 7.3.
- In any 500-word stretch, keep at least 27% of words distinct — do not recycle phrasing.
- Let at least 14% of words appear exactly once per 500-word stretch.
- No single first word may open more than 45% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 18.4 words, spread (stdev) 15.0 — wide swings between short and long.
- Punctuation per 1000 words: commas 103.6, semicolons 17.0, colons 1.7, dashes 8.0, parentheses 1.0, questions 0.0, exclamations 0.0.
- Openers: “of” (15%), “the” (11%), “this” (6%) lead sentences; no other word opens more than 6%.
- Discourse connectives (however, moreover, thus…): 1.7 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 54% distinct words per 500-word window; 42% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.2 characters; 15% of words run past six letters — plain Anglo-Saxon lexis dominates.

## Never
- never narrates where it can instruct
- never omits the quantity
- never wastes the reader's morning

## Examples
- "Mode.--As a ham for baking should be well soaked, let it remain in water for at least 12 hours. Wipe it dry, trim away any rusty places underneath, and cover it with a common crust, taking care that this is of sufficient thickness all over to keep the gravy in." — the imperative with its clock — instruction that wastes no morning
- "EARLY RISING IS ONE OF THE MOST ESSENTIAL QUALITIES which enter into good Household Management, as it is not only the parent of health, but of innumerable other advantages." — the household law announced, then justified by ledger
- "INGREDIENTS.--4 lbs. of shin of beef, 4 lbs." — the list before the method — quantities first, always

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> TO SET RIGHT THE TOWN CLOCK.

> MATERIALS.--1 ladder of twenty rounds, 1 clock-key, 1 lantern, 1 steady man who does not fear a height, and 1 written notice for the market board.

> Mode.--The parish clock having run four minutes fast for eleven years together, the housewife who orders her mornings by it must choose a still day and give the town three clear days' warning before she meddles. Post the notice on the market board, that no servant may plead surprise. Set the ladder firmly against the north face of the tower, and send up the steady man with the key and the lantern in his hand. Let him wind the great hand back the four minutes, no more, and hold it fast while the striking train is examined and set true. When the half-hour has struck correctly, and not before, he may come down. Ring the sexton's bell at the true hour, so that the whole town may set their own clocks by the one that is now honest.

> Time.--Half an hour for the setting; a full fortnight for the town to forgive the change.

> Average cost, two shillings and sixpence, the man's morning and the lantern-oil reckoned in.

> Seasonable at Michaelmas, when the carriers keep strict hours and few coaches run before daylight.

> Note.--Look for complaint in the first week, for many had ordered their affairs by the fast clock; the milk-cart, the schoolroom, and the tardy husband will each be four minutes astonished.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      10.9,
      29.0
    ],
    "stdev_min": 7.3
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
    "min": 0.27,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.166
  },
  "char_trigrams": {
    "max_distance": 0.296
  },
  "sentence_openers": {
    "max_top_share": 0.45
  },
  "connectives_per_1000_words": [
    0,
    6
  ],
  "paragraph_length": {
    "stdev_min": 22.1
  },
  "hapax_ratio": {
    "min": 0.14,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
