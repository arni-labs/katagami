#!/usr/bin/env python3
"""Live local end-to-end proof for ARN-148 lane deep verification.

Drives the REAL production flow against a locally served Temper with paw-fs +
katagami-commons + katagami-curation installed and the actual
finalize_spawned_session WASM registered:

  real image Files (PUT $value) -> ArtStyle (SubmitArtStyle)
  -> CurationJob Start -> CompleteArtStyleSynthesis (fires the finalizer WASM)
  -> assert ArtStyle Published (happy) / job Failed + style unpublished (fake image)

  plus the PaletteSystem happy/reject pair.
"""
import io
import os
import json
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3901")
TENANT = os.environ.get("E2E_TENANT", "katagami")
HDRS = {
    "X-Tenant-Id": TENANT,
    "x-temper-principal-kind": "agent",
    "x-temper-principal-id": "e2e-driver",
    "x-temper-agent-type": "system",
}

PASS, FAIL = [], []


def report(name, ok, detail=""):
    (PASS if ok else FAIL).append(name)
    print(("PASS  " if ok else "FAIL  ") + name + (f"  -- {detail}" if detail else ""))


def req(method, path, body=None, content_type="application/json", raw_response=False):
    data = None
    if body is not None:
        data = body if isinstance(body, (bytes, bytearray)) else json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=data, method=method)
    for k, v in HDRS.items():
        r.add_header(k, v)
    if body is not None:
        r.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(r, timeout=300) as resp:
            payload = resp.read()
            if raw_response:
                return resp.status, payload
            return resp.status, json.loads(payload) if payload.strip() else {}
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            return e.code, json.loads(payload)
        except Exception:
            return e.code, {"raw": payload.decode(errors="replace")[:400]}


def entity_id_of(body):
    for key in ("Id", "id", "entity_id"):
        if isinstance(body, dict) and body.get(key):
            return body[key]
    raise AssertionError(f"no id in {json.dumps(body)[:300]}")


def get_entity(set_name, eid):
    st, body = req("GET", f"/tdata/{set_name}('{eid}')")
    assert st == 200, (set_name, eid, st, body)
    return body


def entity_status(body):
    for key in ("Status", "status", "State"):
        if key in body:
            return body[key]
    fields = body.get("fields") or {}
    return fields.get("Status") or fields.get("status") or ""


def act(set_name, eid, action, params=None):
    return req("POST", f"/tdata/{set_name}('{eid}')/Temper.{action}", params or {})


def must_act(set_name, eid, action, params=None):
    st, body = act(set_name, eid, action, params)
    assert 200 <= st < 300, f"{set_name}({eid}).{action} -> {st}: {json.dumps(body)[:400]}"
    return body


def upload_wasm(name, path):
    blob = open(path, "rb").read()
    st, body = req("POST", f"/api/wasm/modules/{name}", blob, "application/wasm")
    assert 200 <= st < 300, (name, st, body)
    print(f"  wasm '{name}' uploaded ({len(blob)} bytes)")


def set_secret(key, value):
    st, body = req("PUT", f"/api/tenants/{TENANT}/secrets/{key}", {"value": value})
    assert 200 <= st < 300, (key, st, body)
    print(f"  secret '{key}' set")


def make_file(name, payload, mime):
    st, body = req("POST", "/tdata/Files", {"Name": name, "Path": f"/e2e/{name}", "MimeType": mime})
    assert 200 <= st < 300, (name, st, body)
    fid = entity_id_of(body)
    st, body = req("PUT", f"/tdata/Files('{fid}')/$value", payload, mime)
    assert 200 <= st < 300, ("$value", name, st, body)
    for _ in range(20):
        ent = get_entity("Files", fid)
        if entity_status(ent) in ("Ready", "Locked"):
            return fid
        time.sleep(0.5)
    raise AssertionError(f"file {name} never became Ready: {json.dumps(ent)[:300]}")


