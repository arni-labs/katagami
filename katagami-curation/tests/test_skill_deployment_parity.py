"""Guards the repo's curator skills against drifting from the deployed text.

ARN-305. The curator does not read this repository. It reads the
installer-maintained File entities under
``/agents/sl-bootstrap-agent-soul-curator/skills/<slug>/SKILL.md``. Nothing
used to compare the two, and they silently diverged for weeks:
``synthesize-language`` was trimmed to 6786 bytes in master while production
kept serving the 12037-byte text authored on an unmerged branch. This test is
what makes that class of drift loud instead of invisible.

TRADEOFF, stated deliberately: this test needs the network and credentials, so
it cannot run in a bare local checkout. It reads ``TEMPER_API_URL``,
``TEMPER_API_KEY``, and ``TEMPER_TENANT`` from the environment and skips when
any is absent, so ``make test-integration`` on a laptop stays green while CI
with secrets gets a real comparison. A skip is a hole — it reports nothing
rather than success — so the skip reason names exactly what went unchecked and
how to run it, and the module prints the same warning to stderr. If you want
this enforced everywhere, put the curator credentials in CI.

It deliberately uses the governed OData API (``Files('<id>')/$value``, the same
endpoint ``ui/src/lib/temper-files.ts`` uses) rather than the unauthenticated
``katagami.ai/api/file/<id>`` proxy. That proxy is the ARN-309 hole and is being
closed; a test built on it would break when the hole is fixed, and would be a
reason to keep the hole open.

The comparison ignores a leading ``<!-- CANONICAL SYNC NOTE ... -->`` block on
either side. The repo carries provenance in that block, and it reaches the
deployed copy only after the next publish, so the byte comparison has to
tolerate the marker being present on one side, the other, or both.
"""

import hashlib
import json
import os
import re
import sys
import unittest
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SOUL_AGENT = "sl-bootstrap-agent-soul-curator"
SKILL_DIR = Path(__file__).resolve().parents[1] / "agents" / "curator" / "skills"
TIMEOUT_SECONDS = 30

API_URL = (os.environ.get("TEMPER_API_URL") or "").strip().rstrip("/")
API_KEY = (os.environ.get("TEMPER_API_KEY") or "").strip()
TENANT = (os.environ.get("TEMPER_TENANT") or "").strip()

_MISSING = [
    name
    for name, value in (
        ("TEMPER_API_URL", API_URL),
        ("TEMPER_API_KEY", API_KEY),
        ("TEMPER_TENANT", TENANT),
    )
    if not value
]

SKIP_REASON = (
    "curator skill/deployment parity NOT CHECKED: missing "
    + ", ".join(_MISSING)
    + ". The repo's SKILL.md files were not compared against the text the "
    "curator actually runs, so drift between them would pass unnoticed. To "
    "run it: set TEMPER_API_URL, TEMPER_API_KEY and TEMPER_TENANT (see "
    ".env.katagami-curator.local) and re-run."
)

if _MISSING:
    print("\n[test_skill_deployment_parity] SKIPPING: " + SKIP_REASON, file=sys.stderr)

# A leading provenance/sync marker is repo-side metadata, not skill text.
SYNC_NOTE = re.compile(r"\A\s*<!--\s*CANONICAL SYNC NOTE\b.*?-->\s*", re.DOTALL)


def _strip_sync_note(text):
    return SYNC_NOTE.sub("", text, count=1)


def _installer_entity_id(slug):
    return f"os-agent-skill-file-{SOUL_AGENT}-{slug}"


def _request(path):
    url = f"{API_URL}{path}"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "X-Tenant-Id": TENANT,
            "Accept": "*/*",
        },
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read()


def _repo_slugs():
    return sorted(
        path.name for path in SKILL_DIR.iterdir() if (path / "SKILL.md").is_file()
    )


@unittest.skipIf(bool(_MISSING), SKIP_REASON)
class SkillDeploymentParityTests(unittest.TestCase):
    """Every repo SKILL.md must match the installer copy the curator resolves to."""

    maxDiff = None

    def test_every_repo_skill_matches_the_deployed_installer_copy(self):
        slugs = _repo_slugs()
        self.assertTrue(slugs, f"no curator skills found under {SKILL_DIR}")

        drifted = []
        for slug in slugs:
            with self.subTest(skill=slug):
                entity_id = _installer_entity_id(slug)
                quoted = urllib.parse.quote(entity_id, safe="")
                try:
                    raw = _request(f"/tdata/Files('{quoted}')/$value")
                except urllib.error.HTTPError as exc:
                    self.fail(
                        f"{slug}: could not read the deployed skill "
                        f"{entity_id} (HTTP {exc.code}). The curator resolves to "
                        "this entity; if it is gone or renamed, the repo copy is "
                        "no longer the text that runs."
                    )

                deployed = raw.decode("utf-8")
                repo_path = SKILL_DIR / slug / "SKILL.md"
                repo = repo_path.read_text(encoding="utf-8")

                repo_body = _strip_sync_note(repo)
                deployed_body = _strip_sync_note(deployed)
                if repo_body == deployed_body:
                    continue

                drifted.append(slug)
                self.fail(
                    f"{slug}: repo copy has drifted from the deployed skill.\n"
                    f"  repo     {repo_path}: {len(repo_body.encode())} bytes "
                    f"(sync note stripped), sha256 "
                    f"{hashlib.sha256(repo_body.encode()).hexdigest()}\n"
                    f"  deployed {entity_id}: {len(deployed_body.encode())} bytes "
                    f"(sync note stripped), sha256 "
                    f"{hashlib.sha256(deployed_body.encode()).hexdigest()}\n"
                    "  The curator runs the deployed copy, not this repo. Reconcile "
                    "them in the same effort — copy exact bytes, never merge or "
                    "paraphrase the two."
                )

        self.assertEqual(drifted, [], f"skills out of sync with production: {drifted}")

    def test_fetched_bytes_match_the_entitys_content_hash(self):
        """The fetch itself must be trustworthy before parity means anything."""
        for slug in _repo_slugs():
            with self.subTest(skill=slug):
                entity_id = _installer_entity_id(slug)
                quoted = urllib.parse.quote(entity_id, safe="")
                meta = json.loads(_request(f"/tdata/Files('{quoted}')"))
                fields = meta.get("fields", meta)
                declared = (fields.get("content_hash") or "").removeprefix("sha256:")
                body = _request(f"/tdata/Files('{quoted}')/$value")
                self.assertEqual(
                    hashlib.sha256(body).hexdigest(),
                    declared,
                    f"{slug}: fetched bytes do not match the entity's declared "
                    "content_hash — the read is truncated or the entity changed "
                    "mid-test; parity results cannot be trusted.",
                )
                self.assertEqual(
                    fields.get("Path"),
                    f"/agents/{SOUL_AGENT}/skills/{slug}/SKILL.md",
                    f"{slug}: installer entity is not at the soul skills path",
                )
                self.assertEqual(
                    fields.get("Status"),
                    "Ready",
                    f"{slug}: installer entity is not Ready, so it is not what "
                    "the curator resolves to",
                )


if __name__ == "__main__":
    unittest.main()
