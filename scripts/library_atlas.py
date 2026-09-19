#!/usr/bin/env python3
"""Lay out the library atlas and attach each style's place.

For every pair of published design languages and art styles, Typesafe Jev
answers one question: are these the same visual idea? Nothing else is asked and
no axes are written — the map is whatever those answers imply. From the full
matrix this script derives a 2D layout (t-SNE on 1 - similarity), families
(average-link clusters cut at DISTANCE_CUT, kept when FAMILY_MIN or more), and
each style's nearest neighbours, then writes them with AttachAtlasPlace.

A place only means something beside the other places of the same run, so a run
rewrites every row under one atlas_version. New styles have no place until the
next run; the atlas page says how many.

  python3 scripts/library_atlas.py --work /tmp/atlas            # ask + lay out, dry run
  python3 scripts/library_atlas.py --work /tmp/atlas --apply    # and attach

Answers are checkpointed in <work>/pairs.jsonl, so an interrupted run resumes.
457 styles = 104,196 pairs = 2,832 calls of 40 questions, about 11 minutes with
four workers and about $0.64 (2026-09-19, jev-1.13.0).

Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default"),
     TYPESAFE_API_KEY, JEV_MODEL (default jev-1.13.0).
Needs numpy and scikit-learn.
"""
import argparse
import collections
import datetime
import hashlib
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

JEV_URL = "https://api.typesafe.ai/v1/systemone"
JEV_MODEL = os.environ.get("JEV_MODEL", "jev-1.13.0")
BATCH = 40
WORKERS = 4
DISTANCE_CUT = 0.62
FAMILY_MIN = 4
NEIGHBORS = 6
# A tile on the atlas page, as a share of the 0..1 paper (132 x 112 px on a
# 5200 px paper, plus a gutter). Places are pushed apart until no two tiles
# overlap, so a dense family reads as a block of pictures, not a pile.
TILE = (0.030, 0.026)
NAMESPACES = ["Temper", "KatagamiCommons", "Katagami.Curation", "Katagami"]
SETS = [("language", "DesignLanguages"), ("art_style", "ArtStyles")]
QUESTION = (
    "Is the following style essentially the same visual idea as Style A, such that a designer "
    "would call them two takes on one direction?\nStyle B:\n"
)


def env(name, default=None):
    value = os.environ.get(name, default)
    if not value:
        sys.exit(f"missing env {name}")
    return value


def parse(value, fallback):
    if isinstance(value, (dict, list)):
        return value
    if not isinstance(value, str) or not value.strip():
        return fallback
    try:
        return json.loads(value)
    except ValueError:
        return fallback


def style_doc(kind, f):
    """The text Jev compares. Mirrors buildStyleDoc in ui/src/lib/style-dna.mjs."""
    tags = parse(f.get("tags"), [])
    tags = ", ".join(t for t in tags if isinstance(t, str) and t != "specimen") if isinstance(tags, list) else ""

    def summary(key):
        p = parse(f.get(key), None)
        if isinstance(p, dict):
            return str(p.get("summary") or "").strip()
        return p.strip() if isinstance(p, str) else ""

    if kind == "language":
        tokens = parse(f.get("tokens"), {})
        colors = tokens.get("colors", {}) if isinstance(tokens, dict) else {}
        colors = colors if isinstance(colors, dict) else {}
        palette = ", ".join(f"{r} {colors[r]}" for r in ["primary", "secondary", "accent", "background", "text"] if isinstance(colors.get(r), str) and colors[r])
        layout = parse(f.get("layout_principles"), None)
        imagery = summary("imagery_direction")
        lines = [
            f"design language: {f.get('name') or ''}",
            tags and f"qualities: {tags}",
            summary("philosophy"),
            imagery and f"imagery: {imagery[:300]}",
            layout and f"layout: {json.dumps(layout)[:400]}",
            palette and f"palette: {palette}",
        ]
    else:
        guidance = parse(f.get("guidance"), {})
        dos = guidance.get("do", []) if isinstance(guidance, dict) else []
        dos = " ".join(d for d in dos[:3] if isinstance(d, str))[:400] if isinstance(dos, list) else ""
        recipe = f.get("prompt_template") if isinstance(f.get("prompt_template"), str) else ""
        lines = [
            f"art style: {f.get('name') or ''}",
            tags and f"qualities: {tags}",
            f.get("medium") and f"medium: {f.get('medium')}",
            recipe and f"recipe: {recipe.strip()[:500]}",
            dos and f"do: {dos}",
        ]
    return "\n".join(line for line in lines if line)


