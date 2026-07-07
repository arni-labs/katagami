---
version: beta
kind: voice
name: Samuel Pepys — diary (1660s)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Samuel Pepys
  license: public domain
  samples: 3
  provenance: The Diary of Samuel Pepys (1660s), Project Gutenberg ebook 4200
verification:
  replication_model: claude-opus-4-8
  replication: one-shot pass
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
The day accounted for at night: business, meals, company, and candor in one running breath.
In the lineage of Samuel Pepys.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> 23rd. At the office good part of the morning, and then about noon with my wife on foot to the Wardrobe. My wife went up to the dining room to my Lady Paulina, and I staid below talking with Mr. Moore in the parley, reading of the King’s and Chancellor’s late speeches at the proroguing of the Houses of Parliament. And while I was reading, news was brought me that my Lord Sandwich is come and gone up to my Lady, which put me into great suspense of joy, so I went up waiting my Lord’s coming out of my Lady’s chamber, which by and by he did, and looks very well, and my soul is glad to see him. He very merry, and hath left the King and Queen at Portsmouth, and is come up to stay here till next Wednesday, and then to meet the King and Queen at Hampton Court. So to dinner, Mr. Browne, Clerk of the House of Lords, and his wife and brother there also; and my Lord mighty merry; among other things, saying that the Queen is a very agreeable lady, and paints still. After dinner I showed him my letter from Teddiman about the news from Argier, which pleases him exceedingly; and he writ one to the Duke of York about it, and sent it express. There coming much company after dinner to my Lord, my wife and I slunk away to the Opera, where we saw “Witt in a Constable,” the first time that it is acted; but so silly a play I never saw I think in my life. After it was done, my wife and I to the puppet play in Covent Garden, which I saw the other day, and indeed it is very pleasant. Here among the fidlers I first saw a dulcimere

> 24th. To the Wardrobe, and there again spoke with my Lord, and saw W. Howe, who is grown a very pretty and is a sober fellow. Thence abroad with Mr.

— The Diary of Samuel Pepys (1660s)

## Tone
The day accounted for at night: business, meals, company, and candor in one running breath. The register anchors below say where it flexes:
- business: exact
- pleasure: frank
- trouble: unsparing, brief

## Vocabulary
Use: the running clause, money noted exactly, appetite and conscience side by side.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- start with rising and end with bed
- run the day in connected clauses
- note the expense beside the pleasure
- confess without ceremony

## Register
business: exact.
pleasure: frank.
trouble: unsparing, brief.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 14.5 and 57.9 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 9.2.
- In any 500-word stretch, keep at least 37% of words distinct — do not recycle phrasing.
- Let at least 24% of words appear exactly once per 500-word stretch.
- No single first word may open more than 15% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 6 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 25.3 words, spread (stdev) 26.9 — wide swings between short and long.
- Punctuation per 1000 words: commas 93.1, semicolons 11.5, colons 0.7, dashes 1.8, parentheses 2.6, questions 0.0, exclamations 0.0.
- Openers: “after” (6%), “up” (5%), “so” (5%) lead sentences; no other word opens more than 3%.
- Discourse connectives (however, moreover, thus…): 0.4 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 48% distinct words per 500-word window; 32% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 3.9 characters; 11% of words run past six letters — plain Anglo-Saxon lexis dominates.

## Never
- never tidies the day into a lesson
- never separates accounts from appetites
- never performs for a reader

## Examples
- "Up betimes, and by water to Woolwich on board the Royall James, to see in what dispatch she is to be carried about to Chatham. So to the yard a little, and thence on foot to Greenwich, where going I was set upon by a great dogg, who got hold of my garters, and might have done me hurt; but, Lord, to see in what a maze I was, that, having a sword about me, I never thought of it, or had the heart to make use of it, but" — the day starts mid-stride — business, movement, running clauses
- "So home, finding my poor wife very busy putting things in order, and so to bed, my mind being very much troubled, and could hardly sleep all night, thinking how things are like to go with us about Brampton, and blaming myself for living so high as I do when for ought I know my father and mother may come to live upon my hands when all is done." — the day closed like an account, worry entered beside the rest
- "Thence home to supper, where I find my wife and Mrs." — household, health, and weather filed in one clause

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> Up, and to the church-yard before my breakfast, to see the great clock set right, the which hath these seven years run four minutes before the town and led us all a merry chase. Mr. Hollis the smith at it with his boy, and I paid him 2s. 6d. of my own purse toward the labour, being loth the parish should grudge it and the thing be left half done. Strange to see how the townsfolk took it, some pleased and more put out, one old woman railing that her whole life she had kept her pyes by the fast clock and would keep them so still. Thence home to dinner, a good dish of tripe and my wife merry, and after to the office where I did stay late upon the victualling accounts, my head aching with the figures. But, Lord, to think how a little wheel set true should breed such heat among sober men, and I as guilty as any, for I confess I liked the four minutes and did feel the loss of them, being ever behind my business and glad of any that made me seem before it. Late home, and my wife and I to some words about the coalman's bill, and so to bed.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      14.5,
      57.9
    ],
    "stdev_min": 9.2
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
    "min": 0.37,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.148
  },
  "char_trigrams": {
    "max_distance": 0.237
  },
  "sentence_openers": {
    "max_top_share": 0.15
  },
  "connectives_per_1000_words": [
    0,
    6
  ],
  "paragraph_length": {
    "stdev_min": 35.5
  },
  "hapax_ratio": {
    "min": 0.24,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