def wait_fields(set_name, eid, field_names, timeout=15):
    """Poll until the entity's just-written fields are visible through the query
    projection (read-after-write on a fresh local server can lag the dispatch)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        ent = get_entity(set_name, eid)
        fields = ent.get("fields") or {}
        if all(fields.get(name) for name in field_names):
            return
        time.sleep(0.5)
    raise AssertionError(f"{set_name}({eid}) fields {field_names} never became visible")


def jpeg_bytes():
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (64, 48), (244, 240, 230))
    d = ImageDraw.Draw(img)
    d.ellipse([10, 8, 50, 40], fill=(40, 52, 84))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=82)
    return buf.getvalue()


def run_art_style_case(label, ref_payloads, expect_published):
    """ref_payloads: list of (bytes, mime) used as reference images."""
    jpg = jpeg_bytes()
    ref_ids = [make_file(f"{label}-ref-{i}.jpg", p, m) for i, (p, m) in enumerate(ref_payloads)]
    proof_ids = [make_file(f"{label}-proof-{s}.jpg", jpg, "image/jpeg") for s in ("portrait", "landscape", "object", "pattern")]
    thumb_id = make_file(f"{label}-thumb.jpg", jpg, "image/jpeg")

    st, body = req("POST", "/tdata/ArtStyles", {})
    assert 200 <= st < 300, (st, body)
    art_id = entity_id_of(body)
    must_act("ArtStyles", art_id, "SubmitArtStyle", {
        "name": f"E2E {label}",
        "slug": f"e2e-{label}",
        "medium": "print",
        "prompt_template": "{subject}, two-color e2e print, {palette}, coarse grain",
        "negative_prompt": "photorealistic",
        "engine_hints": json.dumps({"recraft": "style: print"}),
        "slot_recipes": json.dumps({"hero": "wide establishing scene", "avatar": "portrait bust"}),
        "guidance": "e2e guidance",
        "reference_image_file_ids": ref_ids,
        "reference_manifest": json.dumps({"items": [{"file_id": i, "role": "reference", "aspect": "1:1"} for i in ref_ids]}),
        "proof_shots_file_ids": proof_ids,
        "proof_shots_manifest": json.dumps({"items": [
            {"file_id": i, "subject": s} for i, s in zip(proof_ids, ("portrait", "landscape", "object", "pattern"))
        ]}),
        "thumbnail_file_id": thumb_id,
        "parent_ids": [],
        "lineage_type": "original",
        "generation_number": "0",
        "model_provenance": json.dumps({"style": {"model": "e2e"}, "images": {"model": "procedural-pil", "provider": "local", "tool": "PIL"}}),
        "credits": json.dumps([{"name": "E2E tradition", "kind": "tradition", "note": "local run"}]),
        "tags": json.dumps(["e2e"]),
        "direction_id": "",
        "curator_notes": "local e2e",
    })

    wait_fields("ArtStyles", art_id, ["prompt_template", "thumbnail_file_id", "credits"])

    st, body = req("POST", "/tdata/CurationJobs", {"ArtStyleIds": json.dumps([art_id])})
    assert 200 <= st < 300, (st, body)
    job_id = entity_id_of(body)
    must_act("CurationJobs", job_id, "Configure", {"job_type": "synthesize_art_style", "completion_contract": "typed-v1"})
    must_act("CurationJobs", job_id, "Start", {})
    st, body = act("CurationJobs", job_id, "CompleteArtStyleSynthesis", {
        "art_style_ids": json.dumps([art_id]),
        "output": json.dumps({"art_style_ids": [art_id]}),
    })
    print(f"  CompleteArtStyleSynthesis -> HTTP {st}")

    time.sleep(2)
    job = get_entity("CurationJobs", job_id)
    art = get_entity("ArtStyles", art_id)
    job_status, art_status = entity_status(job), entity_status(art)
    err = (job.get("ErrorMessage") or (job.get("fields") or {}).get("error_message") or "")[:200]

    if expect_published:
        report(f"art_style/{label}: job Completed", job_status == "Completed", f"job={job_status} err={err}")
        report(f"art_style/{label}: style Published", art_status == "Published", f"style={art_status}")
    else:
        report(f"art_style/{label}: job Failed", job_status == "Failed", f"job={job_status}")
        report(f"art_style/{label}: rejection names the fake image", "lane_file_not_image" in err, f"err={err}")
        report(f"art_style/{label}: style NOT published", art_status != "Published", f"style={art_status}")
    return job_id, art_id


def run_palette_case(label, tokens_payload, expect_published):
    jpg = jpeg_bytes()
    tokens_id = make_file(f"{label}-tokens.css", tokens_payload.encode(), "text/plain")
    thumb_id = make_file(f"{label}-pthumb.jpg", jpg, "image/jpeg")

    st, body = req("POST", "/tdata/PaletteSystems", {})
    assert 200 <= st < 300, (st, body)
    pal_id = entity_id_of(body)
    flat = {"bg": "#faf7f0", "surface": "#ffffff", "ink": "#1c1a16", "muted": "#6b655a",
            "accent": "#7c6f57", "error": "#b3402f", "warning": "#b3862f", "success": "#3f7a4e"}
    must_act("PaletteSystems", pal_id, "SubmitPaletteSystem", {
        "name": f"E2E {label}", "slug": f"e2e-{label}",
        "signature": json.dumps([{"hex": "#7c6f57", "name": "Ochre ink"}]),
        "neutrals": json.dumps({k: v for k, v in flat.items() if k in ("bg", "surface", "ink", "muted")}),
        "semantic": json.dumps({k: v for k, v in flat.items() if k in ("error", "warning", "success")}),
        "mood": json.dumps({"words": ["calm", "warm"]}),
        "ramps": json.dumps({"accent": ["#efe9dd", "#cbbfa4", "#7c6f57", "#4e4636"]}),
        "proof_scenes": json.dumps({"dashboard": "e2e"}),
        "usage_guidance": json.dumps({"do": ["use warm neutrals"], "dont": ["no neon"]}),
        "tokens_export_file_id": tokens_id,
        "tokens_export_format_version": "tokens-v1",
        "tokens_export_manifest": json.dumps({"keys": list(flat.keys()), "css_var_prefix": "--ds-"}),
        "thumbnail_file_id": thumb_id,
        "parent_ids": [], "lineage_type": "original", "generation_number": "0",
        "model_provenance": json.dumps({"style": {"model": "e2e"}}),
        "credits": json.dumps([{"name": "E2E tradition", "kind": "tradition"}]),
        "tags": json.dumps(["e2e"]), "direction_id": "", "curator_notes": "local e2e",
    })

    wait_fields("PaletteSystems", pal_id, ["tokens_export_file_id", "thumbnail_file_id", "signature"])

    st, body = req("POST", "/tdata/CurationJobs", {"PaletteSystemIds": json.dumps([pal_id])})
    job_id = entity_id_of(body)
    must_act("CurationJobs", job_id, "Configure", {"job_type": "synthesize_palette", "completion_contract": "typed-v1"})
    must_act("CurationJobs", job_id, "Start", {})
    st, body = act("CurationJobs", job_id, "CompletePaletteSynthesis", {
        "palette_system_ids": json.dumps([pal_id]),
        "output": json.dumps({"palette_system_ids": [pal_id]}),
    })
    print(f"  CompletePaletteSynthesis -> HTTP {st}")

    time.sleep(2)
    job = get_entity("CurationJobs", job_id)
    pal = get_entity("PaletteSystems", pal_id)
    job_status, pal_status = entity_status(job), entity_status(pal)
    err = (job.get("ErrorMessage") or (job.get("fields") or {}).get("error_message") or "")[:200]

    if expect_published:
        report(f"palette/{label}: job Completed", job_status == "Completed", f"job={job_status} err={err}")
        report(f"palette/{label}: palette Published", pal_status == "Published", f"palette={pal_status}")
    else:
        report(f"palette/{label}: job Failed", job_status == "Failed", f"job={job_status}")
        report(f"palette/{label}: rejection names the tokens export", "palette_tokens_export_invalid" in err, f"err={err}")
        report(f"palette/{label}: palette NOT published", pal_status != "Published", f"palette={pal_status}")


def main():
    wasm_dir = os.path.join(os.path.dirname(__file__), "..", "..", "wasm")
    print("== stage 0: wasm modules + secrets ==")
    upload_wasm("blob_adapter", os.environ.get("PAW_FS_BLOB_ADAPTER", os.path.expanduser("~/Development/temperpaw/os-apps/paw-fs/wasm/blob_adapter.wasm")))
    upload_wasm("finalize_spawned_session", f"{wasm_dir}/finalize_spawned_session/finalize_spawned_session.wasm")
    set_secret("temper_api_url", BASE)

    jpg = jpeg_bytes()
    fake_html = (b"<!doctype html><html><body>" + b"not an image " * 40 + b"</body></html>")

    print("== stage 1: art style happy path (real JPEG references) ==")
    run_art_style_case("good", [(jpg, "image/jpeg")] * 3, expect_published=True)

    print("== stage 2: art style rejection (HTML posing as a reference image) ==")
    run_art_style_case("fake", [(jpg, "image/jpeg"), (fake_html, "image/jpeg")], expect_published=False)

    print("== stage 3: palette happy path ==")
    good_tokens = "/* E2E — Katagami palette tokens */\n:root {\n" + "".join(
        f"  --ds-{k}: {v};\n" for k, v in {
            "bg": "#faf7f0", "surface": "#ffffff", "ink": "#1c1a16", "muted": "#6b655a",
            "accent": "#7c6f57", "error": "#b3402f", "warning": "#b3862f", "success": "#3f7a4e",
        }.items()
    ) + "}\n/* DTCG */\n" + json.dumps({"color": {"accent": {"$type": "color", "$value": "#7c6f57"}}})
    run_palette_case("good", good_tokens, expect_published=True)

    print("== stage 4: palette rejection (garbage tokens export) ==")
    run_palette_case("bad", "oops, not a tokens document", expect_published=False)

    print()
    print(f"== RESULT: {len(PASS)} passed, {len(FAIL)} failed ==")
    for name in FAIL:
        print("  FAILED:", name)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
