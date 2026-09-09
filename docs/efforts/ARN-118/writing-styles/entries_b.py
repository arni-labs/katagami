"""The authored layer for the remaining Gutenberg styles, including two blends.

A blend is a lineage child: its parents are the author voices whose passages
make up its corpus, and its bands are derived from that merged corpus. The
parent voices are records in their own right because the two-level rule makes
them the calibration set a blend is measured against.
"""

ENTRIES = {

"buchan-thirty-nine-steps": dict(
    number=141,
    name="John Buchan — The Thirty-Nine Steps (1915)",
    persona=(
        "An ordinary man who has noticed something, moving across real geography and "
        "explaining what he worked out and when he worked it out. Places are named as "
        "they are on the map and the distances between them are the distances a man on "
        "foot or in a car actually covers. Reasoning is given in sequence: what he knew, "
        "what he guessed, what the guess cost him. He talks about his own competence "
        "briskly and without pride."
    ),
    habits=[
        "the plan stated in full before it is carried out",
        "real place names and the real distances between them",
        "the narrator's own boredom or fear reported as a plain fact",
        "the reader told the reasoning at the moment the narrator did it",
    ],
    vocabulary_use=[
        "British and Scottish place names",
        "dates given by day of the month",
        "the plain idiom of an Edwardian clubman: chap, fellow, giddy, rum",
        "verbs of movement: struck, made for, doubled back",
    ],
    moves=[
        "state the situation and the deadline before moving",
        "give the geography by name and let the pace come from it",
        "put the deduction in the narrator's own words as he reaches it",
        "report physical hardship without dramatising it",
        "close a chapter on the next problem and leave the last solution behind",
    ],
    register={
        "narration": "first person, retrospective, brisk",
        "reasoning": "sequential, and dated",
        "landscape": "named, measured, moved through",
    },
    refusals=[
        "never withholds a deduction the narrator has already made",
        "never invents a place that could not be found on a map",
        "never lets the narrator be an expert at anything he has not done",
        "never spends a sentence on how frightened he was",
    ],
    consent_author="John Buchan",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Thirty-Nine Steps (1915), Project Gutenberg ebook 558. Four contiguous runs "
        "from The Man Who Died, The Milkman Sets Out on his Travels, The Adventure of the "
        "Radical Candidate and The Adventure of the Spectacled Roadman. Buchan died in "
        "1940, so the novel is public domain in the United States and in countries "
        "applying life plus seventy."
    ),
    credits=[
        {"name": "John Buchan", "kind": "writer",
         "note": "The Thirty-Nine Steps (1915); the corpus quoted here"},
        {"name": "The chase novel", "kind": "register",
         "note": "the pursuit narrative carried across named ground"},
    ],
    tags=["fiction", "thriller", "first-person", "geography", "edwardian"],
    curator_notes=(
        "One of the two author voices under the Spy fiction blend. Kept as a record in "
        "its own right because the two-level rule calibrates a blend against its author voices."
    ),
    exemplars=[
        (1, 0, 3, "A man's boredom with London is given as three concrete facts about "
                  "money, weather and the people he has met."),
        (4, 0, 3, "The ground is surveyed in the order a man on a hilltop would survey it, "
                  "and the danger is stated as a fact about cover."),
    ],
),

"childers-riddle-of-the-sands": dict(
    number=142,
    name="Erskine Childers — The Riddle of the Sands (1903)",
    persona=(
        "A Foreign Office clerk on a small boat, writing up what he did not understand at "
        "the time. Tides, soundings, sail plans and channel names are given with the "
        "precision of a log, and the narrator's social discomfort is reported with the "
        "same exactness. The suspicion builds out of navigation: a chart with a page "
        "missing counts for something because the reader has been taught to read charts."
    ),
    habits=[
        "the technical detail of small-boat sailing given in full",
        "the narrator's own vanity described and then punctured by the work",
        "a date and a state of tide opening the day",
        "the discovery arriving through an ordinary piece of equipment",
    ],
    vocabulary_use=[
        "the vocabulary of sail and sounding: halyard, centre-board, lead, kedge",
        "German and Frisian place names",
        "clock times and states of tide",
        "the fastidious diction of a London office",
    ],
    moves=[
        "open the day with the weather, the tide and the narrator's mood",
        "teach the reader the equipment before the plot needs it",
        "let the narrator record his own smallness of mind",
        "keep the sailing accurate while the plot moves under it",
        "end on a question asked in the cabin",
    ],
    register={
        "narration": "first person, retrospective, precise and self-critical",
        "seamanship": "logged, exact, unglamorous",
        "dialogue": "two men in a small space, clipped",
    },
    refusals=[
        "never fakes a piece of seamanship",
        "never lets the narrator be braver than he was",
        "never explains the significance of a discovery before the characters see it",
        "never leaves the geography vague",
    ],
    consent_author="Erskine Childers",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Riddle of the Sands (1903), Project Gutenberg ebook 2360. Four contiguous "
        "runs from The Letter, Davies, The Missing Page and My Initiation. Childers died "
        "in 1922, so the novel is public domain in the United States and in countries "
        "applying life plus seventy."
    ),
    credits=[
        {"name": "Erskine Childers", "kind": "writer",
         "note": "The Riddle of the Sands (1903); the corpus quoted here"},
        {"name": "The small-boat narrative", "kind": "register",
         "note": "sailing written with the exactness of a log"},
    ],
    tags=["fiction", "thriller", "first-person", "sailing", "edwardian"],
    curator_notes=(
        "The second author voice under the Spy fiction blend. The opening passage runs to "
        "a 41-word sentence mean against 15 for the third, which is the range of the book "
        "and is why the blend's sentence ceiling comes out at 30.8."
    ),
    exemplars=[
        (2, 0, 3, "A bad night is given through elbows, draughts and a pool of water on "
                  "the oilcloth, with the narrator's self-regard reported as a fact."),
        (4, 0, 2, "A yacht at anchor is described by heel, keel and tide before anyone on "
                  "board is mentioned."),
    ],
),

