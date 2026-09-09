#!/usr/bin/env python3
"""Build the placement payload: the cells that hold the twenty-five new styles.

Every revision carries `baseHash`, the sha256 of the document as this run read
it, so a cell another run has touched since is refused rather than overwritten.
The two new cells are minted from a source that names the tradition, and each
is read before it is used: the claims in their scope text appear in the fetched
pages, and the Library of Congress record is the one that states the parent.
"""
import hashlib
import json
import os
import urllib.parse
import urllib.request

ORIGIN = "https://openpaw-production.up.railway.app"
BUILD = os.path.dirname(os.path.abspath(__file__))

# Which cell holds which style, and what the record's own credits say. The
# explanation is checkable against both the record and the cited page.
PLACE = {
    "hardboiled": [("hammett-maltese-falcon",
                    'The record\'s credits name the register "Hardboiled detective fiction" and '
                    "the corpus is four passages of The Maltese Falcon (1930).", ["wp-hardboiled"])],
    "ghost-stories": [("james-ghost-stories",
                       "The record's credits name the antiquarian ghost story and the corpus is "
                       "four stories from Ghost Stories of an Antiquary (1904).",
                       ["wp-ghost-story"])],
    "weird-fiction": [("lovecraft-call-of-cthulhu",
                       'The record\'s credits name the register "Weird fiction" and the corpus is '
                       "four runs of The Call of Cthulhu (1928).", ["wp-weird-fiction"])],
    "spy-fiction": [
        ("spy-fiction",
         'The record\'s credits name the register "Spy fiction" and its corpus is two '
         "passages each from Buchan and Childers; it is the lineage child of the two "
         "author voices below.", ["wp-spy-fiction"]),
        ("buchan-thirty-nine-steps",
         "Built from The Thirty-Nine Steps (1915) and credited to Buchan; one of the two "
         "author voices the blend above names as parents.", ["wp-spy-fiction"]),
        ("childers-riddle-of-the-sands",
         "Built from The Riddle of the Sands (1903) and credited to Childers; the other "
         "parent of the blend above.", ["wp-spy-fiction"]),
    ],
    "humorous-fiction": [("jerome-three-men-in-a-boat",
                          "The record's credits name the comic digression and the corpus is four "
                          "runs of Three Men in a Boat (1889).", ["lcgft-humorous-fiction"])],
    "western-fiction": [("wister-the-virginian",
                         'The record\'s credits name the register "Western fiction" and the corpus '
                         "is four runs of The Virginian (1902).", ["wp-western-fiction"])],
    "dystopian-fiction": [("zamyatin-we-zilboorg",
                           'The record\'s credits name the register "Dystopian fiction" and the '
                           "corpus is four Records of Zilboorg's 1924 translation of We.",
                           ["lcgft-dystopian-fiction"])],
    "stream-of-consciousness-fiction": [("richardson-pointed-roofs",
                                         "The record's credits name stream of consciousness as its "
                                         "technique and the corpus is four runs of Pointed Roofs "
                                         "(1915).", ["wp-stream-of-consciousness"])],
    "diary-fiction": [("grossmith-diary-of-a-nobody",
                       "The record's credits name the comic diary and the corpus is four runs of "
                       "The Diary of a Nobody (1892).", ["lcgft-diary-fiction"])],
    "narrative-journalism": [("london-people-of-the-abyss",
                              "The record's credits name immersion reporting and the corpus is "
                              "four runs of The People of the Abyss (1903).",
                              ["wp-narrative-journalism"])],
    "memoirs": [("grant-personal-memoirs",
                 "The record's credits name the military memoir and the corpus is four runs of "
                 "Grant's Personal Memoirs (1885).", ["wp-memoir"])],
    "familiar-essay": [("hazlitt-table-talk",
                        'The record\'s credits name the register "Familiar essay" and the corpus '
                        "is four essays from Table-Talk (1821).", ["wp-essay-familiar"])],
    "nature-writing": [("thoreau-walden",
                        'The record\'s credits name the register "Nature writing" and the corpus '
                        "is four runs of Walden (1854).", ["wp-nature-writing"])],
    "epigrams": [("bierce-devils-dictionary",
                  "The record's credits name the epigram and the corpus is four runs of entries "
                  "from The Devil's Dictionary (1911).", ["wp-epigram"])],
    "fables": [("bierce-fantastic-fables",
                'The record\'s credits name the register "Fable" and the corpus is four runs of '
                "Fantastic Fables (1899).", ["wp-fable"])],
    "imagism": [("imagism",
                 'The record\'s credits name the movement "Imagism" and the corpus is four runs '
                 "of the Some Imagist Poets anthologies of 1915 and 1917.", ["wp-imagism"])],
    "sagas": [
        ("sagas",
         "The record's credits name the Icelandic family saga and its corpus is two "
         "passages each from the Morris and Dasent translations; it is the lineage child "
         "of the two author voices below.", ["wp-sagas-of-icelanders"]),
        ("morris-volsunga-saga",
         "Built from the Morris and Magnusson translation of the Volsunga Saga (1870) and "
         "credited to the translators; one parent of the blend above.",
         ["wp-sagas-of-icelanders"]),
        ("dasent-burnt-njal",
         "Built from Dasent's translation of The Story of Burnt Njal (1861) and credited "
         "to the translator; the other parent of the blend above.",
         ["wp-sagas-of-icelanders"]),
    ],
    "mahjar": [("gibran-the-prophet",
                'The record\'s credits name the movement "Mahjar" and the corpus is four runs '
                "of The Prophet (1923), which Gibran wrote in English.", ["wp-mahjar"])],
    "comedies-of-manners": [("wilde-importance-of-being-earnest",
                             "The record's credits name the comedy of manners and the corpus is "
                             "the opening of each act of The Importance of Being Earnest (1895).",
                             ["wp-comedy-of-manners"])],
}

