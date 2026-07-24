#!/usr/bin/env python3
"""Pull taste vectors + metadata for the three Katagami lanes from the prod OData API.

Each OData row carries the entity under a ``fields`` dict. ``taste_vector`` and the
list-valued fields (tags, proof/reference file ids) arrive either already-parsed or as
JSON strings, so ``maybe_json`` normalises both. We keep only the keys the atlas needs.

Output: data/entities.json  (one list, all lanes), cached so re-runs are offline.
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://openpaw-production.up.railway.app/tdata"
TENANT = "default"
LANES = {
    "DesignLanguages": {"lane": "language", "route": "language"},
    "PaletteSystems": {"lane": "palette", "route": "palettes"},
    "ArtStyles": {"lane": "artstyle", "route": "art-styles"},
}
HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
DATA.mkdir(parents=True, exist_ok=True)


def api_key() -> str:
    k = os.environ.get("TEMPER_API_KEY")
    if k:
        return k
    env = Path.home() / "Development/katagami/.env.katagami-curator.local"
    for line in env.read_text().splitlines():
        if line.startswith("TEMPER_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("TEMPER_API_KEY not found")


def get(url: str, key: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {key}", "X-Tenant-Id": TENANT},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 - transient network
            if attempt == 3:
                raise
            time.sleep(1.5 * (attempt + 1))
            print(f"  retry {attempt+1} ({e})", file=sys.stderr)
    return {}


def maybe_json(s):
    if isinstance(s, str) and s and s[0] in "[{":
        try:
            return json.loads(s)
        except Exception:  # noqa: BLE001
            return None
    return s


def parse_row(fields: dict, meta: dict) -> dict | None:
    vec = maybe_json(fields.get("taste_vector"))
    if not isinstance(vec, list) or not vec:
        return None
    eid = fields.get("Id")
    name = fields.get("name")
    if not eid or not name:
        return None
    return {
        "lane": meta["lane"],
        "id": eid,
        "name": name,
        "slug": fields.get("slug"),
        "tags": maybe_json(fields.get("tags")) or [],
        "medium": fields.get("medium"),
        "vec": [float(x) for x in vec],
        "vec_model": fields.get("taste_vector_model"),
        "page_url": f"https://katagami.ai/{meta['route']}/{eid}",
        "thumb_url": fields.get("thumbnail_asset_url") or None,
        "proof_ids": maybe_json(fields.get("proof_shots_file_ids")) or [],
        "ref_ids": maybe_json(fields.get("reference_image_file_ids")) or [],
    }


def main():
    key = api_key()
    out = []
    for setname, meta in LANES.items():
        flt = urllib.parse.quote("status eq 'Published'", safe="'")
        url = f"{BASE}/{setname}?$filter={flt}&$top=1000"
        page = 0
        got = 0
        while url:
            page += 1
            data = get(url, key)
            rows = data.get("value", [])
            for row in rows:
                fields = row.get("fields")
                if not isinstance(fields, dict):
                    continue
                rec = parse_row(fields, meta)
                if rec:
                    out.append(rec)
                    got += 1
            url = data.get("@odata.nextLink")
            if url and not url.startswith("http"):
                url = f"{BASE}/{url}"
        print(f"{setname}: {got} published entities with vectors ({page} page(s))")
    (DATA / "entities.json").write_text(json.dumps(out))
    dims = {len(r["vec"]) for r in out}
    models = {r["vec_model"] for r in out}
    print(f"TOTAL: {len(out)}  vec dims={dims}  models={models}")
    print(f"wrote {DATA / 'entities.json'}")


if __name__ == "__main__":
    main()