"spy-fiction": dict(
    number=14,
    name="Spy fiction",
    persona=(
        "An ordinary man who has noticed something, moving across real geography while "
        "explaining what he worked out and when. The ground is named and the distances "
        "are the distances a man actually covers, on foot, in a car or under sail. The "
        "reasoning is handed to the reader at the point the narrator reached it, and the "
        "danger is stated as a fact about cover, tide or timetable. Competence is reported "
        "plainly, including its limits."
    ),
    habits=[
        "the plan stated in full before it is carried out",
        "real place names and the real distances between them",
        "the deduction given at the moment the narrator made it",
        "the technical detail taught before it is needed",
    ],
    vocabulary_use=[
        "place names that can be found on a map",
        "dates, clock times and states of tide",
        "the plain idiom of the period's educated Englishman",
        "verbs of movement and of seamanship",
    ],
    moves=[
        "state the situation and the deadline before moving",
        "let the pace come from the geography",
        "put the reasoning in the narrator's own words as he reaches it",
        "report hardship and fear as plain facts",
        "close on the next problem",
    ],
    register={
        "narration": "first person, retrospective, brisk and self-critical",
        "reasoning": "sequential, dated, handed over as it happens",
        "landscape": "named, measured, moved through",
    },
    refusals=[
        "never withholds a deduction the narrator has already made",
        "never invents ground that could not be found on a map",
        "never lets the narrator be an expert at something he has not done",
        "never dramatises the fear the situation already carries",
    ],
    consent_author="John Buchan; Erskine Childers",
    consent_license="public domain (worldwide)",
    provenance=(
        "John Buchan, The Thirty-Nine Steps (1915), Project Gutenberg ebook 558, and "
        "Erskine Childers, The Riddle of the Sands (1903), ebook 2360. Two contiguous "
        "runs from each: The Man Who Died and The Adventure of the Spectacled Roadman "
        "from Buchan, Davies and My Initiation from Childers. Both authors died before "
        "1941, so both novels are public domain in the United States and in countries "
        "applying life plus seventy. No text was composed for this style: the bands are "
        "measured across both authors' real pages and the exemplars are quoted word for "
        "word from each."
    ),
    credits=[
        {"name": "John Buchan", "kind": "writer", "note": "The Thirty-Nine Steps (1915)"},
        {"name": "Erskine Childers", "kind": "writer", "note": "The Riddle of the Sands (1903)"},
        {"name": "Spy fiction", "kind": "register",
         "note": "the register of the amateur who has noticed something and must move"},
    ],
    tags=["fiction", "spy", "first-person", "geography", "blend"],
    curator_notes=(
        "The only blend among the fiction candidates, and it costs three records under "
        "the two-level rule: the two author voices are its parents and this is the "
        "lineage child. Its corpus is two passages from each parent, so the child is "
        "measured on the same text the parents were measured on and nothing was composed "
        "for it. Buchan supplies the overland chase and Childers the technical patience; "
        "the merged sentence band, 12.6 to 30.8, falls between the two."
    ),
    exemplars=[
        (1, 0, 3, "A man's boredom with London is given as three concrete facts about "
                  "money, weather and the people he has met."),
        (4, 0, 2, "A yacht at anchor is described by heel, keel and tide before anyone on "
                  "board is mentioned."),
    ],
    lineage_type="blend",
    generation_number="1",
    parent_slugs=["buchan-thirty-nine-steps", "childers-riddle-of-the-sands"],
),

"london-people-of-the-abyss": dict(
    number=21,
    name="Jack London — The People of the Abyss (1903)",
    persona=(
        "A reporter who went and lived there, writing what he saw with himself in the "
        "frame. The method is stated: where he slept, what he ate, what it cost, how "
        "long the queue was. Figures from official returns sit beside things he watched "
        "happen, and he says which is which. He is present in every scene as a man who "
        "chose to be there and can leave, and he says that too."
    ),
    habits=[
        "the reporter's own position and method stated in the scene",
        "prices, wages and hours given as figures",
        "an official statistic set beside a thing witnessed",
        "the conclusion drawn out loud, at the end of the observation",
    ],
    vocabulary_use=[
        "shillings, pence, hours, ages",
        "London street and district names",
        "the argot as it was spoken, quoted",
        "the vocabulary of the trade: doss, spike, carrying the banner",
    ],
    moves=[
        "put the reporter in the queue and describe it from inside",
        "give the figure that scales what has just been described",
        "quote the person in their own words at length",
        "say what he did to get the access he had",
        "state the argument the scene supports",
    ],
    register={
        "reporting": "first person, present in the scene, method declared",
        "figures": "sourced, and set against what was seen",
        "argument": "stated, at the end of the evidence",
    },
    refusals=[
        "never reports a scene he did not attend",
        "never gives a figure without saying where it came from",
        "never hides that he can leave and they cannot",
        "never puts words in the mouth of someone he quoted",
    ],
    consent_author="Jack London",
    consent_license="public domain (worldwide)",
    provenance=(
        "The People of the Abyss (1903), Project Gutenberg ebook 1688. Four contiguous "
        "runs from Johnny Upright, The Spike, Carrying the Banner and Hops and Hoppers. "
        "London died in 1916, so the book is public domain in the United States and in "
        "countries applying life plus seventy."
    ),
    credits=[
        {"name": "Jack London", "kind": "writer",
         "note": "The People of the Abyss (1903); the corpus quoted here"},
        {"name": "Immersion reporting", "kind": "register",
         "note": "the reporter who lives the conditions before writing about them"},
    ],
    tags=["nonfiction", "reportage", "first-person", "immersion", "edwardian"],
    curator_notes=(
        "The class framing is of its date and shows in the adjectives, which the four "
        "passages keep instead of cutting around. Narrative journalism's own children, New "
        "Journalism and Gonzo, have no public-domain corpus at all, so this is the "
        "ancestor the collection can hold."
    ),
    exemplars=[
        (2, 0, 3, "The reporter accounts for his own body before he describes the ward it "
                  "was taken into."),
        (3, 0, 4, "A phrase from the street is defined, then demonstrated by a night the "
                  "reporter spent proving it."),
    ],
),

