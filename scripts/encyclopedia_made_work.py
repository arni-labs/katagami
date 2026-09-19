#!/usr/bin/env python3
"""Propose where the library's made work sits in the encyclopedia. Proposes; never writes a cell.

Each published design language and art style is put beside every cell of the
art and design maps that names a direction (roots and container headings are
left out: they are true of everything under them), and Typesafe Jev answers one
strict noul per cell — "would a knowledgeable curator call this work a clear
example of it, not merely related?". Every cell is asked, so no early wrong turn
down the tree can hide one; at Jev's price that is about a dollar for the whole
library. Jev only ever chooses among cells the encyclopedia already holds, each
of which a source put there; it cannot mint a cell, and its answer is not a
citation. A proposed manifestation still needs the owner's approval and goes
through the cell contract like any other (see the encyclopedia-populate skill):
this script's output is the proposal.

Output, in --work:
  placements.json  per style, its best cells with path and score, split into
                   `propose` (score >= PROPOSE_AT), `curator` (the ambiguous
                   middle, for a person) and nothing at all below that.
  uncharted.json   cells no style reached and none already manifests, grouped
                   under the root they hang from: directions the encyclopedia
                   names that the library has made no work for.

  python3 scripts/encyclopedia_made_work.py --work /tmp/made-work

Checkpointed per style in <work>/walks.jsonl. 457 styles is about 10,000 calls of 60 questions.

Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default"),
     TYPESAFE_API_KEY, JEV_MODEL (default jev-1.13.0).
"""
import argparse
import collections
import json
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from library_atlas import SETS, Temper, ask_jev, env, fingerprint, style_doc  # noqa: E402

MAPS = {"art", "design"}
BATCH = 60
PROPOSE_AT = 0.75
CURATOR_AT = 0.5  # between the two is the ambiguous middle: a person's call
KEEP = 8  # per style
CONTAINER_KIDS = 10  # a cell with this many narrower cells is a shelf, not a direction
WORKERS = 4


def load_tree(temper):
    cells = {}
    for row in temper.rows("EncyclopediaCells?$top=500"):
        if row.get("status") == "Archived":
            continue
        try:
            doc = json.loads((row.get("fields") or {}).get("document") or "")
        except ValueError:
            continue
        # A cell whose document is not the contract's shape is skipped, not fatal.
        if not isinstance(doc, dict) or not isinstance(doc.get("name"), str):
            continue
        for key in ("maps", "broader", "manifestations"):
            doc[key] = [x for x in doc.get(key) or [] if isinstance(x, dict)] if isinstance(doc.get(key), list) else []
        if any(m.get("map") in MAPS for m in doc["maps"]):
            cells[row["entity_id"]] = doc
    kids = collections.defaultdict(list)
    for cid, doc in cells.items():
        for link in doc.get("broader", []):
            if link.get("cellId") in cells:
                kids[link["cellId"]].append(cid)
    roots = [cid for cid, doc in cells.items() if not any(b.get("cellId") in cells for b in doc.get("broader", []))]
    return cells, kids, roots


def candidates_of(cells, kids, roots):
    """The cells that name a direction a work can be an example of: not the roots,
    not their container headings (Getty's "<styles by region>" guide terms and the
    like), which are true of everything under them and so say nothing."""
    depth = {r: 0 for r in roots}
    queue = list(roots)
    while queue:
        cid = queue.pop(0)
        for kid in kids.get(cid, []):
            if kid not in depth:
                depth[kid] = depth[cid] + 1
                queue.append(kid)
    def names_a_direction(c, d):
        name = cells[c]["name"]
        if name.startswith("<") or "(hierarchy name)" in name or len(kids.get(c, [])) >= CONTAINER_KIDS:
            return False
        return d >= 2 or (d >= 1 and not kids.get(c))

    return sorted(c for c, d in depth.items() if names_a_direction(c, d))


