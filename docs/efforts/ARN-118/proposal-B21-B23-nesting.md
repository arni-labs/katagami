# Nesting pass, 2026-09-09 — batch B21

Prepared unattended. Everything below is written to production as private
attested Drafts. Nothing is published, nothing is archived, nothing is deleted.
Every item carries a number so it can be struck with one instruction.

Branch `claude/encyclopedia-nesting`, draft PR
https://github.com/arni-labs/katagami/pull/286. Decisions D43 to D48 and the
Library of Congress ledger rows are committed with it; the cells themselves are
private Drafts in production.

## The numbers

| depth | before this pass | after |
|---|---|---|
| 0, a root | 367 | 265 |
| 1 | 147 | 296 |
| 2 | 37 | 166 |
| 3 | 2 | 17 |
| live attested cells | 553 | 744 |

The collection grew from 553 to 738 while this pass ran, because other runs were
writing cells at the same time. The before column is production as I read it at
the start; the after column is production as it stands now.

Writing-map roots fall from 291 to 133. A large art-movement pass landed during
the night and took the visual map from 53 roots to 192; a second sweep over
Wikidata brought that back to 165 (items 45 and 50 below).

Written: 42 cells created, 350 broader links, 3 insertions between a cell and
its former parent. 291 existing cells revised. Zero dangling links, zero
unattested drafts.

Where the 320 links come from:

| source of the parent claim | links |
|---|---|
| the cell's own Library of Congress record | 300 |
| the cell's own Wikidata item | 30 |
| Wikidata or Wikipedia, cross-form parents | 9 |
| the cell's own Getty record | 6 |
| Wikipedia's Printmaking article | 5 |

## How a parent was decided

Every cell that cites a Library of Congress Genre/Form Term already carries its
parent: the term's own `skos:broader` link. I fetched all 425 cited term records
as JSON plus every ancestor they reach, 444 terms in all, and walked each cell up
to the nearest term that is a cell. Where the walk needed a term that had no cell
and passed the cell test, the term became a cell. Where it needed a term that
names a shelving category rather than a body of work, the term was declined and
the cell stays a root.

Nineteen terms were declined that way: Literature, Informational works,
Recreational works, Instructional and educational works, Discursive works,
Ephemera, Visual works, Commemorative works, Religious materials, Records
(Documents), Reference works, Serial publications, Periodicals, Illustrated
works, Musical texts, Sacred music texts, Radio scripts, Humor, and Pornographic
comics.

## Items 1 to 3 — the three form divisions, separable

These overturn the B6 decline, which read "a form category of literature, like a
medium; a cell needs a direction inside it". Each cell carries a `questions`
entry saying so. Striking all three drops 174 links from existing cells and
leaves 19 of the cells below without a parent; it does not touch items 4 to 8 or
item 16.

| # | cell | id | Library of Congress term | live cells it now parents |
|---|---|---|---|---|
| 1 | Fiction | `fiction` | gf2014026339 | 50 |
| 2 | Poetry | `poetry` | gf2014026481 | 91 |
| 3 | Drama | `drama` | gf2014026297 | 52 |

## Items 4 to 8 — the cross-form parents, from proposal B9

These are B9 items 1 to 5, unchanged, and they stand whatever you decide about
items 1 to 3. Three of the four parents are named outside the Library of
Congress, which has no cross-form heading for any of them; each cell's
`questions` field says so.

| # | cell | id | named from | children it now has |
|---|---|---|---|---|
| 4 | Gothic literature | `gothic-literature` | Wikidata Q19715429 | gothic-fiction, gothic-poetry |
| 5 | Gothic poetry | `gothic-poetry` | Library of Congress gf2014026361 | none |
| 6 | Epistolary literature | `epistolary-literature` | Wikidata Q3491641 | epistolary-fiction, epistolary-poetry |
| 7 | Dialect literature | `dialect-literature` | Wikidata Q1208422 | dialect-fiction, dialect-poetry, dialect-drama |
| 8 | Electronic literature | `electronic-literature` | English Wikipedia, Wikidata Q173167 | hypertext-fiction, hypertext-poetry, computer-generated-literature |

