#!/usr/bin/env python3
"""Replace an approved writing style's corpus, and read every part of it back.

Seven live styles carry a corpus a language model wrote. A model writes in its
own voice whatever register it is aiming at, so a model-written passage labelled
as an example of a register is not evidence of that register. This script swaps
such a corpus for real text, and it takes the replacement from an approved
payload outside this repository; it composes nothing of its own.

    python3 scripts/replace-writing-style-corpora.py <approved.json> --expect <n> [--apply]

Order matters, because the guards move underneath the write. The corpus files are
created and driven to Ready first, since AttachCorpus needs them there and the
publish guard checks them again. AttachCorpus then clears consent_attested and
bands_self_consistent, which is correct: new text has not been attested and the
bands have not been re-proved against it. Those two gates belong to the curation
finalizer and this script never sets them.

Every style is proved before anything is written. Its corpus passes the bands the
payload derives from that same corpus. Each exemplar sits inside the length floor
and ceiling, passes those bands, and appears verbatim in the new corpus. And the
style still holds the document the payload was built from: `baseHash` is the
sha256 of its exemplars string as its author read it, checked in the plan and
again immediately before the first write, so a style another run has touched is
refused rather than overwritten.

What this script does NOT do, and what therefore stays open after it runs: the
VOICE.md attached to each of these styles quotes the whole model-written corpus
inside it, and the replication samples were produced from that VOICE.md. Both
have to be rebuilt on the new contract before any of these styles can publish.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "docs/research/harness"))
from voice_check_local import check, words_of  # noqa: E402

FLOOR, CEILING, MOST = 150, 400, 3


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def flat(text):
    return re.sub(r"\s+", " ", text).strip()


class Deployment:
    def __init__(self):
        self.origin = os.environ.get("TEMPER_API_URL", "https://openpaw-production.up.railway.app")
        self.tenant = os.environ.get("TEMPER_TENANT", "default")
        self.key = os.environ["TEMPER_API_KEY"]

    def call(self, path, method="GET", body=None, raw=None, content_type=None):
        headers = {"Authorization": f"Bearer {self.key}", "X-Tenant-Id": self.tenant}
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif raw is not None:
            headers["Content-Type"] = content_type or "application/octet-stream"
            data = raw
        request = urllib.request.Request(self.origin + path, method=method, data=data, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    def row(self, entity_set, entity_id):
        status, body = self.call(f"/tdata/{entity_set}('{entity_id}')")
        return json.loads(body) if status == 200 else None

    def action(self, entity_set, entity_id, name, params):
        return self.call(f"/tdata/{entity_set}('{entity_id}')/Temper.{name}", "POST", params)

    def write_file(self, name, path, text):
        """Create a File, put its bytes, and wait for the stream handler to make
        it Ready. AttachCorpus's cross-entity guard wants Ready, and a file that
        never got there would fail the guard rather than this run."""
        status, body = self.call("/tdata/Files", "POST", {"Name": name, "Path": path, "MimeType": "text/markdown"})
        assert status in (200, 201), f"creating {path}: HTTP {status}: {body[:300]!r}"
        file_id = json.loads(body)["entity_id"]
        status, body = self.call(f"/tdata/Files('{file_id}')/$value", "PUT",
                                 raw=text.encode("utf-8"), content_type="text/markdown")
        assert status in (200, 201, 204), f"writing {path}: HTTP {status}: {body[:300]!r}"
        for _ in range(60):
            row = self.row("Files", file_id)
            if row and row["fields"]["Status"] in ("Ready", "Locked"):
                stored = self.call(f"/tdata/Files('{file_id}')/$value")[1].decode("utf-8")
                assert stored == text, f"{path} was stored with different bytes than were sent"
                return file_id
            time.sleep(1)
        raise AssertionError(f"{path} never reached Ready")


def problems_with(style, corpus, bands, exemplars):
    found = []
    if style["fields"]["Status"] != "Draft":
        found.append(f"is {style['fields']['Status']}; this batch expects Draft")
    found += [f"corpus: {v}" for v in check(bands, corpus, corpus)]
    if not 1 <= len(exemplars) <= MOST:
        found.append(f"carries {len(exemplars)} exemplars, outside 1 to {MOST}")
    haystack = " ".join(flat(body) for _, body in corpus)
    for i, exemplar in enumerate(exemplars, 1):
        n = len(words_of(exemplar["text"]))
        if not FLOOR <= n <= CEILING:
            found.append(f"exemplar {i} is {n} words, outside {FLOOR} to {CEILING}")
        if flat(exemplar["text"]) not in haystack:
            found.append(f"exemplar {i} is not a verbatim run of the new corpus")
    found += check(bands, corpus, [(f"exemplar {i}", e["text"]) for i, e in enumerate(exemplars, 1)])
    return found


def main():
    flags = sys.argv[1:]
    apply_writes = "--apply" in flags
    expected = int(flags[flags.index("--expect") + 1])
    payload_path = next(a for i, a in enumerate(flags)
                        if not a.startswith("--") and (i == 0 or flags[i - 1] != "--expect"))
    payload = json.load(open(payload_path))
    styles = payload["styles"]
    assert len(styles) == expected, f"the payload holds {len(styles)} styles, not the {expected} expected"
    assert "AttachCorpus" in payload.get("allowedOperation", ""), \
        f"this script replaces corpora; the payload authorises: {payload.get('allowedOperation')}"
    print(f"Batch {payload['batch']}: {len(styles)} approved styles")

    deployment = Deployment()
    planned, failures = [], []
    for entry in styles:
        label = f"{entry['number']} {entry['slug']}"
        style = deployment.row("WritingStyles", entry["id"])
        if style is None:
            failures.append(f"{entry['slug']}: not found on the deployment")
            continue
        if sha256(style["fields"].get("exemplars") or "") != entry["baseHash"]:
            failures.append(f"{entry['slug']}: has moved since the payload was built; re-read it and rebuild")
            continue
        corpus = [(c["file"], c["text"]) for c in entry["corpus"]]
        found = problems_with(style, corpus, entry["mechanical_bands"], entry["exemplars"])
        if found:
            failures += [f"{entry['slug']}: {p}" for p in found]
            print(f"{label}: {len(found)} problem(s)")
            continue
        print(f"{label}: would rename '{style['fields']['name']}' to '{entry['name']}', "
              f"attach {len(corpus)} passages of {[len(words_of(b)) for _, b in corpus]} words, "
              f"and set {len(entry['exemplars'])} exemplars")
        planned.append((entry, style))

    assert not failures, f"{len(failures)} style(s) failed the plan:\n" + "\n".join(failures)
    print(f"\nEvery one of {len(planned)} styles is ready.")
    if not apply_writes:
        print("Reporting only. Pass --apply to write.")
        return

    for entry, _ in planned:
        label = f"{entry['number']} {entry['slug']}"
        current = deployment.row("WritingStyles", entry["id"])
        if sha256(current["fields"].get("exemplars") or "") != entry["baseHash"]:
            failures.append(f"{entry['slug']}: changed while this run was working; nothing was written to it")
            continue
        file_ids = [deployment.write_file(c["file"], f"/katagami/writing-styles/{entry['slug']}/{c['file']}", c["text"])
                    for c in entry["corpus"]]
        manifest = {"items": [{"file_id": fid, "kind": "public-domain-excerpt",
                               "source": entry["consent"]["provenance"], "words": c["words"]}
                              for fid, c in zip(file_ids, entry["corpus"])]}
        steps = [
            ("SetName", {"name": entry["name"], "slug": entry["slug"]}),
            ("SetVoiceLayer", {"persona": entry["persona"],
                               "tone_scales": json.dumps(entry["tone_scales"]),
                               "vocabulary": json.dumps(entry["vocabulary"]),
                               "moves": json.dumps(entry["moves"]),
                               "register": json.dumps(entry["register"]),
                               "refusals": json.dumps(entry["refusals"])}),
            ("SetMechanicalBands", {"mechanical_bands": json.dumps(entry["mechanical_bands"])}),
            ("AttachCorpus", {"corpus_file_ids": file_ids,
                              "corpus_manifest": json.dumps(manifest, ensure_ascii=False),
                              "consent": json.dumps(entry["consent"], ensure_ascii=False)}),
            ("SetExemplars", {"exemplars": json.dumps(entry["exemplars"], ensure_ascii=False)}),
            ("SetCredits", {"credits": json.dumps(entry["credits"], ensure_ascii=False)}),
            ("SetModelProvenance", {"model_provenance": json.dumps(entry["model_provenance"])}),
            ("SetTags", {"tags": json.dumps(entry["tags"])}),
            ("AddCuratorNotes", {"curator_notes": entry["curator_notes"]}),
        ]
        for name, params in steps:
            status, body = deployment.action("WritingStyles", entry["id"], name, params)
            if status != 200:
                failures.append(f"{entry['slug']}: {name} returned HTTP {status}: {body[:300]!r}")
                break
        else:
            back = deployment.row("WritingStyles", entry["id"])
            stored_corpus = [(f"corpus-{n}.md", deployment.call(f"/tdata/Files('{fid}')/$value")[1].decode("utf-8"))
                             for n, fid in enumerate(back["fields"]["corpus_file_ids"], 1)]
            problems = problems_with(back, stored_corpus, json.loads(back["fields"]["mechanical_bands"]),
                                     json.loads(back["fields"]["exemplars"]))
            if back["fields"]["name"] != entry["name"]:
                problems.append(f"stored name is '{back['fields']['name']}'")
            if problems:
                failures += [f"{entry['slug']}: after writing, {p}" for p in problems]
            print(f"{label}: {'written and read back' if not problems else f'{len(problems)} problem(s) on read-back'}")

    assert not failures, f"{len(failures)} style(s) failed:\n" + "\n".join(failures)
    print(f"\nAll {len(planned)} styles hold a real corpus. VOICE.md and replication are still "
          f"built on the old one and must be rebuilt before any of them publishes.")


if __name__ == "__main__":
    main()
