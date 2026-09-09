"""Extraction for the federal sources, one stated rule at a time.

Every rule here removes apparatus and none of them changes a word of the running
prose. A rule that could touch prose is written to fail loudly instead: the
caller checks the result by reading it, and `carve` refuses a passage that still
carries page furniture.
"""
import re
import unicodedata

import lib


def unligature(text):
    """Decode fi/fl ligature codepoints to the letters they are.

    A PDF that stores U+FB01 has lost nothing; the glyph is the two letters,
    and NFKC on those codepoints alone is a decoding step. Applied only where
    the source stores them, which is the United States Reports volumes.
    """
    for lig in "ﬀﬁﬂﬃﬄﬅﬆ":
        text = text.replace(lig, unicodedata.normalize("NFKC", lig))
    return text


# --- NTSB accident reports ------------------------------------------------
#
# Each page of an NTSB report carries, below the running prose: the footnote
# block for that page, the printed page number, a form feed, and a running
# header naming the report series. Figure captions sit between paragraphs. None
# of it is running prose and none of it is carried. The inline footnote
# reference is a superscript digit the text layer renders either as a bare digit
# after the sentence's full stop or as a digit joined to it; both are apparatus,
# and both are removed only where they follow sentence-final punctuation, so a
# number inside a sentence (a milepost, a speed, a CFR part) is never touched.

NTSB_PAGE = re.compile(
    r"\n\s*\d+\s*\n\x0c[^\n]*\n"          # printed page number, form feed, running header
    r"|\x0c[^\n]*\n"                        # a form feed with a header and no page number
    r"|\n\s*Figure \d+[a-z]?\.[^\n]*\n"     # figure captions
    r"|\n\s*Table \d+[a-z]?\.[^\n]*\n"
)
NTSB_FOOTNOTE_BLOCK = re.compile(
    r"\n\s{2,}\d{1,3}\s*\n\s{2,}\(?[a-zA-Z(].*?(?=\n\s*\n|\Z)", re.S)
# The marker is only recognised where the sentence-final punctuation it follows
# is itself preceded by a letter or a closing quote. That is what separates a
# footnote reference ("during the shoving move.5") from a decimal figure inside
# a sentence ("milepost 480.2"), which an unrestricted rule silently destroys.
NTSB_INLINE_NOTE = re.compile(r"(?<=[A-Za-z\u201d\u2019\"')])([.?!])\s?\d{1,3}(?=\s|$)")


def drop_notes(text):
    return NTSB_INLINE_NOTE.sub(r"\1", text)


def ntsb(text):
    text = NTSB_PAGE.sub("\n\n", text)
    text = NTSB_FOOTNOTE_BLOCK.sub("", text)
    text = drop_notes(text)
    return text


# --- United States Reports ------------------------------------------------
#
# A bound volume prints, at the top of each page, the volume's running head:
# the page number, the case name, and on an opinion page the Justice and the
# role ("Ginsburg, J., dissenting"). Below the prose sit the footnotes. The
# syllabus, the counsel list and the reporter's headnotes are separate matter
# and the passage is taken from inside an opinion, so none of them appears.

# A page break in the bound volume is a form feed followed, on the same line, by
# the typesetter's slug. Above the prose sit the printed page number and the
# volume's running head, which is the case name in small capitals and, on an
# opinion page, the Justice and the role. None of it is running prose.
REPORTS_PAGE = re.compile(
    r"\x0c[^\n]*\n"                                   # form feed and the typesetter's slug
    r"|^\s*\d{1,4}\s*$"                               # a printed page number alone on a line
    r"|^\s*\d{1,4}\s+[A-Z][A-Z0-9\u2019'.,&() -]{4,}$"  # page number and running head on one line
    r"|^\s*[A-Z][A-Z0-9\u2019'.,&() -]{4,}\s+\d{1,4}\s*$"
    r"|^\s*[A-Z][A-Z0-9\u2019'.,&() -]{5,}$"            # the running head in small capitals
    r"|^[^\n]{0,60}, J\., (dissenting|concurring)[^\n]*$"
    r"|^\s*Opinion of [A-Z][^\n]*$"
    r"|^\s*Cite as: \d+ U\. S\. [^\n]*$", re.M)
REPORTS_FOOTNOTE = re.compile(r"\n\s{2,}\d{1,3}\s?\n\s{2,}[A-Z(].*?(?=\n\s*\n|\Z)", re.S)
# A word broken across a printed line carries a soft hyphen. Rejoining it reads
# the line break, the same as unwrapping a hard-wrapped paragraph; the word on
# the page is one word.
SOFT_HYPHEN = re.compile("\u00ad[ \t]*\n?[ \t]*")


PROSE_LINE = re.compile(r"\b(?!v\b)[a-z]{3,}\b")