"grant-personal-memoirs": dict(
    number=22,
    name="Ulysses S. Grant — Personal Memoirs (1885)",
    persona=(
        "A man writing down what he decided and why, with no sentence spent on how it "
        "felt. The situation is given, then the options, then the choice and the reason "
        "for it, in that order and in plain declarative sentences. Other men are judged "
        "by what their decisions cost, and the judgement is stated once. Where he was "
        "wrong he says so in the same tone he uses for everything else."
    ),
    habits=[
        "the situation, the options and the choice, in that order",
        "an admission of error given the same weight as anything else",
        "numbers of men, distances and dates stated flatly",
        "a judgement on another officer made once and not repeated",
    ],
    vocabulary_use=[
        "the vocabulary of command: ordered, moved, reinforced, occupied",
        "regiment and place names in full",
        "numbers of troops, distances in miles",
        "plain connectives: but, so, and then",
    ],
    moves=[
        "state the position before the decision taken in it",
        "give the reason for the choice immediately after the choice",
        "record an error without softening or dwelling",
        "assess a person by the result of what they did",
        "end a passage on the fact and leave the meaning to the reader",
    ],
    register={
        "narrative": "first person, chronological, declarative",
        "judgement": "stated once, in the same register as the facts",
        "figures": "given plainly, without emphasis",
    },
    refusals=[
        "never describes an emotion",
        "never justifies a decision twice",
        "never inflates a victory or explains away a defeat",
        "never uses a figure of speech where a number would do",
    ],
    consent_author="Ulysses S. Grant",
    consent_license="public domain (worldwide)",
    provenance=(
        "Personal Memoirs of U. S. Grant (1885), Project Gutenberg ebook 4367. Four "
        "contiguous runs: ancestry and boyhood, the politics of the Mexican war, the "
        "return and the Pacific coast posting, and the movement against Belmont. Grant "
        "died in 1885, so the memoirs are public domain in the United States and in "
        "countries applying life plus seventy."
    ),
    credits=[
        {"name": "Ulysses S. Grant", "kind": "writer",
         "note": "Personal Memoirs (1885); the corpus quoted here"},
        {"name": "The military memoir", "kind": "register",
         "note": "the account of decisions written by the person who took them"},
    ],
    tags=["nonfiction", "memoir", "first-person", "plain", "military"],
    curator_notes=(
        "Military narrative from end to end, so the plainness arrives attached to one "
        "subject. Two of the four passages were chosen from outside the campaigns (family "
        "history and a peacetime posting), so the bands measure the manner and not the "
        "battlefield vocabulary."
    ),
    exemplars=[
        (1, 0, 3, "Four generations of a family are given as dates, places and trades, "
                  "with no adjective spent on any of them."),
        (2, 0, 1, "A war's politics are stated as the calculation two parties were making, "
                  "and the calculation is named."),
    ],
),

"douglass-narrative": dict(
    number=23,
    name="Frederick Douglass — Narrative of the Life (1845)",
    persona=(
        "A first person recounting his own life in exact chronology. Each fact is given "
        "with what is known about it and what is not: a birthplace without a birth date, "
        "a mother seen four times, a master named and his conduct described. The "
        "argument is built entirely out of incident and is never stated as an argument. "
        "Where the writer draws a conclusion he draws it from the scene immediately "
        "before it and moves on."
    ),
    habits=[
        "what is known and what is not stated together",
        "a person named, then described by a specific act",
        "the conclusion drawn from the incident directly above it",
        "the writer's own age given as an approximation, with the reason",
    ],
    vocabulary_use=[
        "names of people, farms and counties in full",
        "ages and intervals given as estimates, with the estimate marked",
        "the vocabulary of the system as it named itself",
        "plain verbs of action and of witness",
    ],
    moves=[
        "give the fact and its limits in the same sentence",
        "characterise by a single recorded act",
        "let the scene carry the argument the writer does not state",
        "move to the next stage of the chronology without a transition",
        "state the general truth once, immediately after its instance",
    ],
    register={
        "narrative": "first person, chronological, exact about what is known",
        "characterisation": "by act, named and dated",
        "argument": "carried by incident",
    },
    refusals=[
        "never claims knowledge the writer could not have had",
        "never generalises before the incident that earns it",
        "never softens what was done or who did it",
        "never appeals to the reader's feeling in place of the record",
    ],
    consent_author="Frederick Douglass",
    consent_license="public domain (worldwide)",
    provenance=(
        "Narrative of the Life of Frederick Douglass, an American Slave (1845), Project "
        "Gutenberg ebook 23. Four contiguous runs from chapters one, four, seven and ten. "
        "Douglass died in 1895, so the narrative is public domain in the United States "
        "and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "Frederick Douglass", "kind": "writer",
         "note": "Narrative of the Life of Frederick Douglass (1845); the corpus quoted here"},
        {"name": "The slave narrative", "kind": "register",
         "note": "the first-person account written to be evidence"},
    ],
    tags=["nonfiction", "autobiography", "first-person", "chronological", "testimony"],
    curator_notes=(
        "The Crisis editorial page, already in the collection, has race in America as its "
        "subject too. The two are different registers doing different work (an editorial argues and this testifies), and the owner approved both knowing how close they are."
    ),
    exemplars=[
        (1, 0, 2, "A birthplace is given precisely and a birth date is given as a thing "
                  "that was withheld, in the same paragraph."),
        (2, 1, 2, "An overseer is characterised in six flat sentences about his manner "
                  "before anything he did is described."),
    ],
),

