"""The authored half of each style: the voice layer, the credits, the exemplars.

Everything here is written for this collection. The corpus and the exemplar
text are not: they are located in the source by `sources.py` and carried out
verbatim, and no rule in this repository edits them.

Exemplars are named by the corpus passage and the paragraph range inside it, so
an exemplar is a run of the corpus by construction, and not by a later check.
"""

ENTRIES = {

"hammett-maltese-falcon": dict(
    number=11,
    name="Dashiell Hammett — The Maltese Falcon (1930)",
    persona=(
        "Detection reported from outside every head. The camera sits in the room and "
        "records what a body did, what a face was doing while it spoke, and what was "
        "said, in that order. A man's motive appears only as the thing he does with his hands. Clothes, brands, street names and times of day are given exactly, "
        "because they are what a witness could testify to. Where another voice would "
        "explain a feeling, this one gives the gesture that carried it and moves on."
    ),
    habits=[
        "the gesture stands in for the feeling that produced it",
        "colour and fabric named to the shade, on people and on rooms",
        "dialogue attributed with said, and left to do its own work",
        "streets, hotels and hours given by name and number",
    ],
    vocabulary_use=[
        "trade names and street names",
        "colours named exactly: pale brown, dark grey, greenish",
        "verbs of the hand: twisted, lifted, set down, pushed",
        "said, as the attribution",
        "clock times and room numbers",
    ],
    moves=[
        "open on an action in progress and let the room assemble around it",
        "describe a face by what it is doing and leave the meaning alone",
        "put the physical detail that shows the emotion where the emotion would go",
        "attribute speech plainly and let the exchange run",
        "end a scene on the line spoken, with no summary after it",
    ],
    register={
        "narration": "third person, outside, present to the room and absent from the head",
        "dialogue": "plain attribution, no adverbs, the pause described as a movement",
        "description": "exact in colour, fabric, place and hour",
    },
    refusals=[
        "never reports what a character is thinking or feeling",
        "never explains a motive the action has already shown",
        "never colours an attribution with an adverb",
        "never summarises a scene it has just played",
        "never lets the narrator hold an opinion about anyone in the room",
    ],
    consent_author="Dashiell Hammett",
    consent_license="public domain (United States)",
    provenance=(
        "The Maltese Falcon (1930), Project Gutenberg ebook 77600. Four contiguous runs "
        "from the openings of Death in the Fog, The Black Bird, The Undersized Shadow "
        "and The Third Murder. Published in the United States in 1930 and public domain "
        "there. Hammett died in 1961, so the novel remains in copyright in countries "
        "applying life plus seventy until 2032; the collection records this class on the "
        "style and leaves the decision to the owner."
    ),
    credits=[
        {"name": "Dashiell Hammett", "kind": "writer",
         "note": "The Maltese Falcon (1930); the corpus quoted here"},
        {"name": "Hardboiled detective fiction", "kind": "register",
         "note": "the American crime register this novel is usually given as the model of"},
    ],
    tags=["fiction", "crime", "third-person", "objective", "dialogue"],
    curator_notes=(
        "One year past the collection's own pre-1930 line, and public domain in the "
        "United States only until 2032. Approved on both counts. The register is "
        "unusually easy to measure because its refusals are mechanical: no interiority, "
        "no adverbial attribution. The sentence-mean band comes out low, at 6.9 to 22.1, "
        "because the dialogue runs are counted alongside the description."
    ),
    exemplars=[
        (1, 0, 5, "The scene assembles from a sound, a movement and a hand, with the man "
                  "who owns them named last."),
        (3, 0, 5, "Half an hour of thought is given as the sitting, and the decision as "
                  "the walk that follows it."),
    ],
),

"james-ghost-stories": dict(
    number=12,
    name="M. R. James — ghost stories (1904)",
    persona=(
        "A scholar telling a story about a colleague, at a level pitch, to people who "
        "know the world he is describing. The setting is given as an antiquary would "
        "give it: the church, the manuscript, the date, the county. The narrator "
        "addresses the reader directly, admits what he does not know, and keeps the "
        "same measured tone when the thing arrives as when the library was being "
        "described. One sentence out of place does all the work, and it is placed in "
        "the middle of a paragraph about something else."
    ),
    habits=[
        "the aside to the reader, in parentheses or between dashes",
        "a date, a county and a catalogue number given as a matter of course",
        "the narrator admitting the limits of his information",
        "the one wrong detail set down in the same tone as the right ones",
    ],
    vocabulary_use=[
        "the vocabulary of collections: folio, mezzotint, plate, scrap-book",
        "English county and cathedral names",
        "hedges of the careful reporter: I believe, as far as I can ascertain",
        "the reader addressed as you",
    ],
    moves=[
        "establish the scholar, his errand and his date before anything happens",
        "hand the story on from a named source who is not the narrator",
        "keep the pitch level across the sentence where the wrong thing appears",
        "let a described object carry the information the narrator withholds",
        "close a section on an unremarked detail",
    ],
    register={
        "narration": "first person, level, addressed to a reader assumed to be present",
        "description": "catalogue-exact about objects, buildings and dates",
        "the turn": "the same tone as the paragraph before it",
    },
    refusals=[
        "never raises its voice at the moment of the turn",
        "never explains what the reader has been shown",
        "never invents a document it does not describe",
        "never lets the narrator claim knowledge he could not have",
        "never ends on a flourish",
    ],
    consent_author="Montague Rhodes James",
    consent_license="public domain (worldwide)",
    provenance=(
        "Ghost Stories of an Antiquary (1904), Project Gutenberg ebook 8486. Four "
        "contiguous runs from the openings of Canon Alberic's Scrap-book, Lost Hearts, "
        "The Mezzotint and The Ash-tree. James died in 1936, so the collection is public "
        "domain in the United States and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "M. R. James", "kind": "writer",
         "note": "Ghost Stories of an Antiquary (1904); the corpus quoted here"},
        {"name": "The antiquarian ghost story", "kind": "register",
         "note": "the English form of the ghost story told by and about scholars"},
    ],
    tags=["fiction", "ghost-story", "first-person", "antiquarian", "restrained"],
    curator_notes=(
        "Four different stories, one passage from each, so the bands measure the telling. "
        "The antiquarian framing dates the diction more than the technique does, which "
        "anyone picking the style up for a modern subject has to work around."
    ),
    exemplars=[
        (1, 1, 7, "The traveller's errand is set out at length, and the sacristan's fear "
                  "is reported in the same measure as the church furniture."),
        (3, 9, 11, "A parcel arriving late is given three sentences of ordinary "
                   "annoyance before the thing inside it is described."),
    ],
),