class Temper:
    def __init__(self):
        self.api = env("TEMPER_API_URL").rstrip("/")
        self.headers = {"Authorization": f"Bearer {env('TEMPER_API_KEY')}", "X-Tenant-Id": os.environ.get("TEMPER_TENANT", "default")}

    def rows(self, path):
        out, url = [], f"{self.api}/tdata/{path}"
        while url:
            with urllib.request.urlopen(urllib.request.Request(url, headers=self.headers), timeout=120) as res:
                body = json.load(res)
            out += body.get("value", [])
            nxt = body.get("@odata.nextLink")
            url = urllib.parse.urljoin(url, nxt) if nxt else None
        return out

    def attach(self, entity_set, entity_id, body):
        last = ""
        for ns in NAMESPACES:
            req = urllib.request.Request(
                f"{self.api}/tdata/{entity_set}('{entity_id}')/{ns}.AttachAtlasPlace",
                data=json.dumps(body).encode(),
                headers={**self.headers, "Content-Type": "application/json"},
                method="POST",
            )
            try:
                urllib.request.urlopen(req, timeout=60).close()
                return
            except urllib.error.HTTPError as err:
                last = f"{ns} -> {err.code}: {err.read()[:160]!r}"
                if err.code != 404:  # 404 = wrong namespace; anything else is real
                    break
        raise RuntimeError(last)


