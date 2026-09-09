#!/usr/bin/env python3
"""Does a cell's cited source carry the claim, and does a parent link match the record?

Two sweeps over the live collection. Reporting only: it needs a production
credential and roughly 1,500 fetches, so it is not a build gate, and it prints
findings rather than failing.

    TEMPER_API_KEY=... python3 scripts/encyclopedia_support.py [--cache DIR]

Why it exists. On 2026-09-09 five cells on one branch declared `provenance.basis:
"cited"` while asserting names their cited pages did not carry. The agent that
wrote them had read each source's LEAD SECTION, written four or five sentences of
scope from what it already knew, and checked only that the page was about the
same topic. Nothing in the repository could see the difference between a source
that supports a sentence and a source that was merely reachable. Measured across
the collection, one live cell in nine had the same defect.

The name check and its rules are proof-283-b's, ported here so the verified
version runs rather than a third reimplementation of it. The structural check is
also its work, added after it noticed the first check had never asked a
structural question at all.

It scores twice. The DESCRIPTION-ONLY number is the one to quote, because it is
the number proof-283-b measured and hand-verified. The ALL-PROSE number reads
every explanation and question too, and it is larger: the nesting run found ten
of its sixteen defects in a `maps` explanation rather than in scope text, and the
hypomnemata defect that started all of this lived in a manifestation explanation.
Both are printed so a wider sweep cannot be mistaken for a worse collection.

Each explanation is read against the sources IT cites, not against every source
on the cell. Until 2026-09-09 the wide score searched the concatenation of all of
them, so a name counted as supported when it appeared in a source the sentence
never cited, and the number ran forgiving. `broader`, `relations`, `maps` and
`manifestations` all carry their own `sourceIds` and the contract requires them;
using them is the whole point of requiring them. The description and the
questions carry no citation of their own and are still read against the cell's
whole pool, which is what those two fields mean.

THE NEXT QUESTIONS OF BYTES ALREADY FETCHED, so the list is inherited rather
than rediscovered. The structural check reads one predicate,
`hasBroaderAuthority`. The same records carry three more things the collection
makes claims against and nothing asks about:

  * `authoritativeLabel`, against the cell's own name. A cell named from a
    source vocabulary should carry that vocabulary's label.
  * `hasVariantLabel`, which is where a legitimate alternate name lives. A name
    check that does not read these will flag a correct variant as unsupported.
  * `hasNarrowerAuthority`, against the cells that claim this one as a parent.
    The broader check runs child to parent; this is the same edge from the other
    end and would catch a parent that has been given children it does not have.

WHAT THIS DOES NOT CHECK, which matters as much as what it does:

  * A claim carried by paraphrase rather than by the name reads as unsupported.
    This is the largest source of remaining false positives.
  * A wrong date next to a right name passes, because the name is present.
  * A name in a source that could not be retrieved is not scored at all; those
    cells are listed separately rather than counted either way.
  * A structural mismatch is not read for whether the cell discloses it. The
    explanation is printed instead, because that is a reading.

False-positive rate for the name check: 0 of 30 cells hand-verified, which is a
95% upper bound of 10% by the rule of three. The sample and its verdicts are in
`.agents/skills/encyclopedia/claim-support-sample.json` so the number
travels with the code instead of being re-derived by whoever runs it next.
"""
import argparse, collections, html, json, os, re, sys, time, unicodedata
import urllib.error, urllib.parse, urllib.request

UA = {
    "User-Agent": "katagami-claim-support/1.0 (+https://github.com/arni-labs/katagami) "
                  "citation audit, batched, <=1 req/s",
    "Accept": "application/json, application/ld+json;q=0.9, text/html;q=0.5",
}
STOP = {"The", "A", "An", "It", "Its", "They", "This", "That", "There", "Both", "Each",
        "English", "American", "British", "Greek", "Roman", "French", "Russian", "German",
        "Wikipedia", "Library", "Congress", "Number", "Five", "What", "Where", "One", "Two",
        "Three", "Four", "Journalists", "Reporters", "Writers", "Length", "Modern", "Internet",
        "Web", "Blog", "Blogs", "Most", "Every", "Some", "When", "Since", "After", "Before",
        "Named", "Names", "Read", "Write", "Written", "Reading", "Writing", "Cell", "Cells",
        # A Katagami record's lifecycle state. A manifestation explanation says which
        # status the record it points at is in, and that is a fact about the
        # collection, readable in the collection, and no external source will ever
        # carry it. Left in, it was 134 of 402 flags and every one a false positive.
        "Draft", "UnderReview", "Published", "Archived",
        # The name of a source vocabulary. Whether a cell citing a filing cites that
        # vocabulary is decided exactly, by the host of the URL, in the check below,
        # so asking a second time whether the word appears in the fetched bytes only
        # produces noise: a Wikidata entity's JSON does not contain the string
        # "Wikidata", and "Its Wikidata item files it as..." is neither wrong nor
        # uncited. Wikipedia, Library and Congress were already here for this reason.
        "Artsy", "Getty", "AAT", "Wikidata", "LCGFT", "LCSH"}