# Questions a pass writes onto the cell a reader would look at, rather than only
# into a report.
QUESTIONS = {
    "mahjar": ["Mahjar is a movement and the writing style placed here is one register "
               "inside it, the second-person address of The Prophet. Whether the movement "
               "needs a narrower cell under it for that register, and what body of work "
               "would stand behind such a cell, is unsettled."],
    "nature-writing": ["Two writing styles now sit on this branch: Walden here and the "
                       "Darwin and White voices on the child cell Field notes. Whether "
                       "Walden belongs on a narrower cell of its own, and what would name "
                       "one, is unsettled; the collection declined to mint a leaf for a "
                       "single book."],
    "free-verse": ["This cell holds no writing style. Whitman's Leaves of Grass was read "
                   "as a corpus for one and the derived sentence-length band came out at "
                   "14.2 to 304.8 words, because free verse does not punctuate sentences "
                   "the way prose does, so the band admitted any prose and proved nothing. "
                   "A free-verse style needs a measurement the current bands schema does "
                   "not have."],
}

NEW = {
    "scientific-romance": {
        "name": "Scientific romance",
        "description": (
            "The British form of speculative fiction of the late nineteenth century and "
            "the first half of the twentieth, named in hindsight rather than by the writers "
            "themselves. H. G. Wells's early novels became its exemplars, and the term was "
            "secured by his own 1933 omnibus The Scientific Romances of H.G. Wells. It is "
            "marked off from American genre science fiction by long evolutionary "
            "perspectives, a pessimism about where civilisation is going, and a narrator "
            "who observes and broods rather than acts. Brian Stableford's Scientific "
            "Romance in Britain 1890-1950 (1985) is the study the term's modern use rests on."
        ),
        "maps": [{"map": "writing",
                  "explanation": "A named form of prose fiction with its own canon, its own "
                                 "period and a book-length critical study.",
                  "sourceIds": ["sfe-scientific-romance"]}],
        "broader": [{"cellId": "science-fiction",
                     "explanation": "The Encyclopedia of Science Fiction defines it as a form of "
                                    "sf found in the UK from the late nineteenth century onward, "
                                    "so this cell is placed one level below Science fiction on "
                                    "that definition. LCGFT has no heading for it.",
                     "sourceIds": ["sfe-scientific-romance"]}],
        "sources": [
            {"id": "sfe-scientific-romance",
             "title": "Scientific Romance — The Encyclopedia of Science Fiction",
             "url": "https://sf-encyclopedia.com/entry/scientific_romance"},
            {"id": "wp-scientific-romance", "title": "Scientific romance — Wikipedia",
             "url": "https://en.wikipedia.org/wiki/Scientific_romance"},
        ],
        "questions": ["Wells's later work and the between-the-wars authors the Encyclopedia "
                      "of Science Fiction lists under this term have no cells yet; whether any "
                      "of them needs one is unread."],
    },
    "slave-narratives": {
        "name": "Slave narratives",
        "description": (
            "First-person accounts of enslavement written or dictated by the people who "
            "were enslaved, published in the United States and Britain mostly between the "
            "1770s and the end of the American Civil War, and written to be read as "
            "evidence by an audience deciding a public question. The narrative runs in "
            "chronology, names people and places, and states what the writer knows and "
            "what was kept from them."
        ),
        "maps": [{"map": "writing",
                  "explanation": "The Library of Congress genre and form vocabulary carries it "
                                 "as a heading for works of this kind.",
                  "sourceIds": ["lcgft-slave-narratives"]}],
        "broader": [{"cellId": "autobiographies",
                     "explanation": "The Library of Congress files Slave narratives under "
                                    "Autobiographies.",
                     "sourceIds": ["lcgft-slave-narratives"]}],
        "sources": [
            {"id": "lcgft-slave-narratives", "title": "Slave narratives — LCGFT gf2014026176",
             "url": "https://id.loc.gov/authorities/genreForms/gf2014026176"},
            {"id": "wp-slave-narrative", "title": "Slave narrative — Wikipedia",
             "url": "https://en.wikipedia.org/wiki/Slave_narrative"},
        ],
        "questions": ["Whether the American slave narrative and the British abolitionist "
                      "narrative are one practice or two is unread; the Library of Congress "
                      "heading covers both."],
    },
}