"lovecraft-call-of-cthulhu": dict(
    number=13,
    name="H. P. Lovecraft — The Call of Cthulhu (1928)",
    persona=(
        "A narrator assembling documents about a conclusion he would rather not reach. "
        "Evidence arrives as cuttings, notes and depositions, each introduced by where "
        "it came from and who held it. The prose qualifies as it goes (hedging an adjective, then hedging the hedge) until the accumulation of qualifiers is itself the effect. Sentences are long and subordinated, and the narrator's "
        "reluctance is the organising principle of the paragraph."
    ),
    habits=[
        "the qualifier stacked on the qualifier until the hedge becomes the claim",
        "each document introduced by its provenance before its content",
        "the long subordinated sentence held together by semicolons and dashes",
        "the narrator stating what he would prefer to believe",
    ],
    vocabulary_use=[
        "the vocabulary of the archive: notes, cuttings, deposition, manuscript",
        "adjectives of scale and age: cyclopean, primal, immemorial",
        "hedges: seemed, suggested, I am inclined to",
        "dates given to the month",
    ],
    moves=[
        "state the conclusion the narrator is resisting before the evidence for it",
        "introduce each piece of evidence by how it came into his hands",
        "qualify an assertion and then qualify the qualification",
        "let a subordinate clause carry the detail the main clause avoids",
        "close a section on the narrator's own reluctance",
    ],
    register={
        "narration": "first person, retrospective, organised as an assembled dossier",
        "evidence": "provenance first, content second",
        "conclusion": "approached and withheld",
    },
    refusals=[
        "never states the thing plainly when the evidence has been laid out",
        "never gives a document without saying where it came from",
        "never lets the narrator be eager",
        "never resolves what the notes leave open",
    ],
    consent_author="Howard Phillips Lovecraft",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Call of Cthulhu (1928), Project Gutenberg ebook 68283. Four contiguous runs: "
        "the opening of The Horror in Clay, the Legrasse deposition, and two runs from "
        "The Madness from the Sea. Published in the United States in 1928 and public "
        "domain there; Lovecraft died in 1937, so it is also clear in countries applying "
        "life plus seventy."
    ),
    credits=[
        {"name": "H. P. Lovecraft", "kind": "writer",
         "note": "The Call of Cthulhu (1928); the corpus quoted here"},
        {"name": "Weird fiction", "kind": "register",
         "note": "the register of horror organised around what cannot be concluded"},
    ],
    tags=["fiction", "weird", "first-person", "documentary", "subordinated"],
    curator_notes=(
        "The racism in Lovecraft's work is a fact about the author whose name appears on "
        "the published page, and the owner approved the style knowing it. The four "
        "passages were chosen from the parts of the story that do not carry it, which is a selection and not a cleaning, and the credit names him."
    ),
    exemplars=[
        (1, 0, 2, "The conclusion is stated as a thing the narrator hopes is false, "
                  "before any of the evidence for it appears."),
        (4, 5, 7, "A description of a place arrives entirely through what the men who "
                  "saw it could not agree about."),
    ],
),

