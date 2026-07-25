#!/usr/bin/env python3
"""Live local end-to-end proof for ARN-148 lane deep verification.

Drives the REAL production flow against a locally served Temper with paw-fs +
katagami-commons + katagami-curation installed and the actual
finalize_spawned_session WASM registered:

  four Locked contributor-source Files + eight recorded proof Files
  -> ArtStyle (SubmitArtStyle, no references)
  -> CurationJob Start -> CompleteArtStyleSynthesis (fires the finalizer WASM)
  -> assert ArtStyle Published (happy) / job Failed + style unpublished
     (HTML posing as one proof; recorded hash mismatch)

  plus the PaletteSystem happy/reject pair.
"""
import io
import os
import json
import hashlib
import random
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
EDIT_ENDPOINTS = [
    "openai/gpt-image-2/edit",
    "fal-ai/nano-banana-2/edit",
]
PROOF_CASES = [
    {
        "category": "human_portrait",
        "subject": "night-shift printer beside a blank paper stack",
        "composition": "waist-up three-quarter portrait with open space to one side",
        "source_medium": "documentary photograph",
    },
    {
        "category": "nonhuman_living",
        "subject": "urban pigeon lifting into flight",
        "composition": "single bird crossing the frame diagonally with wings spread",
        "source_medium": "black-ink line drawing",
    },
    {
        "category": "still_life_object",
        "subject": "cassette player with headphones and tape cases",
        "composition": "overhead product arrangement with deliberate gaps",
        "source_medium": "neutral synthetic 3d render",
    },
    {
        "category": "landscape_environment",
        "subject": "hillside neighborhood with stairs and water tanks",
        "composition": "wide cityscape rising diagonally across the frame",
        "source_medium": "flat vector illustration",
    },
]


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


def create_entity(set_name, payload=None, timeout=90):
    """Wait out Temper's background formal-verification gate on fresh boots."""
    deadline = time.time() + timeout
    while True:
        st, body = req("POST", f"/tdata/{set_name}", payload or {})
        if 200 <= st < 300:
            return entity_id_of(body)
        code = body.get("error", {}).get("code") if isinstance(body, dict) else ""
        if st != 423 or code != "VerificationRequired" or time.time() >= deadline:
            raise AssertionError((set_name, st, body))
        time.sleep(1)


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


def make_file(name, payload, mime, lock=False):
    st, body = req("POST", "/tdata/Files", {"Name": name, "Path": f"/e2e/{name}", "MimeType": mime})
    assert 200 <= st < 300, (name, st, body)
    fid = entity_id_of(body)
    st, body = req("PUT", f"/tdata/Files('{fid}')/$value", payload, mime)
    assert 200 <= st < 300, ("$value", name, st, body)
    for _ in range(20):
        ent = get_entity("Files", fid)
        current = entity_status(ent)
        if current in ("Ready", "Locked"):
            if lock and current == "Ready":
                st, body = act("Files", fid, "Lock")
                if not 200 <= st < 300:
                    # Blob finalization can race this read and make the File
                    # Locked before the explicit action is dispatched. The
                    # query projection may still lag that transition, so poll
                    # again instead of treating one stale read as a failure.
                    raced = get_entity("Files", fid)
                    if entity_status(raced) != "Locked":
                        time.sleep(0.25)
                        continue
                continue
            if not lock or current == "Locked":
                return fid
        time.sleep(0.5)
    raise AssertionError(f"file {name} never became Ready/Locked: {json.dumps(ent)[:300]}")


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


def sizable_png_bytes():
    """A deterministic, megabyte-scale proof that exercises the streaming
    verifier while remaining below disposable servers' ordinary upload cap."""
    from PIL import Image

    width = height = 720
    pixels = random.Random(148).randbytes(width * height * 3)
    img = Image.frombytes("RGB", (width, height), pixels)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    payload = buf.getvalue()
    assert 1_000_000 < len(payload) < 1_900_000, len(payload)
    return payload


def sha256(value):
    payload = value.encode() if isinstance(value, str) else value
    return hashlib.sha256(payload).hexdigest()


