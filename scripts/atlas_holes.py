#!/usr/bin/env python3
"""Place the encyclopedia's unmade directions on the library atlas.

A hole is a cell of the art or design maps that names a direction (same rule as
encyclopedia_made_work.py) and carries no made work. Each hole is put beside
every placed style and Typesafe Jev answers one noul per pair: "is this style
the kind of made work nearest to this direction?". A hole whose best answers
reach PLACE_AT sits beside its nearest style, leaning toward the next two, then
takes the nearest free spot clear of the style cards and of other holes. A hole nothing comes near
stays off the map: the atlas is of visual work, and the encyclopedia also names
things (a music genre, a material) no style here approaches.

Holes are named and sourced by the encyclopedia; this script mints nothing. The
output is ui/src/data/atlas-holes.json: coordinates, the cell's id, name and
description, and the atlas_version they were placed against — the page draws
them only beside places of that same run. No style ids are written: the page
finds a hole's neighbours among the styles the viewer may see.

  python3 scripts/atlas_holes.py --work /tmp/holes            # ask + place
Checkpointed per hole in <work>/holes.jsonl.

Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT, TYPESAFE_API_KEY, JEV_MODEL.
"""
import argparse
import json
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from encyclopedia_made_work import candidates_of, load_tree  # noqa: E402
from library_atlas import SETS, TILE, Temper, ask_jev, env, fingerprint, parse  # noqa: E402

BATCH = 115
WORKERS = 6
PLACE_AT = 0.55
OUT = pathlib.Path(__file__).parent.parent / "ui/src/data/atlas-holes.json"


def short_doc(kind, f):
    tags = parse(f.get("tags"), [])
    tags = ", ".join(t for t in tags[:8] if isinstance(t, str)) if isinstance(tags, list) else ""
    p = parse(f.get("philosophy"), None)
    summary = (p.get("summary") if isinstance(p, dict) else "") or (f.get("prompt_template") if kind == "art_style" else "") or ""
    return f"{f.get('name')} — {tags}. {str(summary)[:140]}"