"hazlitt-table-talk": dict(
    number=24,
    name="William Hazlitt — Table-Talk (1821)",
    persona=(
        "An essay that opens on a general claim and argues it against the writer's own "
        "examples until the claim has changed. The examples are personal and specific: a "
        "picture he painted, a book he read at a named age, a man he watched. Quotation "
        "arrives unannounced and is absorbed into the sentence. The evidence he brings against the argument changes it instead of settling it."
    ),
    habits=[
        "the general claim stated first and then complicated",
        "a personal instance given at length as the counter-evidence",
        "quotation absorbed into the sentence without introduction",
        "the position at the end of the essay different from the one at the start",
    ],
    vocabulary_use=[
        "the vocabulary of the studio and the library",
        "names of painters, writers and public men",
        "the long balanced clause joined by semicolons",
        "the first person used as evidence",
    ],
    moves=[
        "open on a claim general enough that the essay can attack it",
        "bring the writer's own experience as the first objection to it",
        "let a quotation carry a step of the argument",
        "accumulate instances until the claim has to move",
        "end where the argument has arrived, which is not where it began",
    ],
    register={
        "essay": "first person, discursive, argued against itself",
        "instance": "personal, dated, specific",
        "quotation": "unannounced, absorbed",
    },
    refusals=[
        "never states a conclusion the essay has not reached",
        "never uses an instance it cannot vouch for",
        "never signposts the structure of the argument",
        "never leaves the claim where it started",
    ],
    consent_author="William Hazlitt",
    consent_license="public domain (worldwide)",
    provenance=(
        "Table Talk: Essays on Men and Manners (1821), Project Gutenberg ebook 3020. Four "
        "contiguous runs from On the Pleasure of Painting, On the Past and Future, "
        "Character of Cobbett and On the Ignorance of the Learned. Hazlitt died in 1830, "
        "so the essays are public domain in the United States and in countries applying "
        "life plus seventy."
    ),
    credits=[
        {"name": "William Hazlitt", "kind": "writer",
         "note": "Table-Talk (1821); the corpus quoted here"},
        {"name": "The familiar essay", "kind": "register",
         "note": "the personal essay that argues from the writer's own instances"},
    ],
    tags=["nonfiction", "essay", "first-person", "romantic", "discursive"],
    curator_notes=(
        "Lamb and Hazlitt were contemporaries and friends, and the Elia style already in the collection is very close to this one. This style carries one exemplar "
        "and not two: Hazlitt's sentence mean runs from 26 to 45 across the corpus, "
        "so a passage short enough to be an exemplar rarely holds enough sentences to sit "
        "inside the mean band, and only one run of 150 to 400 words does."
    ),
    exemplars=[
        (3, 0, 1, "A public man is characterised through a run of comparisons that keep "
                  "revising the one before."),
    ],
),

"thoreau-walden": dict(
    number=25,
    name="Henry David Thoreau — Walden (1854)",
    persona=(
        "Observation of one place across a year, with the account of what was spent and "
        "grown kept beside it. A paragraph starts in the particular (a sound at a distance, a boat on the pond, a bean row) and ends in a general claim that the "
        "particular has earned. The writer is present, doing the work he describes, and "
        "the arithmetic of the work is given. The address to the reader is direct and "
        "occasionally sharp."
    ),
    habits=[
        "the particular observation opening the paragraph and the general claim closing it",
        "costs, yields and hours given as figures",
        "the second person used to challenge the reader",
        "the classical or scriptural allusion set beside a local fact",
    ],
    vocabulary_use=[
        "the names of local plants, birds and trades",
        "figures for money, bushels and hours",
        "allusion to Greek, Latin and Hindu writing",
        "the second person, addressed to a townsman",
    ],
    moves=[
        "begin in the specific thing seen or done",
        "give the arithmetic of the work alongside the description of it",
        "turn the observation into a claim in the last sentence",
        "address the reader directly when the claim is uncomfortable",
        "let a season change without announcing it",
    ],
    register={
        "observation": "first person, present in the work, exact about the place",
        "accounting": "figures, given without apology",
        "claim": "general, earned by the paragraph above it",
    },
    refusals=[
        "never makes the general claim before the observation that supports it",
        "never reports a cost it did not incur",
        "never flatters the reader",
        "never leaves the place for an abstraction and stays there",
    ],
    consent_author="Henry David Thoreau",
    consent_license="public domain (worldwide)",
    provenance=(
        "Walden (1854), Project Gutenberg ebook 205. Four contiguous runs from Reading, "
        "Sounds, Solitude and The Pond in Winter. Thoreau died in 1862, so the book is "
        "public domain in the United States and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "Henry David Thoreau", "kind": "writer",
         "note": "Walden (1854); the corpus quoted here"},
        {"name": "Nature writing", "kind": "register",
         "note": "sustained observation of one place, with the observer's economy in view"},
    ],
    tags=["nonfiction", "nature", "first-person", "observation", "transcendentalist"],
    curator_notes=(
        "Walden's sermon passages and its observation passages measure differently, and "
        "the corpus decides which style this becomes. Three of the four runs are "
        "observation and one is argument, which is roughly the book's own proportion and "
        "gives a mean band of 17.8 to 44.9. The style attaches at Nature writing, a "
        "parent whose child Field notes is already occupied."
    ),
    exemplars=[
        (2, 1, 2, "A summer of not reading is accounted for in hours and then defended as "
                  "a use of them."),
        (3, 2, 3, "A claim about distance between people is built from the width of a "
                  "room and the length of a pond."),
    ],
),

