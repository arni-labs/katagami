# Replacement corpora for the seven model-written writing styles

Seven live writing styles carried a corpus whose manifest `kind` was
`original-in-register`, meaning a language model wrote it. A model writes in its
own voice whatever register it is aiming at, so a model-written passage labelled
as an example of a register is not evidence of that register. Either a style has
text by real hands or the style does not exist yet.

This file records what replaced each one, on what licence basis, and exactly
which spans were quoted. Every passage is a contiguous verbatim run of its
source. Nothing was rewritten, reordered, or joined across a gap.

## What closed the Creative Commons route

`AttachCorpus` takes a consent block whose `basis` is one of three values:
`opt_in`, `public_domain`, `original` (`katagami-commons/specs/writing_style.ioa.toml`,
the `AttachCorpus` and `AttestConsent` hints). Text under a Creative Commons
licence is none of the three, and recording it as `public_domain` would be false.
Two candidates were read rather than assumed:

- **The Conversation** — CC BY-ND 4.0. Its republishing guidelines separately
  forbid systematic republication and permit only lead paragraphs with a link
  back. Unusable on the licence as well as on the basis.
- **Global Voices** — CC BY 3.0, attribution only, genuinely permissive. Usable
  as a licence and unusable as a basis.

Opening that route needs a fourth basis in the spec and a finalizer that checks
attribution. That is a decision for the owner rather than for this effort, and it
is why every modern replacement below is a work of the United States federal
government: 17 U.S.C. 105(a) puts those outside copyright, so `public_domain` is
true of them.

## The seven

| was | is | basis |
|---|---|---|
| Op-ed | The Crisis — editorial page (1910–1911) | public domain (US, pre-1929) |
| Explanatory journalism | Congressional Research Service — issue reports (2020s) | public domain (17 U.S.C. 105) |
| Minimalism (technical communication) | Federal Aviation Administration — Airplane Flying Handbook (2021) | public domain (17 U.S.C. 105) |
| Liveblogging | National Hurricane Center — forecast discussions (2024) | public domain (17 U.S.C. 105) |
| Lyric essay | Charles Lamb — Elia essays (1823) | public domain |
| Dirty realism | Sherwood Anderson — Winesburg, Ohio (1919) | public domain |
| High fantasy | High fantasy (name kept) | public domain |

### The Crisis — editorial page (1910–1911)

*The Crisis: A Record of the Darker Races*, Vol. I No. 1 (November 1910),
Project Gutenberg ebook 71222, and Vol. I No. 3 (January 1911), ebook 71650.
Four runs: the whole editorial page of No. 1, then ENVY / THE TRUTH,
OPPORTUNITY / SCHOOLS, and THE OLD STORY / ASHAMED from No. 3. 1333, 680, 771
and 786 words.

An op-ed is by definition the outside contributor's piece opposite a paper's own
editorials; these are the editor's own, so the style is named for what the text
is. Published in the United States before 1929 and public domain there. Du Bois
died in 1963, so the issues remain in copyright in countries applying life plus
seventy until 2034 — the same position the collection already holds for Emily
Post.

### Congressional Research Service — issue reports (2020s)

CRS Report R48580, *Avian Influenza (Bird Flu) in the United States*, and CRS
Report R48845, *Surface Transportation Reauthorization: Federal Highway
Programs*. Two contiguous runs of running text from each: 873, 821, 752 and 840
words. Reports of record at crsreports.congress.gov; text retrieved from the
everycrsreport.com mirror because the official host refuses scripted requests.

Outside copyright under 17 U.S.C. 105, and reproducible in full under 2 U.S.C.
166a. A CRS report is not journalism, so the style is named for what it is. It is
the strongest modern text the collection can carry honestly: written this decade,
by working analysts, in the register the owner asked for.

**Extraction:** the reports carry footnote reference numbers as `<sup>` elements
inside sentences, and figure and table source notes between paragraphs. Both are
apparatus rather than prose and are not carried; a note interrupts a run rather
than being reached over. No word of the running text is changed.

### Federal Aviation Administration — Airplane Flying Handbook (2021)

FAA-H-8083-3C, chapter 5, published at faa.gov. Four runs: slow flight,
performing the slow flight maneuver, the fundamentals of stall recovery, and
intentional spins. 709, 836, 733 and 660 words. Outside copyright under
17 U.S.C. 105.

Carroll's minimalism was set out in 1990 and has no public-domain text. What the
old persona described — one task, the destructive part flagged before step one,
numbered actions in the order a hand performs them, a section on what to do when
it fails — is this handbook, whose maneuver sections end in "Common Errors".

**Extraction:** the chapter's text layer places printed page numbers on their own
lines mid-sentence. Those lines are not carried. Nothing else is removed.

### National Hurricane Center — forecast discussions (2024)

Hurricane Helene (AL092024) Forecast Discussions 8, 9, 11 and 12, issued 25 and
26 September 2024, archived at nhc.noaa.gov, signed by forecasters Beven, Berg
and Pasch. Each quoted entire from its title line to the end of its key messages.
665, 693, 741 and 802 words. Outside copyright under 17 U.S.C. 105.