def run_art_style_case(
    label,
    expect_published,
    fake_proof_index=None,
    mismatched_hash_index=None,
    expected_error_code="lane_file_not_image",
):
    """Exercise reference-free publication with optional proof/consent failures."""
    jpg = jpeg_bytes()
    sizable_png = sizable_png_bytes()
    fake_html = (b"<!doctype html><html><body>" + b"not an image " * 40 + b"</body></html>")
    prompt = (
        "Render the supplied subject as a two-ink relief print on fibrous matte paper. "
        "Use blunt carved contours and visibly broken edges. Build volume with sparse "
        "directional hatching and broad unprinted highlights. Reserve deep indigo for "
        "structural masses and vermilion for small focal accents. Keep a centered, "
        "compressed composition with generous bare paper. Add slight ink spread and "
        "irregular hand pressure. Avoid photorealistic skin, glossy surfaces, gradients, "
        "and smooth vector geometry."
    )
    dimensions = {
        "medium_material": "two-ink relief print on fibrous matte paper",
        "marks_edges": "blunt carved contours and visibly broken edges",
        "tonal_shading": "sparse directional hatching and broad unprinted highlights",
        "color_roles": "deep indigo for structural masses and vermilion for small focal accents",
        "composition": "centered, compressed composition with generous bare paper",
        "signature_details": "slight ink spread and irregular hand pressure",
        "exclusions": "Avoid photorealistic skin, glossy surfaces, gradients, and smooth vector geometry",
    }
    source_payloads = [jpg, sizable_png, jpg, sizable_png]
    source_records = []
    for index, (case, payload) in enumerate(zip(PROOF_CASES, source_payloads)):
        extension = "png" if index in (1, 3) else "jpg"
        mime = "image/png" if extension == "png" else "image/jpeg"
        file_id = make_file(
            f"{label}-generated-source-{index}.{extension}",
            payload,
            mime,
            lock=True,
        )
        source_records.append({
            "file_id": file_id,
            "sha256": sha256(payload),
        })

    proof_specs = [
        (model, case_index)
        for model in EDIT_ENDPOINTS
        for case_index in range(len(PROOF_CASES))
    ]
    proof_ids = []
    proof_records = []
    cases_by_model = {model: [] for model in EDIT_ENDPOINTS}
    for index, (model, case_index) in enumerate(proof_specs):
        case = PROOF_CASES[case_index]
        if index == fake_proof_index:
            payload, extension, mime = fake_html, "jpg", "image/jpeg"
        elif index == 0:
            payload, extension, mime = sizable_png, "png", "image/png"
        else:
            payload, extension, mime = jpg, "jpg", "image/jpeg"
        model_label = model.replace("/", "-")
        file_id = make_file(
            f"{label}-proof-{model_label}-{case_index}.{extension}",
            payload,
            mime,
            lock=True,
        )
        proof_ids.append(file_id)
        generation_record = {
            "schema_version": "1",
            "kind": "art_style_proof",
            "style_slug": f"e2e-{label}",
            "source": source_records[case_index].copy(),
            "output": {
                "file_id": file_id,
                "sha256": sha256(payload),
                "prompt_sha256": sha256(prompt),
                "provider_request_id": f"{label}-output-request-{model_label}-{case_index}",
            },
        }
        if index == mismatched_hash_index:
            generation_record["output"]["sha256"] = "00" * 32
        record = {
            "file_id": file_id,
            "category": case["category"],
            "subject": case["subject"],
            "composition": case["composition"],
            "source_medium": case["source_medium"],
            "mode": "image_edit",
            "style_reference_used": False,
            "model": {"provider": "fal", "model": model},
            "generation_record": generation_record,
        }
        proof_records.append(record)
        cases_by_model[model].append({
            "file_id": file_id,
            "category": case["category"],
            "subject": case["subject"],
            "composition": case["composition"],
            "source_medium": case["source_medium"],
            "mode": "image_edit",
            "prompt": prompt,
            "style_reference_used": False,
            "content_preserved": True,
            "source_medium_replaced": True,
            "generation_record": generation_record,
            "scores": {dimension: 2 for dimension in dimensions},
        })
    thumb_id = make_file(f"{label}-thumb.jpg", jpg, "image/jpeg")
    portability_report = {
        "schema_version": "1",
        "verdict": "pass",
        "prompt": prompt,
        "blind_evaluation": True,
        "evaluator": {"provider": "local", "model": "fixture-vision-reviewer"},
        "models": [
            {"provider": "fal", "model": model, "cases": cases}
            for model, cases in cases_by_model.items()
        ],
    }

    art_id = create_entity("ArtStyles")
    must_act("ArtStyles", art_id, "SubmitArtStyle", {
        "name": f"E2E {label}",
        "slug": f"e2e-{label}",
        "medium": "print",
        "prompt_template": prompt,
        "slot_recipes": json.dumps({"hero": "wide establishing scene", "avatar": "portrait bust"}),
        "guidance": "e2e guidance",
        "reference_image_file_ids": [],
        "reference_manifest": json.dumps({"items": []}),
        "proof_shots_file_ids": proof_ids,
        "proof_shots_manifest": json.dumps({
            "schema_version": "3",
            "items": proof_records,
        }),
        "thumbnail_file_id": thumb_id,
        "parent_ids": [],
        "lineage_type": "original",
        "generation_number": "0",
        "model_provenance": json.dumps({
            "style": {"provider": "local", "model": "fixture-author"},
            "images": [{"model": model, "provider": "fal"} for model in cases_by_model],
        }),
        "credits": json.dumps([{"name": "E2E tradition", "kind": "tradition", "note": "local run"}]),
        "source_basis": json.dumps({
            "schema_version": "1",
            "verdict": "pass",
            "reviewer": {"provider": "local", "model": "fixture-reviewer"},
            "all_named_people_checked": True,
            "sources": [{"name": "E2E tradition", "kind": "tradition", "evidence_url": "https://example.test/e2e"}],
        }),
        "prompt_review": json.dumps({
            "schema_version": "1",
            "verdict": "pass",
            "prompt": prompt,
            "reviewer": {"provider": "local", "model": "fixture-reviewer"},
            "reference_independent": True,
            "subject_independent": True,
            "source_medium_independent": True,
            "model_agnostic": True,
            "style_name_independent": True,
            "contradictions": [],
            "intentional_tensions": [],
            "revision_count": 0,
            "observable_dimensions": dimensions,
        }),
        "portability_report": json.dumps(portability_report),
        "tags": json.dumps(["e2e"]),
        "direction_id": "",
        "curator_notes": "local e2e",
    })

    wait_fields("ArtStyles", art_id, ["prompt_template", "thumbnail_file_id", "credits"])

    job_id = create_entity("CurationJobs", {"ArtStyleIds": json.dumps([art_id])})
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
        report(
            f"art_style/{label}: rejection names the failing gate",
            expected_error_code in err,
            f"err={err}",
        )
        report(f"art_style/{label}: style NOT published", art_status != "Published", f"style={art_status}")
    return job_id, art_id