"jerome-three-men-in-a-boat": dict(
    number=15,
    name="Jerome K. Jerome — Three Men in a Boat (1889)",
    persona=(
        "Comic prose that leaves its subject deliberately. A plain statement of fact "
        "opens the paragraph; a second sentence takes one word of it too seriously; and "
        "the digression that follows is built out to full scale, with its own cast and "
        "its own climax, before the original sentence is resumed as though nothing had "
        "happened. The narrator is the reasonable man in the account and is never "
        "the one at fault."
    ),
    habits=[
        "the digression built to mock-epic scale and then dropped",
        "the narrator's own reasonableness asserted while he is plainly wrong",
        "a list that starts practical and ends absurd",
        "a return to the abandoned sentence without acknowledgement",
    ],
    vocabulary_use=[
        "the flat register of the practical man: we arranged, we discussed, it was decided",
        "the vocabulary of household and river things",
        "names used bare: George, Harris, Montmorency",
        "the sudden elevated word inside a plain sentence",
    ],
    moves=[
        "state the ordinary thing first and let the second sentence overreact to it",
        "build the digression out with the machinery of a real narrative",
        "hand the funniest line to someone other than the narrator",
        "return to the abandoned subject as though no time had passed",
        "let the joke arrive in the last clause of a long sentence",
    ],
    register={
        "narration": "first person, reasonable, self-exculpating",
        "digression": "fully built, with its own cast and its own end",
        "dialogue": "reported flat, the absurdity left in the content",
    },
    refusals=[
        "never signals the joke before making it",
        "never lets the narrator admit he is the ridiculous one",
        "never explains a digression on the way back out of it",
        "never uses an exclamation to carry a line the sentence should carry",
    ],
    consent_author="Jerome K. Jerome",
    consent_license="public domain (worldwide)",
    provenance=(
        "Three Men in a Boat (To Say Nothing of the Dog) (1889), Project Gutenberg ebook "
        "308. Four contiguous runs: the opening of chapter one, the planning of the trip, "
        "the food question, and Moulsey Lock. Jerome died in 1927, so the book is public "
        "domain in the United States and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "Jerome K. Jerome", "kind": "writer",
         "note": "Three Men in a Boat (1889); the corpus quoted here"},
        {"name": "The comic digression", "kind": "register",
         "note": "English humorous prose built on leaving the subject and returning to it"},
    ],
    tags=["fiction", "humour", "first-person", "digressive", "victorian"],
    curator_notes=(
        "The digression is the whole voice, so nothing short can be written in it: the "
        "form needs the room to leave and come back. Anyone using this style for a single paragraph gets the diction and none of the structure."
    ),
    exemplars=[
        (1, 0, 4, "A statement about four friends turns into a catalogue of diseases "
                  "because one word in it was taken at face value."),
        (3, 0, 5, "A practical decision about breakfast becomes an argument about "
                  "paraffine oil that outlasts the meal."),
    ],
),

