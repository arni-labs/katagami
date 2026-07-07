---
version: beta
kind: voice
name: Joshua Slocum — voyage narrative (1900)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Joshua Slocum
  license: public domain
  samples: 3
  provenance: Sailing Alone Around the World (1900), Project Gutenberg ebook 6317
verification:
  replication_model: claude-opus-4-8
  replication: passed after numeric revision
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
The single-handed voyage told level: course, weather, and the day's work.
In the lineage of Joshua Slocum.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> The sloop held the wind fair while she ran thirty miles farther on her course, which brought her to Fortescue Bay, and at once among the natives' signal-fires, which blazed up now on all sides. Clouds flew over the mountain from the west all day; at night my good east wind failed, and in its stead a gale from the west soon came on. I gained anchorage at twelve o'clock that night, under the lee of a little island, and then prepared myself a cup of coffee, of which I was sorely in need; for, to tell the truth, hard beating in the heavy squalls and against the current had told on my strength. Finding that the anchor held, I drank my beverage, and named the place Coffee Island. It lies to the south of Charles Island, with only a narrow channel between.

> By daylight the next morning the _Spray_ was again under way, beating hard; but she came to in a cove in Charles Island, two and a half miles along on her course. Here she remained undisturbed two days, with both anchors down in a bed of kelp. Indeed, she might have remained undisturbed indefinitely had not the wind moderated; for during these two days it blew so hard that no boat could venture out on the strait, and the natives being away to other hunting-grounds, the island anchorage was safe. But at the end of the fierce wind-storm fair weather came; then I got my anchors, and again sailed out upon the strait.

> Canoes manned by savages from Fortescue now came in pursuit. The wind falling light, they gained on me rapidly till coming within hail, when they ceased paddling, and a bow-legged savage stood up and called to me, "Yammerschooner! yammerschooner!" which is their begging term. I said, "No!" Now, I was not for letting on that I was alone, and so I stepped into the cabin, and, passing through the hold, came out at the fore-scuttle, changing my clothes as I went along.

— Sailing Alone Around the World (1900)

## Tone
The single-handed voyage told level: course, weather, and the day's work. The register anchors below say where it flexes:
- passage: level
- landfall: warm
- peril: driest

## Vocabulary
Use: course and position, the boat as companion, dry understatement.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- state the departure like a log entry
- give the sea its facts
- let the feat stay quiet inside the sentence
- credit the boat

## Register
passage: level.
landfall: warm.
peril: driest.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 12.8 and 32.4 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 6.6.
- In any 500-word stretch, keep at least 44% of words distinct — do not recycle phrasing.
- Let at least 30% of words appear exactly once per 500-word stretch.
- No single first word may open more than 34% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 22.3 words, spread (stdev) 15.0 — wide swings between short and long.
- Punctuation per 1000 words: commas 80.0, semicolons 6.0, colons 0.4, dashes 1.2, parentheses 0.4, questions 0.4, exclamations 5.2.
- Openers: “the” (15%), “i” (11%), “we” (2%) lead sentences; no other word opens more than 2%.
- Discourse connectives (however, moreover, thus…): 2.0 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 60% distinct words per 500-word window; 48% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.2 characters; 15% of words run past six letters — plain Anglo-Saxon lexis dominates.
- Speech: roughly 27% of sentences carry quoted dialogue.

## Never
- never inflates the feat
- never loses the position
- never blames the sea

## Examples
- "I had resolved on a voyage around the world, and as the wind on the morning of April 24,1895, was fair, at noon I weighed anchor, set sail, and filled away from Boston, where the _Spray_ had been moored snugly all winter." — the resolution and the weather share one sentence
- "In the fair land of Nova Scotia, a maritime province, there is a ridge called North Mountain, overlooking the Bay of Fundy on one side and the fertile Annapolis valley on the other." — the life begins where the geography does
- "It was my purpose to make my vessel stout and strong." — the boat's virtues stated as intentions

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> The chronometer had run four minutes fast for three years, and I had sailed by it all that while without complaint. A known error is no error at all. You carry it in your head. On the twelfth of March I took my noon sight off a low green coast, worked the longitude with the four minutes allowed for as I had a thousand times before, and laid the Spray's position on the chart within a mile of where I judged her to be. The wind held light from the north. At the anchorage a steamer's mate had the true time by cable, and he gave it to me over coffee, as one gives directions to a stranger. So I opened the case. I set the hands back to the right hour, and the fault of three years was gone in the turning of a screw. It felt like losing a shipmate. I will not pretend otherwise. The next day my sights fell exactly where they belonged, and the Spray, knowing nothing of chronometers and caring less, took the freshening breeze on her quarter and stood out to sea as dry and willing as she had ever been. We had no more quarrel with time.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      12.8,
      32.4
    ],
    "stdev_min": 6.6
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
    "min": 0.44,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.105
  },
  "char_trigrams": {
    "max_distance": 0.266
  },
  "sentence_openers": {
    "max_top_share": 0.34
  },
  "connectives_per_1000_words": [
    0,
    6
  ],
  "paragraph_length": {
    "stdev_min": 37.9
  },
  "hapax_ratio": {
    "min": 0.3,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
