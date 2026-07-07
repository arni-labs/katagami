---
version: beta
kind: voice
name: Marcus Aurelius — Meditations (Casaubon, 1634)
lineage:
  parents: []
  generation: 0
corpus:
  consent: public_domain
  author: Marcus Aurelius (Meric Casaubon, translator)
  license: public domain
  samples: 3
  provenance: Meditations, Casaubon translation (1634); Project Gutenberg ebook 2680
verification:
  replication_model: claude-opus-4-8
  replication: passed after numeric revision
  checks: deterministic voice-bands (v1+v2), corpus as fingerprint reference
---
## Overview
Orders addressed to oneself: brief, corrective, indifferent to audience.
In the lineage of Marcus Aurelius; Meric Casaubon.

## How it reads
The strongest guide is the corpus itself. Read this before writing; imitate how the sentences move, not what they mention.

> XXVII. Within a very little while, thou wilt be either ashes, or a sceletum; and a name perchance; and perchance, not so much as a name. And what is that but an empty sound, and a rebounding echo? Those things which in this life are dearest unto us, and of most account, they are in themselves but vain, putrid, contemptible. The most weighty and serious, if rightly esteemed, but as puppies, biting one another: or untoward children, now laughing and then crying. As for faith, and modesty, and justice, and truth, they long since, as one of the poets hath it, have abandoned this spacious earth, and retired themselves unto heaven. What is it then that doth keep thee here, if things sensible be so mutable and unsettled? and the senses so obscure, and so fallible? and our souls nothing but an exhalation of blood? and to be in credit among such, be but vanity? What is it that thou dost stay for? an extinction, or a translation; either of them with a propitious and contented mind. But still that time come, what will content thee? what else, but to worship and praise the Gods; and to do good unto men. To bear with them, and to forbear to do them any wrong. And for all external things belonging either to this thy wretched body, or life, to remember that they are neither thine, nor in thy power.

> XXVIII. Thou mayest always speed, if thou wilt but make choice of the right way; if in the course both of thine opinions and actions, thou wilt observe a true method. These two things be common to the souls, as of God, so of men, and of every reasonable creature, first that in their own proper work they cannot be hindered by anything: and secondly, that their happiness doth consist in a disposition to, and in the practice of righteousness; and that in these their desire is terminated.

> XXIX.

— Meditations (Long translation, 1862)

## Tone
Orders addressed to oneself: brief, corrective, indifferent to audience. The register anchors below say where it flexes:
- admonition: blunt
- reflection: measured
- maxim: compressed

## Vocabulary
Use: the second person turned inward, nature and duty as measures, the short corrective clause.
Ban: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting, at the end of the day.

## Moves
- begin from the fault observed
- measure it against nature or duty
- issue the correction to yourself
- end without consolation

## Register
admonition: blunt.
reflection: measured.
maxim: compressed.

## Rhythm — write to these numbers
The verifier enforces these mechanically; treat them as hard requirements, not suggestions.
- Keep the average sentence between 12.5 and 31.2 words.
- Vary hard: set short sentences against long ones until the spread (stdev) reaches at least 9.6.
- In any 500-word stretch, keep at least 39% of words distinct — do not recycle phrasing.
- Let at least 26% of words appear exactly once per 500-word stretch.
- No single first word may open more than 26% of sentences.
- Discourse connectives (however, moreover, therefore…): at most 8.3 per 1000 words.
- Banned outright: delve, leverage, seamless, game-changer, robust, cutting-edge, in today's fast-paced, it's worth noting.
- Imitate the excerpt's small words — its articles, prepositions, and clause joints — not only its imagery; the verifier measures function-word and character-level distance against the corpus.

## Linguistic profile
Measured from the corpus, not asserted:
- Sentences: mean 20.3 words, spread (stdev) 23.0 — wide swings between short and long.
- Punctuation per 1000 words: commas 93.1, semicolons 11.5, colons 9.2, dashes 0.0, parentheses 3.8, questions 11.5, exclamations 1.1.
- Openers: “and” (10%), “for” (6%), “but” (5%) lead sentences; no other word opens more than 3%.
- Discourse connectives (however, moreover, thus…): 3.8 per 1000 words — sparse; the argument moves by content, not signposts.
- Vocabulary: 52% distinct words per 500-word window; 38% of words appear exactly once — recycles key terms deliberately.
- Lexis: mean word length 4.4 characters; 18% of words run past six letters — plain Anglo-Saxon lexis dominates.

## Never
- never performs virtue for a reader
- never complains of what nature ordains
- never excuses itself

## Examples
- "Betimes in the morning say to thyself, This day I shalt have to do with an idle curious man, with an unthankful man, a railer, a crafty, false, or an envious man; an unsociable uncharitable man. All these ill qualities have happened unto them, through ignorance of that which is truly good and truly bad." — the day's faults inventoried before breakfast — orders issued to the self
- "Let it be thy earnest and incessant care as a Roman and a man to perform whatsoever it is that thou art about, with true and unfeigned gravity, natural affection, freedom and justice: and as for all other cares, and imaginations, how thou mayest ease thy mind of them." — duty phrased as a standing instruction
- "Do, soul, do; abuse and contemn thyself; yet a while and the time for thee to respect thyself, will be at an end. Every man's happiness depends from himself, but behold thy life is almost at an end, whiles affording thyself no respect, thou dost make thy happiness to consist in the souls, and conceits of other men." — the self addressed by name and given its deadline

## Known-good replica
Written by claude-opus-4-8 from this file alone, then verified against the bands below. It is a replica, never the author's text — a floor for what this contract can produce, not a ceiling.

> Consider the clock upon the tower, which ran four minutes fast, and this it did for many years together, while thou, ordering thy risings and thy labours by its face, didst never once suspect that the very measure of thy day was a falsehood made constant by long custom. Mark this well. A thing false yet steady will deceive thee longer than a thing false and wild, for the mind, unto that which never varies, doth grant the name of truth. So it was here. When at last a man climbed the tower and set the hands unto the true hour, the market cursed him, their habit being disturbed. Be not of their number. Nature keeps the hours, and the sun doth not consult the town. Give thanks and be still. Ask thyself not who moved the hands, nor whether he had the right of it, nor what thy neighbours will say of the change; ask only whether the clock be now true, and if it be true, keep thou unto it. If thine own reckoning was bent by custom, bend it back, and mourn not the four minutes as though they were thine own. They were never thine. They were an error thou hadst grown to love, and a loved error is the hardest of all to yield.

## Bands (the machine contract)
```json
{
  "schema": "katagami:voice-bands/v1",
  "sentence_length": {
    "mean": [
      12.5,
      31.2
    ],
    "stdev_min": 9.6
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
    "min": 0.39,
    "window_words": 500
  },
  "function_words": {
    "max_distance": 0.158
  },
  "char_trigrams": {
    "max_distance": 0.245
  },
  "sentence_openers": {
    "max_top_share": 0.26
  },
  "connectives_per_1000_words": [
    0,
    8.3
  ],
  "paragraph_length": {
    "stdev_min": 33.7
  },
  "hapax_ratio": {
    "min": 0.26,
    "window_words": 500
  },
  "min_words_to_evaluate": 150
}
```
