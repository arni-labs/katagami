#!/usr/bin/env python3
"""Create approved writing styles as private Drafts, and read every part back.

The sibling of `replace-writing-style-corpora.py`. That script swaps the corpus
of a style that already exists; this one brings a style into being. Both take an
approved payload from outside this repository and compose nothing of their own,
and both hold the payload to the same proof before anything is written:

  * the corpus passes the bands the payload derives from that same corpus;
  * each exemplar sits inside the 150-to-400 word range, passes those bands, and
    appears verbatim in the corpus it claims to come from;
  * the replica, written from the VOICE.md alone, comes back inside the same
    bands, which is the only thing a replica is evidence of;
  * the VOICE.md is generated here from the corpus about to be attached rather
    than carried in the payload, so a contract cannot disagree with the text
    that lands beside it, and every passage it quotes is checked against that
    corpus before and after the write.

    python3 scripts/create-writing-styles.py <approved.json> --expect <n> [--apply]

Where a revision needs `baseHash` to say which bytes it was built from, a
creation needs the opposite guarantee: that it is not overwriting anything. The
slug is the identity a reader and every other script uses, so the run refuses to
proceed if the deployment already holds a style under a slug in the payload —
before writing, and again immediately before the first write, because another
run may have landed one in between.

Nothing here publishes. Every style lands in `Draft`, which is where consent
attestation, bands self-consistency, review and publication are decided by the
curation finalizer and a human curator. This script never fires those.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "docs/research/harness"))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from voice_check_local import check, words_of  # noqa: E402
import writing_style_voice_md as voice_md_format  # noqa: E402

FLOOR, CEILING, MOST = 150, 400, 3
REPLICA_FLOOR = 150


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

    def slugs_in_use(self):
        """Every slug the deployment holds, at any status.

        Archived counts. An archived style keeps its identity, so reusing its
        slug would put two records under one name in every listing that reads
        the field.
        """
        seen, path = {}, "/tdata/WritingStyles?$top=200"
        while path:
            status, body = self.call(path)
            assert status == 200, f"listing writing styles: HTTP {status}: {body[:200]!r}"
            page = json.loads(body)
            for row in page["value"]:
                seen[row["fields"]["slug"]] = (row["entity_id"], row["fields"]["Status"])
            following = page.get("@odata.nextLink")
            path = ("/" + following.lstrip("/")) if following else None
        return seen

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


def problems_with(corpus, bands, exemplars, *, basis):
    found = [f"corpus: {v}" for v in check(bands, corpus, corpus)]
    if not 1 <= len(exemplars) <= MOST:
        found.append(f"carries {len(exemplars)} exemplars, outside 1 to {MOST}")
    haystack = " ".join(flat(body) for _, body in corpus)
    for i, exemplar in enumerate(exemplars, 1):
        n = len(words_of(exemplar["text"]))
        if not FLOOR <= n <= CEILING:
            found.append(f"exemplar {i} is {n} words, outside {FLOOR} to {CEILING}")
        if not (exemplar.get("annotation") or "").strip():
            found.append(f"exemplar {i} carries no annotation")
        if basis == "public_domain" and flat(exemplar["text"]) not in haystack:
            found.append(f"exemplar {i} is not a verbatim run of the corpus")
    found += check(bands, corpus, [(f"exemplar {i}", e["text"]) for i, e in enumerate(exemplars, 1)])
    return found


def replica_problems(entry, corpus):
    replica = entry.get("replica", "")
    n = len(words_of(replica))
    if n < REPLICA_FLOOR:
        return [f"replica is {n} words, under the {REPLICA_FLOOR} the contract requires"]
    return [f"replica: {v}" for v in check(entry["mechanical_bands"], corpus, [("replica", replica)])]


def contract_problems(entry, corpus):
    """The VOICE.md this run would write has to quote the corpus it attaches."""
    contract = voice_md_format.build(entry, [f"pending-{n}" for n in range(1, len(corpus) + 1)], corpus)
    haystack = " ".join(flat(body) for _, body in corpus)
    found = []
    passages = voice_md_format.quoted_from(contract)
    if not passages:
        found.append("the VOICE.md would quote no corpus passage, so nothing in it would be checked")
    for n, passage in enumerate(passages, 1):
        if flat(passage) not in haystack:
            found.append(f"VOICE.md passage {n} would not be in the corpus")
    return found, contract


def in_parent_order(styles):
    """A blend after the author voices it names, so its parents exist to point at.

    A blend declares its parents by slug because the payload is written before
    any of them has an identifier. The identifiers are filled in during the run
    from the styles it has just created.
    """
    by_slug = {entry["slug"]: entry for entry in styles}
    ordered, placed = [], set()
    for entry in styles:
        for parent in entry.get("parent_slugs", []):
            assert parent in by_slug or parent, f"{entry['slug']} names an unknown parent {parent}"
            if parent in by_slug and parent not in placed:
                ordered.append(by_slug[parent])
                placed.add(parent)
        if entry["slug"] not in placed:
            ordered.append(entry)
            placed.add(entry["slug"])
    return ordered


def main():
    flags = sys.argv[1:]
    apply_writes = "--apply" in flags
    expected = int(flags[flags.index("--expect") + 1])
    payload_path = next(a for i, a in enumerate(flags)
                        if not a.startswith("--") and (i == 0 or flags[i - 1] != "--expect"))
    payload = json.load(open(payload_path))
    styles = payload["styles"]
    assert len(styles) == expected, f"the payload holds {len(styles)} styles, not the {expected} expected"
    assert payload.get("allowedOperation") == "create Draft WritingStyles", \
        f"this script creates Drafts; the payload authorises: {payload.get('allowedOperation')}"
    slugs = [entry["slug"] for entry in styles]
    assert len(set(slugs)) == len(slugs), "the payload names one slug twice"
    styles = in_parent_order(styles)
    print(f"Batch {payload['batch']}: {len(styles)} approved styles")

    deployment = Deployment()
    in_use = deployment.slugs_in_use()
    planned, failures = [], []
    for entry in styles:
        label = f"{entry['number']} {entry['slug']}"
        if entry["slug"] in in_use:
            entity_id, status = in_use[entry["slug"]]
            failures.append(f"{entry['slug']}: the deployment already holds this slug ({entity_id}, {status})")
            continue
        corpus = [(c["file"], c["text"]) for c in entry["corpus"]]
        found = problems_with(corpus, entry["mechanical_bands"], entry["exemplars"],
                              basis=entry["consent"]["basis"])
        found += replica_problems(entry, corpus)
        contract_found, contract = contract_problems(entry, corpus)
        found += contract_found
        if found:
            failures += [f"{entry['slug']}: {p}" for p in found]
            print(f"{label}: {len(found)} problem(s)")
            continue
        print(f"{label}: would create '{entry['name']}' with {len(corpus)} passages of "
              f"{[len(words_of(b)) for _, b in corpus]} words, {len(entry['exemplars'])} exemplars, "
              f"a VOICE.md quoting {len(voice_md_format.quoted_from(contract))} passages, and a "
              f"{len(words_of(entry['replica']))}-word replica")
        planned.append(entry)

    assert not failures, f"{len(failures)} style(s) failed the plan:\n" + "\n".join(failures)
    print(f"\nEvery one of {len(planned)} styles is ready.")
    if not apply_writes:
        print("Reporting only. Pass --apply to write.")
        return

    in_use = deployment.slugs_in_use()
    created, made = [], {}
    for entry in planned:
        label = f"{entry['number']} {entry['slug']}"
        if entry["slug"] in in_use:
            failures.append(f"{entry['slug']}: another run created this slug while this one was working")
            continue
        status, body = deployment.call("/tdata/WritingStyles", "POST", {})
        assert status in (200, 201), f"creating {entry['slug']}: HTTP {status}: {body[:300]!r}"
        entity_id = json.loads(body)["entity_id"]
        created.append({"number": entry["number"], "slug": entry["slug"],
                        "name": entry["name"], "id": entity_id})
        made[entry["slug"]] = entity_id
        file_ids = [deployment.write_file(c["file"], f"/katagami/writing-styles/{entry['slug']}/{c['file']}", c["text"])
                    for c in entry["corpus"]]
        corpus = [(c["file"], c["text"]) for c in entry["corpus"]]
        contract = voice_md_format.build(entry, file_ids, corpus)
        contract_id = deployment.write_file(
            "VOICE.md", f"/katagami/writing-styles/{entry['slug']}/VOICE.md", contract)
        replica_id = deployment.write_file(
            "replica-1.md", f"/katagami/writing-styles/{entry['slug']}/replica-1.md", entry["replica"])
        manifest = {"items": [{"file_id": fid, "kind": "public-domain-excerpt",
                               "source": entry["consent"]["provenance"], "words": c["words"]}
                              for fid, c in zip(file_ids, entry["corpus"])]}
        steps = [
            ("SetName", {"name": entry["name"], "slug": entry["slug"]}),
            ("SetVoiceLayer", {"persona": entry["persona"],
                               "tone_scales": json.dumps(entry["tone_scales"]),
                               "vocabulary": json.dumps(entry["vocabulary"], ensure_ascii=False),
                               "moves": json.dumps(entry["moves"], ensure_ascii=False),
                               "register": json.dumps(entry["register"], ensure_ascii=False),
                               "refusals": json.dumps(entry["refusals"], ensure_ascii=False)}),
            ("SetMechanicalBands", {"mechanical_bands": json.dumps(entry["mechanical_bands"])}),
            ("AttachCorpus", {"corpus_file_ids": file_ids,
                              "corpus_manifest": json.dumps(manifest, ensure_ascii=False),
                              "consent": json.dumps(entry["consent"], ensure_ascii=False)}),
            ("SetExemplars", {"exemplars": json.dumps(entry["exemplars"], ensure_ascii=False)}),
            ("SetCredits", {"credits": json.dumps(entry["credits"], ensure_ascii=False)}),
            ("SetModelProvenance", {"model_provenance": json.dumps(entry["model_provenance"])}),
            ("SetTags", {"tags": json.dumps(entry["tags"])}),
            ("AttachVoiceMd", {"voice_md_file_id": contract_id,
                               "voice_md_lint_result": json.dumps({"summary": {"errors": 0, "warnings": 0}}),
                               "voice_md_format_version": voice_md_format.FORMAT_VERSION}),
            ("AttachReplication", {"replication_sample_file_ids": [replica_id],
                                   "replication_manifest": json.dumps(
                                       {"items": [{"file_id": replica_id,
                                                   "model": entry["replica_model"],
                                                   "prompt_words": len(words_of(contract))}]})}),
            ("AddCuratorNotes", {"curator_notes": entry["curator_notes"]}),
        ]
        missing = [p for p in entry.get("parent_slugs", []) if p not in made]
        if missing:
            failures.append(f"{entry['slug']}: parent {', '.join(missing)} was not created")
            continue
        parent_ids = [made[slug] for slug in entry.get("parent_slugs", [])]
        if parent_ids:
            steps.insert(1, ("SetLineage", {"parent_ids": parent_ids,
                                            "lineage_type": entry["lineage_type"],
                                            "generation_number": entry["generation_number"]}))
        for name, params in steps:
            status, body = deployment.action("WritingStyles", entity_id, name, params)
            if status != 200:
                failures.append(f"{entry['slug']}: {name} returned HTTP {status}: {body[:300]!r}")
                break
        else:
            back = deployment.row("WritingStyles", entity_id)
            stored_corpus = [(f"corpus-{n}.md", deployment.call(f"/tdata/Files('{fid}')/$value")[1].decode("utf-8"))
                             for n, fid in enumerate(back["fields"]["corpus_file_ids"], 1)]
            problems = problems_with(stored_corpus, json.loads(back["fields"]["mechanical_bands"]),
                                     json.loads(back["fields"]["exemplars"]),
                                     basis=json.loads(back["fields"]["consent"])["basis"])
            if back["fields"]["name"] != entry["name"]:
                problems.append(f"stored name is '{back['fields']['name']}'")
            if back["fields"]["Status"] != "Draft":
                problems.append(f"stored status is '{back['fields']['Status']}', not Draft")
            stored_contract = deployment.call(
                f"/tdata/Files('{back['fields']['voice_md_file_id']}')/$value")[1].decode("utf-8")
            haystack = " ".join(flat(body) for _, body in stored_corpus)
            for n, passage in enumerate(voice_md_format.quoted_from(stored_contract), 1):
                if flat(passage) not in haystack:
                    problems.append(f"stored VOICE.md passage {n} is not in the stored corpus")
            stored_replica = deployment.call(
                f"/tdata/Files('{back['fields']['replication_sample_file_ids'][0]}')/$value")[1].decode("utf-8")
            problems += [f"stored replica: {v}" for v in
                         check(json.loads(back["fields"]["mechanical_bands"]), stored_corpus,
                               [("replica", stored_replica)])]
            if problems:
                failures += [f"{entry['slug']}: after writing, {p}" for p in problems]
            print(f"{label}: {entity_id} "
                  f"{'written and read back' if not problems else f'{len(problems)} problem(s) on read-back'}")

    record = os.path.join(os.path.dirname(payload_path), f"created-{payload['batch']}.json")
    with open(record, "w") as handle:
        json.dump({"batch": payload["batch"], "created": created}, handle, indent=2, ensure_ascii=False)
    print(f"\nIdentifiers written to {record}")
    assert not failures, f"{len(failures)} style(s) failed:\n" + "\n".join(failures)
    print(f"All {len(created)} styles hold a real corpus, a VOICE.md quoting that corpus, "
          f"and a replica that round-trips its bands.")


if __name__ == "__main__":
    main()