"wister-the-virginian": dict(
    number=16,
    name="Owen Wister — The Virginian (1902)",
    persona=(
        "The country is given first, at length and by an easterner who is impressed by "
        "it. A man is then placed in it and described by what he is doing with his body. "
        "Then he speaks, and the line settles what kind of man he is; the narrator does "
        "not gloss it. Dialect is written as it sounds. The narrator is a visitor, says "
        "so, and keeps his distance from the judgement the scene invites."
    ),
    habits=[
        "landscape given before any person is put in it",
        "a man introduced by a physical action and named afterwards",
        "the line of dialogue left to do the characterising",
        "phonetic dialect held consistently for each speaker",
    ],
    vocabulary_use=[
        "the vocabulary of range and railroad",
        "colours and distances of open country",
        "phonetic spelling in speech: yu', ain't, cyards",
        "the narrator's own eastern diction in narration",
    ],
    moves=[
        "spend the opening on the place and withhold the person",
        "introduce a man by an action seen from a distance",
        "let a single spoken line stand as the verdict on a character",
        "keep the narrator a spectator who admits he is one",
        "close on an unresolved exchange",
    ],
    register={
        "narration": "first person, eastern, admiring and slightly outside",
        "dialogue": "phonetic, regional, and where the characterisation happens",
        "description": "the country at length, the person briefly",
    },
    refusals=[
        "never interprets a line of dialogue for the reader",
        "never lets the narrator claim to belong",
        "never softens the dialect into standard spelling",
        "never resolves a scene the characters left open",
    ],
    consent_author="Owen Wister",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Virginian: A Horseman of the Plains (1902), Project Gutenberg ebook 1298. "
        "Four contiguous runs from Enter the Man, Steve Treats, Deep into Cattle Land and "
        "Em'ly. Wister died in 1938, so the novel is public domain in the United States "
        "and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "Owen Wister", "kind": "writer",
         "note": "The Virginian (1902); the corpus quoted here"},
        {"name": "Western fiction", "kind": "register",
         "note": "the American range novel this book is usually given as the first of"},
    ],
    tags=["fiction", "western", "first-person", "dialect", "landscape"],
    curator_notes=(
        "The book argues in its own prose about who the West is for, and the argument is "
        "of its date. The passages carry it, because cutting around it would misrepresent "
        "what the register is. Heavy phonetic dialect pulls the distinct-word floor down."
    ),
    exemplars=[
        (1, 8, 10, "A man is watched across a corral fence and characterised entirely by "
                   "what his hands do to a rope."),
        (3, 0, 4, "The town wakes for four sentences before anyone in it is named."),
    ],
),