def from_host(url, hosts):
    """Is this URL served by one of these hosts, decided on the parsed hostname.

    The first version asked whether the host string appeared anywhere in the URL,
    which is a substring standing in for a claim: `https://example.com/?ref=artsy.net`
    would have counted as citing Artsy, and so would any path or query containing
    the name. That is the same mistake the check was built to catch, one level
    down, and it is worth saying plainly because this check is what found 123 cells
    asserting an Artsy filing they never cited. A substring is not evidence.

    The suffix rule keeps `www.artsy.net` and `vocab.getty.edu` matching while
    `notartsy.net` and `artsy.net.example.com` do not.
    """
    host = (urllib.parse.urlsplit(url).hostname or "").lower().rstrip(".")
    return any(host == h or host.endswith("." + h) for h in hosts)


def fold(s):
    """Strip combining marks and lowercase, so a description writing Mieville is not
    flagged against a source writing it with an acute. Costs one cell of the count
    and removes a whole false-positive class."""
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)).lower()


ORDINAL = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6,
           "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10, "eleventh": 11,
           "twelfth": 12, "thirteenth": 13, "fourteenth": 14, "fifteenth": 15,
           "sixteenth": 16, "seventeenth": 17, "eighteenth": 18, "nineteenth": 19,
           "twentieth": 20, "twenty-first": 21}


def variants(name):
    """Other surface forms of the same claim. A description writing "the thirteenth
    century" and a source writing 1223 are saying one thing, and flagging that as
    unsupported buried four real findings in the nesting run's first pass."""
    out = {name}
    m = re.match(r"(?i)^(%s)[- ]century$" % "|".join(ORDINAL), name.strip())
    if m:
        n = ORDINAL[m.group(1).lower()]
        out.add(f"{n}th century")
        out.update(str(y) for y in range((n - 1) * 100, n * 100, 10))
    return out


def names_in(text):
    out = set()
    for m in re.finditer(r"(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+){0,3})\b", text):
        if m.group(1).split()[0] not in STOP:
            out.add(m.group(1))
    for m in re.finditer(r"(?i)\b((?:%s)[- ]century)\b" % "|".join(ORDINAL), text):
        out.add(m.group(1))
    return out


def prose_chars(raw):
    """How much running text a source actually gives a writer.

    The mechanism behind the defect is not how many sources a cell cites, it is
    whether any of them carries sentences. A Library of Congress record gives a
    label and its narrower terms and no prose, so there is nothing to write a
    scope sentence from except what the writer already knows. The art run
    measured this on its own unrepaired cells: 13 of 20 cells standing on a
    record alone carried an unsupported claim, against 4 of 20 on two sources,
    with both groups asserting the same number of names (2.95 against 2.85), so
    the difference is not that one group said more.

    A JSON record counts only its sentence-shaped string values, which is where a
    scope note lives; anything else counts its whole text.
    """
    try:
        rec = json.loads(raw)
    except Exception:  # noqa: BLE001 - not a record, so it is page text
        return len(raw)

    total = 0
    stack = [rec]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            stack.extend(node.values())
        elif isinstance(node, list):
            stack.extend(node)
        elif isinstance(node, str) and " " in node and (len(node) > 80 or node.rstrip().endswith(".")):
            total += len(node)
    return total


def prose_fields(d, wide):
    """The description alone, or every sentence a reader sees, each paired with the
    sources that sentence actually cites.

    The pairing is the point. An explanation carries its own `sourceIds`, and
    scoring it against the concatenation of every source on the cell asks the
    wrong question: it passes a name that appears in some other source the
    sentence never cited. Literary nonsense cites Nonsense verse on one parent
    link and Nonsense fiction on another, so a name carried only by the second
    would have supported the first. `None` means no citation of its own, and the
    cell's whole pool is the right comparison: the description is the cell's own
    prose covered by its sources collectively, and a question cites nothing.
    """
    parts = [("description", d.get("description", ""), None, None)]
    if wide:
        for k in ("maps", "broader", "relations", "manifestations"):
            for e in d.get(k, []):
                text = e.get("explanation", "")
                # A manifestation explanation is read against the record it names
                # as well as the sources it cites, because "the record's credits
                # name Botanical aquatint" is checkable in the record and will
                # never appear on the Wikipedia page the link cites.
                #
                # An earlier version deleted quoted spans from these explanations
                # before scoring, on the theory that a quoted span is the record's
                # own credits label. That let a claim inside quotation marks
                # through unread, so its cell came back clean because nothing had
                # looked at it, which is the failure this whole script exists to
                # find. Reading the record makes the strip unnecessary as well as
                # wrong: a credits label the explanation quotes is in the record,
                # so it matches on the evidence rather than on being skipped.
                if k == "manifestations":
                    parts.append((k, text, e.get("sourceIds"), f"{e['entitySet']}/{e['entityId']}"))
                    continue
                parts.append((k, text, e.get("sourceIds"), None))
        parts += [("questions", q, None, None) for q in d.get("questions", [])]
    return parts