def ask_jev(key, state, questions):
    body = json.dumps({"state": state, "model": JEV_MODEL, "questions": questions}).encode()
    last = None
    for attempt in range(5):
        if attempt:
            time.sleep(2 ** attempt)
        try:
            req = urllib.request.Request(JEV_URL, data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.load(res)
        except urllib.error.HTTPError as err:
            last = f"HTTP {err.code}: {err.read()[:200]!r}"
            if err.code not in (429, 500, 502, 503, 504):
                break
        except (urllib.error.URLError, TimeoutError) as err:
            last = str(err)
    raise RuntimeError(last)


def fingerprint(doc):
    """What an answer was computed from: the model and the exact text compared."""
    return hashlib.sha256(f"{JEV_MODEL}\n{doc}".encode()).hexdigest()[:12]


def ask_pairs(items, work):
    """Every pair once. The checkpoint is keyed by entity id and read in either order, so a library that grew or came back in another order resumes cleanly."""
    key = env("TYPESAFE_API_KEY")
    out = work / "pairs.jsonl"
    sim = {}
    ids = [it["id"] for it in items]
    prints = {it["id"]: fingerprint(it["doc"]) for it in items}
    if out.exists():
        # An answer is reused only if both styles still read as they did and the
        # model is the same; an edited style or a new model is asked again.
        for line in out.read_text().splitlines():
            a, b, s, fa, fb = json.loads(line)
            if prints.get(a) == fa and prints.get(b) == fb:
                sim[(a, b)] = sim[(b, a)] = s
    todo = []
    for i, a in enumerate(ids):
        rest = [j for j in range(i + 1, len(ids)) if (a, ids[j]) not in sim]
        todo += [(i, rest[k : k + BATCH]) for k in range(0, len(rest), BATCH)]
    print(f"{len(items)} styles, {len(ids) * (len(ids) - 1) // 2} pairs, {len(todo)} calls to make", flush=True)

    def run(task):
        i, js = task
        questions = {f"j{j}": {"type": "noul", "instructions": QUESTION + items[j]["doc"][:420]} for j in js}
        res = ask_jev(key, "Style A:\n" + items[i]["doc"][:700], questions)
        return [(ids[i], ids[j], round(res["answers"][f"j{j}"]["noul"], 3)) for j in js], res.get("usage", {}).get("input_tokens", 0)

    tokens, started = 0, time.time()
    with ThreadPoolExecutor(WORKERS) as pool, out.open("a") as f:
        for n, (answers, used) in enumerate(pool.map(run, todo)):
            for a, b, s in answers:
                sim[(a, b)] = sim[(b, a)] = s
                f.write(json.dumps([a, b, s, prints[a], prints[b]]) + "\n")
            tokens += used
            if n % 200 == 0:
                f.flush()
                print(f"  {n}/{len(todo)} calls, {round(time.time() - started)}s, ≈ ${tokens / 1e6 * 0.042:.3f}", flush=True)
    print(f"asked: {tokens} input tokens ≈ ${tokens / 1e6 * 0.042:.3f}")
    return sim


def spread(xy):
    """Push overlapping tiles apart along their shorter overlap, a little per pass, then rescale to 0..1."""
    import numpy as np

    xy = xy.copy()
    for _ in range(400):
        dx = xy[:, None, 0] - xy[None, :, 0]
        dy = xy[:, None, 1] - xy[None, :, 1]
        ox = TILE[0] - np.abs(dx)
        oy = TILE[1] - np.abs(dy)
        hit = (ox > 0) & (oy > 0)
        np.fill_diagonal(hit, False)
        if not hit.any():
            break
        along_x = hit & (ox / TILE[0] <= oy / TILE[1])
        along_y = hit & ~along_x
        # Two styles at one point have no direction; index order gives them one.
        sx = np.where(dx == 0, np.sign(np.arange(len(xy))[:, None] - np.arange(len(xy))[None, :]), np.sign(dx))
        sy = np.where(dy == 0, np.sign(np.arange(len(xy))[:, None] - np.arange(len(xy))[None, :]), np.sign(dy))
        xy[:, 0] += (along_x * ox * sx).sum(1) * 0.25
        xy[:, 1] += (along_y * oy * sy).sum(1) * 0.25
    span = xy.max(0) - xy.min(0)
    # One scale for both axes: stretching one would reopen the overlaps.
    return (xy - xy.min(0)) / span.max()


def lay_out(items, sim):
    import numpy as np
    from sklearn.cluster import AgglomerativeClustering
    from sklearn.manifold import TSNE

    n = len(items)
    S = np.eye(n)
    for i in range(n):
        for j in range(i + 1, n):
            S[i, j] = S[j, i] = sim[(items[i]["id"], items[j]["id"])]
    D = 1 - S
    xy = TSNE(n_components=2, metric="precomputed", init="random", perplexity=min(18, max(2, (n - 1) // 3)), random_state=7, max_iter=2000).fit_transform(D)
    span = xy.max(0) - xy.min(0)
    xy = spread((xy - xy.min(0)) / np.where(span > 0, span, 1))
    labels = AgglomerativeClustering(n_clusters=None, distance_threshold=DISTANCE_CUT, metric="precomputed", linkage="average").fit_predict(D)
    sizes = collections.Counter(labels.tolist())
    medoid = {}
    for c, size in sizes.items():
        if size >= FAMILY_MIN:
            members = [i for i in range(n) if labels[i] == c]
            medoid[c] = items[max(members, key=lambda i: S[i, members].mean())]["id"]
    kept = []
    places = []
    for i in range(n):
        order = [j for j in np.argsort(-S[i]).tolist() if j != i][:NEIGHBORS]
        on_map = set(np.argsort(((xy - xy[i]) ** 2).sum(1)).tolist()[1:16])
        kept.append(len(set(order[:5]) & on_map) / 5)
        places.append(
            {
                "atlas_x": f"{xy[i, 0]:.4f}",
                "atlas_y": f"{xy[i, 1]:.4f}",
                "atlas_family": medoid.get(int(labels[i]), ""),
                "atlas_neighbors": json.dumps([[items[j]["id"], round(float(S[i, j]), 2)] for j in order]),
            }
        )
    in_family = sum(1 for p in places if p["atlas_family"])
    print(f"laid out: {len(medoid)} families holding {in_family} of {n}; {np.mean(kept):.0%} of each style's 5 nearest stay among its 15 nearest on the map")
    return places


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--work", required=True, help="directory for the pairwise checkpoint")
    ap.add_argument("--apply", action="store_true", help="attach places (default: dry run)")
    ap.add_argument("--any-status", action="store_true", help="include unpublished rows (a local stack whose seed stops at Draft)")
    args = ap.parse_args()
    work = pathlib.Path(args.work)
    work.mkdir(parents=True, exist_ok=True)

    temper = Temper()
    flt = "" if args.any_status else "$filter=" + urllib.parse.quote("Status eq 'Published'") + "&"
    items = []
    for kind, entity_set in SETS:
        for row in temper.rows(f"{entity_set}?{flt}$top=500"):
            fields = row.get("fields") or {}
            if fields.get("name"):
                items.append({"id": row["entity_id"], "set": entity_set, "doc": style_doc(kind, fields)})
    if len(items) < 8:
        sys.exit(f"only {len(items)} styles — too few to lay out")

    places = lay_out(items, ask_pairs(items, work))
    version = f"atlas/{JEV_MODEL}/{datetime.date.today().isoformat()}"
    (work / "places.json").write_text(json.dumps({"version": version, "places": dict(zip((i["id"] for i in items), places))}, indent=1))
    if not args.apply:
        print(f"dry run: {len(places)} places written to {work / 'places.json'}; pass --apply to attach as {version}")
        return
    failed = 0
    for item, place in zip(items, places):
        try:
            temper.attach(item["set"], item["id"], {**place, "atlas_version": version})
        except RuntimeError as err:
            failed += 1
            print(f"  FAILED {item['set']} {item['id']}: {err}", file=sys.stderr)
    print(f"attached {len(places) - failed} places as {version}; {failed} failed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
