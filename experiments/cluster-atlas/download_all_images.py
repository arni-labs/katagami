#!/usr/bin/env python3
"""Download every proof/reference image for all art styles (multi-image lever).

The baseline embedded ONE representative thumbnail per style. To test
multi-proof-shot averaging we need every proof shot / reference image. This
downloads all unique file ids (thumb + proof_ids + ref_ids) per art style into
multi_image_data/<file_id>.img, keyed by file id, cached and resumable.

Also writes data/style_images.json: {style_id: {thumb: id, images: [ids...]}}
so the embedding step knows which images belong to which style.
"""
import concurrent.futures as cf
import json
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
IMG = HERE / "multi_image_data"
IMG.mkdir(parents=True, exist_ok=True)
FILE_BASE = "https://katagami.ai/api/file/"


def thumb_id(rec):
    t = rec.get("thumb_url")
    return t.rsplit("/", 1)[-1] if t else None


def _as_list(v):
    if v is None:
        return []
    if isinstance(v, str):
        return [v]
    return list(v)


def style_images(rec):
    """Ordered unique image ids for a style: thumb first, then proofs, then refs."""
    ids = []
    seen = set()
    cands = [thumb_id(rec)] + _as_list(rec.get("proof_ids")) + _as_list(rec.get("ref_ids"))
    for cand in cands:
        if cand and cand not in seen:
            seen.add(cand)
            ids.append(cand)
    return ids


def download(fid):
    dest = IMG / (fid + ".img")
    if dest.exists() and dest.stat().st_size > 500:
        return fid, True, "cached"
    url = FILE_BASE + fid
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "katagami-atlas/1.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                dest.write_bytes(r.read())
            if dest.stat().st_size > 500:
                return fid, True, "downloaded"
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                return fid, False, str(e)
            time.sleep(1.5 * (attempt + 1))
    return fid, False, "too-small"


def main():
    art = [r for r in json.loads((DATA / "entities.json").read_text())
           if r.get("lane") == "artstyle"]
    manifest = {}
    all_ids = set()
    for r in art:
        imgs = style_images(r)
        manifest[r["id"]] = {"name": r["name"], "thumb": thumb_id(r), "images": imgs}
        all_ids.update(imgs)
    (DATA / "style_images.json").write_text(json.dumps(manifest))
    print(f"{len(art)} styles, {len(all_ids)} unique images", flush=True)

    ok = fail = 0
    failures = []
    with cf.ThreadPoolExecutor(max_workers=10) as ex:  # <=10 concurrent
        futs = [ex.submit(download, fid) for fid in sorted(all_ids)]
        for i, fut in enumerate(cf.as_completed(futs)):
            fid, good, why = fut.result()
            if good:
                ok += 1
            else:
                fail += 1
                failures.append((fid, why))
            if (i + 1) % 50 == 0:
                print(f"  {i+1}/{len(all_ids)}  ok={ok} fail={fail}", flush=True)
    print(f"DONE ok={ok} fail={fail}", flush=True)
    for fid, why in failures[:20]:
        print(f"  FAIL {fid}: {why}", file=sys.stderr)


if __name__ == "__main__":
    main()