def run_palette_case(label, tokens_payload, expect_published):
    jpg = jpeg_bytes()
    tokens_id = make_file(f"{label}-tokens.css", tokens_payload.encode(), "text/plain")
    thumb_id = make_file(f"{label}-pthumb.jpg", jpg, "image/jpeg")

    pal_id = create_entity("PaletteSystems")
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

    job_id = create_entity("CurationJobs", {"PaletteSystemIds": json.dumps([pal_id])})
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


def verify_non_system_cannot_forge_attestation(art_id):
    st, body = act("ArtStyles", art_id, "AttachArtStyleReview", {
        "source_basis": json.dumps({"verdict": "forged"}),
        "prompt_review": json.dumps({"verdict": "forged"}),
        "portability_report": json.dumps({"verdict": "forged"}),
    })
    detail = json.dumps(body)[:300]
    report(
        "art_style/security: non-system principal cannot forge review attestation",
        st in (401, 403),
        f"http={st} body={detail}",
    )


def main():
    wasm_dir = os.path.join(os.path.dirname(__file__), "..", "..", "wasm")
    print("== stage 0: wasm modules + secrets ==")
    upload_wasm("blob_adapter", os.environ.get("PAW_FS_BLOB_ADAPTER", os.path.expanduser("~/Development/temperpaw/os-apps/paw-fs/wasm/blob_adapter.wasm")))
    upload_wasm("finalize_spawned_session", f"{wasm_dir}/finalize_spawned_session/finalize_spawned_session.wasm")
    set_secret("temper_api_url", BASE)
    set_secret("published_blob_endpoint", "http://127.0.0.1:3910")
    set_secret("published_blob_bucket", "katagami-e2e")
    set_secret("published_blob_public_base_url", "http://127.0.0.1:3910/public")

    print("== stage 1: art style happy path (no reference images) ==")
    _, good_art_id = run_art_style_case("good", expect_published=True)

    print("== stage 1b: forged attestation is denied to non-system principals ==")
    verify_non_system_cannot_forge_attestation(good_art_id)

    print("== stage 2: art style rejection (HTML posing as a proof image) ==")
    run_art_style_case("fake", expect_published=False, fake_proof_index=1)

    print("== stage 3: art style rejection (recorded output hash mismatch) ==")
    run_art_style_case(
        "hash-mismatch",
        expect_published=False,
        mismatched_hash_index=0,
        expected_error_code="art_style_proof_file_hash_mismatch",
    )

    print("== stage 4: palette happy path ==")
    good_tokens = "/* E2E — Katagami palette tokens */\n:root {\n" + "".join(
        f"  --ds-{k}: {v};\n" for k, v in {
            "bg": "#faf7f0", "surface": "#ffffff", "ink": "#1c1a16", "muted": "#6b655a",
            "accent": "#7c6f57", "error": "#b3402f", "warning": "#b3862f", "success": "#3f7a4e",
        }.items()
    ) + "}\n/* DTCG */\n" + json.dumps({"color": {"accent": {"$type": "color", "$value": "#7c6f57"}}})
    run_palette_case("good", good_tokens, expect_published=True)

    print("== stage 5: palette rejection (garbage tokens export) ==")
    run_palette_case("bad", "oops, not a tokens document", expect_published=False)

    print()
    print(f"== RESULT: {len(PASS)} passed, {len(FAIL)} failed ==")
    for name in FAIL:
        print("  FAILED:", name)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
