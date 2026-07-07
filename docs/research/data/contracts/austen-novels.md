---
version: beta
kind: voice
name: Jane Austen — novels (1811–1817)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Jane Austen
  license: public domain
  samples: 6
  provenance: Pride and Prejudice (1813), Project Gutenberg ebook 1342; Emma (1815), Project Gutenberg ebook 158; Persuasion (1817), Project Gutenberg ebook 105
verification:
  replication_model: claude-opus-4-8
  replication: one-shot pass
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
Social observation with the blade kept sheathed: courtesy on the surface, judgment underneath.
In the lineage of Jane Austen.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> “When I do myself the honour of speaking to you next on the subject, I shall hope to receive a more favourable answer than you have now given me; though I am far from accusing you of cruelty at present, because I know it to be the established custom of your sex to reject a man on the first application, and, perhaps, you have even now said as much to encourage my suit as would be consistent with the true delicacy of the female character.”

> “Really, Mr. Collins,” cried Elizabeth, with some warmth, “you puzzle me exceedingly. If what I have hitherto said can appear to you in the form of encouragement, I know not how to express my refusal in such a way as may convince you of its being one.”

> “You must give me leave to flatter myself, my dear cousin, that your refusal of my addresses are merely words of course. My reasons for believing it are briefly these:--It does not appear to me that my hand is unworthy of your acceptance, or that the establishment I can offer would be any other than highly desirable. My situation in life, my connections with the family of De Bourgh, and my relationship to your own, are circumstances highly in my favour; and you should take it into further consideration that, in spite of your manifold attractions, it is by no means certain that another offer of marriage may ever be made you. Your portion is unhappily so small, that it will in all likelihood undo the effects of your loveliness and amiable qualifications. As I must, therefore, conclude that you are not serious in your rejection of me, I shall choose to attribute it to your wish of increasing my love by suspense, according to the usual practice of elegant females.”

> “I do assure you, sir, that I have no pretensions whatever to that kind of elegance which consists in tormenting a respectable man. I would rather be paid the compliment of being believed sincere.

— Pride and Prejudice (1813)

## Tone
Social observation with the blade kept sheathed: courtesy on the surface, judgment underneath. The register anchors below say where it flexes:
- narration: poised
- dialogue: each speaker self-revealing
- letters: formal, edged

## Vocabulary
Use: measured qualifications, reported opinion, the pointed aside.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- open on the social fact
- let the qualification carry the judgment
- report speech so it convicts the speaker
- close before the point is laboured

## Register
narration: poised.
dialogue: each speaker self-revealing.
letters: formal, edged.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 8.2 and 37.9 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 5.8.
- In any 500-word stretch, keep at least 40% of words distinct — do not recycle phrasing.
- Let at least 26% of words appear exactly once per 500-word stretch.
- No single first word may open more than 44% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6.1 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 18.8 words, spread (stdev) 17.1 — wide swings between short and long.
- Punctuation per 1000 words: commas 69.1, semicolons 14.2, colons 1.0, dashes 7.9, parentheses 1.2, questions 2.4, exclamations 10.5.
- Openers: “she” (8%), “i” (7%), “it” (6%) lead sentences; no other word opens more than 6%.
- Discourse connectives (however, moreover, thus…): 2.6 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 50% distinct words per 500-word window; 34% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.3 characters; 18% of words run past six letters — plain Anglo-Saxon lexis dominates.

## Never
- never states the judgment the sentence already implies
- never raises its voice
- never explains the joke

## Examples
- "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife." — the aphorism that means its opposite — the judgment hides inside the courtesy
- "Emma Woodhouse, handsome, clever, and rich, with a comfortable home and happy disposition, seemed to unite some of the best blessings of existence; and had lived nearly twenty-one years in the world with very little to distress or vex her." — the introduction that convicts while it compliments
- "Sir Walter Elliot, of Kellynch Hall, in Somersetshire, was a man who, for his own amusement, never took up any book but the Baronetage; there he found occupation for an idle hour, and consolation in a distressed one; there his faculties were roused into admiration and respect, by contemplating the limited remnant of the earliest patents; there any unwelcome sensations, arising from domestic affairs changed naturally" — vanity measured by its own bookshelf — reported fact does the mocking

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> It was long the pride of Middlethorpe that its church clock ran four minutes before the truth, a distinction the inhabitants had come to regard as very nearly a virtue. Those who caught their coaches did so with a margin they attributed to their own foresight; those who missed them blamed the coachman. Mrs. Alderton, whose drawing-room commanded a view of the tower, was fond of observing that a town which kept a little ahead of the hour could hardly be accused of idleness — a remark she made chiefly to visitors who had come from towns of no such advantage. When at last a Mr. Prentice, newly settled and possessed of a scrupulous watch, prevailed upon the sexton to set the hands right, the effect was not gratitude. The clock now told the time, and the town discovered it had preferred the flattery. 'One did not object to being early,' said Mrs. Alderton, 'but there is something forward in a clock that insists upon being correct.' The younger ladies agreed that Mr. Prentice, whatever his watch, wanted tact; and the sexton, who had wound the error faithfully for thirty years, was heard to say that he saw no call to mend what nobody had thought broken until a stranger told them it was.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      8.2,
      37.9
    ],
    "stdev_min": 5.8
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
    "min": 0.4,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.172
  },
  "char_trigrams": {
    "max_distance": 0.311
  },
  "sentence_openers": {
    "max_top_share": 0.44
  },
  "connectives_per_1000_words": [
    0,
    6.1
  ],
  "paragraph_length": {
    "stdev_min": 10.5
  },
  "hapax_ratio": {
    "min": 0.26,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
