#!/usr/bin/env python3
"""Live local end-to-end proof for the writing-style curation lane (Phase 1).

Drives the REAL pipeline flow against a locally served Temper (see
serve_local.sh) with this branch's finalize_spawned_session WASM registered:

  corpus/VOICE.md/thumbnail Files -> WritingStyle (SubmitWritingStyle)
  -> CurationJob Configure(synthesize_writing_style)/Start
  -> CompleteWritingStyleSynthesis (fires the finalizer WASM)
  -> consent attested + bands self-consistency proven + assets published
  -> WritingStyle Published

  plus two rejection paths: a corpus that violates its own bands
  (voice_bands_violation) and a non-opt-in consent block
  (voice_consent_invalid) — both must fail the job and leave the style Draft.
"""
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3903")
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


def req(method, path, body=None, content_type="application/json"):
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
            return resp.status, json.loads(payload) if payload.strip() else {}
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            return e.code, json.loads(payload)
        except Exception:
            return e.code, {"raw": payload.decode(errors="replace")[:300]}


def entity_id_of(body):
    for key in ("Id", "id", "entity_id"):
        if body.get(key):
            return body[key]
    raise AssertionError(json.dumps(body)[:200])


def get_entity(set_name, eid):
    st, body = req("GET", f"/tdata/{set_name}('{eid}')")
    assert st == 200, (st, body)
    return body


def must_act(set_name, eid, action, params=None):
    st, body = req("POST", f"/tdata/{set_name}('{eid}')/Temper.{action}", params or {})
    assert 200 <= st < 300, f"{action} -> {st}: {json.dumps(body)[:300]}"
    return body


def act(set_name, eid, action, params=None):
    return req("POST", f"/tdata/{set_name}('{eid}')/Temper.{action}", params or {})


def make_file(name, payload, mime):
    st, body = req("POST", "/tdata/Files", {"Name": name, "Path": f"/e2e/{name}", "MimeType": mime})
    assert 200 <= st < 300, (name, st, body)
    fid = entity_id_of(body)
    st, body = req("PUT", f"/tdata/Files('{fid}')/$value", payload, mime)
    assert 200 <= st < 300, (name, st, body)
    for _ in range(30):
        if get_entity("Files", fid).get("status") in ("Ready", "Locked"):
            return fid
        time.sleep(0.5)
    raise AssertionError(f"{name} never Ready")


def jpeg_bytes():
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (600, 400), (250, 247, 240))
    d = ImageDraw.Draw(img)
    d.rectangle([40, 300, 560, 306], fill=(28, 26, 22))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=80)
    return buf.getvalue()


def plain_register_paragraph(i, noun, action, metric):
    return (
        f"Ship the {noun} change. Run {i} passed clean, and the {metric} held steady. "
        f"No drama here. We cut the flaky {action} path, measured everything twice, and watched "
        f"the {metric} drop by a third while the error budget stayed flat in each region. "
        f"Plain words win arguments. When a claim about the {noun} carries no number, either "
        f"count it honestly or delete the sentence before anyone reads it."
    )


def corpus_texts():
    topics = [
        ("deploy", "rollout", "latency"), ("cache", "eviction", "hit rate"),
        ("queue", "backlog", "drain time"), ("schema", "migration", "row count"),
        ("index", "rebuild", "scan cost"), ("alert", "paging", "noise floor"),
    ]
    docs = []
    for start in range(3):
        parts = [plain_register_paragraph(i, *topics[(start + i) % len(topics)]) for i in range(6)]
        docs.append("\n\n".join(parts))
    return docs


BANDS = {
    "schema": "katagami:voice-bands/v1",
    "sentence_length": {"mean": [4, 18], "stdev_min": 2.0},
    "banned_phrases": ["delve", "leverage", "game-changer"],
    "punctuation": {"exclamations_per_1000_words": [0, 3]},
    "type_token_ratio": {"min": 0.15, "window_words": 500},  # derived: fixture corpus measures ~0.19
    "function_words": {"max_distance": 0.2},
    "min_words_to_evaluate": 120,
}

VOICE_MD = """---
version: alpha
kind: voice
corpus:
  consent: opt_in
---
## Overview
Plain operational register: numbers first, no drama.
## Tone
formality: 3/10 — "Ship it." directness: 9/10 — "Cut the claim or count it."
## Vocabulary
use: plain words, counts. ban: delve, leverage, game-changer.
## Moves
Open on the outcome. Close on the number.
## Register
chat: dry. email: one degree warmer.
## Never
Never exclaim twice. Never hedge a measured claim.
```json
{"schema": "katagami:voice-bands/v1"}
```
"""


