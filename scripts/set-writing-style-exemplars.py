#!/usr/bin/env python3
"""Apply an approved exemplar payload to the writing styles, and read every one back.

The payload lives outside this repository: it is the record of what the owner
approved, and it is the only source of content. This script adds nothing to it.
It dispatches one action, SetExemplars, on styles that are already Draft or
UnderReview, and it refuses anything the payload does not authorise.

    python3 scripts/set-writing-style-exemplars.py <approved.json> --expect <n> [--apply]

`--expect` is how many styles the operator believes were approved; a swapped or
truncated file stops here rather than being written.

Before anything is written every exemplar is proved against the deployment: it
sits inside the length floor and ceiling, it passes that style's own mechanical
bands with that style's own corpus as the reference, and on a public-domain
style it appears verbatim in that corpus. An exemplar is evidence, so a passage
that has drifted from the corpus by a word stops the batch.

SetExemplars replaces the whole list, so a style whose exemplars have moved since
the payload was built would be overwritten silently. Each style therefore carries
`baseHash`, the sha256 of the exemplars string exactly as its author read it. The
base is checked in the plan and again immediately before the write. When it
refuses: re-read the style, rebuild on what production holds now, and re-apply
only your own change. Replaying a payload built against the older bytes undoes
the other write in the opposite direction.
"""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "docs/research/harness"))
from voice_check_local import check, words_of  # noqa: E402

FLOOR, CEILING, MOST = 150, 400, 3
WRITEABLE = ("Draft", "UnderReview")


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def flat(text):
    return re.sub(r"\s+", " ", text).strip()


class Deployment:
    def __init__(self):
        self.origin = os.environ.get("TEMPER_API_URL", "https://openpaw-production.up.railway.app")
        self.headers = {"Authorization": f"Bearer {os.environ['TEMPER_API_KEY']}",
                        "X-Tenant-Id": os.environ.get("TEMPER_TENANT", "default")}

    def _open(self, path, method="GET", body=None):
        headers = dict(self.headers)
        if body is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(self.origin + path, method=method,
                                         data=None if body is None else json.dumps(body).encode("utf-8"),
                                         headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    def style(self, entity_id):
        status, raw = self._open(f"/tdata/WritingStyles('{entity_id}')")
        return json.loads(raw) if status == 200 else None

    def file_text(self, file_id):
        status, raw = self._open(f"/tdata/Files('{file_id}')/$value")
        assert status == 200, f"cannot read file {file_id}: HTTP {status}"
        return raw.decode("utf-8")

    def set_exemplars(self, entity_id, exemplars):
        return self._open(f"/tdata/WritingStyles('{entity_id}')/Temper.SetExemplars",
                          "POST", {"exemplars": exemplars})


def problems_with(style, exemplars, corpus):
    """Everything that would make this write wrong, named."""
    fields = style["fields"]
    found = []
    if fields["Status"] not in WRITEABLE:
        found.append(f"is {fields['Status']}; SetExemplars is valid only from {' or '.join(WRITEABLE)}")
    if not 1 <= len(exemplars) <= MOST:
        found.append(f"carries {len(exemplars)} exemplars, outside 1 to {MOST}")
    for i, exemplar in enumerate(exemplars, 1):
        n = len(words_of(exemplar["text"]))
        if not FLOOR <= n <= CEILING:
            found.append(f"exemplar {i} is {n} words, outside {FLOOR} to {CEILING}")
        if not exemplar.get("annotation", "").strip():
            found.append(f"exemplar {i} carries no annotation")
        if exemplar.get("kind") not in ("corpus", "authored"):
            found.append(f"exemplar {i} states kind '{exemplar.get('kind')}'")
    bands = json.loads(fields.get("mechanical_bands") or "{}")
    found += check(bands, corpus, [(f"exemplar {i}", e["text"]) for i, e in enumerate(exemplars, 1)])
    if json.loads(fields.get("consent") or "{}").get("basis") == "public_domain":
        haystack = " ".join(flat(body) for _, body in corpus)
        for i, exemplar in enumerate(exemplars, 1):
            if flat(exemplar["text"]) not in haystack:
                found.append(f"exemplar {i} is not a verbatim run of its own corpus")
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
    assert re.match(r"^SetExemplars on Draft or UnderReview WritingStyle", payload.get("allowedOperation", "")), \
        f"this script only sets exemplars; the payload authorises: {payload.get('allowedOperation')}"
    print(f"Batch {payload['batch']}: {len(styles)} approved styles")
    print(f"Allowed operation: {payload['allowedOperation']}")

    deployment = Deployment()
    planned, failures = [], []
    for entry in styles:
        label = f"{entry['number']:>2} {entry['slug']}"
        style = deployment.style(entry["id"])
        if style is None:
            failures.append(f"{entry['slug']}: not found on the deployment")
            print(f"{label}: not found")
            continue
        stored = style["fields"].get("exemplars") or ""
        if sha256(stored) != entry["baseHash"]:
            failures.append(f"{entry['slug']}: exemplars have moved since the payload was built "
                            f"(stored {sha256(stored)[:12]}, payload {entry['baseHash'][:12]}); "
                            f"re-read it and rebuild on what production holds now")
            print(f"{label}: base moved")
            continue
        corpus = [(f"corpus-{n}.md", deployment.file_text(fid))
                  for n, fid in enumerate(style["fields"].get("corpus_file_ids") or [], 1)]
        found = problems_with(style, entry["exemplars"], corpus)
        if found:
            failures += [f"{entry['slug']}: {p}" for p in found]
            print(f"{label}: {len(found)} problem(s)")
            continue
        words = [len(words_of(e["text"])) for e in entry["exemplars"]]
        print(f"{label}: would set {len(entry['exemplars'])} exemplars, {words} words, all verbatim and in band")
        planned.append((entry, style, corpus))

    assert not failures, f"{len(failures)} style(s) failed the plan:\n" + "\n".join(failures)
    print(f"\nEvery one of {len(planned)} styles is ready.")
    if not apply_writes:
        print("Reporting only. Pass --apply to write.")
        return

    for entry, _, corpus in planned:
        label = f"{entry['number']:>2} {entry['slug']}"
        # The base is checked again against the read taken immediately before the
        # write, so a style that moved between the plan and now is refused rather
        # than overwritten.
        current = deployment.style(entry["id"])
        if sha256(current["fields"].get("exemplars") or "") != entry["baseHash"]:
            failures.append(f"{entry['slug']}: changed while this run was working; nothing was written to it")
            print(f"{label}: base moved during the run")
            continue
        body = json.dumps(entry["exemplars"], ensure_ascii=False)
        status, raw = deployment.set_exemplars(entry["id"], body)
        if status != 200:
            failures.append(f"{entry['slug']}: SetExemplars returned HTTP {status}: {raw[:300]!r}")
            print(f"{label}: HTTP {status}")
            continue
        # A dispatch that returned is not evidence. The stored bytes are.
        back = deployment.style(entry["id"])
        stored = json.loads(back["fields"].get("exemplars") or "[]")
        problems = problems_with(back, stored, corpus)
        if stored != entry["exemplars"]:
            problems.append("the stored exemplars differ from the approved exemplars")
        if problems:
            failures += [f"{entry['slug']}: after writing, {p}" for p in problems]
            print(f"{label}: written, {len(problems)} problem(s) on read-back")
            continue
        print(f"{label}: written and read back, {len(stored)} exemplars")

    assert not failures, f"{len(failures)} style(s) failed:\n" + "\n".join(failures)
    print(f"\nAll {len(planned)} styles hold exactly the approved exemplars.")


if __name__ == "__main__":
    main()
