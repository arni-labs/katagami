"""Where each corpus passage comes from, span by span.

A passage is named by the two literal markers that bound it in the source file.
Nothing between them is altered, so a marker that has moved fails the build
rather than quietly carrying different text. `lib.clean` touches whitespace
only: it unwraps the hard line breaks the source file was typeset with, which
no band the checker computes can see.

Passages are chosen across subjects rather than only across pages. A band
derived from four passages about one thing measures that thing; the collection
learnt this from a hurricane and paid for it twice.
"""
import lib

SPANS = {
    # --- Batch 2: fiction ------------------------------------------------
    "hammett-maltese-falcon": ("pg77600.txt", [
        ("Death in the Fog", "A TELEPHONE-BELL rang in darkness.", "“Bad business.”"),
        ("The Black Bird", "MISS WONDERLY, in a belted green crêpe silk dress",
         "Now what are we going to tell the police?”"),
        ("The Undersized Shadow", "FOR half an hour after Joel Cairo had gone",
         "her stockings and slippers were Artoise."),
        ("The Third Murder", "SPADE went into the Hotel Sutter and telephoned",
         "“Oh, Sam, go!”"),
    ]),
    "james-ghost-stories": ("pg8486.txt", [
        ("Canon Alberic's Scrap-book", "In the spring of 1883 an Englishman arrived",
         "which runs thus:"),
        ("Lost Hearts", "It was, as far as I can ascertain, in September of the year 1811",
         "means disinclined to communicate her information."),
        ("The Mezzotint", "Some time ago I believe I had the pleasure", "second,—_ssex_."),
        ("The Ash-tree", "Everyone who has travelled over Eastern England",
         "he had no good explanation to offer of his visit."),
    ]),
    "lovecraft-call-of-cthulhu": ("pg68283.txt", [
        ("The Horror in Clay", "Theosophists have guessed at the awesome grandeur",
         "outbreaks of group folly or mania in the spring of 1925."),
        ("The Tale of Inspector Legrasse", "It must not be fancied that Inspector Legrasse",
         "now lying before the meeting."),
        ("The Madness from the Sea", "The matter of the cult still remained to fascinate me",
         "in a small carved shrine of\n    common pattern."),
        ("The Madness from the Sea, continued", "I now felt gnawing at my vitals",
         "after the first showed convexity."),
    ]),
    "buchan-thirty-nine-steps": ("pg558.txt", [
        ("The Man Who Died", "I returned from the City about three o’clock",
         "with whom I had passed the time of day on the stairs."),
        ("The Milkman Sets Out", "It took me an hour or two to think this out",
         "disinclined to go looking for trouble, if you understand me."),
        ("The Radical Candidate", "You may picture me driving that 40 h.p. car",
         "suddenly in the\ndarkness of a summer night."),
        ("The Spectacled Roadman", "I sat down on the very crest of the pass",
         "and bare hill bent, and the white highway."),
    ]),
    "childers-riddle-of-the-sands": ("pg2360.txt", [
        ("The Letter", "I have read of men who, when forced by their calling",
         "positively\nliked the dog-days in Whitehall."),
        ("Davies", "I dozed but fitfully, with a fretful sense of sore elbows",
         "over in the Frisian Islands.”"),
        ("The Missing Page", "I woke (on the 1st of October) with that dispiriting sensation",
         "emerging\nnoisily with a boiling kettle."),
        ("My Initiation", "The yacht lay with a very slight heel",
         "“Why is it so important to know that?”"),
    ]),
    "jerome-three-men-in-a-boat": ("pg308.txt", [
        ("Three invalids", "There were four of us—George, and William Samuel Harris",
         "more certain than before\nthat I had scarlet fever."),
        ("Plans discussed", "We pulled out the maps, and discussed plans.",
         "Camping out in\nrainy weather is not pleasant."),
        ("The food question", "Then we discussed the food question.",
         "and to light a bit of brown paper."),
        ("Moulsey Lock", "It was while passing through Moulsey Lock",
         "We did have\na lively time!"),
    ]),
    "wister-the-virginian": ("pg1298.txt", [
        ("Enter the man", "Some notable sight was drawing the passengers",
         "He\nhad by no means done with the old man."),
        ("Steve treats", "It was for several minutes, I suppose, that I stood drawing",
         "and remark, “It’s\nonly eleven.”"),
        ("Deep into cattle land", "Morning had been for some while astir in Medicine Bow",
         "he\npushed it too far."),
        ("Em'ly", "My personage was a hen, and she lived at the Sunk Creek Ranch",
         "let them trail."),
    ]),
    "zamyatin-we-zilboorg": ("pg61963.txt", [
        ("Record One", "This is merely a copy, word by word, of what was published",
         "we are only\nconsciously--"),
        ("Record Three", "I looked over all that I wrote down yesterday",
         "in the\nTables of Hours."),
        ("Record Five", "Again with you, my unknown reader",
         "catastrophes are\nnot possible any more."),
        ("Record Six", "I must repeat, I made it my duty to write concealing nothing",
         "tiny squares of windows."),
    ]),
    "richardson-pointed-roofs": ("pg3019.txt", [
        ("Her new Saratoga trunk", "Her new Saratoga trunk stood solid and gleaming", "staring into the fire."),
        ("Coffee and chocolate", "The playing of the two Martins brought back",
         "she remembered the cry, hand to mouth, of a\nLondon dustman."),
        ("Orders for schocolade", "Gertrude had taken everyone's choice between coffee", "\"French and\nEnglish governesses.\""),
        ("Tea was over", "Tea was over. Fraeulein decided against a walk", "humming Solveig's song."),
    ]),
    "grossmith-diary-of-a-nobody": ("pg1026.txt", [
        ("April, the new house", "My dear wife Carrie and I have just been a week",
         "I will keep it for another occasion."),
        ("April, Mr Merton", "APRIL 19.—Cummings called, bringing with him his friend Merton",
         "Carrie is very proud of my\nbeard."),
        ("August, Lupin comes home", "AUGUST 4.—The first post brought a nice letter",
         "he\nwould sit up and read a bit."),
        ("November, the party", "NOVEMBER 15.—A red-letter day.",
         "we were all shrieking with laughter."),
    ]),
    "wells-war-of-the-worlds": ("pg36.txt", [
        ("The falling star", "Then came the night of the first falling star.",
         "he linked the Thing with the flash\nupon Mars."),
        ("The heat-ray", "After the glimpse I had had of the Martians",
         "seemed to flicker out from it."),
        ("With the curate", "After getting this sudden lesson in the power",
         "worried me excessively."),
        ("The man on Putney Hill", "I spent that night in the inn that stands at the top",
         "stretching wide and far."),
    ]),

    # --- Batch 3: nonfiction prose --------------------------------------
    "london-people-of-the-abyss": ("pg1688.txt", [
        ("Johnny Upright", "I shall not give you the address of Johnny Upright",
         "of which I might be\nguilty."),
        ("The spike", "First of all, I must beg forgiveness of my body",
         "poor devils on that “lay.”"),
        ("Carrying the banner", "“To carry the banner” means to walk the streets all night",
         "The bobbies couldn’t find us there.”"),
        ("Hops and hoppers", "So far has the divorcement of the worker from the soil",
         "because they cannot afford more."),
    ]),
    "grant-personal-memoirs": ("pg4367.txt", [
        ("Ancestry and boyhood", "My family is American, and has been for generations",
         "with less than twenty men."),
        ("Buena Vista", "The Mexican war was a political war",
         "and several were personally hostile."),
        ("Ordered to the Pacific coast", "My experience in the Mexican war was of great advantage",
         "especially for the tropics in July."),
        ("Belmont", "From the occupation of Paducah up to the early part of November", "to protect our\ntransports."),
    ]),
    "douglass-narrative": ("pg23.txt", [
        ("Tuckahoe", "I was born in Tuckahoe, near Hillsborough",
         "the double relation of\nmaster and father."),
        ("Overseers", "Mr. Hopkins remained but a short time in the office of overseer",
         "had not been stained with his brother’s blood."),
        ("Master Hugh's family", "I lived in Master Hugh’s family about seven years.",
         "hope that something would\noccur by which I might be free."),
        ("Covey", "I had left Master Thomas’s house, and went to live with Mr. Covey",
         "midnight often caught us in the field binding\nblades."),
    ]),
    "hazlitt-table-talk": ("pg3020.txt", [
        ("On the pleasure of painting", "There is a pleasure in painting which none but painters",
         "a\nmore particular explanation of the subject:--"),
        ("On the past and future", "I have naturally but little imagination",
         "the\nglowing image of some bright reality,"),
        ("Character of Cobbett", "People have about as substantial an idea of Cobbett",
         "however, be _caviare_ to the Whigs.(1)"),
        ("On the ignorance of the learned", "The description of persons who have the fewest ideas",
         "at school or at the university."),
    ]),
    "thoreau-walden": ("pg205.txt", [
        ("Reading", "With a little more deliberation in the choice of their pursuits",
         "and a few scholars only are still reading it."),
        ("Sounds", "But while we are confined to books",
         "because\nthey once stood in their midst."),
        ("Solitude", "This is a delicious evening, when the whole body is one sense",
         "could ever be strange to me again.—"),
        ("The pond in winter", "An old man who used to frequent this pond",
         "and I can\nalmost say, Walden, is it you?"),
    ]),

    # --- Batch 4: short forms -------------------------------------------
    "bierce-devils-dictionary": ("pg972.txt", [
        ("A", "ACQUAINTANCE, n.  A person whom we know well enough",
         "An offering burnt with an unholy flame."),
        ("F", "FOLLY, n.  That \"gift and faculty divine\"",
         "the manifold temptations of too\ngreat wealth.\""),
        ("L", "LEXICOGRAPHER, n.  A pestilent fellow",
         "unable to supply us with the Strasbourg _pate_."),
        ("S", "SCRAP-BOOK, n.  A book that is commonly edited by a fool.",
         "sunk them all in the deepest part of the Atlantic."),
    ]),
    "bierce-fantastic-fables": ("pg374.txt", [
        ("The moral principle", "A Moral Principle met a Material Interest",
         "The King signed to the Great Head Factotum to approach."),
        ("The opossum of the future", "One day an Opossum who had gone to sleep",
         "intervened in the interest of\npeace."),
        ("The party manager", "\"How much will you pay for a nomination to office?\"",
         "the reptiles all escaped into the\nstreet."),
        ("The mother and the child", "\"Indeed!\" said the Mother.",
         "the\ntwo the Hawk was calamitously defeated."),
    ]),
    "whitman-leaves-of-grass": ("pg1322.txt", [
        ("Song of the Open Road", "Afoot and light-hearted I take to the open road",
         "he or she shall be blessed and shall bless me."),
        ("Crossing Brooklyn Ferry", "Flood-tide below me! I see you face to face!",
         "and down into the clefts of streets."),
        ("Song of the Broad-Axe", "Weapon shapely, naked, wan",
         "The power of personality just or unjust."),
        ("Out of the Cradle", "Out of the cradle endlessly rocking",
         "O moon do not keep her from me any longer."),
    ]),
    "imagism": (None, [
        ("Some Imagist Poets (1915)", "pg30276.txt", "I don't believe in God.",
         "I cover you with my net.\n  What are you--banded one?"),
        ("Some Imagist Poets (1915), continued", "pg30276.txt", "Soon they will fall;",
         "and a secret in their smell\n  I have forgotten."),
        ("Some Imagist Poets, 1917", "pg79529.txt", "As I stood among the bare rocks",
         "I who had lived unconscious,\nwho was almost forgot."),
        ("Some Imagist Poets, 1917, continued", "pg79529.txt", "Under the soft grey windswept sky",
         "with the primæval fear behind them and among them...."),
    ]),

    # --- Batch 5 ---------------------------------------------------------
    "morris-volsunga-saga": ("pg1152.txt", [
        ("Of the slaying of King Volsung", "Now tells the tale of King Volsung and his sons",
         "and thereof she had her bane."),
        ("The death of King Siggeir", "The tale tells that Sigmund thought Sinfjotli over young",
         "and went out into the porch to them and said--"),
        ("Of Sigurd's avenging of Sigmund", "Now Sigurd went to the kings, and spake thus--",
         "and the more part of their folk withal."),
        ("Of the slaying of the worm Fafnir", "Now Sigurd and Regin ride up the heath",
         "who are\ndaughters of Dvalin.\""),
    ]),
    "dasent-burnt-njal": ("pg17919.txt", [
        ("Hrut and Gunnhillda", "At that time Harold Grayfell reigned in Norway",
         "but then come to me.\""),
        ("Hrut sails out to Iceland", "Hrut stayed with the king that winter",
         "Then Hrut said to his wife--"),
        ("Thorwald gets Hallgerda to wife", "Now, it must be told how Hallgerda",
         "said Hauskuld, and rode off home."),
        ("Thiostolf's flight", "While this was going on, Thorwald's men came down",
         "where there's good store of it.\""),
    ]),
    "gibran-the-prophet": ("pg58585.txt", [
        ("Love, marriage, children", "Then said Almitra, Speak to us of",
         "though they quiver with the same music."),
        ("Work, joy and sorrow", "Then a ploughman said, Speak",
         "and the voices of the night."),
        ("Laws and freedom", "Then a lawyer said, But what of our",
         "upon your own forehead."),
        ("Prayer and pleasure", "Then a priestess said, Speak to us",
         "let\nthem be comforted."),
    ]),
    "wilde-importance-of-being-earnest": ("pg844.txt", [
        ("First act", "Morning-room in Algernon’s flat in Half-Moon Street.",
         "Gwendolen is devoted to bread and butter."),
        ("Second act", "Garden at the Manor House.",
         "has not returned from town yet?"),
        ("Third act", "Morning-room at the Manor House.",
         "as regards Algernon! . . .\nAlgernon!"),
    ]),
}


# Two blends. A blend's corpus is drawn from the author voices it names as
# parents, two passages from each, so its bands are derived from the same text
# its parents were measured on rather than from anything written for it.
BLENDS = {
    "spy-fiction": [("buchan-thirty-nine-steps", 0), ("buchan-thirty-nine-steps", 3),
                    ("childers-riddle-of-the-sands", 1), ("childers-riddle-of-the-sands", 3)],
    "sagas": [("morris-volsunga-saga", 0), ("morris-volsunga-saga", 2),
              ("dasent-burnt-njal", 1), ("dasent-burnt-njal", 3)],
}


def corpus(slug):
    """The passages of one style, verbatim, in order."""
    if slug in BLENDS:
        return [corpus(parent)[index] for parent, index in BLENDS[slug]]
    path, spans = SPANS[slug]
    out = []
    if path is None:
        for label, source, first, last in spans:
            text = lib.gutenberg_body(lib.load(source))
            out.append((label, lib.clean(lib.span(text, first, last))))
        return out
    text = lib.gutenberg_body(lib.load(path))
    for label, first, last in spans:
        out.append((label, lib.clean(lib.span(text, first, last))))
    return out
