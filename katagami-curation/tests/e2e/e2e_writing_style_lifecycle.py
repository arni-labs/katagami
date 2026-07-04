#!/usr/bin/env python3
"""Live lifecycle proof for the WritingStyle spec (RFC-0002 §6.1, PR #133).

Drives a real WritingStyle entity on a live local Temper through its whole
lifecycle and proves the load-bearing behavior:

  1. SubmitWritingStyle + SubmitForReview work with real corpus/VOICE.md/
     thumbnail Files (Ready-gated by cross-entity guards).
  2. Publish is BLOCKED until the verifier-owned gates are set
     (consent_attested, then bands_self_consistent, then quality/assets).
  3. After all gates: Published.
  4. Revise + AttachCorpus invalidates consent_attested -> Publish blocked
     again (a corpus change forces re-attestation).
"""
import io
import os
import json
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3902")
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
        with urllib.request.urlopen(r, timeout=120) as resp:
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


def act(set_name, eid, action, params=None):
    return req("POST", f"/tdata/{set_name}('{eid}')/Temper.{action}", params or {})


def must_act(set_name, eid, action, params=None):
    st, body = act(set_name, eid, action, params)
    assert 200 <= st < 300, f"{action} -> {st}: {json.dumps(body)[:300]}"
    return body


def make_file(name, payload, mime):
    st, body = req("POST", "/tdata/Files", {"Name": name, "Path": f"/e2e/{name}", "MimeType": mime})
    assert 200 <= st < 300, (name, st, body)
    fid = entity_id_of(body)
    st, body = req("PUT", f"/tdata/Files('{fid}')/$value", payload, mime)
    assert 200 <= st < 300, (name, st, body)
    for _ in range(20):
        ent = get_entity("Files", fid)
        if ent.get("status") in ("Ready", "Locked"):
            return fid
        time.sleep(0.5)
    raise AssertionError(f"{name} never Ready")


def jpeg_bytes():
    from PIL import Image
    img = Image.new("RGB", (64, 48), (250, 247, 240))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=80)
    return buf.getvalue()


def publish_blocked_on(eid, var):
    st, body = act("WritingStyles", eid, "Publish", {})
    msg = json.dumps(body)
    return st == 409 and var in msg, f"HTTP {st}: {msg[:180]}"


