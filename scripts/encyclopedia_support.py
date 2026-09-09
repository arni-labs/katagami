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

WHAT THIS DOES NOT CHECK, which matters as much as what it does:

  * Only the `description` field. Not map, broader, relation or manifestation
    explanations. The hypomnemata defect that started this lived in a
    manifestation explanation, so this sweep would have missed the very case
    that produced it.
  * A claim carried by paraphrase rather than by the name reads as unsupported.
  * A wrong date next to a right name passes, because the name is present.
  * A name in a source that could not be retrieved is not scored at all; those
    cells are listed separately rather than counted either way.

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


def names_in(desc):
    out = set()
    for m in re.finditer(r"(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+){0,3})\b", desc):
        if m.group(1).split()[0] not in STOP:
            out.add(m.group(1))
    return out


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

    # ---- does a cited source carry the names the scope asserts
    flagged, partial, scored = [], [], 0
    lane_total, lane_flagged = collections.Counter(), collections.Counter()
    for cid, d in sorted(docs.items()):
        srcs = d.get("sources", [])
        texts = [cache.get(s["url"], "") for s in srcs]
        lanes = ",".join(sorted(m["map"] for m in d.get("maps", []))) or "(none)"
        if not srcs or not all(texts):
            partial.append(cid)
            continue
        scored += 1
        lane_total[lanes] += 1
        blob = fold(" ".join(texts))
        bad = []
        for n in sorted(names_in(d.get("description", ""))):
            toks = [t for t in n.split() if t not in STOP]
            if toks and all(fold(t) not in blob for t in toks):
                bad.append((n, "strict" if all(fold(t)[:5] not in blob for t in toks) else "loose"))
        if bad:
            flagged.append((cid, bad, lanes))
            lane_flagged[lanes] += 1

    strict = [f for f in flagged if any(k == "strict" for _, k in f[1])]
    print(f"\nlive cells {len(live)}, scored {scored}, not scored {len(partial)}")
    print(f"CELLS ASSERTING A NAME NO CITED SOURCE CARRIES: {len(strict)} strict, {len(flagged)} loose,"
          f" of {scored} ({100 * len(strict) / max(scored, 1):.1f}% strict)")
    print("  false-positive rate on the strict rule: 0 of 30 cells hand-verified,")
    print("  95% upper bound 10% by the rule of three. Reads the description field only.")
    for lane in sorted(lane_total):
        print(f"    {lane:16} {lane_flagged[lane]:4} / {lane_total[lane]:4}")
    for cid, bad, lanes in strict:
        print(f"  {cid:44} {lanes:14} {[n for n, k in bad if k == 'strict']}")

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