NEW_PLACE = {
    "scientific-romance": [("wells-war-of-the-worlds",
                            "The record's credits name the scientific romance and the corpus is "
                            "four runs of The War of the Worlds (1898), one of the novels the "
                            "Encyclopedia of Science Fiction gives as the form's exemplars.",
                            ["sfe-scientific-romance"])],
    "slave-narratives": [("douglass-narrative",
                          "The record's credits name the slave narrative and the corpus is four "
                          "chapters of Douglass's Narrative of the Life (1845).",
                          ["lcgft-slave-narratives"])],
}


def read_all(path):
    key = os.environ["TEMPER_API_KEY"]
    rows, url = [], ORIGIN + path
    while url:
        request = urllib.request.Request(
            url, headers={"Authorization": f"Bearer {key}", "X-Tenant-Id": "default"})
        page = json.load(urllib.request.urlopen(request, timeout=180))
        rows += page["value"]
        following = page.get("@odata.nextLink")
        url = urllib.parse.urljoin(ORIGIN + "/tdata/", following) if following else None
    return rows


def main():
    made = {s["slug"]: s["id"] for s in json.load(open(f"{BUILD}/created-W1.json"))["created"]}
    cells = {}
    for row in read_all("/tdata/EncyclopediaCells?$top=500"):
        fields = row["fields"]
        document = fields.get("document") or ""
        cells[row["entity_id"]] = {
            "document": document, "status": fields["Status"],
            "attested": str(fields.get("document_validated")).lower() == "true"
                        and hashlib.sha256(document.encode("utf-8")).hexdigest() == fields.get("document_hash"),
            "hash": hashlib.sha256(document.encode("utf-8")).hexdigest(),
        }

    payload, number = [], 0
    for cell_id, spec in NEW.items():
        assert cell_id not in cells, f"{cell_id} already exists"
        number += 1
        payload.append({
            "number": number, "name": spec["name"], "id": cell_id, "new": True, "version": 3,
            "description": spec["description"], "provenance": {"basis": "cited"},
            "maps": spec["maps"], "sources": spec["sources"], "broader": spec["broader"],
            "relations": [], "questions": spec["questions"],
            "manifestations": [
                {"entitySet": "WritingStyles", "entityId": made[slug],
                 "explanation": note, "sourceIds": ids}
                for slug, note, ids in NEW_PLACE[cell_id]],
            "studies": [],
        })

    for cell_id in list(PLACE) + [c for c in QUESTIONS if c not in PLACE]:
        held = cells.get(cell_id)
        assert held, f"{cell_id} is not on the deployment"
        assert held["status"] == "Draft", f"{cell_id} is {held['status']}"
        assert held["attested"], f"{cell_id} is not attested; it must not be revised blind"
        document = json.loads(held["document"])
        known = {s["id"] for s in document["sources"]}
        for slug, note, ids in PLACE.get(cell_id, []):
            for source in ids:
                assert source in known, f"{cell_id} has no source {source}"
            assert not any(m["entityId"] == made[slug] for m in document.get("manifestations", [])), \
                f"{cell_id} already names {slug}"
            document.setdefault("manifestations", []).append(
                {"entitySet": "WritingStyles", "entityId": made[slug],
                 "explanation": note, "sourceIds": ids})
        if cell_id in QUESTIONS:
            document.setdefault("questions", [])
            for question in QUESTIONS[cell_id]:
                if question not in document["questions"]:
                    document["questions"].append(question)
        number += 1
        entry = {"number": number, "name": document["name"], "id": cell_id, "new": False,
                 "version": 3, "baseHash": held["hash"]}
        entry.update({k: v for k, v in document.items() if k != "version"})
        entry["version"] = 3
        payload.append(entry)

    out = {
        "batch": "W1-PLACE",
        "approval": ("Owner approval of all five batches of WRITING-STYLE-CANDIDATES.md "
                     "(ARN-118, 2026-09-09), which names the cell each candidate attaches to and "
                     "the cells that would have to be minted. Draft only; every mint numbered and "
                     "reported."),
        "allowedOperation": ("Define private Draft EncyclopediaCell documents for batch W1-PLACE "
                             "(writing-style placement), contract version 3: manifestations "
                             "naming the twenty-five new WritingStyles records, the questions "
                             "three cells now carry, and two new cells with the broader links and "
                             "sources those links cite; no change of status and no studies."),
        "cells": payload,
    }
    with open(f"{BUILD}/payload-W1-PLACE.json", "w") as handle:
        json.dump(out, handle, indent=1, ensure_ascii=False)
    print(f"{len(payload)} cells: {len(NEW)} new, {len(payload) - len(NEW)} revised")
    placed = sum(len(v) for v in PLACE.values()) + sum(len(v) for v in NEW_PLACE.values())
    print(f"{placed} styles placed of {len(made)}")


if __name__ == "__main__":
    main()