"bierce-devils-dictionary": dict(
    number=26,
    name="Ambrose Bierce — The Devil's Dictionary (1911)",
    persona=(
        "A definition that accepts the word's ordinary sense for one clause and then says "
        "what the thing is. The entry keeps the form of a real dictionary: headword, "
        "part of speech, definition, illustration. The turn happens inside the definition "
        "itself, usually at a comma, and the illustration that follows is attributed to a "
        "person who does not exist. The entry never signals that it is a joke."
    ),
    habits=[
        "the headword and part of speech given in dictionary form",
        "the turn placed inside the definition at a comma",
        "an illustrative quotation attributed to an invented authority",
        "the second definition of a word left plainer than the first",
    ],
    vocabulary_use=[
        "the formulas of lexicography: n., adj., one who, the state of",
        "abstract nouns treated as if they were objects",
        "invented attributions in the manner of real ones",
        "verse quoted as evidence",
    ],
    moves=[
        "grant the ordinary sense for exactly one clause",
        "put the reversal at the comma, before the sentence ends",
        "follow the definition with an illustration that extends it",
        "attribute the illustration to a name that sounds like a real authority",
        "stop as soon as the definition is complete",
    ],
    register={
        "entry": "lexicographic in form throughout",
        "definition": "one clause conceded, one clause taken back",
        "illustration": "verse or anecdote, attributed",
    },
    refusals=[
        "never explains the joke it has made",
        "never abandons the dictionary form",
        "never runs a definition past the point it is complete",
        "never signals the turn before making it",
    ],
    consent_author="Ambrose Bierce",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Devil's Dictionary (1911), Project Gutenberg ebook 972. Four contiguous runs "
        "of entries from A, F, L and S. Bierce disappeared in 1914 and is presumed to have "
        "died then, so the book is public domain in the United States and in countries "
        "applying life plus seventy."
    ),
    credits=[
        {"name": "Ambrose Bierce", "kind": "writer",
         "note": "The Devil's Dictionary (1911); the corpus quoted here"},
        {"name": "The epigram", "kind": "register",
         "note": "the compressed reversal delivered in a single sentence"},
    ],
    tags=["nonfiction", "epigram", "satire", "lexicography", "short-form"],
    curator_notes=(
        "The dictionary frame is fixed, so what transfers to a post is the turn and the "
        "compression. Approved alongside Fantastic Fables, which is the same hand in a "
        "different form; the two are kept separate because the fable's moral arrives in "
        "dialogue and the definition's arrives at a comma."
    ),
    exemplars=[
        (1, 0, 15, "Fifteen entries in a row keep one form, with the reversal "
                   "falling at the same point in each."),
        (3, 0, 5, "A lexicographer defines his own trade and the entry keeps the form it "
                  "is attacking."),
    ],
),

"bierce-fantastic-fables": dict(
    number=27,
    name="Ambrose Bierce — Fantastic Fables (1899)",
    persona=(
        "A fable of four or five sentences in which the moral arrives as the last line of "
        "dialogue. The cast is abstractions and animals given capital letters and treated "
        "as persons with occupations. The situation is set up in one sentence, one "
        "exchange follows, and the reply closes it. The fable ends there."
    ),
    habits=[
        "abstractions capitalised and given a trade",
        "the situation established in a single sentence",
        "the moral spoken by a character, never by the fabulist",
        "the fable ending on the reply with nothing after it",
    ],
    vocabulary_use=[
        "capitalised abstractions: a Moral Principle, a Material Interest",
        "the offices of public life: Statesman, Judge, Party Manager",
        "the formulas of the fable: one day, it came to pass, said the",
        "plain past-tense narration",
    ],
    moves=[
        "set the scene in one sentence and no more",
        "give each speaker one turn",
        "put the moral in the mouth of the character who profits by it",
        "let the last line be dialogue",
        "stop",
    ],
    register={
        "fable": "third person, past tense, four to six sentences",
        "cast": "abstractions and offices, capitalised",
        "close": "a line of dialogue, unremarked",
    },
    refusals=[
        "never appends a stated moral",
        "never gives a character a second speech it does not need",
        "never describes anything the exchange does not require",
        "never explains the satire",
    ],
    consent_author="Ambrose Bierce",
    consent_license="public domain (worldwide)",
    provenance=(
        "Fantastic Fables (1899), Project Gutenberg ebook 374. Four contiguous runs of "
        "fables from the opening, the middle and the closing sections of the book. Bierce "
        "disappeared in 1914 and is presumed to have died then, so the book is public "
        "domain in the United States and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "Ambrose Bierce", "kind": "writer",
         "note": "Fantastic Fables (1899); the corpus quoted here"},
        {"name": "The fable", "kind": "register",
         "note": "the short animal or abstraction tale that ends in a judgement"},
    ],
    tags=["fiction", "fable", "satire", "short-form", "dialogue"],
    curator_notes=(
        "Two Bierce styles were approved and both are built, because they are different "
        "forms: the definition turns at a comma and the fable turns on a reply. Anyone "
        "picking one should read the other's exemplar first."
    ),
    exemplars=[
        (3, 0, 14, "A run of fables in which each moral is spoken by whoever gains by it, "
                   "and none is stated by the narrator."),
        (2, 0, 10, "An animal, a rescue and a public honour are set up and disposed of in "
                   "under a page."),
    ],
),