B9 flagged that Dialect literature is the weakest name: no English Wikipedia
article, and the Wikidata item's only sitelink is the German Dialektliteratur.
Its third child, Dialect drama, has since become a cell, so the parent is now
full. B9 also flagged the Chesterfield manifestation on Epistolary literature as
published correspondence rather than fiction; that record is still on the cell
and is still yours to strike.

## Items 9 to 41 — the parents the Library of Congress hierarchy needed

Each is named by the Library of Congress, cited to its term record, and given a
second reference where one existed. The children column counts direct children
in production now.

| # | cell | id | term | parent it took | children |
|---|---|---|---|---|---|
| 9 | Sayings | `sayings` | gf2014026170 | none, see item 46 | 2 |
| 10 | Allegories | `allegories` | gf2014026218 | none, see item 46 | 3 |
| 11 | Biographies | `biographies` | gf2014026049 | creative-nonfiction | 4 |
| 12 | Religious drama | `religious-drama` | gf2014026501 | drama | 7 |
| 13 | Religious poetry | `religious-poetry` | gf2014026503 | poetry | 3 |
| 14 | Nonfiction comics | `nonfiction-comics` | gf2014026453 | comics-graphic-works | 2 |
| 15 | Humorous poetry | `humorous-poetry` | gf2014026379 | poetry | 8 |
| 16 | Printmaking | `printmaking` | Wikipedia, Getty 300053319 | none | 5 |
| 17 | Epigrams | `epigrams` | gf2014026312 | sayings | 1 |
| 18 | Bible plays | `bible-plays` | gf2014026241 | religious-drama | 2 |
| 19 | Liturgical poetry | `liturgical-poetry` | gf2014026416 | religious-poetry | 1 |
| 20 | Biographical poetry | `biographical-poetry` | gf2014026247 | biographies, poetry | 2 |
| 21 | Biographical comics | `biographical-comics` | gf2014026244 | biographies, nonfiction-comics | 1 |
| 22 | Autobiographical poetry | `autobiographical-poetry` | gf2014026232 | autobiographies, biographical-poetry | 1 |
| 23 | Verse satire | `verse-satire` | gf2024026077 | humorous-poetry, satirical-literature | 1 |
| 24 | Humorous comics | `humorous-comics` | gf2014026376 | comics-graphic-works | 1 |
| 25 | Dance drama | `dance-drama` | gf2016026018 | drama | 10 |
| 26 | Christmas plays | `christmas-plays` | gf2016026061 | drama | 1 |
| 27 | Interludes (Drama) | `interludes-drama` | gf2014026386 | drama | 1 |
| 28 | Didactic drama | `didactic-drama` | gf2014026287 | drama | 1 |
| 29 | Bawdy plays | `bawdy-plays` | gf2014026237 | comedy-plays | 1 |
| 30 | Biographical fiction | `biographical-fiction` | gf2014026246 | fiction | 1 |
| 31 | Action and adventure fiction | `action-and-adventure-fiction` | gf2014026217 | fiction | 2 |
| 32 | Action and adventure comics | `action-and-adventure-comics` | gf2014026216 | comics-graphic-works | 1 |
| 33 | Monster fiction | `monster-fiction` | gf2018026127 | fiction | 2 |
| 34 | Survival fiction | `survival-fiction` | gf2023026013 | fiction | 2 |
| 35 | Experimental fiction | `experimental-fiction` | gf2014026325 | fiction | 1 |
| 36 | Experimental poetry | `experimental-poetry` | gf2014026326 | poetry | 1 |
| 37 | Love poetry | `love-poetry` | gf2014026419 | poetry | 1 |
| 38 | Nature poetry | `nature-poetry` | gf2016026111 | poetry | 1 |
| 39 | Nature fiction | `nature-fiction` | gf2015026095 | fiction | 1 |
| 40 | Occasional verse | `occasional-verse` | gf2014026460 | poetry | 1 |
| 41 | Humorous fiction | `humorous-fiction` | gf2014026377 | fiction | 1 |

