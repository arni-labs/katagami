"""Trajectory capture wiring contract (ARN-293).

Source-level checks, in the style of the other contract tests here: the pieces
that make capture work are spread across a converter, a hook wrapper, and two
role skills, and each of them can be individually correct while the wiring
between them silently rots. These assertions are what notice.
"""

import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
import unittest.mock
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
JUDGE_SKILL = SKILLS_DIR / "katagami-judge" / "SKILL.md"

ROLE_SKILLS = [
    SKILLS_DIR / "katagami-contributor" / "SKILL.md",
    SKILLS_DIR / "katagami-iterate" / "SKILL.md",
]


def _load(path, module_name):
    sys.path.insert(0, str(path.parent))
    try:
        spec = importlib.util.spec_from_file_location(module_name, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.remove(str(path.parent))


class HarborIsPinnedAndIsolatedTest(unittest.TestCase):
    def test_harbor_is_pinned_to_a_tag_not_a_range(self):
        requirements = REQUIREMENTS.read_text()
        self.assertIn(
            "harbor @ git+https://github.com/harbor-framework/harbor.git@v0.21.0",
            requirements,
        )
        # A range would let the converter drift under a trajectory that has
        # already been posted, leaving no way to reconstruct how it was built.
        declarations = [
            line.strip()
            for line in requirements.splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        self.assertTrue(declarations)
        for line in declarations:
            for loose in (">=", "<=", "~=", "*"):
                self.assertNotIn(loose, line, f"loose version specifier in {line!r}")

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

    def test_the_post_carries_the_request_principal_as_well_as_the_claim(self):
        converter = CONVERTER.read_text()
        self.assertIn("x-temper-principal-kind", converter)
        self.assertIn("x-temper-principal-id", converter)

    def test_nothing_reaches_the_document_without_passing_through_redaction(self):
        converter = CONVERTER.read_text()
        self.assertIn("from redaction import redact_text, redact_value", converter)
        # The three places verbatim agent content enters the document.
        self.assertIn("redact_value(call.get(\"arguments\")", converter)
        self.assertIn("redact_text(reasoning)", converter)
        self.assertIn("def _result_parts", converter)


class JudgeSkillTargetsRealEndpointsTest(unittest.TestCase):
    """The judge must call things that exist.

    Two of its calls did not: `/tdata/Specs` (specs are served at
    `/observe/specs/{entity}`) and `/api/conformance/check` (the kernel has no
    conformance engine at all). A skill that 404s before its first verdict is a
    skill that never runs.
    """

    def setUp(self):
        self.skill = JUDGE_SKILL.read_text()

    def test_it_does_not_call_endpoints_the_server_does_not_have(self):
        self.assertNotIn("/tdata/Specs", self.skill)
        for line in self.skill.splitlines():
            if line.startswith(("GET ", "POST ", "PUT ", "PATCH ", "DELETE ")):
                self.assertNotIn("/api/conformance/check", line)
        # And it says so, so nobody reintroduces the call.
        self.assertIn("There is no `/api/conformance/check`", self.skill)

    def test_layer_one_runs_the_replay_that_ships_in_this_repository(self):
        self.assertIn("scripts/trajectory/conformance_check.py", self.skill)
        self.assertTrue((TRAJECTORY_DIR / "conformance_check.py").is_file())

    def test_the_spec_slice_is_verified_against_the_recorded_version(self):
        self.assertIn("scripts/trajectory/spec_version.py", self.skill)
        self.assertIn("--verify", self.skill)
        self.assertIn("/observe/specs/", self.skill)

    def test_it_does_not_expect_the_list_endpoint_to_return_documents(self):
        # OtsTrajectoryRow carries ids and counts, not the OTS blob.
        self.assertIn("Metadata only", self.skill)
        self.assertNotIn('"data": "<OTS JSON>"', self.skill)

    def test_it_reports_the_guards_the_replay_could_not_check(self):
        self.assertIn("unverifiable", self.skill)


class SubagentStagingTest(unittest.TestCase):
    """Delegated work is in a separate file, and it belongs in the trajectory.

    Claude Code writes each subagent's transcript to
    `<projects>/<slug>/<session-id>/subagents/*.jsonl`. Staging only the primary
    JSONL yields a trajectory that is silently missing whatever was delegated —
    a publish, a file mutation — and a replay over it can pass a run whose
    actions are not all there.
    """

    def setUp(self):
        self.adapter = _load(ADAPTER, "harbor_adapter_under_test")
        self.scratch = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.transcript = self.scratch / "9bd6.jsonl"
        self.transcript.write_text('{"uuid": "1"}\n')
        subagents = self.scratch / "9bd6" / "subagents"
        subagents.mkdir(parents=True)
        (subagents / "agent-a.jsonl").write_text('{"uuid": "2"}\n')
        (subagents / "agent-b.jsonl").write_text('{"uuid": "3"}\n')

    def test_the_sibling_subagent_directory_is_found(self):
        found = [p.name for p in self.adapter.subagent_transcripts(self.transcript)]
        self.assertEqual(found, ["agent-a.jsonl", "agent-b.jsonl"])

    def test_a_session_with_no_subagents_finds_none(self):
        alone = self.scratch / "alone.jsonl"
        alone.write_text('{"uuid": "1"}\n')
        self.assertEqual(self.adapter.subagent_transcripts(alone), [])

    def test_staging_puts_them_where_harbor_globs_for_them(self):
        session_dir = self.scratch / "staged"
        session_dir.mkdir()
        staged = self.adapter._stage_subagent_transcripts(self.transcript, session_dir)
        self.assertEqual(len(staged), 2)
        # Harbor reads session_dir.rglob("subagents/*.jsonl").
        self.assertEqual(
            sorted(p.name for p in session_dir.rglob("subagents/*.jsonl")),
            ["agent-a.jsonl", "agent-b.jsonl"],
        )
        # And excludes those directories when counting session dirs, so the
        # "exactly one session directory" requirement still holds.
        for path in session_dir.rglob("subagents/*.jsonl"):
            self.assertIn("subagents", path.parent.parts)


class CaptureIdentityTest(unittest.TestCase):
    """One derivation of the ids, read by both the hook and the skills.

    The actor record carries session_id and trajectory_id; the stored
    trajectory is filed under ids derived from the harness session id. A skill
    that mints its own leaves a trajectory_id pointing at nothing.
    """

    def setUp(self):
        self.hook = _load(HOOK_SCRIPT, "capture_under_test")
        self.converter = _load(CONVERTER, "converter_under_test")
        self.queue = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.env = self.enterContext(
            unittest.mock.patch.dict(
                os.environ,
                {
                    "KATAGAMI_TRAJECTORY_QUEUE": str(self.queue),
                    "KATAGAMI_AGENT_ID": "katagami-contributor",
                    "KATAGAMI_TRAJECTORY_SCRIPT": str(CONVERTER),
                },
            )
        )

    def test_the_hook_derives_the_trajectory_id_with_the_converters_function(self):
        identity = self.hook.build_identity("9bd6-session")
        self.assertEqual(
            identity["trajectory_id"],
            self.converter.derive_trajectory_id("9bd6-session"),
        )

    def test_there_is_no_second_copy_of_the_derivation(self):
        # A duplicate would drift, and the drift would be invisible.
        self.assertNotIn("def derive_trajectory_id", HOOK_SCRIPT.read_text())
        self.assertIn("derive_trajectory_id", HOOK_SCRIPT.read_text())

    def test_the_identity_carries_the_actor_spec_version(self):
        identity = self.hook.build_identity("9bd6-session")
        self.assertTrue(identity["spec_version"].startswith("CuratorAgent@sha256:"))

    def test_the_identity_is_published_where_a_skill_can_read_it(self):
        self.hook.write_identity("9bd6-session")
        published = json.loads((self.queue / self.hook.IDENTITY_PATH).read_text())
        self.assertEqual(published["session_id"], "9bd6-session")
        self.assertEqual(
            published["trajectory_id"],
            self.converter.derive_trajectory_id("9bd6-session"),
        )

    def test_the_identity_subcommand_prints_it(self):
        self.hook.write_identity("9bd6-session")
        result = subprocess.run(
            [sys.executable, str(HOOK_SCRIPT), "identity"],
            capture_output=True,
            text=True,
            env={**os.environ},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["session_id"], "9bd6-session")

    def test_asking_before_a_session_started_says_so_rather_than_inventing(self):
        result = subprocess.run(
            [sys.executable, str(HOOK_SCRIPT), "identity"],
            capture_output=True,
            text=True,
            env={**os.environ, "KATAGAMI_TRAJECTORY_QUEUE": str(self.queue / "empty")},
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("no capture identity", result.stderr)

    def test_the_enqueued_entry_carries_the_same_ids(self):
        result = subprocess.run(
            [sys.executable, str(HOOK_SCRIPT), "enqueue"],
            input=json.dumps(
                {"session_id": "9bd6-session", "transcript_path": "/tmp/x.jsonl"}
            ),
            capture_output=True,
            text=True,
            env={**os.environ},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        entry = json.loads((self.queue / "pending" / "9bd6-session.json").read_text())
        self.assertEqual(
            entry["trajectory_id"],
            self.converter.derive_trajectory_id("9bd6-session"),
        )
        self.assertTrue(entry["spec_version"].startswith("CuratorAgent@sha256:"))


class HookWiringTest(unittest.TestCase):
    def test_enqueue_at_session_end_and_process_at_session_start(self):
        snippet = json.loads(HOOK_SNIPPET.read_text())
        hooks = snippet["hooks"]
        self.assertIn("capture.py enqueue", json.dumps(hooks["SessionEnd"]))
        self.assertIn("capture.py process", json.dumps(hooks["SessionStart"]))

    def test_the_default_install_resolves_an_actor_spec_version(self):
        # A verbatim install used to produce rows with no spec_version, which
        # the judge stops on: captured, stored, and unjudgeable.
        snippet = json.loads(HOOK_SNIPPET.read_text())
        env = snippet["env"]
        spec_version = _load(TRAJECTORY_DIR / "spec_version.py", "spec_version_under_test")
        resolved = env.get("KATAGAMI_ACTOR_SPEC") or spec_version.actor_for_agent_id(
            env["KATAGAMI_AGENT_ID"]
        )
        self.assertTrue(resolved, "the shipped snippet resolves no actor spec")
        self.assertTrue(spec_version.compute_version(resolved))

    def test_the_hook_script_implements_all_three_modes(self):
        script = HOOK_SCRIPT.read_text()
        self.assertIn("def cmd_enqueue", script)
        self.assertIn("def cmd_process", script)
        self.assertIn("def cmd_identity", script)
        self.assertIn("session_id", script)
        self.assertIn("transcript_path", script)

    def test_every_posted_document_is_archived_for_the_judge(self):
        # GET /api/ots/trajectories returns metadata rows without the document,
        # so this archive is where the judge reads the trajectory it judges.
        script = HOOK_SCRIPT.read_text()
        self.assertIn('"archive"', script)
        self.assertIn("--out", script)
        self.assertIn("archive", JUDGE_SKILL.read_text())

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

    def test_every_role_skill_requires_ids_at_the_start(self):
        for skill in ROLE_SKILLS:
            text = skill.read_text()
            self.assertIn("session_id", text, skill.name)
            self.assertIn("trajectory_id", text, skill.name)

    def test_every_role_skill_reads_the_ids_rather_than_minting_them(self):
        # A self-minted trajectory_id resolves to no stored document: the hook
        # files the trajectory under the harness session id.
        for skill in ROLE_SKILLS + [JUDGE_SKILL]:
            text = skill.read_text()
            self.assertIn("capture.py identity", text, skill.name)
            flowed = " ".join(text.lower().split())
            self.assertTrue(
                "do not invent" in flowed or "rather than minting" in flowed,
                f"{skill.name} does not tell the reader to read the ids",
            )

    def test_every_role_skill_requires_the_roles_own_credential(self):
        for skill in ROLE_SKILLS:
            self.assertIn("own agent credential", skill.read_text(), skill.name)


if __name__ == "__main__":
    unittest.main()