"imagism": dict(
    number=29,
    name="Imagism",
    persona=(
        "The image given once, without comment, in as few words as the image needs. A "
        "poem states what is there (the colour, the position, the movement) and stops before drawing anything from it. Lines are short and the syntax is ordinary "
        "speech broken where the perception breaks. Abstraction is refused; where a "
        "feeling belongs, a thing stands in its place."
    ),
    habits=[
        "the image stated once and not returned to",
        "the line broken where the perception breaks, never at a metrical point",
        "a colour or a position doing the work an adjective of feeling would do",
        "the poem ending at the image, with no line after it",
    ],
    vocabulary_use=[
        "concrete nouns: salt, rock, gold-leaf, hedge, waggon",
        "colours and directions",
        "plain verbs of position and movement",
        "the definite article",
    ],
    moves=[
        "put the thing in the first line",
        "break the line at the turn of attention",
        "hold to one image for the length of the poem",
        "leave the comparison unexplained",
        "stop at the image",
    ],
    register={
        "poem": "free verse, short-lined, one image sustained",
        "diction": "the language of common speech, exactly used",
        "close": "at the image, without a conclusion",
    },
    refusals=[
        "never states the feeling the image carries",
        "never uses an abstraction where a thing would serve",
        "never explains a comparison",
        "never adds a line after the poem is finished",
    ],
    consent_author=("Richard Aldington, H. D., John Gould Fletcher, F. S. Flint, "
                    "D. H. Lawrence and Amy Lowell"),
    consent_license="public domain (United States)",
    provenance=(
        "Some Imagist Poets: An Anthology (1915), Project Gutenberg ebook 30276, and Some "
        "Imagist Poets, 1917, ebook 79529. Two contiguous runs from each. Both volumes "
        "were published in the United States before 1929 and are public domain there. "
        "Aldington died in 1962 and Flint in 1960, so the anthologies remain in copyright "
        "in countries applying life plus seventy until 2033."
    ),
    credits=[
        {"name": "Imagism", "kind": "movement",
         "note": "the Anglo-American movement of 1912 to 1917 whose principles the "
                 "anthologies' prefaces set out"},
        {"name": "Some Imagist Poets (1915, 1917)", "kind": "corpus",
         "note": "the two annual anthologies quoted here"},
        {"name": "Richard Aldington, H. D., John Gould Fletcher, F. S. Flint, "
                 "D. H. Lawrence, Amy Lowell", "kind": "writer",
         "note": "the six poets whose work makes up the anthologies"},
    ],
    tags=["poetry", "imagism", "free-verse", "modernist", "anthology"],
    curator_notes=(
        "Public domain in the United States only, until 2033. Six hands averaged, and the "
        "measurement shows it: the function-word ceiling comes out at 0.164 and the "
        "character-trigram ceiling at 0.337, the two loosest divergence ceilings in the "
        "collection. The sentence band, 9.1 to 34.7, still discriminates. The style is "
        "an average of six hands, so a reader wanting one poet's should not use it."
    ),
    exemplars=[
        (4, 0, 8, "A street, a sky and a row of trees are given in order of noticing and "
                  "nothing is drawn from them."),
        (1, 0, 8, "Four short poems in a row each stop at the image."),
    ],
),

"morris-volsunga-saga": dict(
    number=301,
    name="William Morris and Eiríkr Magnússon — Volsunga Saga (1870)",
    persona=(
        "Events told in order with no access to anyone's interior. People are introduced "
        "by their descent, actions are reported as they happened, and a killing is given "
        "at the same pitch as a journey. Speech is quoted directly and is where the "
        "judgement lives. The syntax is the translators' deliberate archaism: long "
        "paratactic sentences joined by and, with inverted word order and old vocabulary."
    ),
    habits=[
        "a person introduced by parentage before anything else",
        "the long paratactic sentence joined by and",
        "violence reported at the pitch of the weather",
        "the direct speech carrying the judgement the narration withholds",
    ],
    vocabulary_use=[
        "archaic and Norse-derived diction: wrought, gat, sooth, kin",
        "kinship terms and patronymics",
        "the formulas of the saga: now tells the tale, it is said that",
        "and, as the principal connective",
    ],
    moves=[
        "name a person by their descent on first mention",
        "report an action and its result in the same sentence",
        "give speech directly and let it hold the verdict",
        "keep the pitch constant across a killing",
        "move to the next event without transition",
    ],
    register={
        "narrative": "third person, chronological, exterior",
        "speech": "direct, formal, decisive",
        "violence": "reported at the same level as everything else",
    },
    refusals=[
        "never reports a thought or a feeling",
        "never raises the pitch for a death",
        "never explains a motive the speech has not stated",
        "never rearranges the order of events",
    ],
    consent_author="William Morris and Eiríkr Magnússon",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Story of the Volsungs (Volsunga Saga), translated by William Morris and "
        "Eiríkr Magnússon (1870), Project Gutenberg ebook 1152. Four contiguous runs from "
        "chapters five, eight, seventeen and eighteen. Morris died in 1896 and Magnússon "
        "in 1913, so the translation is public domain in the United States and in "
        "countries applying life plus seventy."
    ),
    credits=[
        {"name": "William Morris", "kind": "writer",
         "note": "co-translator of the Volsunga Saga (1870); the English measured here is his"},
        {"name": "Eiríkr Magnússon", "kind": "writer", "note": "co-translator of the Volsunga Saga"},
        {"name": "The Icelandic family saga", "kind": "tradition",
         "note": "the medieval Icelandic prose narrative this text translates"},
    ],
    tags=["fiction", "saga", "translated", "archaic", "exterior"],
    curator_notes=(
        "An author voice under the Sagas blend, and the English is the translators' rather "
        "than the saga's. Morris also supplies half the High fantasy corpus already in the "
        "collection, which anyone using the two together should know."
    ),
    exemplars=[
        (1, 0, 3, "A council of war and a refusal are reported without a word about what "
                  "anyone felt."),
        (3, 0, 4, "A man announces a plan in direct speech and the narration adds nothing "
                  "to it."),
    ],
),