Seventeen of these have exactly one child today. They are here because the
Library of Congress states them as the broader term of a live cell, and a cell
placed under its own source's parent is more honest than a cell left floating.
Item 47 lists them so you can strike them as a group.

## Item 42 — the three insertions

D38, insertion between a cell and its parent. In each case the new middle cell
was created under the old parent and the child was moved under the middle, and
the direct link to the grandparent was dropped because it is no longer a
separate claim.

| child | was under | now under |
|---|---|---|
| Autobiographies | Creative nonfiction | Biographies, which is under Creative nonfiction |
| Comics journalism | Comics (Graphic works) | Nonfiction comics, which is under Comics |
| Autobiographical comics | Comics (Graphic works) | Autobiographies and Biographical comics |

## Item 43 — the five visual links written from Getty

No new cell was needed for these; each cell's own Getty record names a broader
concept that is already a cell.

| child | parent | Getty concept |
|---|---|---|
| Action Painting | Abstract Expressionism | 300112061 broader 300022099 |
| German Expressionism | Expressionism | 300438588 broader 300021502 |
| Japonisme | Orientalism | 300055785 broader 300055784 |
| Mingei | Folk Art | 300260035 broader 300056487 |
| Net Art | Computer art | 300419940 broader 300069478 |

## Item 44 — Printmaking and its five children

Lithography, Screen printing, Relief printing, Intaglio printmaking and
Risograph now sit under Printmaking. Wikipedia's Printmaking article names
woodcut, etching, engraving, lithography and screenprinting as the traditional
techniques and names risograph where hand and digital printing cross over; that
article is the source on each link and was added to each child's sources.

Halftone printing, Dye transfer printing and Xerox art were left as roots. They
are reproduction processes rather than printmaking as that article defines it.
Say if they belong under the cell.

## Item 45 — the visual map got almost nothing, and here is why

Every visual cell cites a Getty Art & Architecture Thesaurus concept, so Getty
looked like the same lane as the Library of Congress. It is not. Reading the
records showed that above a style or a movement, Getty's parent is almost always
a guide term written in angle brackets: `<modern European fine arts styles and
movements>`, `<modern French fine arts styles and movements>`, `<post-1945 fine
arts styles and movements>`, `<painting techniques by medium>`. Those are
shelving categories, and most of them sort directions by nation, which the skill
says not to do.

Item 50 is the second attempt at the visual map, which brought its roots from
192 to 165.

## Item 46 — cells left as roots because the Library of Congress files them under a container

Twenty-five cells reach only a declined term. Field notes was on this list and is not any more: a concurrent run put it under Nature writing. Each row names the term that was
declined, so overturning one decline drops the cells under it into place.

| cell | its Library of Congress broader term |
|---|---|
| Black humor | Humor, Literature |
| Blogs | Informational works |
| Cartonera books | Ephemera, Literature |
| Comics (Graphic works) | Illustrated works, Literature |
| Creative nonfiction | none, it is a top term |
| Cut-ups (Literature) | Literature |
| Dialogues (Literature) | Literature |
| Editorials | Discursive works |
| Exempla | Instructional and educational works, Literature |
| Folk literature | Literature |
| Handbooks and manuals | Instructional and educational works, Reference works |
| Jataka stories | Literature |
| Newsletters | Ephemera, Serial publications |
| Parodies (Literature) | Literature |
| Pastiches (Literature) | Literature |
| Popular works | Informational works |
| Romances | Literature |
| Sagas | Literature |
| Satirical literature | Humor, Literature |
| Zines | Ephemera, Periodicals |
| Allegories (item 10) | Instructional and educational works |
| Sayings (item 9) | Reference works |
| Fiction, Poetry, Drama (items 1 to 3) | Literature |

