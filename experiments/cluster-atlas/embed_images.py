#!/usr/bin/env python3
"""Stage 2: local visual embeddings for art styles.

Text taste_vectors embed the *description*, so two art styles that look identical
but are worded differently read as far apart. This embeds each art style's
representative rendered image with a local open model (SigLIP2, CLIP fallback --
no paid key) so we can find the visual duplicates the text vectors miss.

  python3 embed_images.py            # all art styles (downloads + caches images)
  python3 embed_images.py --limit 6  # smoke test on a handful

Output: data/image_vectors.json  (id, name, url, img_url, vec, model), cached and
resumable -- re-runs skip anything already embedded.
"""
import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
IMG = HERE / "image_data"
IMG.mkdir(parents=True, exist_ok=True)
FILE_BASE = "https://katagami.ai/api/file/"

CANDIDATE_MODELS = [
    ("siglip2", "google/siglip2-base-patch16-224"),
    ("clip", "openai/clip-vit-base-patch32"),
]


def image_url(rec):
    if rec.get("thumb_url"):
        return rec["thumb_url"]
    for key in ("proof_ids", "ref_ids"):
        ids = rec.get(key) or []
        if ids:
            return FILE_BASE + ids[0]
    return None


def download(url, dest: Path):
    if dest.exists() and dest.stat().st_size > 500:
        return True
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "katagami-atlas/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                dest.write_bytes(r.read())
            return dest.stat().st_size > 500
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                print(f"    download failed {url}: {e}", file=sys.stderr)
                return False
            time.sleep(1.5 * (attempt + 1))
    return False


def load_model():
    import torch
    from transformers import AutoModel, AutoProcessor

    last = None
    for tag, name in CANDIDATE_MODELS:
        try:
            print(f"loading {name} ...", flush=True)
            proc = AutoProcessor.from_pretrained(name)
            model = AutoModel.from_pretrained(name).eval()
            return tag, name, proc, model, torch
        except Exception as e:  # noqa: BLE001
            print(f"  {name} unavailable: {e}", file=sys.stderr)
            last = e
    raise SystemExit(f"no image model could be loaded: {last}")


def embed(proc, model, torch, pil_img):
    inputs = proc(images=pil_img, return_tensors="pt")
    with torch.no_grad():
        out = model.get_image_features(**inputs)
    # CLIP returns a tensor; SigLIP returns an output object with pooled features
    if hasattr(out, "pooler_output") and out.pooler_output is not None:
        t = out.pooler_output
    elif hasattr(out, "last_hidden_state"):
        t = out.last_hidden_state.mean(dim=1)
    else:
        t = out
    v = t[0].float().numpy()
    n = np.linalg.norm(v)
    return (v / n if n else v).tolist()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    from PIL import Image

    records = [r for r in json.loads((DATA / "entities.json").read_text())
               if r["lane"] == "artstyle"]
    if args.limit:
        records = records[: args.limit]

    out_path = DATA / "image_vectors.json"
    done = {}
    if out_path.exists():
        done = {r["id"]: r for r in json.loads(out_path.read_text())}

    tag, name, proc, model, torch = load_model()
    print(f"model: {name} (tag={tag}); {len(records)} art styles, "
          f"{len(done)} already embedded", flush=True)

    results = list(done.values())
    n_new = n_fail = 0
    for i, rec in enumerate(records):
        if rec["id"] in done and done[rec["id"]].get("model") == name:
            continue
        url = image_url(rec)
        if not url:
            n_fail += 1
            continue
        dest = IMG / (rec["id"] + ".img")
        if not download(url, dest):
            n_fail += 1
            continue
        try:
            img = Image.open(dest).convert("RGB")
            vec = embed(proc, model, torch, img)
        except Exception as e:  # noqa: BLE001
            print(f"    embed failed {rec['name']}: {e}", file=sys.stderr)
            n_fail += 1
            continue
        results = [r for r in results if r["id"] != rec["id"]]
        results.append({
            "id": rec["id"], "name": rec["name"], "url": rec["page_url"],
            "img_url": url, "vec": vec, "model": name,
        })
        n_new += 1
        if n_new % 10 == 0:
            out_path.write_text(json.dumps(results))
            print(f"  {i+1}/{len(records)}  embedded={n_new} failed={n_fail}", flush=True)

    out_path.write_text(json.dumps(results))
    dims = {len(r["vec"]) for r in results}
    print(f"DONE: {len(results)} vectors  new={n_new} failed={n_fail}  dims={dims}")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