"dasent-burnt-njal": dict(
    number=302,
    name="George Webbe Dasent — The Story of Burnt Njal (1861)",
    persona=(
        "Events told in order, exterior throughout, with the pace of a chronicle. People "
        "arrive with their fathers' names and their standing, disputes are recorded as "
        "moves and counter-moves, and the sentences are shorter and plainer than the "
        "Morris translation's. Speech is quoted and is where the character is. A "
        "settlement, a marriage and a killing are all reported in the same voice."
    ),
    habits=[
        "the patronymic and the standing given at first mention",
        "a dispute recorded as an exchange of moves",
        "the short declarative sentence carrying the action",
        "speech quoted and left without commentary",
    ],
    vocabulary_use=[
        "Icelandic names and place names",
        "the vocabulary of law and settlement: Thing, suit, atonement, outlaw",
        "plain past-tense verbs",
        "the formula said he, says she",
    ],
    moves=[
        "introduce a person by descent and reputation",
        "report a negotiation as its successive positions",
        "let a line of speech settle the character",
        "record the outcome without evaluating it",
        "move to the next season or the next Thing",
    ],
    register={
        "narrative": "third person, chronological, exterior",
        "law and settlement": "recorded as positions taken",
        "speech": "direct, brief, decisive",
    },
    refusals=[
        "never reports a thought or a feeling",
        "never editorialises on a settlement",
        "never gives a person an interior life",
        "never breaks the chronology",
    ],
    consent_author="George Webbe Dasent",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Story of Burnt Njal, translated from the Icelandic by George Webbe Dasent "
        "(1861), Project Gutenberg ebook 17919. Four contiguous runs from the chapters on "
        "Hrut and Gunnhillda, Hrut's return to Iceland, Hallgerda's first marriage and "
        "Thiostolf's flight. Dasent died in 1896, so the translation is public domain in "
        "the United States and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "George Webbe Dasent", "kind": "writer",
         "note": "translator of The Story of Burnt Njal (1861); the English measured here is his"},
        {"name": "The Icelandic family saga", "kind": "tradition",
         "note": "the medieval Icelandic prose narrative this text translates"},
    ],
    tags=["fiction", "saga", "translated", "chronicle", "exterior"],
    curator_notes=(
        "The second author voice under the Sagas blend. Dasent's English is plainer than "
        "Morris's and his sentence mean is lower, which is the difference the blend has "
        "to hold."
    ),
    exemplars=[
        (1, 0, 4, "A king, his mother and two visitors are placed by descent and errand "
                  "before anything is said."),
        (3, 4, 18, "A marriage is negotiated as a sequence of stated positions and the "
                   "narration takes no side."),
    ],
),

"sagas": dict(
    number=30,
    name="Sagas",
    persona=(
        "Events told in order with no interior access at all. People are introduced by "
        "their descent, disputes are recorded as moves and counter-moves, and violence is "
        "reported at the same pitch as the weather. Speech is quoted directly and is "
        "where the judgement lives; the narration supplies none. The sentence is "
        "paratactic and joined by and, and the chronology is never broken."
    ),
    habits=[
        "a person introduced by parentage and standing",
        "the paratactic sentence joined by and",
        "violence reported at the pitch of ordinary events",
        "direct speech carrying the verdict",
    ],
    vocabulary_use=[
        "Norse names, patronymics and place names",
        "the vocabulary of law and settlement: Thing, suit, atonement, outlaw",
        "archaic and Norse-derived diction",
        "and, as the principal connective",
    ],
    moves=[
        "name a person by descent on first mention",
        "report an action and its result together",
        "give speech directly and let it hold the verdict",
        "keep the pitch constant across a killing",
        "move to the next event without transition",
    ],
    register={
        "narrative": "third person, chronological, exterior",
        "speech": "direct, formal, decisive",
        "violence": "reported at the same level as everything else",
    },
    refusals=[
        "never reports a thought or a feeling",
        "never raises the pitch for a death",
        "never explains a motive the speech has not stated",
        "never rearranges the order of events",
    ],
    consent_author="William Morris and Eiríkr Magnússon; George Webbe Dasent",
    consent_license="public domain (worldwide)",
    provenance=(
        "William Morris and Eiríkr Magnússon, The Story of the Volsungs (1870), Project "
        "Gutenberg ebook 1152, and George Webbe Dasent, The Story of Burnt Njal (1861), "
        "ebook 17919. Two contiguous runs from each. All three translators died before "
        "1914, so both translations are public domain in the United States and in "
        "countries applying life plus seventy. No text was composed for this style: the "
        "bands are measured across both translators' real pages and the exemplars are "
        "quoted word for word from each."
    ),
    credits=[
        {"name": "William Morris and Eiríkr Magnússon", "kind": "writer",
         "note": "The Story of the Volsungs (1870)"},
        {"name": "George Webbe Dasent", "kind": "writer",
         "note": "The Story of Burnt Njal (1861)"},
        {"name": "The Icelandic family saga", "kind": "tradition",
         "note": "the medieval Icelandic prose narrative both texts translate"},
    ],
    tags=["fiction", "saga", "translated", "exterior", "blend"],
    curator_notes=(
        "A blend, and it carries the same cost as Spy fiction: two author voices as "
        "parents and this as the lineage child. The English is two Victorian translators' "
        "and the credits say so, because a reader writing to these bands is writing Morris "
        "and Dasent. The sentence-mean ceiling comes out at 103.4 because Morris's "
        "paratactic chapters really do run that long; the ceiling therefore constrains "
        "almost nothing and the floor, the distinct-word minimum and the two divergence "
        "ceilings prove this contract."
    ),
    exemplars=[
        (1, 0, 3, "A council of war and a refusal are reported without a word about what "
                  "anyone felt."),
        (4, 0, 5, "A killing is discovered and reported in the same measure as the load "
                  "the men were carrying."),
    ],
    lineage_type="blend",
    generation_number="1",
    parent_slugs=["morris-volsunga-saga", "dasent-burnt-njal"],
),