Eleven of them would take Literature as a parent if you accepted it.

## Item 47 — the question I did not settle: a Literature cell

The Library of Congress files 235 terms under Literature. Accepting it as a cell
would give Fiction, Poetry and Drama a parent, would pick up the eleven cells
above, and would leave the writing map with one root over everything.

I did not create it, for two reasons. The skill says the top stays open and
warns against inventing a tidy taxonomy to make the graph look finished. And
`maps` already records that a cell sits on the writing map, so a Literature cell
would be the map showing up as a node inside itself, the way a Websites cell
would be on a design map.

This is yours to rule on. If you want it, it is one cell and about fourteen
links.

## Item 48 — the thin parents, if you want them gone

These cells each parent exactly one live cell today. Each is a real Library of
Congress heading with a body of work behind it, and each is the stated parent of
the cell under it, but a reader may find them empty.

Liturgical poetry (19), Biographical comics (21), Verse satire (23), Humorous
comics (24), Christmas plays (26), Interludes (Drama) (27), Didactic drama (28),
Bawdy plays (29), Biographical fiction (30), Action and adventure comics (32),
Experimental fiction (35), Experimental poetry (36), Love poetry (37), Nature
poetry (38), Nature fiction (39), Occasional verse (40), Humorous fiction (41).

Striking any of them returns its child to the parent above, or to a root where
there is none.

## Item 49 — one Library of Congress term I declined that you might want

Pornographic comics, gf2014026485. The Library of Congress files Eight-pagers
under it and under Humorous comics. I created Humorous comics and declined this
one, so Eight-pagers has a parent either way and the collection gains nothing
from the second cell. Say if you want it for completeness.

## What was written, and how it was checked

| run | result |
|---|---|
| `B21-create.json --expect 41` | 41 documents valid, 71 checks passed, every source reachable, exit 0. Applied, all 41 written and attested |
| `B21-links-1.json --expect 65` | 184 checks passed. Applied, 65 written |
| `B21-links-2.json --expect 65` | 206 checks passed. Applied, 65 written |
| `B21-links-3.json --expect 65` | 181 checks passed. Applied, 65 written |
| `B21-links-4.json --expect 63` | 254 checks passed. Applied, 60 written, 3 refused on `baseHash` |
| `B21-art.json --expect 5` | 23 checks passed. Rebuilt on a fresh read after 3 refusals, then applied, 5 written |
| final read, 755 rows | 738 live attested Drafts, 0 unattested, 0 dangling broader links |
| `scripts/encyclopedia-coverage.mjs` | Library of Congress 166/646, 26 per cent |
| `ui/scripts/encyclopedia-coverage.test.mjs` | 6 pass, 0 fail |

The `baseHash` guard from PR #285 refused six writes across the run, every one of
them a cell another run had rewritten in the meantime. Each was re-read from
production; in all six cases the cell already carried the link, so nothing was
overwritten and nothing was lost. The guard did the job it was built for.

## Ledger

36 rows in `.agents/skills/encyclopedia/sources/lcgft-literature.json`. Fourteen
replace an earlier decision rather than adding a duplicate:

| term | previous decision | now |
|---|---|---|
| Fiction, Poetry, Drama | declined, B6 | live |
| Gothic poetry | deferred, B8 | live |
| Humorous poetry, Humorous fiction | declined, B8 and B6 | live |
| Biographical poetry, Biographical fiction | declined | live |
| Action and adventure fiction, Monster fiction | declined | live |
| Experimental fiction, Experimental poetry | declined | live |
| Love poetry, Nature fiction | declined | live |

The four cross-form parents and Printmaking get no Library of Congress row,
because the vocabulary has no term for any of them.

## Payloads

In the worktree `/private/tmp/nesting`: `B21-create.json`, `B21-links-1.json`
through `B21-links-4.json`, `B21-art.json`. Each holds the exact documents that
were written.

