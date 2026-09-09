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
        "Named", "Names", "Read", "Write", "Written", "Reading", "Writing", "Cell", "Cells"}


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


def prose_fields(d, wide):
    """The description alone, or every sentence a reader sees."""
    parts = [d.get("description", "")]
    if wide:
        for k in ("maps", "broader", "relations", "manifestations"):
            parts += [e.get("explanation", "") for e in d.get(k, [])]
        parts += d.get("questions", [])
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


def loc_id(sources):
    for s in sources:
        m = LOC.search(s.get("url", ""))
        if m:
            return m.group(1)
    return None


def broader_ids(blob):
    """The hasBroaderAuthority ids carried by a MADS/RDF record."""
    return set(re.findall(r"genreForms/(gf\d+)", blob or ""))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.environ.get("KATAGAMI_SOURCE_CACHE", "/tmp/katagami-source-cache"))
    args = ap.parse_args()

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
            by_lane[lane] += 1
            by_count[n_src] += 1
            blob = fold(" ".join(texts))
            bad = []
            for field in prose_fields(d, wide):
                for n in sorted(names_in(field)):
                    forms = variants(n)
                    if any(all(fold(t) in blob for t in f.split() if t not in STOP) for f in forms):
                        continue
                    toks = [t for t in n.split() if t not in STOP]
                    if not toks or not all(fold(t) not in blob for t in toks):
                        continue
                    bad.append((n, "strict" if all(fold(t)[:5] not in blob for t in toks) else "loose"))
            bad = sorted(set(bad))
            if bad:
                flagged.append((cid, bad, lane, n_src))
                by_lane_flag[lane] += 1
                by_count_flag[n_src] += 1
        return flagged, partial, scored, by_lane, by_lane_flag, by_count, by_count_flag

    narrow = score(False)
    wide = score(True)
    for label, (flagged, partial, scored, by_lane, by_lane_flag, by_count, by_count_flag) in (
            ("DESCRIPTION ONLY, the measured and hand-verified number", narrow),
            ("EVERY SENTENCE A READER SEES, including explanations and questions", wide)):
        strict = [f for f in flagged if any(k == "strict" for _, k in f[1])]
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
        print("  by number of cited sources:")
        for n in sorted(by_count):
            f, t = by_count_flag[n], by_count[n]
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
            for cid, bad, lane, n_src in strict:
                print(f"    {cid:44} {lane:14} {n_src}src {[n for n, k in bad if k == 'strict']}")

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
    ok, mismatch, unknown = 0, [], 0
    for cid, d in sorted(docs.items()):
        child = loc_id(d.get("sources", []))
        if not child:
            continue
        for link in d.get("broader", []):
            if not any(LOC.search(s.get("url", "")) for s in d.get("sources", [])
                       if s["id"] in link.get("sourceIds", [])):
                continue
            parent_doc = docs.get(link["cellId"])
            parent = loc_id(parent_doc.get("sources", [])) if parent_doc else None
            if not parent:
                unknown += 1
                continue
            blob = next((cache.get(s["url"], "") for s in d["sources"] if LOC.search(s.get("url", ""))), "")
            if parent in broader_ids(blob) - {child}:
                ok += 1
            else:
                mismatch.append((cid, link["cellId"], child, parent))
    print(f"\nPARENT LINKS CITED TO A LIBRARY OF CONGRESS RECORD: {ok} match the record,"
          f" {len(mismatch)} do not, {unknown} not checkable")
    if mismatch:
        print("  A mismatch is not automatically a defect. A cell may place a parent on a")
        print("  judgement the Library of Congress does not make, and that is legitimate")
        print("  when the explanation says so. The explanation is printed rather than")
        print("  classified, because deciding whether a sentence discloses a divergence is")
        print("  a reading and not a keyword test.")
    for child_cell, parent_cell, child, parent in mismatch:
        expl = next((b["explanation"] for b in docs[child_cell]["broader"] if b["cellId"] == parent_cell), "")
        print(f"\n  {child_cell} -> {parent_cell}")
        print(f"    {child}'s record does not carry {parent} as a broader authority")
        print(f"    the cell says: {expl}")

    if partial:
        print(f"\nnot scored, a cited source could not be retrieved ({len(partial)}):")
        for cid in partial[:40]:
            print(f"  {cid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
