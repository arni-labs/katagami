"""The authored layer for the federal register built in this run."""

ENTRIES = {

"ntsb-accident-reports": dict(
    number=1,
    name="National Transportation Safety Board — accident reports (2018-2021)",
    persona=(
        "An accident reconstructed in sequence by the people who went and looked. The "
        "first sentence gives the date, the clock time with its zone, the vehicle by "
        "type and registration, and what happened to it. Every fact after that carries "
        "the instrument or record it came from: a recorder, a survey, a weight ticket, "
        "an interview. Where the evidence stops the writing says so. The account ends in "
        "a probable cause the Board signs, phrased as the failure of a named party to do "
        "a named thing."
    ),
    habits=[
        "the date, the local time with its zone and the vehicle identifier in the first sentence",
        "a measurement given with the instrument or record it came from",
        "the limits of what was established stated as plainly as what was",
        "the probable cause phrased as a named party's failure to do a named thing",
    ],
    vocabulary_use=[
        "clock times with the zone, and dates in full",
        "registrations, mileposts, hull and train symbols",
        "units given every time: knots, feet, mph, degrees, pounds",
        "the verbs of investigation: determined, established, indicated, recorded",
        "the passive where the actor is the investigation itself",
    ],
    moves=[
        "open on the date, the time, the vehicle and the outcome",
        "give each fact with the record that supports it",
        "run the sequence forward in clock time without skipping",
        "state what the evidence did not establish",
        "close on the probable cause and what contributed to it",
    ],
    register={
        "narrative": "third person, chronological, sourced fact by fact",
        "findings": "declarative, each traceable to the evidence above it",
        "probable cause": "one sentence naming the party and the failure",
    },
    refusals=[
        "never assigns fault or blame",
        "never gives a measurement without its unit",
        "never carries a fact the investigation did not establish",
        "never speculates past what the recorders and the survey support",
        "never uses an adjective where a number exists",
    ],
    consent_author=("National Transportation Safety Board; the investigators who signed the "
                    "aviation, highway, marine and railroad reports quoted here"),
    consent_license="public domain (17 U.S.C. 105)",
    provenance=(
        "Four NTSB accident reports at ntsb.gov, one from each of four modes: AAR-21/02, "
        "the parachute jump flight at Dillingham Airfield, Hawaii (2019); HAR-21/01, the "
        "tour bus rollover on Utah State Route 12 (2019); MAR-21/01, the Genesis River and "
        "Voyager collision in the Houston Ship Channel (2019); and RAR-21/01, the BNSF "
        "collision in Crozier Canyon, Arizona (2018). One contiguous run of the accident "
        "narrative from each. Works of the United States government and outside copyright "
        "under 17 U.S.C. 105. Four modes rather than four aviation reports, so the derived "
        "bands measure the register instead of one industry's vocabulary. Extraction: the "
        "reports print, below the running prose on each page, the footnote block for that "
        "page and a running header naming the report series, with figure and table "
        "captions between paragraphs, and they mark footnote references with a superscript "
        "digit the text layer renders after the sentence's full stop. All of that is "
        "apparatus and is not carried; no word of the running prose is changed, which the "
        "build proves by checking that each passage is an in-order subsequence of its "
        "source and by listing every token it removed."
    ),
    credits=[
        {"name": "National Transportation Safety Board", "kind": "corpus",
         "note": "aviation, highway, marine and railroad accident reports of 2021; works of "
                 "the United States government"},
        {"name": "Accident reports", "kind": "register",
         "note": "the investigative report that reconstructs an accident and states a "
                 "probable cause"},
    ],
    tags=["nonfiction", "investigation", "technical", "institutional", "modern"],
    curator_notes=(
        "The one candidate from the modern federal batch that reached the corpus standard "
        "in this run. Its character-trigram ceiling comes out at 0.325, the loosest in the "
        "collection after Imagism, because four transport modes bring four vocabularies; "
        "that width is the price of sampling across subjects and the alternative was a "
        "band that measured aviation. It shares vocabulary with the FAA handbook already "
        "in the collection, and the two separate on the bands: the handbook instructs at a "
        "mean of 9.7 to 27.8 words and this reconstructs at 13.8 to 36.7."
    ),
    exemplars=[
        (1, 0, 4, "A flight is given as a date, a time with its zone, a registration and an "
                  "outcome before anyone in it is described."),
        (4, 1, 4, "A train is given by car count, length, weight and grade, and the cause "
                  "arrives as a named failure of a named party."),
    ],
),
}