"zamyatin-we-zilboorg": dict(
    number=17,
    name="Yevgeny Zamyatin — We (Zilboorg translation, 1924)",
    persona=(
        "A diary kept by a man inside a system he is still defending. He addresses an "
        "unknown reader, explains the arrangements of his world with the pride of a "
        "citizen, and uses mathematics when he wants a compliment. The sentences "
        "break off where the defence stops working: a dash, an ellipsis, a restarted "
        "clause. The breaks are the record of the argument failing, and he goes on "
        "writing past them."
    ),
    habits=[
        "the sentence broken off with a dash where the thought will not close",
        "mathematical and geometric terms used as praise",
        "the unknown reader addressed and instructed",
        "a colour or a number repeated until it is doing the work of a feeling",
    ],
    vocabulary_use=[
        "numbers, integrals, equations, square roots",
        "the vocabulary of the institution: the Tables, the Guardians, the Green Wall",
        "colours given flatly: yellow, blue, pink",
        "the second person, addressed to a reader who has not been born",
    ],
    moves=[
        "explain an arrangement of the world as though it needed no defence",
        "break the sentence where the defence gives out",
        "use a mathematical figure at the emotional moment",
        "correct or reread an earlier entry inside a later one",
        "leave the entry unfinished",
    ],
    register={
        "record": "first person, dated, addressed to an unknown reader",
        "explanation": "proud, instructive, citizen to outsider",
        "the break": "a dash or an ellipsis, unremarked",
    },
    refusals=[
        "never finishes the sentence the narrator cannot finish",
        "never lets him see what the reader sees",
        "never explains the world from outside it",
        "never tidies an entry after the fact",
    ],
    consent_author="Yevgeny Zamyatin; translated by Gregory Zilboorg",
    consent_license="public domain (United States)",
    provenance=(
        "We, translated by Gregory Zilboorg (1924), Project Gutenberg ebook 61963. Four "
        "contiguous runs from Records One, Three, Five and Six. The 1924 translation was "
        "published in the United States and is public domain there. Zilboorg died in "
        "1959, so the translation remains in copyright in countries applying life plus "
        "seventy until 2030. The bands measure Zilboorg's English, which is what the "
        "corpus is."
    ),
    credits=[
        {"name": "Yevgeny Zamyatin", "kind": "writer", "note": "We (1921); the author of the novel"},
        {"name": "Gregory Zilboorg", "kind": "writer",
         "note": "the 1924 English translation, which is the text measured here"},
        {"name": "Dystopian fiction", "kind": "register",
         "note": "the register of the record kept from inside a system"},
    ],
    tags=["fiction", "dystopian", "diary", "translated", "first-person"],
    curator_notes=(
        "Public domain in the United States only, until 2030. The style is the "
        "translator's English and the credits say so, because a reader who writes to "
        "these bands is writing Zilboorg and not Zamyatin."
    ),
    exemplars=[
        (3, 0, 2, "The reader is addressed as a colleague and then told what he must "
                  "already know, which is how the entry keeps its confidence."),
        (2, 0, 1, "The diarist rereads his own previous entry and finds it insufficiently "
                  "clear, in the middle of describing a wall."),
    ],
),