## Item 50 — the second visual sweep, on Wikidata

The Artsy pass that landed overnight produced cells sourced to Wikipedia,
Wikidata and Getty. No cell carries an Artsy gene page, so there was no Artsy
citation to take a parent from. Wikidata is the vocabulary 147 of the visual
roots do cite, and it states parents in machine-readable form: `subclass of`,
`part of`, `movement`. I read all 222 cited items plus their ancestors and
walked each root up to the nearest item that is a cell, the same method the
writing map used.

One cell created:

| # | cell | id | named from | children |
|---|---|---|---|---|
| 50 | Abstract art | `abstract-art` | English Wikipedia, Wikidata Q128115 | abstract-expressionism, abstraction-creation, concrete-art, geometric-abstraction |

Thirty links onto 28 existing cells, each from that cell's own Wikidata item.
Among them: Abstract Expressionism and Die Brücke and Neue Sachlichkeit under
Expressionism, American Impressionism and Pointillism under Impressionism,
Ashcan School and American Realism and Social Realism and Costumbrismo and
Precisionism under Realism, Orphism and Purism under Cubism, Rococo under
Baroque, Nabis under Post-Impressionism, Hudson River School under Romanticism,
Luminism under Hudson River School, Mexican Muralism under Social Realism,
Gothic art under Medieval art, Shunga under Ukiyo-e, Gekiga under Manga,
Afrofuturism under Science fiction, and the four Renaissance cells under
Renaissance art.

Three of those need your eye:

- **The Renaissance links.** High Renaissance, Mannerism and Northern
  Renaissance are filed by Wikidata under the Renaissance, the historical
  period, and this collection's cell for that period's art is Renaissance art.
  The explanation on each link says exactly that. Strike them if the step is
  too large.
- **Afrofuturism under Science fiction.** Wikidata files it as a subclass of
  science fiction. Afrofuturism also runs through music and visual art, so the
  parent may be too narrow.
- **Pointillism has two parents**, Neo-Impressionism and Impressionism, because
  Wikidata states both.

Visual roots fall from 192 to 165. The remaining 165 are the ceiling of the
source rather than of the pass: Wikidata carries no parent claim at all for Der
Blaue Reiter, CoBrA, Suprematism, Minimalism and most other named groups, and
where it carries one it is often a class like art, Western art, cultural
movement or avant-garde, which are not cells. That layer has to be curated.

This sweep produces no ledger rows, because it read claims on cells that already
existed rather than reading a source's terms. Abstract art is its one mint and
is numbered above.

## Item 51 — three of my own links corrected after review

The nesting-visual agent reviewed the visual sweep and found three links that
were wrong or one level too high. I checked each against the cell's own article
before changing anything, and all three held.

| cell | was under | now under | why |
|---|---|---|---|
| Ashcan School | Realism | American realism | The American realism article gives the Ashcan school its own section and calls its painters American Realists. American realism already sits under Realism, so this is the insertion move. |
| Die Brücke | Expressionism | German Expressionism | Its own article opens by calling the group German expressionist artists formed in Dresden in 1905. German Expressionism already sits under Expressionism. |
| Precisionism | Realism | American modernism | Its own article opens by calling it a modernist art movement that emerged in the United States after the First World War. My link had walked Wikidata from Precisionism to magic realism to realism, where realism means the nineteenth-century movement rather than the tendency Precisionism belongs to. |

The third was a real defect, not a placement preference, and it is the only one
of the 350 links in this run known to be wrong. The rule that would have caught
it is now written into the skill and recorded as D47: a parent more than one step
up the vocabulary is read before it is written.

## Item 52 — a contradiction for you to settle: the Abstract art cell

I created Abstract art because four live cells name it as their parent and
nothing above them existed. The Artsy reading pass declined the Artsy gene of
that name, with the note "a medium crossed with a broad quality, which is a way
of filtering a catalogue rather than a direction". The live cell and that ledger
row now say opposite things, and both land on master.