Liveblogging is a web register whose writers are living and whose text is in
copyright, and this style was expected to be archived. The forecast discussion
satisfies every clause of the persona it already had: short numbered issues,
present tense, written without knowing the ending, saying what is confirmed and
what is not, superseded rather than edited, and signed. Discussion 8 opens
"Corrected Helen to Helene", which is the register correcting itself in public.

**Extraction:** the teletype routing header above each discussion, and the
numeric forecast position table and the forecaster's signature below it, are not
running prose and are not carried.

### Charles Lamb — Elia essays (1823)

*The Works of Charles and Mary Lamb, Volume 2: Elia and The Last Essays of Elia*,
Project Gutenberg ebook 10343. Four runs from the openings of Oxford in the
Vacation, Mrs Battle's Opinions on Whist, A Chapter on Ears, and Old China. 915,
820, 869 and 901 words.

The lyric essay was named by Deborah Tall and John D'Agata in 1997 and its
practitioners are living, so there is no text of it the collection can carry.
Elia is the public-domain ancestor of the ornate and intimate end of the range
the owner asked for. What Elia does not have is the fragmentary form the old
persona described, argument moving by juxtaposition across white space; that
register remains one the collection does not hold.

Dream-Children was cut from the corpus in favour of A Chapter on Ears. It runs at
a mean sentence length of 74 words against 23 to 32 for the others, which would
have set the style's ceiling near 100 words a sentence and left the band proving
almost nothing.

### Sherwood Anderson — Winesburg, Ohio (1919)

*Winesburg, Ohio: A Group of Tales of Ohio Small Town Life*, Project Gutenberg
ebook 416. Four runs from the openings of Hands, Mother, Adventure, and The
Untold Lie. 884, 956, 888 and 906 words.

Bill Buford named dirty realism in *Granta* in 1983 and its writers are in
copyright. Anderson is its acknowledged ancestor and matches the persona the
style already had. Preferred over Hemingway's *In Our Time*, which has been
public domain in the United States since 2021 and is not public domain in
countries applying life plus seventy; Anderson died in 1941 and is clear
everywhere.

### High fantasy

*The Wood Beyond the World* by William Morris (1894), Project Gutenberg ebook
3055, and *Phantastes: A Faerie Romance for Men and Women* by George MacDonald
(1858), ebook 325. Two runs from the opening chapters of each. 833, 916, 828 and
884 words.

The name is kept because the register genuinely is these books; only the corpus
changes. Lord Dunsany is the third name usually given and is not carried: he died
in 1957, so his work is public domain in the United States and remains in
copyright in countries applying life plus seventy until 2028.

## Styles that are public domain in the United States only

Three of the collection's styles rest on the United States rule that anything
published before 1929 is public domain there, while their authors died recently
enough that the work is still in copyright in countries applying life plus
seventy. Katagami publishes at katagami.ai to readers in both. Recording the
class rather than deciding it style by style:

| style | author died | clear in life+70 countries from |
|---|---|---|
| Emily Post — etiquette manual (1922) | 1960 | 2031 |
| The Crisis — editorial page (1910-1911) | Du Bois, 1963 | 2034 |
| William Strunk Jr. — style manual (1918) | 1946 | 2017 (clear now) |

Emily Post was already in this position before this effort; The Crisis joins her.
Two candidates were rejected on exactly this test rather than admitted to the
class: Lord Dunsany (died 1957, clear 2028) for High fantasy, and Hemingway's
*In Our Time* for the dirty-realism slot. Where an author who is clear everywhere
does the same job, that author is preferred, which is why the corpora above are
Morris and MacDonald rather than Dunsany, and Anderson rather than Hemingway.

What the class needs and does not have is a decision about whether the site
should serve a corpus that is public domain only in the United States to a reader
outside it. That is the owner's call, recorded here so it is asked once rather
than re-litigated per style.

## Bands

Every style's mechanical bands are derived from its own new corpus rather than
chosen for it, with the margins the collection already uses. Those margins were
measured off two styles the pipeline built earlier, Jane Austen and Aphorism: the
mean band runs from the shortest file's mean at 0.70 to the longest file's mean
at 1.35, the burstiness floor sits at 0.55 of the least bursty file, the
distinct-word floor at 0.80 of the poorest file, and the two divergence ceilings
at 2.75 times the file furthest from the corpus centre.

Only the keys the checker in `docs/research/harness/voice_check_local.py`
evaluates are emitted, which is the same set the Aphorism style emits. A band
nothing checks is a band nothing proves.

Every corpus passes its own derived bands, and so does every exemplar drawn from
it: zero violations across all seven.

## What is still open after the corpora land

The VOICE.md attached to each of these seven quotes the whole model-written
corpus inside its "Gold standard samples" section — around 14 KB of model prose
in the portable contract file, which is the artifact most likely to be handed to
someone. The replication samples were then produced from that VOICE.md. Both have
to be rebuilt on the new contract before any of these styles can publish.