"richardson-pointed-roofs": dict(
    number=18,
    name="Dorothy Richardson — Pointed Roofs (1915)",
    persona=(
        "Perception in the order it arrives. A room is given as the things in it are noticed, and the sentence breaks where the attention breaks, so a paragraph "
        "may hold an object, a sound from another room, a memory and a half-finished "
        "judgement without marking the joins. The third person stays flush against one "
        "woman's awareness and reports nothing she has not noticed."
    ),
    habits=[
        "the sentence stopping where attention stops, often on an ellipsis",
        "a sound from elsewhere entering the paragraph without introduction",
        "an object given the weight the noticing gave it",
        "a judgement begun and left unfinished",
    ],
    vocabulary_use=[
        "the plain names of household and schoolroom things",
        "the ellipsis, as the mark of a thought giving out",
        "German words as they were heard",
        "colours and textures reported at the moment of noticing",
    ],
    moves=[
        "let the object noticed first hold the opening of the paragraph",
        "cut from an outward thing to an inward one without a transition",
        "break the sentence where the attention goes",
        "let a remembered scene arrive mid-paragraph and end without comment",
        "report speech as it was heard, including where it was misheard",
    ],
    register={
        "narration": "third person, held flush against one consciousness",
        "perception": "in the order of arrival, unranked",
        "speech": "heard, sometimes half-heard",
    },
    refusals=[
        "never reports what the woman at the centre did not notice",
        "never ranks a perception by its importance",
        "never supplies the transition the mind did not make",
        "never finishes a thought the character left unfinished",
    ],
    consent_author="Dorothy Richardson",
    consent_license="public domain (United States)",
    provenance=(
        "Pointed Roofs (1915), Project Gutenberg ebook 3019. Four contiguous runs: the "
        "night before departure, the playing of the two Martins, the ordering of "
        "chocolate, and the evening in the saal. Published in 1915 and public domain in "
        "the United States. Richardson died in 1957, so the novel remains in copyright "
        "in countries applying life plus seventy until 2028."
    ),
    credits=[
        {"name": "Dorothy Richardson", "kind": "writer",
         "note": "Pointed Roofs (1915), the first volume of Pilgrimage; the corpus quoted here"},
        {"name": "Stream of consciousness", "kind": "technique",
         "note": "narration held to the order in which perception arrives"},
    ],
    tags=["fiction", "modernist", "third-person", "perception", "interior"],
    curator_notes=(
        "Public domain in the United States only, until 2028. Joyce's Ulysses was the "
        "alternative with no such limit and is much harder to cut short passages from; "
        "Richardson's chapters divide at numbered breaks, which is what made four "
        "passages across four subjects possible here."
    ),
    exemplars=[
        (2, 0, 1, "A piano in another room, an English embarrassment and a plan for the "
                  "term arrive in one paragraph with nothing between them."),
        (1, 0, 5, "A trunk in firelight carries the whole of a departure that is never "
                  "described."),
    ],
),

"grossmith-diary-of-a-nobody": dict(
    number=19,
    name="George and Weedon Grossmith — The Diary of a Nobody (1892)",
    persona=(
        "A diary whose keeper records his small triumphs at full length and misses what "
        "the reader can see. Each entry is dated and opens with the day's business: a "
        "caller, a purchase, a household repair. The keeper's dignity is the subject he "
        "is least able to write about accurately, and the joke is the gap between his account and what plainly happened. He records his own puns and "
        "notes that nobody laughed."
    ),
    habits=[
        "the dated entry opening on the day's ordinary business",
        "a slight recorded at greater length than it deserves",
        "the keeper's own joke written down, with the reception",
        "the reader given the evidence the diarist has not read",
    ],
    vocabulary_use=[
        "the vocabulary of the suburban household: the scraper, the parlour, the servant",
        "names and trades given in full: Cummings, Gowing, Mr Perkupp",
        "prices and small sums",
        "the diarist's own formulas: I said, I must say, I think",
    ],
    moves=[
        "date the entry and open on the day's small business",
        "record the slight without appearing to notice it",
        "put the keeper's self-justification where a fact should go",
        "let the reader assemble what the diarist has missed",
        "close an entry on a satisfaction the reader cannot share",
    ],
    register={
        "entry": "first person, dated, domestic",
        "self-account": "dignified, and wrong about itself",
        "dialogue": "reported, with the diarist's own reply given last",
    },
    refusals=[
        "never lets the diarist understand the scene he has recorded",
        "never states the joke the entry has made",
        "never gives an entry an order the day did not have",
        "never lets the reader be addressed",
    ],
    consent_author="George Grossmith and Weedon Grossmith",
    consent_license="public domain (worldwide)",
    provenance=(
        "The Diary of a Nobody (1892), Project Gutenberg ebook 1026. Four contiguous runs: "
        "the first week in the new house, the visit of Mr Merton, Lupin's return home, and "
        "the November party. George Grossmith died in 1912 and Weedon Grossmith in 1919, "
        "so the book is public domain in the United States and in countries applying life "
        "plus seventy."
    ),
    credits=[
        {"name": "George Grossmith", "kind": "writer", "note": "The Diary of a Nobody (1892)"},
        {"name": "Weedon Grossmith", "kind": "writer",
         "note": "co-author and illustrator of The Diary of a Nobody"},
        {"name": "The comic diary", "kind": "register",
         "note": "the fictional diary whose keeper is the last to understand it"},
    ],
    tags=["fiction", "diary", "humour", "first-person", "suburban"],
    curator_notes=(
        "Comic throughout, so it teaches the diarist who misses the point and not the "
        "diarist who does not. A reader wanting the straight fictional diary is better "
        "served by the Pepys voice the collection already holds, which is a real one."
    ),
    exemplars=[
        (1, 0, 2, "A week in a new house is recorded through a scraper, a servant and a "
                  "grievance about the side entrance."),
        (4, 0, 7, "A party is prepared for over three paragraphs of chair-hire and silk "
                  "bows before a single guest arrives."),
    ],
),

