"""Trajectory capture wiring contract (ARN-293).

Source-level checks, in the style of the other contract tests here: the pieces
that make capture work are spread across a converter, a hook wrapper, and two
role skills, and each of them can be individually correct while the wiring
between them silently rots. These assertions are what notice.
"""

import json
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAJECTORY_DIR = REPO_ROOT / "scripts" / "trajectory"
HOOK_DIR = REPO_ROOT / "hooks" / "trajectory-capture"
SKILLS_DIR = REPO_ROOT / "mcp" / "skills"

CONVERTER = TRAJECTORY_DIR / "claude_session_to_ots.py"
ADAPTER = TRAJECTORY_DIR / "harbor_adapter.py"
REQUIREMENTS = TRAJECTORY_DIR / "requirements.txt"
HOOK_SCRIPT = HOOK_DIR / "capture.py"
HOOK_README = HOOK_DIR / "README.md"
HOOK_SNIPPET = HOOK_DIR / "settings.snippet.json"

ROLE_SKILLS = [
    SKILLS_DIR / "katagami-contributor" / "SKILL.md",
    SKILLS_DIR / "katagami-iterate" / "SKILL.md",
]


class HarborIsPinnedAndIsolatedTest(unittest.TestCase):
    def test_harbor_is_pinned_to_a_tag_not_a_range(self):
        requirements = REQUIREMENTS.read_text()
        self.assertIn(
            "harbor @ git+https://github.com/harbor-framework/harbor.git@v0.21.0",
            requirements,
        )
        # A range would let the converter drift under a trajectory that has
        # already been posted, leaving no way to reconstruct how it was built.
        self.assertNotIn(">=", requirements.split("#")[-1])

    def test_the_pin_in_the_adapter_matches_the_requirements_file(self):
        adapter = ADAPTER.read_text()
        version = re.search(r'HARBOR_PINNED_VERSION = "([^"]+)"', adapter).group(1)
        ref = re.search(r'HARBOR_PINNED_REF = "([^"]+)"', adapter).group(1)
        self.assertEqual(ref, f"v{version}")
        self.assertIn(f"harbor.git@{ref}", REQUIREMENTS.read_text())

    def test_harbor_is_imported_in_exactly_one_module(self):
        # The dependency is swappable only while it stays behind one seam.
        importers = [
            path.relative_to(REPO_ROOT).as_posix()
            for path in list(TRAJECTORY_DIR.glob("*.py")) + list(HOOK_DIR.glob("*.py"))
            if re.search(r"^\s*(from|import)\s+harbor\b", path.read_text(), re.M)
        ]
        self.assertEqual(importers, ["scripts/trajectory/harbor_adapter.py"])

    def test_a_drifted_harbor_version_is_an_error_not_a_warning(self):
        adapter = ADAPTER.read_text()
        self.assertIn("class HarborUnavailable", adapter)
        self.assertIn("raise HarborUnavailable", adapter)
        self.assertIn("if installed != HARBOR_PINNED_VERSION", adapter)


class ConverterContractTest(unittest.TestCase):
    def test_the_ingest_path_and_every_required_header_are_wired(self):
        converter = CONVERTER.read_text()
        self.assertIn('OTS_INGEST_PATH = "/api/ots/trajectories"', converter)
        for header in (
            "X-Agent-Id",
            "X-Session-Id",
            "X-Tenant-Id",
            "X-Trajectory-Id",
            "Authorization",
        ):
            self.assertIn(header, converter)
        self.assertIn('f"Bearer {api_key}"', converter)

    def test_the_ots_contract_fields_are_emitted(self):
        converter = CONVERTER.read_text()
        for field in (
            "spec_version",
            "harness",
            "cause_id",
            "prompt_token_ids",
            "completion_token_ids",
            "logprobs",
        ):
            self.assertIn(field, converter)

    def test_response_mask_is_never_fabricated(self):
        # It has no ATIF source. A mask guessed from text would be wrong in
        # exactly the cases RL consumers depend on it for.
        converter = CONVERTER.read_text()
        self.assertNotIn('"response_mask"', converter)
        self.assertIn("response_mask", converter)  # documented, not emitted


class HookWiringTest(unittest.TestCase):
    def test_enqueue_at_session_end_and_process_at_session_start(self):
        snippet = json.loads(HOOK_SNIPPET.read_text())
        hooks = snippet["hooks"]
        self.assertIn("capture.py enqueue", json.dumps(hooks["SessionEnd"]))
        self.assertIn("capture.py process", json.dumps(hooks["SessionStart"]))

    def test_the_hook_script_implements_both_modes(self):
        script = HOOK_SCRIPT.read_text()
        self.assertIn("def cmd_enqueue", script)
        self.assertIn("def cmd_process", script)
        self.assertIn("session_id", script)
        self.assertIn("transcript_path", script)

    def test_failures_are_surfaced_rather_than_swallowed(self):
        script = HOOK_SCRIPT.read_text()
        self.assertIn("failed", script)
        self.assertIn("file=sys.stderr", script)
        # A queue entry that could not be converted keeps its reason next to it.
        self.assertIn("error.txt", script)

    def test_the_readme_documents_install_and_recovery(self):
        readme = HOOK_README.read_text()
        for expected in (
            "~/.claude/settings.json",
            "KATAGAMI_AGENT_ID",
            "TEMPER_API_URL",
            "SessionEnd",
            "SessionStart",
            "failed/",
        ):
            self.assertIn(expected, readme)


class RoleSkillPreambleTest(unittest.TestCase):
    """Both role skills must carry the same capture preamble.

    A skill that forgets the headers produces a trajectory with holes in it,
    and the holes are invisible until someone tries to judge the run — which is
    exactly too late.
    """

    def test_every_role_skill_exists(self):
        for skill in ROLE_SKILLS:
            self.assertTrue(skill.is_file(), f"missing role skill: {skill}")

    def test_every_role_skill_has_a_trajectory_capture_section(self):
        for skill in ROLE_SKILLS:
            self.assertIn("## Trajectory capture", skill.read_text(), skill.name)

    def test_every_role_skill_names_both_headers_verbatim(self):
        for skill in ROLE_SKILLS:
            text = skill.read_text()
            self.assertIn("X-Session-Id", text, skill.name)
            self.assertIn("X-Intent", text, skill.name)

    def test_every_role_skill_requires_ids_minted_at_the_start(self):
        for skill in ROLE_SKILLS:
            text = skill.read_text()
            self.assertIn("session_id", text, skill.name)
            self.assertIn("trajectory_id", text, skill.name)

    def test_every_role_skill_requires_the_roles_own_credential(self):
        for skill in ROLE_SKILLS:
            self.assertIn("own agent credential", skill.read_text(), skill.name)


if __name__ == "__main__":
    unittest.main()