def get(url, timeout=60):
    """Fetch with backoff. Raises only when every attempt failed, so a 429 never
    becomes an empty cache entry, which would understate the finding."""
    p = urllib.parse.urlsplit(url)
    safe = urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(p.path, safe="/%:@"), p.query, ""))
    last = None
    for i, delay in enumerate([0, 3, 8, 20, 45, 90]):
        if delay:
            time.sleep(delay)
        try:
            with urllib.request.urlopen(urllib.request.Request(safe, headers=UA), timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = e
            if e.code not in (429, 502, 503, 504):
                raise
            print(f"    {e.code}, backing off ({i + 1})", file=sys.stderr)
        except Exception as e:  # noqa: BLE001 - network, retried
            last = e
    raise last


def strip_html(b):
    b = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", b)
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", b)))


def read_record(origin, key, entity_set, entity_id):
    """One Katagami record, as the text a manifestation explanation describes.

    A manifestation explanation is mostly a statement about the record: which
    tradition its credits name, which edition its corpus is built from, what
    status it is in. That is checkable, and the record is where it is checkable;
    the Wikipedia page the link cites has no reason to name a Katagami record's
    corpus. Reading the record alongside the cited sources is what the skill
    already says about manifestations, where the record's own page is the natural
    citation because the record declares its lineage in `credits`.

    This does not exempt the field. The defect that produced this script was a
    manifestation explanation claiming Marcus Aurelius wrote under the title To
    Himself, which is a claim about the world; the record does not carry it either,
    so it still flags.
    """
    url = f"{origin}/tdata/{entity_set}('{urllib.parse.quote(entity_id)}')"
    try:
        req = urllib.request.Request(url, headers={"X-Tenant-Id": "default",
                                                   "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001 - a record that cannot be read adds nothing
        print(f"  record miss {entity_set}/{entity_id}: {e}", file=sys.stderr)
        return ""


def read_cells(origin, key):
    rows, url = [], f"{origin}/tdata/EncyclopediaCells?limit=200"
    while url:
        with urllib.request.urlopen(urllib.request.Request(
                url, headers={"X-Tenant-Id": "default", "Authorization": f"Bearer {key}"}), timeout=90) as r:
            page = json.load(r)
        rows.extend(page["value"])
        nxt = page.get("@odata.nextLink")
        url = f"{origin}/tdata/{nxt}" if nxt else None
    return [r for r in rows if r["fields"].get("status") != "Archived" and r["fields"].get("document")]


def fetch_sources(urls, cache, cache_path):
    """Wikipedia as complete wikitext rather than the lead, Wikidata as entity JSON,
    the Library of Congress and Getty as their machine records, everything else as
    stripped page text. Batched 50 at a time where the API allows it."""
    def save():
        json.dump(cache, open(cache_path, "w"))

    todo = [u for u in urls if u not in cache]
    print(f"{len(urls)} distinct sources, {len(todo)} to fetch", file=sys.stderr)

    wp = collections.defaultdict(list)
    for u in todo:
        p = urllib.parse.urlparse(u)
        if p.netloc.endswith("wikipedia.org") and p.path.startswith("/wiki/"):
            wp[p.netloc].append(u)
    for host, group in wp.items():
        for i in range(0, len(group), 50):
            chunk = group[i:i + 50]
            titles = [urllib.parse.unquote(urllib.parse.urlparse(u).path[6:]).replace("_", " ") for u in chunk]
            q = (f"https://{host}/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main"
                 f"&redirects=1&format=json&formatversion=2&titles="
                 f"{urllib.parse.quote('|'.join(titles), safe='|')}")
            try:
                data = json.loads(get(q))
            except Exception as e:  # noqa: BLE001
                print(f"  batch failed {host} {i}: {e}", file=sys.stderr)
                continue
            norm = {n["from"]: n["to"] for k in ("normalized", "redirects")
                    for n in data.get("query", {}).get(k, [])}

            def resolve(t):
                for _ in range(6):
                    if t not in norm:
                        break
                    t = norm[t]
                return t

            bytitle = {pg.get("title", ""): (pg["revisions"][0]["slots"]["main"].get("content", "")
                                             if "revisions" in pg else "")
                       for pg in data.get("query", {}).get("pages", [])}
            for u, t in zip(chunk, titles):
                if bytitle.get(resolve(t)):
                    cache[u] = bytitle[resolve(t)]
            save()
            time.sleep(1.2)

    ids = collections.defaultdict(list)
    for u in [x for x in todo if "wikidata.org" in x and x not in cache]:
        m = re.search(r"/(Q\d+)", u)
        if m:
            ids[m.group(1)].append(u)
    keys = sorted(ids)
    for i in range(0, len(keys), 50):
        chunk = keys[i:i + 50]
        q = ("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en"
             "&props=labels|descriptions|aliases|claims&ids=" + "|".join(chunk))
        try:
            data = json.loads(get(q))
        except Exception as e:  # noqa: BLE001
            print(f"  wikidata batch failed {i}: {e}", file=sys.stderr)
            continue
        for qid in chunk:
            ent = data.get("entities", {}).get(qid, {})
            for u in ids[qid] if ent else []:
                cache[u] = json.dumps(ent, ensure_ascii=False)
        save()
        time.sleep(1.2)

    rest = [u for u in todo if u not in cache]
    for n, u in enumerate(rest, 1):
        target = u.split("#")[0].rstrip("/") + ".json" if "id.loc.gov" in u and not u.endswith(".json") else u
        try:
            body = get(target)
            cache[u] = body if target.endswith(".json") or "vocab.getty.edu" in u else strip_html(body)
        except Exception as e:  # noqa: BLE001
            print(f"  miss {u}: {e}", file=sys.stderr)
        if n % 25 == 0:
            save()
        time.sleep(0.35)
    save()
    return cache


LOC = re.compile(r"id\.loc\.gov/authorities/genreForms/(gf\d+)")
WD = re.compile(r"wikidata\.org/wiki/(Q\d+)")
# The properties a cell explanation actually reports about a Wikidata item. A
# statement's object is a Q-id, so an entity fetched with props=claims carries
# "P279 -> Q37068" and never the word Romanticism. Every "its Wikidata item files
# it as a subclass of X" therefore read as unsupported: six links, all six true.
# Resolving these targets to their labels is a fetch fix, not a scoring one. The
# list stays short on purpose, because widening it to every property would pull in
# countries, dates and collections and hide claims that really are unsupported.
WD_PARENT = ("P279", "P361", "P135", "P31", "P144")


def wikidata_targets(raw):
    """The Q-ids this entity's parentage statements point at."""
    try:
        ent = json.loads(raw)
    except Exception:  # noqa: BLE001 - not an entity record
        return set()
    out = set()
    for prop in WD_PARENT:
        for claim in ent.get("claims", {}).get(prop, []) or []:
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value")
            if isinstance(value, dict) and isinstance(value.get("id"), str):
                out.add(value["id"])
    return out


def label_wikidata_targets(cache, cache_dir):
    """Append the labels of those targets to each entity's cached text.

    Read alongside the entity, so a cell reporting what the item says is scored
    against what the item says. The labels are cached separately from the source
    bodies so that re-reading a source never re-fetches them.
    """
    path = os.path.join(cache_dir, "wikidata-labels.json")
    labels = json.load(open(path)) if os.path.exists(path) else {}
    entities = {u: cache[u] for u in cache if WD.search(u) and cache.get(u)}
    wanted = sorted({q for raw in entities.values() for q in wikidata_targets(raw)} - set(labels))
    if wanted:
        print(f"{len(wanted)} Wikidata statement targets to label", file=sys.stderr)
    for i in range(0, len(wanted), 50):
        chunk = wanted[i:i + 50]
        try:
            data = json.loads(get("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json"
                                  "&languages=en&props=labels|aliases&ids=" + "|".join(chunk)))
        except Exception as e:  # noqa: BLE001
            print(f"  label batch failed {i}: {e}", file=sys.stderr)
            continue
        for qid in chunk:
            ent = data.get("entities", {}).get(qid, {})
            names = [ent.get("labels", {}).get("en", {}).get("value", "")]
            names += [a.get("value", "") for a in ent.get("aliases", {}).get("en", []) or []]
            labels[qid] = " ".join(n for n in names if n)
        json.dump(labels, open(path, "w"))
        time.sleep(1.2)
    json.dump(labels, open(path, "w"))

    # Returned beside the cache, never merged into it. Appending the labels to the
    # entity's JSON made `json.loads` fail in `prose_chars`, which then fell back to
    # counting the whole blob as running text and classified a machine record as
    # prose-backed. A record is a record; these labels are searchable text about it,
    # and the two are kept apart so that neither question borrows the other's answer.
    return {url: " ".join(labels.get(q, "") for q in sorted(wikidata_targets(raw)))
            for url, raw in entities.items()}


def loc_sources(sources, source_ids=None):
    """Every Library of Congress record in scope, not the first one found.

    A cell may carry several LoC records and its parent links may cite different
    ones. Literary nonsense cites Nonsense verse for its Humorous poetry parent
    and Nonsense fiction for its Fiction parent, and taking the first record
    compares the second link against the wrong authority and manufactures a
    defect. Three cells carry more than one LoC source today and it will grow.

    Returning all of them rather than the first closes the same hole on the other
    end of the edge. The child side is narrowed by the link's own `sourceIds`; the
    parent side has no link to narrow it, so a parent holding two records has to
    be read as standing for both, or a link naming its second record reads as a
    mismatch against its first.
    """
    pool = [s for s in sources if source_ids is None or s["id"] in source_ids]
    return [(m.group(1), s["url"]) for s in pool if (m := LOC.search(s.get("url", "")))]


def broader_authorities(raw, gf):
    """The objects of hasBroaderAuthority on the record's own subject.

    Searching the flattened record for the parent id as a substring would pass a
    link whose id appears under hasNarrowerAuthority, under a related term, or in
    a change note, because it never asks which predicate the id sits under. That
    is the same category error as searching a machine record for proper nouns:
    the structured evidence is right there and a substring match throws it away.
    """
    try:
        rec = json.loads(raw)
    except Exception:  # noqa: BLE001 - a non-JSON record carries no predicates
        return None
    graph = rec if isinstance(rec, list) else rec.get("@graph", [rec])
    out = set()
    for node in graph:
        if not isinstance(node, dict) or not str(node.get("@id", "")).endswith(gf):
            continue
        for k, v in node.items():
            if not k.endswith("hasBroaderAuthority"):
                continue
            for x in (v if isinstance(v, list) else [v]):
                ref = x.get("@id") if isinstance(x, dict) else x
                if isinstance(ref, str):
                    out.add(ref.rsplit("/", 1)[-1])
    return out


def self_test():
    """The host rule, enumerated from what the rule says rather than from the
    cases that happened to be in the collection.

    Every line below is a way a name can appear in a URL without the URL being
    served by that host. The substring version passed nine of them.
    """
    cases = [
        # served by the host, so a citation of it
        ("https://www.artsy.net/gene/impressionism", ("artsy.net",), True),
        ("https://artsy.net/gene/x", ("artsy.net",), True),
        ("https://ARTSY.NET/gene/x", ("artsy.net",), True),
        ("https://artsy.net./gene/x", ("artsy.net",), True),
        ("https://artsy.net:443/gene/x", ("artsy.net",), True),
        ("https://vocab.getty.edu/aat/300021426", ("getty.edu",), True),
        ("https://en.wikipedia.org/wiki/Dada", ("wikipedia.org",), True),
        ("https://de.wikipedia.org/wiki/Echogedicht", ("wikipedia.org",), True),
        # not served by the host, whatever the string contains
        ("https://example.com/?ref=artsy.net", ("artsy.net",), False),
        ("https://example.com/artsy.net/gene", ("artsy.net",), False),
        ("https://example.com/#artsy.net", ("artsy.net",), False),
        ("https://artsy.net@example.com/", ("artsy.net",), False),
        ("https://user:artsy.net@example.com/", ("artsy.net",), False),
        ("https://notartsy.net/gene/x", ("artsy.net",), False),
        ("https://artsy.net.example.com/", ("artsy.net",), False),
        ("https://artsy.network/gene/x", ("artsy.net",), False),
        ("https://en.wikipedia.org/wiki/Getty_Images", ("getty.edu",), False),
        ("", ("artsy.net",), False),
        ("not a url", ("artsy.net",), False),
    ]
    bad = [(u, h, w) for u, h, w in cases if from_host(u, h) is not w]
    for u, h, w in bad:
        print(f"  from_host({u!r}, {h}) should be {w}", file=sys.stderr)

    # A case list both rules pass proves nothing, and a later edit could quietly
    # reduce this to one. So the list is also required to separate the two: the
    # substring version it replaced must still fail on it. An assertion is worth
    # what it fails on; until it has failed on something it is a comment.
    def substring(url, hosts):
        return any(h in url for h in hosts)

    caught = [u for u, h, w in cases if substring(u, h) is not w]
    print(f"host rule: {len(cases) - len(bad)} of {len(cases)} cases hold; "
          f"the substring version it replaced fails {len(caught)} of them", file=sys.stderr)
    if len(cases) < 15:
        print("  the case list has been reduced below what the rule needs", file=sys.stderr)
    if not caught:
        print("  no case separates the parsed-host rule from a substring match, so this"
              " list would pass the bug it exists to catch", file=sys.stderr)
    return 1 if bad or not caught or len(cases) < 15 else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true",
                    help="check the host rule and exit; needs no credential and no network")
    ap.add_argument("--cache", default=os.environ.get("KATAGAMI_SOURCE_CACHE", "/tmp/katagami-source-cache"))
    args = ap.parse_args()
    if args.self_test:
        return self_test()

    key = os.environ.get("TEMPER_API_KEY")
    if not key:
        print("TEMPER_API_KEY is required", file=sys.stderr)
        return 2
    origin = os.environ.get("TEMPER_API_URL", "https://openpaw-production.up.railway.app")

    os.makedirs(args.cache, exist_ok=True)
    cache_path = os.path.join(args.cache, "sources.json")
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}

    live = read_cells(origin, key)
    docs = {r["fields"]["id"]: json.loads(r["fields"]["document"]) for r in live}
    urls = sorted({s["url"] for d in docs.values() for s in d.get("sources", [])})
    cache = fetch_sources(urls, cache, cache_path)
    # Searchable text about a source that is not part of the source's own bytes.
    # Kept beside the cache so `prose_chars` still sees a machine record as one.
    expansions = label_wikidata_targets(cache, args.cache)

    def searchable(url):
        return cache.get(url, "") + " " + expansions.get(url, "")

    # ---- an explanation naming a vocabulary, cited to nothing from that vocabulary
    #
    # The name check cannot find this on its own. "The Artsy Art Genome lists it in
    # its Styles and Movements family" was written on 123 art cells and not one of
    # them cited an artsy.net page; the words Styles and Movements happen to appear
    # in most Wikipedia articles, so 104 of the 123 scored as supported. The claim
    # is about where a vocabulary files the term, and whether the cell cites that
    # vocabulary is a question about the URL, which is exact.
    vocab_hosts = {"Artsy": ("artsy.net",), "Getty": ("getty.edu",), "AAT": ("getty.edu",),
                   "Wikidata": ("wikidata.org",), "Wikipedia": ("wikipedia.org",),
                   "LCGFT": ("id.loc.gov",), "LCSH": ("id.loc.gov",),
                   "Library of Congress": ("id.loc.gov",), "Aesthetics Wiki": ("aesthetics.fandom.com",)}
    uncited = []
    for cid, d in sorted(docs.items()):
        by_id = {s["id"]: s["url"] for s in d.get("sources", [])}
        for field in ("maps", "broader", "relations", "manifestations"):
            for e in d.get(field, []):
                text = e.get("explanation", "") or ""
                cited = [by_id.get(i, "") for i in e.get("sourceIds", [])]
                for name, hosts in vocab_hosts.items():
                    if not re.search(r"\b%s\b" % re.escape(name), text):
                        continue
                    if any(from_host(u, hosts) for u in cited):
                        continue
                    uncited.append((cid, field, name, text))
    print(f"\nAN EXPLANATION NAMES A VOCABULARY AND CITES NOTHING FROM IT: {len(uncited)}")
    print("  Not every one is a defect: a sentence may say a vocabulary has NO heading")
    print("  for the term, which is an absence and cites the source that named it instead.")
    print("  The sentence is printed rather than classified, because that is a reading.")
    for cid, field, name, text in uncited:
        print(f"  {cid} [{field}] names {name}: {text[:150]}")

    # The records the manifestation links point at, read once each.
    pointed = sorted({(m["entitySet"], m["entityId"]) for d in docs.values()
                      for m in d.get("manifestations", [])})
    print(f"{len(pointed)} manifestation records to read", file=sys.stderr)
    records = {f"{s}/{i}": fold(read_record(origin, key, s, i)) for s, i in pointed}

    # ---- does a cited source carry the names the prose asserts
    def score(wide):
        flagged, partial, scored = [], [], 0
        by_lane, by_lane_flag = collections.Counter(), collections.Counter()
        by_count, by_count_flag = collections.Counter(), collections.Counter()
        for cid, d in sorted(docs.items()):
            srcs = d.get("sources", [])
            texts = [cache.get(s["url"], "") for s in srcs]
            if not srcs or not all(texts):
                partial.append(cid)
                continue
            scored += 1
            lane = ",".join(sorted(m["map"] for m in d.get("maps", []))) or "(none)"
            n_src = len(srcs)
            # 2,000 characters of running text is about the 3rd percentile of what
            # a cell has available, and every cell standing on Library of Congress
            # records alone falls under it. It is a threshold on a distribution
            # rather than a guess: the collection's median is roughly 18,000.
            backed = "prose-backed" if max(prose_chars(t) for t in texts) >= 2000 else "prose-thin "
            by_lane[lane] += 1
            by_count[(n_src, backed)] += 1
            allblob = fold(" ".join(searchable(s["url"]) for s in srcs))
            bysid = {s["id"]: fold(searchable(s["url"])) for s in srcs}
            bad = []
            for kind, field, sids, record in prose_fields(d, wide):
                # A sentence is read against what it cites, and against the whole
                # cell only when it cites nothing. An id that does not resolve
                # contributes no text, which is what an unresolvable citation is
                # worth; the format validator is what refuses it.
                blob = allblob if sids is None else " ".join(bysid.get(i, "") for i in sids)
                if record is not None:
                    blob += " " + records.get(record, "")
                for n in sorted(names_in(field)):
                    forms = variants(n)
                    if any(all(fold(t) in blob for t in f.split() if t not in STOP) for f in forms):
                        continue
                    toks = [t for t in n.split() if t not in STOP]
                    if not toks or not all(fold(t) not in blob for t in toks):
                        continue
                    bad.append((n, "strict" if all(fold(t)[:5] not in blob for t in toks) else "loose",
                                kind, field))
            bad = sorted(set(bad))
            if bad:
                flagged.append((cid, bad, lane, n_src, backed))
                by_lane_flag[lane] += 1
                by_count_flag[(n_src, backed)] += 1
        return flagged, partial, scored, by_lane, by_lane_flag, by_count, by_count_flag

    narrow = score(False)
    wide = score(True)
    for label, (flagged, partial, scored, by_lane, by_lane_flag, by_count, by_count_flag) in (
            ("DESCRIPTION ONLY, the measured and hand-verified number", narrow),
            ("EVERY SENTENCE A READER SEES, including explanations and questions", wide)):
        strict = [f for f in flagged if any(k == "strict" for _, k, _, _ in f[1])]
        print(f"\n{label}")
        print(f"  scored {scored}, not scored {len(partial)}")
        print(f"  asserting a name no cited source carries: {len(strict)} strict, {len(flagged)} loose"
              f" ({100 * len(strict) / max(scored, 1):.1f}% strict)")
        # The rate is not uniform and a single number reads as if it were. Read
        # this split with care: a run that repaired its own cells by cutting the
        # unsupported claim leaves those cells with fewer names and no findings,
        # so a bucket can look clean because it was fixed rather than because it
        # was never at risk. The nesting run reported fifteen of its sixteen
        # defects in single-source cells and repaired them that way, and the
        # collection now shows the opposite split. Both can be true.
        # Two cuts, and a warning that belongs with both. The mechanism is real
        # and was measured on unrepaired cells elsewhere: 13 of 20 cells standing
        # on a Library of Congress record alone carried an unsupported claim,
        # against 4 of 20 on two sources, with both groups asserting the same
        # number of names. A record gives a label and its narrower terms and no
        # prose, so there is nothing to write a scope sentence from except what
        # the writer already knows.
        #
        # This collection cannot show it. Those cells were repaired by deleting
        # the unsupported claim, so they now carry fewer names and flag less,
        # and both cuts here run the opposite way. Swapping source count for
        # prose does not fix that, because it is the same cells either way. A
        # repaired population cannot measure the risk that produced it, and
        # these splits are reported for drift rather than as evidence.
        backed_t, backed_f = collections.Counter(), collections.Counter()
        for (n, b), t in by_count.items():
            backed_t[b] += t
            backed_f[b] += by_count_flag[(n, b)]
        print("  by whether any cited source carries prose (2,000 chars, about p3).")
        print("  Both cuts below are confounded: the cells that carried the defect were")
        print("  repaired by cutting claims, so they now have less to flag. Read them as")
        print("  drift, not as evidence about risk.")
        for b in sorted(backed_t):
            f, t = backed_f[b], backed_t[b]
            print(f"    {b}   {f:4} / {t:4}   {100 * f / t:5.1f}%")
        print("  by number of cited sources, which is the weaker cut:")
        for n in sorted({k[0] for k in by_count}):
            f = sum(by_count_flag[(n, b)] for b in backed_t)
            t = sum(by_count[(n, b)] for b in backed_t)
            print(f"    {n} source{'s' if n != 1 else ' '}   {f:4} / {t:4}   {100 * f / t:5.1f}%")
        print("  by map lane:")
        for lane in sorted(by_lane):
            print(f"    {lane:18} {by_lane_flag[lane]:4} / {by_lane[lane]:4}")
        if label.startswith("DESCRIPTION"):
            print("  false-positive rate on the strict rule: 0 of 30 cells hand-verified,")
            print("  95% upper bound 10% by the rule of three.")
        else:
            print("  FALSE-POSITIVE RATE UNKNOWN for this wider number. The hand-verified")
            print("  sample covers description hits only. Explanations are shorter and more")
            print("  formulaic than scope text, so the rate almost certainly differs, and")
            print("  quoting this figure beside the verified one would borrow its error bar.")
            # Which field a flag came from decides what it means, so it is printed.
            # A `questions` entry carries no sourceIds and the contract asks it for
            # none: it is the cell saying what it does not know, and it often names
            # another cell or a decision the pass made, which no external page will
            # ever carry. A `manifestations` explanation is mostly a statement about
            # the Katagami record, readable in the collection. Neither is exempt,
            # because the defect that produced this script lived in a manifestation
            # explanation, but neither can be read as a scope-text hit either.
            by_field = collections.Counter(kind for _, bad, *_ in strict
                                           for n, k, kind, _ in bad if k == "strict")
            print("  by field: " + ", ".join(f"{k} {v}" for k, v in sorted(by_field.items())))
            for cid, bad, lane, n_src, backed in strict:
                for n, k, kind, text in bad:
                    if k == "strict":
                        print(f"    {cid} [{kind}] {n}\n        {text[:190]}")

    flagged, partial, scored = narrow[0], narrow[1], narrow[2]

    # ---- a page can resolve, be the right page, and carry nothing
    # Epistolary literature credited Horace and Ovid's Heroides to an article 180
    # characters long that names neither. An empty page satisfies any check that
    # only asks whether a name appears somewhere in a cell's sources, because it
    # contributes nothing and reduces nothing.
    thin = sorted({(s["url"], len(cache.get(s["url"], ""))) for d in docs.values()
                   for s in d.get("sources", []) if 0 < len(cache.get(s["url"], "")) < 400})
    if thin:
        print(f"\nSOURCES THAT RESOLVE AND CARRY ALMOST NOTHING ({len(thin)}, under 400 characters):")
        for url, n in thin:
            cells_using = sorted(cid for cid, d in docs.items()
                                 if any(x["url"] == url for x in d.get("sources", [])))
            print(f"  {n:4} chars  {url}\n            cited by {', '.join(cells_using)}")

    # ---- does a parent link match the record it is cited to
    ok, mismatch, unknown, unparsed = 0, [], [], []
    for cid, d in sorted(docs.items()):
        for link in d.get("broader", []):
            children = loc_sources(d.get("sources", []), set(link.get("sourceIds", [])))
            if not children:
                continue
            parent_doc = docs.get(link["cellId"])
            parents = loc_sources(parent_doc.get("sources", [])) if parent_doc else []
            if not parents:
                unknown.append((cid, link["cellId"]))
                continue
            parent_ids = {gf for gf, _ in parents}
            found = [(gf, broader_authorities(cache.get(url, ""), gf)) for gf, url in children]
            if all(a is None for _, a in found):
                unparsed.append((cid, link["cellId"]))
            elif any(parent_ids & (a or set()) for _, a in found):
                ok += 1
            else:
                mismatch.append((cid, link["cellId"], ",".join(gf for gf, _ in children),
                                 ",".join(sorted(parent_ids)),
                                 sorted({x for _, a in found for x in (a or set())})))
    print(f"\nPARENT LINKS CITED TO A LIBRARY OF CONGRESS RECORD: {ok} match the record,"
          f" {len(mismatch)} do not, {len(unknown)} not checkable, {len(unparsed)} unparsed")
    print("  Not checkable is a different state from a disagreement: the parent cell")
    print("  carries no Library of Congress id, so there is no pair to compare and the")
    print("  link may well be right. Collapsing the two would overstate the repair list.")
    if mismatch:
        print("  A mismatch is not automatically a defect either. A cell may place a parent")
        print("  on a judgement the Library of Congress does not make, and that is")
        print("  legitimate when the explanation says so. The explanation is printed rather")
        print("  than classified, because that is a reading and not a keyword test.")
    for child_cell, parent_cell, child, parent, authorities in mismatch:
        expl = next((b["explanation"] for b in docs[child_cell]["broader"] if b["cellId"] == parent_cell), "")
        print(f"\n  {child_cell} -> {parent_cell}")
        print(f"    {child} has broader authority {authorities or '(none)'}, not {parent}")
        print(f"    the cell says: {expl}")
    for cid, parent_cell in unknown:
        print(f"  not checkable: {cid} -> {parent_cell}, the parent carries no Library of Congress id")

    if partial:
        print(f"\nnot scored, a cited source could not be retrieved ({len(partial)}):")
        for cid in partial[:40]:
            print(f"  {cid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