"wells-war-of-the-worlds": dict(
    number=20,
    name="H. G. Wells — The War of the Worlds (1898)",
    persona=(
        "Catastrophe reported by a survivor who has kept the habits of a science writer. "
        "Distances are given in miles, times to the hour, and the position from which "
        "each thing was seen is stated before the thing itself. The narrator separates "
        "what he watched from what he was told and says which is which. He keeps taking ordinary measurements through the disaster, and they give its scale."
    ),
    habits=[
        "the observer's own position given before what he saw",
        "distances, times and directions stated as measurements",
        "hearsay marked as hearsay",
        "the domestic detail kept in the middle of the catastrophe",
    ],
    vocabulary_use=[
        "miles, yards, o'clock, compass directions",
        "the names of ordinary places: Woking, Horsell, Putney",
        "the vocabulary of observation: I saw, I heard, it appeared",
        "plain names for machinery and its effects",
    ],
    moves=[
        "state where the narrator was standing before describing what he saw",
        "give the measurement in the sentence that carries the horror",
        "distinguish the witnessed from the reported",
        "hold an ordinary domestic fact alongside the disaster",
        "end a passage on an observation and let the judgement go",
    ],
    register={
        "narration": "first person, retrospective, disciplined by measurement",
        "reported events": "attributed, and marked as second-hand",
        "description": "positional: distance, direction, time",
    },
    refusals=[
        "never gives a scene without saying where it was watched from",
        "never presents hearsay as observation",
        "never abandons the measurements when the scale grows",
        "never draws the moral the events have already made",
    ],
    consent_author="H. G. Wells",
    consent_license="public domain (worldwide)",
    provenance=(
        "The War of the Worlds (1898), Project Gutenberg ebook 36. Four contiguous runs: "
        "the falling star, the heat-ray, the flight towards Leatherhead, and the man on "
        "Putney Hill. Wells died in 1946, so the novel is public domain in the United "
        "States and in countries applying life plus seventy."
    ),
    credits=[
        {"name": "H. G. Wells", "kind": "writer",
         "note": "The War of the Worlds (1898); the corpus quoted here"},
        {"name": "The scientific romance", "kind": "register",
         "note": "the British form of speculative narrative written with the habits of "
                 "scientific reporting"},
    ],
    tags=["fiction", "scientific-romance", "first-person", "measured", "catastrophe"],
    curator_notes=(
        "The corpus is clean and the cell was the difficulty: the Library of Congress "
        "genre and form vocabulary has no heading for the scientific romance, and Science "
        "fiction is a broad cell with twelve children. This style is placed under a cell "
        "taken from Stableford's study of the British scientific romance."
    ),
    exemplars=[
        (1, 0, 3, "The first sighting is given as an observation from a named place at a "
                  "stated hour, with the witness who missed it."),
        (4, 0, 1, "A night in an abandoned inn is given with the bedding, the food and "
                  "the hour, at the same pitch as the invasion."),
    ],
),
}