For the cell: a hundred years of painting and sculpture, a boundary critics
argue about, and four cells whose own Wikidata items name it as their parent.
For the decline: as a catalogue gene it is a filter, and Geometric abstraction
and Abstract Expressionism may already do the job more precisely.

If you keep it, the Artsy ledger row wants revising to `merge` naming
`abstract-art`. If you strike it, four links drop and Geometric abstraction
becomes the parent of that group, which is where the nesting-visual agent put
them independently.

## Item 53 — the rest of the visual map is written up but not written

The nesting-visual agent verified about thirty more visual parents by reading
the articles rather than trusting a Wikidata triple, and two cells that would be
needed, Performance art and Information design. None of it is in production,
because that agent's session refuses the loader's apply step. I have not applied
its payload: doing so would work around a permission decision made about that
session rather than about mine. That needs you or the team lead to unblock, not
another agent to route around.

Its write-up is at `/private/tmp/encyclopedia-passes/report-nesting-visual.md`
and its draft PR is https://github.com/arni-labs/katagami/pull/287.

## Item 54 — four defects the verifier found on pull request 286, and what was done

The nesting itself held: 744 of 744 attested, zero dangling links, zero cycles,
448 of 453 Library of Congress parents stated verbatim by the cited record,
ledger and live in agreement. Four defects were real and are fixed in batch B23.

**Three links, not one, reached the wrong Realism.** D47 recorded Precisionism
as the only wrong link of 350. American realism and Social realism reached the
same place by the same route: their Wikidata items name Q10857409, the general
realist tendency, while the Realism cell here is the French movement of the
1840s standing on Q2642826 with Courbet in its scope. Both links are removed and
those two cells are roots again. Ashcan School was reaching Courbet in two hops
through American realism, and that chain is broken by the same removal, so its
link to American realism now stands on its own evidence.

A question for you: nothing in the collection stands for the general realist
tendency, which is why these two have no parent rather than a better one. A cell
for it would hold American realism, Social realism, Costumbrismo and the French
movement itself. I have not minted it, because it would sit very close to the
existing Realism cell and that is the kind of near-duplicate worth your ruling.

**The three Renaissance links cited a record that did not carry the claim.**
High Renaissance, Mannerism and Northern Renaissance cite Wikidata items filed
under the Renaissance as a historical period, and link to a cell standing on
Renaissance art, which is not the same item. The placements are defensible, so
the fix was the citation rather than the link: each now cites its own Wikipedia
article and the explanation says what that article actually states. Mannerism is
the weakest and its explanation says so, because its article places it after the
High Renaissance and ending when the Baroque replaced it, so it sits on the edge
of the span Renaissance art covers. Strike that one if the edge is too far out.

**Ten reversals carried no note of what they overturn.** Fiction, Poetry, Drama
and Gothic poetry recorded it; the other ten did not, so a reader met a cell
with nothing saying it had once been refused. Each of the ten now quotes the
decline it overturns in the words that decline used, and says how to keep the
earlier ruling: Humorous poetry, Humorous fiction, Biographical poetry,
Biographical fiction, Action and adventure fiction, Monster fiction,
Experimental fiction, Experimental poetry, Love poetry, Nature fiction.

**This file was on one laptop only.** It is now committed with the effort at
`docs/efforts/ARN-118/proposal-B21-B23-nesting.md`, so the pull request points
at something you can open.

## Item 55 — two citations added and five links told to name their speaker

The verifier read every one of the 548 broader links against the rule that a
citation supports a claim only if the source makes it. 514 are the strong form,
where the cell's own cited page states what it belongs to, and 448 of those come
from a Library of Congress broader term. Eleven rest only on the parent's
article, which is legitimate but weaker, and the explanation has to say so.