def clip(text, n):
    if len(text) <= n:
        return text
    cut = text[:n]
    return cut[: max(cut.rfind(" "), n - 30)].rstrip(" ,;:.") + "…"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--work", required=True)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    work = pathlib.Path(args.work)
    work.mkdir(parents=True, exist_ok=True)
    key = env("TYPESAFE_API_KEY")
    temper = Temper()

    styles, versions = [], {}
    for kind, entity_set in SETS:
        for row in temper.rows(f"{entity_set}?$filter=Status%20eq%20'Published'&$top=500"):
            f = row.get("fields") or {}
            try:
                x, y = float(f.get("atlas_x")), float(f.get("atlas_y"))
            except (TypeError, ValueError):
                continue
            versions[f.get("atlas_version")] = versions.get(f.get("atlas_version"), 0) + 1
            styles.append({"id": row["entity_id"], "x": x, "y": y, "v": f.get("atlas_version"), "doc": short_doc(kind, f)})
    version = max(versions, key=versions.get)
    styles = [s for s in styles if s["v"] == version]

    cells, kids, roots = load_tree(temper)
    holes = [c for c in candidates_of(cells, kids, roots) if not cells[c].get("manifestations")]
    if args.limit:
        holes = holes[: args.limit]
    print(f"{len(styles)} placed styles ({version}); {len(holes)} holes to try", flush=True)

    out = work / "holes.jsonl"
    styles_print = fingerprint("\n".join(s["id"] + s["doc"] for s in styles))
    done = {}
    if out.exists():
        for line in out.read_text().splitlines():
            rec = json.loads(line)
            if rec.get("print") == styles_print:
                done[rec["cell"]] = rec["near"]

    def run(cid):
        state = f"A named direction in art and design:\n{cells[cid]['name']}: {cells[cid].get('description', '')[:400]}"
        near = []
        try:
            for at in range(0, len(styles), BATCH):
                batch = styles[at : at + BATCH]
                qs = {f"s{i}": {"type": "noul", "instructions": "The following made work is a close neighbour of this direction: a designer asked for the direction would accept it as nearly that.\n" + s["doc"]} for i, s in enumerate(batch)}
                ans = ask_jev(key, state, qs)["answers"]
                near += [(round(ans[f"s{i}"]["noul"], 3), s["id"]) for i, s in enumerate(batch)]
        except Exception as err:  # noqa: BLE001 — one hole's failure must not lose the run; it is retried next run
            return cid, None, str(err)
        return cid, sorted(near, reverse=True)[:5], None

    failed = 0
    todo = [c for c in holes if c not in done]
    with ThreadPoolExecutor(WORKERS) as pool, out.open("a") as f:
        for n, (cid, near, err) in enumerate(pool.map(run, todo)):
            if err:
                failed += 1
                print(f"  FAILED {cells[cid]['name']}: {err}", file=sys.stderr)
                continue
            done[cid] = near
            f.write(json.dumps({"cell": cid, "print": styles_print, "near": near}) + "\n")
            if n % 50 == 0:
                f.flush()
                print(f"  {n}/{len(todo)} holes asked", flush=True)

    by_id = {s["id"]: s for s in styles}
    placed = []
    for cid in holes:
        near = [(n, i) for n, i in (done.get(cid) or []) if i in by_id][:3]
        if not near or near[0][0] < PLACE_AT:
            continue
        total = sum(n for n, _ in near)
        placed.append(
            {
                "id": cid,
                "name": cells[cid]["name"],
                "description": clip(cells[cid].get("description", ""), 220),
                # Beside its single nearest style, leaning toward the next two. The
                # plain centre of three styles that lie far apart is a spot on the
                # paper near none of them — and the page reads a hole's neighbours
                # off the paper.
                "x": 0.8 * by_id[near[0][1]]["x"] + 0.2 * sum(n * by_id[i]["x"] for n, i in near) / total,
                "y": 0.8 * by_id[near[0][1]]["y"] + 0.2 * sum(n * by_id[i]["y"] for n, i in near) / total,
                "nearness": near[0][0],
            }
        )
    # Seat each hole in the free spot nearest where it wants to be, the surest
    # holes first: a spiral outward from its target, a fraction of a card per
    # step, taking the first spot clear of every style card (which do not move)
    # and every hole already seated. Pushing overlapping holes apart pairwise
    # did not converge where a dozen directions crowd one style, and left a
    # third of them stacked where the page could never draw them.
    import math

    taken = [(s["x"], s["y"]) for s in styles]
    placed.sort(key=lambda h: -h["nearness"])

    def clear(x, y):
        # A hair more than a card, so rounding the coordinates cannot reopen an overlap.
        return all(abs(x - ox) >= TILE[0] * 1.02 or abs(y - oy) >= TILE[1] * 1.02 for ox, oy in taken)

    seated = []
    for h in placed:
        spot = None
        for ring in range(0, 400):
            radius = ring * TILE[1] * 0.5
            steps = max(1, int(2 * math.pi * radius / (TILE[0] * 0.5)))
            for t in range(steps):
                angle = 2 * math.pi * t / steps
                x, y = h["x"] + radius * math.cos(angle) * TILE[0] / TILE[1], h["y"] + radius * math.sin(angle)
                if -0.04 <= x <= 1.04 and -0.04 <= y <= 1.04 and clear(x, y):
                    spot = (x, y)
                    break
            if spot:
                break
        if not spot:
            sys.exit(f"no free spot found for {h['name']} — the paper is full; raise PLACE_AT")
        h["x"], h["y"] = spot
        taken.append(spot)
        seated.append(h)
    placed = seated
    overlaps = sum(1 for i, a in enumerate(placed) for b in placed[i + 1 :] if abs(a["x"] - b["x"]) < TILE[0] and abs(a["y"] - b["y"]) < TILE[1])
    if overlaps:
        sys.exit(f"{overlaps} holes still overlap after seating")
    for h in placed:
        h["x"], h["y"], h["nearness"] = round(h["x"], 4), round(h["y"], 4), round(h["nearness"], 2)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"atlas_version": version, "holes": placed}, indent=1, ensure_ascii=False) + "\n")
    print(f"placed {len(placed)} of {len(holes)} holes beside made work; {failed} failed; wrote {OUT}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