def strip_page_furniture(text):
    """Drop what a page break prints above the prose.

    The bound volume puts the typesetter's slug, the printed page number and the
    running head at the top of every page, and how many lines that takes varies.
    The structural fact is what to lean on: a page begins at a form feed, and
    everything from there down to the first line of running prose is furniture.
    A line counts as prose when it holds a lowercase word of three letters or
    more, which no page number, slug or small-capitals case name does.
    """
    role = re.compile(r"^\s*[A-Z][A-Za-z.]*(, [A-Z][A-Za-z.]*)*, C?\.?\s?J\.,? (dissenting|concurring)")
    kept = []
    for line in text.replace("\x0c", "\n").split("\n"):
        if line.strip() and not PROSE_LINE.search(line):
            continue                      # a page number, a slug, or a case name in small capitals
        if role.match(line):
            continue                      # the running head naming the Justice and the role
        kept.append(line)
    return "\n".join(kept)


def us_reports(text):
    text = SOFT_HYPHEN.sub("", text)
    text = unligature(text)
    text = REPORTS_FOOTNOTE.sub("", text)
    text = strip_page_furniture(text)
    text = drop_notes(text)
    return text


# --- plainlanguage.gov guidelines -----------------------------------------
#
# The pages are markdown with YAML front matter listing the sources each
# guideline was drawn from. The front matter is a bibliography and is not
# carried. Headings, the "before and after" example tables and the code blocks
# are the page's apparatus for showing examples; the running instruction between
# them is the prose.

FRONT_MATTER = re.compile(r"\A---\n.*?\n---\n", re.S)
MD_APPARATUS = re.compile(
    r"^#{1,6} .*$"                    # headings
    r"|^\s*\|.*$"                     # tables
    r"|^\s*[-*+] .*$"                 # bullets
    r"|^\s*\d+\. .*$"                 # numbered lists
    r"|^```.*?^```", re.M | re.S)


def plain_language(text):
    text = FRONT_MATTER.sub("", text)
    text = MD_APPARATUS.sub("", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)   # link text, not the target
    return text


def removed_by(raw, cleaned):
    """The tokens the cleaner took out, in order, and whether it took only those.

    A cleaner is allowed to delete apparatus and nothing else. Checking that the
    result is an in-order subsequence of the source proves no word was changed,
    reordered or inserted; listing what went proves the deletions were
    apparatus. A rule that quietly eats a clause fails here rather than shipping.
    """
    source, result = raw.split(), cleaned.split()
    i = j = 0
    gone = []
    while i < len(source) and j < len(result):
        if source[i] == result[j]:
            i += 1
            j += 1
        else:
            gone.append(source[i])
            i += 1
    return gone + source[i:], j == len(result)


def locate(text, marker, start=0):
    """Find a marker that was read from the unwrapped text, in the wrapped source.

    A passage is chosen by reading the prose, where a paragraph is one line. In
    the file it is hard-wrapped, so the marker's spaces have to match a line
    break as readily as a space.
    """
    pattern = r"\s+".join(re.escape(word) for word in marker.split())
    found = re.compile(pattern).search(text, start)
    assert found, f"marker not in the source: {marker[:60]!r}"
    return found


def carve(text, first, last, *, cleaner, log=None):
    """A contiguous run between two literal markers, with apparatus removed.

    The subsequence check is the guarantee: the passage is the source's own
    words, in the source's own order, with some deleted and none altered. What
    was deleted is written to `log` so a reader can see it is apparatus, which
    is the half no rule can prove on its own.
    """
    at = locate(text, first).start()
    stop = locate(text, last, at).end()
    raw = lib.clean(text[at:stop])
    passage = lib.clean(cleaner(text[at:stop]))
    gone, subsequence = removed_by(raw, passage)
    assert subsequence, "the cleaner changed or reordered a word, it did not only delete"
    if log is not None:
        log.extend(gone)
    return passage


NTSB_SPANS = [
    ("Aviation: parachute jump flight, Dillingham Airfield, 2019", "ntsb-AAR2102.txt",
     "On June 21, 2019, about 1822 Hawaii-Aleutian standard time",
     "are discussed in section 1.2.3.)"),
    ("Highway: tour bus rollover, State Route 12, Utah, 2019", "ntsb-HAR2101.txt",
     "On Friday, September 20, 2019, about 11:30 a.m. mountain daylight time",
     "caused the bus to become unstable and to roll over."),
    ("Marine: Genesis River and Voyager, Houston Ship Channel, 2019", "ntsb-MAR2101.txt",
     "Preparing to Get Under Way.",
     "to rely on and had good visibility for seeing navigation aids."),
    ("Rail: BNSF collision, Crozier Canyon, Arizona, 2018", "ntsb-RAR2101.txt",
     "On June 5, 2018, about 2:50 p.m. local time, a westbound BNSF",
     "as specified in Title 49 Code of Federal Regulations 236.812."),
]


def ntsb_corpus(log=None):
    out = []
    for label, name, first, last in NTSB_SPANS:
        text = open(f"{lib.CORPUS}/fed/{name}", encoding="utf-8", errors="strict").read()
        out.append((label, carve(text[10000:], first, last, cleaner=ntsb, log=log)))
    return out