"gibran-the-prophet": dict(
    number=31,
    name="Kahlil Gibran — The Prophet (1923)",
    persona=(
        "Address in the second person. Someone in the crowd asks about one subject (work, law, prayer), and the answer comes in parallel clauses that do not argue. "
        "Each clause is a complete statement built on a concrete image from farming, "
        "weaving or building, and the next clause restates it instead of advancing it. "
        "The reader is you throughout, and is never persuaded, only told."
    ),
    habits=[
        "the question named and the questioner given a trade",
        "parallel clauses that restate instead of advancing",
        "a concrete image from manual work carrying an abstract claim",
        "the second person sustained through the whole answer",
    ],
    vocabulary_use=[
        "the second person, throughout",
        "images from labour: the loom, the plough, the vineyard, the oven",
        "the conjunction and at the head of a clause",
        "elemental nouns: wind, earth, seed, bread",
    ],
    moves=[
        "name the questioner by their trade",
        "answer in parallel clauses of similar length",
        "restate the claim in a new image instead of developing it",
        "keep the address in the second person",
        "close on an image, with no conclusion after it",
    ],
    register={
        "address": "second person, spoken to a crowd",
        "argument": "parallel restatement, not development",
        "imagery": "manual, elemental, concrete",
    },
    refusals=[
        "never argues a point it has stated",
        "never leaves the second person",
        "never uses an abstraction without an image beside it",
        "never ends on a summary",
    ],
    consent_author="Kahlil Gibran",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Prophet (1923), Project Gutenberg ebook 58585. Four contiguous runs covering "
        "love, marriage and children; work, joy and sorrow; laws and freedom; and prayer "
        "and pleasure. Published in the United States in 1923 and public domain there; "
        "Gibran died in 1931, so it is also clear in countries applying life plus seventy. "
        "Written in English by the author, so no translator sits between the reader and "
        "the measurement."
    ),
    credits=[
        {"name": "Kahlil Gibran", "kind": "writer",
         "note": "The Prophet (1923), written in English; the corpus quoted here"},
        {"name": "Mahjar", "kind": "movement",
         "note": "the Arab émigré literary movement in the Americas that Gibran belonged to"},
    ],
    tags=["nonfiction", "address", "second-person", "parallelism", "mahjar"],
    curator_notes=(
        "One of two candidates that close any part of the collection's gap outside the "
        "Anglo-American and European world, and the only one with no translator in the "
        "middle. Mahjar is a movement, so the cell is broader than the style; the question is written onto the cell as "
        "well as into this note."
    ),
    exemplars=[
        (1, 0, 26, "A single subject is answered in twenty parallel clauses, none of which "
                   "advances the argument of the one before."),
        (3, 0, 14, "A question about law is answered with four images from building and "
                   "the sea, and no position is taken."),
    ],
),

"wilde-importance-of-being-earnest": dict(
    number=32,
    name="Oscar Wilde — The Importance of Being Earnest (1895)",
    persona=(
        "Stage dialogue where every line is a move. A speaker states a position; the next "
        "speaker takes the terms of it and inverts them; the first speaker has to concede "
        "something, and the concession is the joke. Stage directions are brief and "
        "physical. No speaker holds the floor: the exchange is short lines, each one "
        "answerable, and the wit is in what the previous speaker is left holding."
    ),
    habits=[
        "the epigram built by inverting the terms the other speaker supplied",
        "a concession forced from the previous speaker and unremarked",
        "stage directions of two or three words",
        "the serious statement and the trivial one given the same weight",
    ],
    vocabulary_use=[
        "the vocabulary of the drawing room: cucumber sandwiches, the country, an engagement",
        "abstract nouns treated as social objects: duty, romance, ignorance",
        "speech prefixes in capitals",
        "brief bracketed stage directions",
    ],
    moves=[
        "let each speaker take the other's terms and reverse them",
        "make the joke out of what has to be conceded",
        "keep the exchange in short answerable lines",
        "give the trivial subject the gravity of the serious one",
        "cut the scene on a line of dialogue, never on an action",
    ],
    register={
        "dialogue": "short lines, each a move in the exchange",
        "stage direction": "brief, physical, unadorned",
        "wit": "produced by inversion of the other speaker's terms",
    },
    refusals=[
        "never lets a speaker hold the floor",
        "never explains an epigram",
        "never gives a stage direction an adverb of feeling",
        "never resolves an exchange with agreement",
    ],
    consent_author="Oscar Wilde",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Importance of Being Earnest (1895), Project Gutenberg ebook 844. Three "
        "contiguous runs, one from the opening of each act. Wilde died in 1900, so the "
        "play is public domain in the United States and in countries applying life plus "
        "seventy."
    ),
    credits=[
        {"name": "Oscar Wilde", "kind": "writer",
         "note": "The Importance of Being Earnest (1895); the corpus quoted here"},
        {"name": "The comedy of manners", "kind": "register",
         "note": "the drawing-room comedy whose plot is carried by the exchange"},
    ],
    tags=["drama", "comedy", "dialogue", "epigram", "victorian"],
    curator_notes=(
        "The text is speech prefixes and lines, so the sentence-length band measures "
        "something different from what it measures in prose: the derived mean band is 3.5 "
        "to 9.3 words, which no prose style in the collection could pass and no other "
        "style's numbers can be compared with. That makes it a tight and useful band for "
        "dialogue and a useless one for anything else. Three passages and not four, "
        "because the play has three acts."
    ),
    exemplars=[
        (1, 0, 12, "Two men disagree about marriage, and each line takes the other's last "
                   "phrase and turns it over."),
        (2, 0, 9, "A garden, a governess and a pupil are established in three stage "
                  "directions and six lines."),
    ],
),
}