def wait_fields(eid, names, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        fields = get_entity("WritingStyles", eid).get("fields") or {}
        if all(fields.get(n) for n in names):
            return
        time.sleep(0.5)
    raise AssertionError(f"fields {names} never visible")


def wait_status(eid, expected, timeout=15):
    deadline = time.time() + timeout
    status = ""
    while time.time() < deadline:
        status = get_entity("WritingStyles", eid).get("status") or ""
        if status == expected:
            return True, status
        time.sleep(0.5)
    return False, status


def main():
    print("== stage 0: upload blob_adapter (Files need it for $value) ==")
    blob = open(os.environ.get("PAW_FS_BLOB_ADAPTER", os.path.expanduser("~/Development/temperpaw/os-apps/paw-fs/wasm/blob_adapter.wasm")), "rb").read()
    st, body = req("POST", "/api/wasm/modules/blob_adapter", blob, "application/wasm")
    assert 200 <= st < 300, (st, body)

    print("== stage 1: consented corpus + VOICE.md + thumbnail as real Files ==")
    corpus_ids = [
        make_file("sample-1.md", b"I write short. Then I push one long, winding sentence to earn the next short one. No hedging.\n" * 8, "text/markdown"),
        make_file("sample-2.md", b"Plain words win. Numbers over adjectives. If a claim has no number, cut it or count it.\n" * 8, "text/markdown"),
    ]
    voice_md = make_file("VOICE.md", b"---\nversion: alpha\nkind: voice\n---\n## Overview\ne2e voice\n## Tone\nformality: 3/10\n## Vocabulary\nban: [delve]\n## Moves\nopen cold\n## Register\nchat: dry\n## Never\nnever exclaim\n", "text/markdown")
    thumb = make_file("ws-thumb.jpg", jpeg_bytes(), "image/jpeg")

    print("== stage 2: SubmitWritingStyle -> SubmitForReview ==")
    st, body = req("POST", "/tdata/WritingStyles", {})
    assert 200 <= st < 300, (st, body)
    ws = entity_id_of(body)
    must_act("WritingStyles", ws, "SubmitWritingStyle", {
        "name": "E2E Voice", "slug": "e2e-voice",
        "persona": "dry, direct operator",
        "tone_scales": json.dumps({"formality": 3, "directness": 9}),
        "vocabulary": json.dumps({"use": ["plain words"], "ban": ["delve", "leverage"]}),
        "moves": json.dumps(["open cold", "close on the number"]),
        "register": json.dumps({"chat": "dry", "email": "warmer"}),
        "refusals": json.dumps(["never exclaim", "never hedge"]),
        "mechanical_bands": json.dumps({
            "schema": "katagami:voice-bands/v1",
            "sentence_length": {"mean": [6, 14], "stdev_min": 4.0},
            "banned_phrases": ["delve", "leverage"],
            "min_words_to_evaluate": 150,
        }),
        "corpus_file_ids": corpus_ids,
        "corpus_manifest": json.dumps({"items": [{"file_id": i, "kind": "essay"} for i in corpus_ids]}),
        "consent": json.dumps({"basis": "opt_in", "author": "Rita (e2e)", "license": "internal", "samples": 2, "provenance": "local fixtures"}),
        "exemplars": json.dumps([
            {"text": "Shipped. 3 bugs, 0 regressions.", "annotation": "close on the number", "kind": "sent"},
            {"text": "Plain words win.", "annotation": "thesis first", "kind": "sent"},
            {"text": "No. And here is the count that says why.", "annotation": "refusal + number", "kind": "sent"},
        ]),
        "voice_md_file_id": voice_md,
        "voice_md_lint_result": json.dumps({"summary": {"errors": 0, "warnings": 0}}),
        "voice_md_format_version": "alpha",
        "thumbnail_file_id": thumb,
        "parent_ids": [], "lineage_type": "original", "generation_number": "0",
        "model_provenance": json.dumps({"style": {"model": "e2e"}, "extraction": {"model": "e2e", "tool": "local"}}),
        "credits": json.dumps([{"name": "Plain-style tradition", "kind": "register"}]),
        "tags": json.dumps(["e2e"]), "direction_id": "", "curator_notes": "local e2e",
    })
    wait_fields(ws, ["mechanical_bands", "voice_md_file_id", "thumbnail_file_id"])
    must_act("WritingStyles", ws, "SubmitForReview", {})
    ok, status = wait_status(ws, "UnderReview")
    report("SubmitForReview reaches UnderReview", ok, f"status={status}")

    print("== stage 3: Publish must be blocked until each verifier-owned gate ==")
    ok, detail = publish_blocked_on(ws, "consent_attested")
    report("Publish blocked on consent_attested", ok, detail)

    must_act("WritingStyles", ws, "AttestConsent", {})
    ok, detail = publish_blocked_on(ws, "bands_self_consistent")
    report("Publish blocked on bands_self_consistent after consent", ok, detail)

    must_act("WritingStyles", ws, "MarkBandsSelfConsistent", {})
    ok, detail = publish_blocked_on(ws, "quality_review_passed")
    report("Publish blocked on quality_review_passed after bands", ok, detail)

    must_act("WritingStyles", ws, "MarkQualityPassed", {})
    ok, detail = publish_blocked_on(ws, "has_published_assets")
    report("Publish blocked on has_published_assets after quality", ok, detail)

    must_act("WritingStyles", ws, "AttachPublishedAssets", {
        "voice_md_asset_id": "as-e2e-1", "voice_md_asset_url": "http://127.0.0.1/voice.md",
        "thumbnail_asset_id": "as-e2e-2", "thumbnail_asset_url": "http://127.0.0.1/thumb.jpg",
    })
    must_act("WritingStyles", ws, "Publish", {})
    ok, status = wait_status(ws, "Published")
    report("Publish succeeds once the full contract is satisfied", ok, f"status={status}")

    print("== stage 4: corpus change invalidates consent ==")
    must_act("WritingStyles", ws, "Revise", {"curator_notes": "e2e revise"})
    new_corpus = [make_file("sample-3.md", b"Different corpus now. Consent must be re-attested.\n" * 10, "text/markdown")]
    must_act("WritingStyles", ws, "AttachCorpus", {
        "corpus_file_ids": new_corpus,
        "corpus_manifest": json.dumps({"items": [{"file_id": new_corpus[0], "kind": "essay"}]}),
        "consent": json.dumps({"basis": "opt_in", "author": "Rita (e2e)", "license": "internal", "samples": 1, "provenance": "local fixtures v2"}),
    })
    ok, detail = publish_blocked_on(ws, "consent_attested")
    report("After Revise + new corpus, Publish blocked on consent_attested again", ok, detail)

    print()
    print(f"== RESULT: {len(PASS)} passed, {len(FAIL)} failed ==")
    for name in FAIL:
        print("  FAILED:", name)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