def judge(key, style, cells, candidates):
    """Every candidate cell, asked once, strictly. No walk, so no early wrong turn can hide a cell."""
    state = "A piece of made work in a design library:\n" + style["doc"][:900]
    claims = []
    for at in range(0, len(candidates), BATCH):
        batch = candidates[at : at + BATCH]
        questions = {
            f"c{i}": {
                "type": "noul",
                "instructions": f"A knowledgeable curator would call this work a clear example of the following direction, not merely related to it.\n{cells[c]['name']}: {cells[c].get('description', '')[:200]}",
            }
            for i, c in enumerate(batch)
        }
        answers = ask_jev(key, state, questions)["answers"]
        claims += [{"cell": c, "score": round(answers[f"c{i}"]["noul"], 3)} for i, c in enumerate(batch)]
    return sorted((c for c in claims if c["score"] >= CURATOR_AT), key=lambda r: r["score"], reverse=True)[:KEEP]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--work", required=True)
    ap.add_argument("--limit", type=int, default=0, help="walk only the first N styles (a trial run)")
    args = ap.parse_args()
    work = pathlib.Path(args.work)
    work.mkdir(parents=True, exist_ok=True)
    key = env("TYPESAFE_API_KEY")

    temper = Temper()
    cells, kids, roots = load_tree(temper)
    styles = []
    for kind, entity_set in SETS:
        for row in temper.rows(f"{entity_set}?$filter=Status%20eq%20'Published'&$top=500"):
            fields = row.get("fields") or {}
            if fields.get("name"):
                styles.append({"id": row["entity_id"], "set": entity_set, "name": fields["name"], "doc": style_doc(kind, fields)})
    if args.limit:
        styles = styles[: args.limit]
    candidates = candidates_of(cells, kids, roots)
    print(f"{len(cells)} cells, {len(candidates)} of them name a direction; {len(styles)} styles", flush=True)

    out = work / "walks.jsonl"
    done = {}
    if out.exists():
        for line in out.read_text().splitlines():
            rec = json.loads(line)
            done[(rec["id"], rec.get("print"))] = rec["reached"]
    # A judgment is reused only for the text and model it was made from, against
    # the same set of candidate cells.
    tree_print = fingerprint("\n".join(candidates))
    for style in styles:
        style["print"] = fingerprint(style["doc"] + tree_print)
    todo = [s for s in styles if (s["id"], s["print"]) not in done]

    def run(style):
        try:
            return style, judge(key, style, cells, candidates), None
        except Exception as err:  # noqa: BLE001 — one style's failure must not lose the run; it is reported and retried next run
            return style, None, str(err)

    failed = 0
    with ThreadPoolExecutor(WORKERS) as pool, out.open("a") as f:
        for n, (style, reached, err) in enumerate(pool.map(run, todo)):
            if err:
                failed += 1
                print(f"  FAILED {style['name']}: {err}", file=sys.stderr)
                continue
            done[(style["id"], style["print"])] = reached
            f.write(json.dumps({"id": style["id"], "print": style["print"], "reached": reached}) + "\n")
            if n % 25 == 0:
                f.flush()
                print(f"  {n}/{len(todo)} walked", flush=True)

    already = {(m["entitySet"], m["entityId"], cid) for cid, doc in cells.items() for m in doc.get("manifestations", [])}
    placements = []
    touched = {cid for cid, doc in cells.items() if doc.get("manifestations")}
    for style in styles:
        reached = [r for r in done.get((style["id"], style["print"])) or [] if r["cell"] in cells]
        propose, curator = [], []
        for r in reached:
            if (style["set"], style["id"], r["cell"]) in already:
                continue
            entry = {**r, "cell_name": cells[r["cell"]]["name"], "under": [cells[b["cellId"]]["name"] for b in cells[r["cell"]].get("broader", []) if b.get("cellId") in cells]}
            if r["score"] >= PROPOSE_AT:
                propose.append(entry)
                touched.add(r["cell"])
            elif r["score"] >= CURATOR_AT:
                curator.append(entry)
        placements.append({"id": style["id"], "set": style["set"], "name": style["name"], "propose": propose, "curator": curator})
    (work / "placements.json").write_text(json.dumps(placements, indent=1))

    # Uncharted: leaves nothing manifests and no proposal reached, under their root.
    def root_of(cid, hops=0):
        parents = [b["cellId"] for b in cells[cid].get("broader", []) if b.get("cellId") in cells]
        return cid if not parents or hops > 20 else root_of(parents[0], hops + 1)

    uncharted = collections.defaultdict(list)
    for cid, doc in cells.items():
        if not kids.get(cid) and cid not in touched:
            uncharted[cells[root_of(cid)]["name"]].append({"cell": cid, "name": doc["name"], "description": doc.get("description", "")})
    (work / "uncharted.json").write_text(json.dumps(uncharted, indent=1))

    n_prop = sum(len(p["propose"]) for p in placements)
    n_cur = sum(len(p["curator"]) for p in placements)
    nowhere = sum(1 for p in placements if not p["propose"] and not p["curator"])
    print(f"proposals {n_prop}, for a curator {n_cur}, styles placed nowhere {nowhere}; uncharted leaves {sum(len(v) for v in uncharted.values())} of {sum(1 for c in cells if not kids.get(c))}; failed {failed}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