def submit_style(label, corpus_docs, consent_basis="opt_in", exemplars=None):
    corpus_ids = [make_file(f"{label}-corpus-{i}.md", doc.encode(), "text/markdown") for i, doc in enumerate(corpus_docs)]
    voice_md = make_file(f"{label}-VOICE.md", VOICE_MD.encode(), "text/markdown")
    thumb = make_file(f"{label}-thumb.jpg", jpeg_bytes(), "image/jpeg")

    st, body = req("POST", "/tdata/WritingStyles", {})
    ws = entity_id_of(body)
    must_act("WritingStyles", ws, "SubmitWritingStyle", {
        "name": f"E2E {label}", "slug": f"e2e-{label}",
        "persona": "dry, direct operator",
        "tone_scales": json.dumps({"formality": 3, "directness": 9}),
        "vocabulary": json.dumps({"use": ["plain words"], "ban": ["delve", "leverage"]}),
        "moves": json.dumps(["open on the outcome", "close on the number"]),
        "register": json.dumps({"chat": "dry", "email": "warmer"}),
        "refusals": json.dumps(["never exclaim twice", "never hedge a measured claim"]),
        "mechanical_bands": json.dumps(BANDS),
        "corpus_file_ids": corpus_ids,
        "corpus_manifest": json.dumps({"items": [{"file_id": i, "kind": "original-in-register"} for i in corpus_ids]}),
        "consent": json.dumps({"basis": consent_basis, "author": "katagami-curation (original in-register corpus)", "license": "internal", "samples": len(corpus_ids), "provenance": "e2e fixtures"}),
        "exemplars": json.dumps(exemplars or [
            {"text": "Shipped. 3 bugs, 0 regressions.", "annotation": "close on the number", "kind": "sent"},
            {"text": "Plain words win arguments.", "annotation": "thesis first", "kind": "sent"},
            {"text": "No. The count says why.", "annotation": "refusal + number", "kind": "sent"},
        ]),
        "voice_md_file_id": voice_md,
        "voice_md_lint_result": json.dumps({"summary": {"errors": 0, "warnings": 0}}),
        "voice_md_format_version": "alpha",
        "thumbnail_file_id": thumb,
        "parent_ids": [], "lineage_type": "original", "generation_number": "0",
        "model_provenance": json.dumps({"style": {"model": "e2e"}, "extraction": {"model": "e2e", "tool": "sandbox-python-stylometry"}}),
        "credits": json.dumps([{"name": "Plain-style operational register", "kind": "register", "note": "numbers-first technical prose"}]),
        "tags": json.dumps(["e2e"]), "direction_id": "", "curator_notes": "writing-lane e2e",
    })
    # settle barrier: submitted fields visible through the projection
    deadline = time.time() + 15
    while time.time() < deadline:
        fields = get_entity("WritingStyles", ws).get("fields") or {}
        if fields.get("mechanical_bands") and fields.get("voice_md_file_id"):
            break
        time.sleep(0.5)
    return ws


def run_job(ws):
    st, body = req("POST", "/tdata/CurationJobs", {"WritingStyleIds": json.dumps([ws])})
    job = entity_id_of(body)
    must_act("CurationJobs", job, "Configure", {"job_type": "synthesize_writing_style", "completion_contract": "typed-v1"})
    must_act("CurationJobs", job, "Start", {})
    st, body = act("CurationJobs", job, "CompleteWritingStyleSynthesis", {
        "writing_style_ids": json.dumps([ws]),
        "output": json.dumps({"writing_style_ids": [ws]}),
    })
    time.sleep(3)
    j = get_entity("CurationJobs", job)
    w = get_entity("WritingStyles", ws)
    raw = (j.get("fields") or {}).get("error_message") or ""
    try:
        parsed = json.loads(raw)
        err = f"{parsed.get('code', '')}: {parsed.get('message', '')}"
    except Exception:
        err = raw
    return j.get("status"), w, err[:300]


def main():
    print("== stage 0: wasm modules + secrets ==")
    blob = open(os.environ.get("PAW_FS_BLOB_ADAPTER", os.path.expanduser("~/Development/temperpaw/os-apps/paw-fs/wasm/blob_adapter.wasm")), "rb").read()
    st, _ = req("POST", "/api/wasm/modules/blob_adapter", blob, "application/wasm")
    assert 200 <= st < 300
    wasm_path = os.path.join(os.path.dirname(__file__), "..", "..", "wasm", "finalize_spawned_session", "finalize_spawned_session.wasm")
    st, _ = req("POST", "/api/wasm/modules/finalize_spawned_session", open(wasm_path, "rb").read(), "application/wasm")
    assert 200 <= st < 300
    for key, value in [
        ("temper_api_url", BASE),
        ("published_blob_endpoint", "http://127.0.0.1:3910"),
        ("published_blob_bucket", "e2e-public"),
        ("published_blob_public_base_url", "http://127.0.0.1:3910/e2e-public"),
    ]:
        st, _ = req("PUT", f"/api/tenants/{TENANT}/secrets/{key}", {"value": value})
        assert 200 <= st < 300, key
    print("  bootstrap done")

    print("== stage 1: happy path — corpus passes its own bands ==")
    ws = submit_style("plainops", corpus_texts())
    status, w, err = run_job(ws)
    fields = w.get("fields") or {}
    report("writing/happy: job Completed", status == "Completed", f"job={status} err={err}")
    report("writing/happy: style Published", w.get("status") == "Published", f"style={w.get('status')}")
    report("writing/happy: VOICE.md asset attached", bool(fields.get("voice_md_asset_url")), str(fields.get("voice_md_asset_url"))[:80])

    print("== stage 2: rejection — corpus violates its own bands ==")
    tainted = corpus_texts()
    tainted[1] += " We must leverage this game-changer and delve deeper into synergy."
    ws2 = submit_style("tainted", tainted)
    status, w2, err = run_job(ws2)
    report("writing/bands: job Failed", status == "Failed", f"job={status}")
    report("writing/bands: names the violation", "voice_bands_violation" in err and "banned phrase" in err, f"err={err}")
    report("writing/bands: style NOT published", w2.get("status") != "Published", f"style={w2.get('status')}")

    print("== stage 3: rejection — consent is not opt-in ==")
    ws3 = submit_style("scraped", corpus_texts(), consent_basis="found_online")
    status, w3, err = run_job(ws3)
    report("writing/consent: job Failed", status == "Failed", f"job={status}")
    report("writing/consent: names the consent gate", "voice_consent_invalid" in err, f"err={err}")
    report("writing/consent: style NOT published", w3.get("status") != "Published", f"style={w3.get('status')}")

    print()
    print(f"== RESULT: {len(PASS)} passed, {len(FAIL)} failed ==")
    for name in FAIL:
        print("  FAILED:", name)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