Five of the eleven did not say so and now do: Computer-generated literature,
Hypertext fiction and Hypertext poetry under Electronic literature, Field notes
under Nature writing, and Ukiyo-e under Relief printing. Each explanation now
opens by naming whose claim it is and says what the cell's own pages do not
carry. The six printmaking and Ashcan links already named their speaker.

Twelve links have no cited page carrying the parent's name at all. Memorates
holds on its own record's note; the other eleven mostly predate this pass and
are recorded as collection follow-ups rather than fixed here.

Two cells stood on the Library of Congress record alone where an article exists.
Action and adventure fiction now cites Adventure fiction and Non-fiction comics
cites Non-fiction comics, and both scope sentences were rewritten to say what
those articles say. Action and adventure fiction had claimed travel, which
neither source carries, and Non-fiction comics had used the banned contrast
frame.

## Item 56 — a citation check over the 42 cells this run minted

Two of the seven cells touched in item 55 turned out to carry a claim their
sources do not make, and both were found only because adding a citation forced
a reading of the source. That base rate said the other forty would not be clean,
so all 42 were checked before the review panel rather than after.

| | cells carrying an unsupported claim |
|---|---|
| before | 17 of 42 |
| after this pass | 1 of 42 |
| after the review round caught the miss | 0 of 42 |

The method: fetch every page each cell cites, as complete article text rather
than the lead, and look for every person, place, work, period and date the cell's
scope sentence or link explanations name.

The first run of this reported sixteen defects and zero remaining, and the zero
was wrong. Survival fiction still credited a canon to Robinson Crusoe, a work its
only cited page never names. The checker missed it because it fell back to
matching the first word of a phrase when the whole phrase was absent, and
"Robinson" appears inside "Robinsonades" in that record. The fallback was there
to tolerate a surname written without its initials. Run strictly, it finds the
one it hid and nothing else: the two Gothic cells it also flags are false
positives, because the Gothic fiction article carries Pope, Eloisa, Abelard,
Pushkin and Bridegroom, and only my possessive phrasing is absent. Seventeen of
42 carried an unsupported claim, and none do now.

Every one was fixed by deleting the claim rather than by finding a source for it.
That direction matters: going looking for a citation that fits prose already
written produces the same defect with better paperwork.

What was cut, and from where:

- **Canons asserted from general knowledge on cells citing only a Library of
  Congress record.** Verse satire claimed Horace and Juvenal through Dryden and
  Pope; Nature poetry claimed pastoral and Romantic writing; Autobiographical
  poetry claimed The Prelude and the American confessional poets; Experimental
  fiction claimed the nouveau roman; Experimental poetry claimed the
  twentieth-century avant-gardes; Bawdy plays claimed Greek satyr drama through
  Restoration comedy; Didactic drama claimed the twentieth-century teaching play.
- **Geographies and traditions inferred from the names of a term's children.**
  Dance drama claimed South, Southeast and East Asian traditions; Religious drama
  claimed medieval Europe, Spain, Shia Islam and Hindu performance; Religious
  poetry claimed Jewish, Christian and Islamic practice; Bible plays claimed the
  Gospels and the book of Esther; Interludes claimed Tudor England and Japanese
  nō performance; Biographical comics claimed underground comix and a body of
  work in North American and French comics.
- **Two cases where part of a claim held and part did not.** Allegories cited a
  canon from the Psychomachia through Piers Plowman to The Pilgrim's Progress;
  only the last is in the Allegory article, so only the last survives. Poetry
  claimed the Chinese and Korean forms; the Poetry article carries Chinese and
  not Korean.
- **One where the cited page turned out to be a stub.** Epistolary literature
  credited the verse epistle of Horace and Ovid's Heroides to an Epistolary poem
  article that is 180 characters long and names neither.

Each replacement says what the record does state, which is usually the term's
placement and the headings filed under it. The cells are less colourful and they
are now true.

The checker is at `/private/tmp/encyclopedia-passes/citecheck-nesting.py`. It was
written for these 42 and is not the collection-wide tool; that one is being built
against a measured rate of 82 of 744 live cells.
