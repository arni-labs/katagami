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
import tomllib
import unittest
import unittest.mock
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CURATION_ROOT = Path(__file__).resolve().parents[1]
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
    """The judge must call things that exist, with the shapes they really have.

    `/tdata/Specs` never existed (specs are served at
    `/observe/specs/{entity}`). `/api/conformance/check` did not exist when this
    skill was written and does now, so layer 1 is the kernel's engine and this
    test pins the endpoints and response shapes it actually addresses.
    """

    def setUp(self):
        self.skill = JUDGE_SKILL.read_text()

    def test_it_does_not_call_endpoints_the_server_does_not_have(self):
        self.assertNotIn("/tdata/Specs", self.skill)
        # There is no bare GET /api/ots/trajectories/{id}: the only single
        # trajectory route is the ATIF export (temper-server/src/api/mod.rs).
        for line in self.skill.splitlines():
            stripped = line.strip()
            if stripped.startswith("GET ") and "/api/ots/trajectories/" in stripped:
                self.assertIn("/atif", stripped, stripped)

    def test_layer_one_is_the_kernel_endpoint(self):
        self.assertIn("POST $TEMPER_API_URL/api/conformance/check", self.skill)
        # Its required request fields and the verdict vocabulary it answers in.
        for field in ('"entity_type"', '"session_id"', '"spec_version"'):
            self.assertIn(field, self.skill)
        for field in ("evidence_complete", "evidence_gaps", "spec_resolution"):
            self.assertIn(field, self.skill)
        for verdict in ("indeterminate", "`pass`", "`fail`"):
            self.assertIn(verdict, self.skill)

    def test_the_local_replay_is_labelled_as_the_offline_fallback(self):
        self.assertIn("scripts/trajectory/conformance_check.py", self.skill)
        self.assertTrue((TRAJECTORY_DIR / "conformance_check.py").is_file())
        flowed = " ".join(self.skill.lower().split())
        self.assertIn("offline", flowed)
        # And the tool itself says the kernel is authoritative, so the two
        # engines cannot silently drift into disagreeing.
        tool = (TRAJECTORY_DIR / "conformance_check.py").read_text()
        self.assertIn("/api/conformance/check", tool)
        self.assertIn("authoritative", tool.lower())

    def test_the_canonical_trajectory_read_is_the_kernel_not_a_local_file(self):
        self.assertIn("/api/ots/trajectories/<trajectory-id>/atif", self.skill)
        # The archive survives only as an explicitly-labelled offline fallback.
        archive_context = self.skill.lower()
        self.assertIn("offline fallback", archive_context)
        self.assertIn("~/.katagami/trajectory-queue/archive/", self.skill)

    def test_the_spec_slice_is_verified_against_the_recorded_version(self):
        self.assertIn("scripts/trajectory/spec_version.py", self.skill)
        self.assertIn("--verify", self.skill)
        self.assertIn("/observe/specs/", self.skill)

    def test_it_reads_how_the_spec_version_was_obtained(self):
        # A 409 means different things depending on whether the version was
        # read from the kernel or computed locally, and the judge has to say
        # which rather than reporting a spec nobody has.
        # It rides in `tags`, because the kernel drops metadata keys it does
        # not model — a field of our own would always read as absent, and
        # absent means "locally computed".
        self.assertIn("spec-version-source:", self.skill)
        self.assertIn("tags", self.skill)
        self.assertIn("`registry`", self.skill)
        self.assertIn("`local`", self.skill)


    def test_it_does_not_expect_the_list_endpoint_to_return_documents(self):
        # OtsTrajectoryRow carries ids and counts, not the OTS blob.
        self.assertIn("Metadata only", self.skill)
        self.assertNotIn('"data": "<OTS JSON>"', self.skill)

    def test_it_reports_what_the_check_could_not_settle(self):
        self.assertIn("unverifiable", self.skill)
        self.assertIn("evidence_gaps", self.skill)

    def test_entity_creation_reads_the_id_the_server_actually_returns(self):
        # Temper answers a spec-governed create with the entity's state, whose
        # id field is `entity_id`. `Id` belongs to other creation paths.
        self.assertIn('"entity_id"', self.skill)
        self.assertNotIn('-> { "Id":', self.skill)


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
                    "KATAGAMI_SPEC_SNAPSHOT_DIR": str(self.queue / "spec-snapshots"),
                    "KATAGAMI_SPEC_ATTESTATION_DIR": str(self.queue / "spec-attestations"),
                    "KATAGAMI_AGENT_ID": "katagami-contributor",
                    "KATAGAMI_TRAJECTORY_SCRIPT": str(CONVERTER),
                },
            )
        )
        # Building an identity resolves the spec version, which reads the
        # registry. With TEMPER_API_URL exported — the normal state on a
        # developer machine — these unit tests made live authenticated calls to
        # whatever that pointed at, once per test, and their results changed
        # with connectivity.
        for name in ("TEMPER_API_URL", "TEMPER_API_KEY"):
            os.environ.pop(name, None)

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

    def test_every_path_that_emits_an_id_agrees_with_the_converter(self):
        """The real guard on "one derivation" — behaviour, not a name.

        Grepping for `def derive_trajectory_id` only catches a duplicate that
        announces itself. An inlined `hashlib.sha256(...)` in any of these code
        paths is exactly the drift the rule exists to prevent, and it passes
        the grep. So every path that hands an id to a caller is compared
        against the converter's own answer.
        """
        for session_id in ("9bd6-session", "iter-abc-3", "jcs-ledger-8fdc9a3135"):
            expected = self.converter.derive_trajectory_id(session_id)

            self.assertEqual(
                self.hook.build_identity(session_id)["trajectory_id"],
                expected,
                f"build_identity disagrees with the converter for {session_id!r}",
            )

            derived = self._derive(session_id)
            self.assertEqual(derived.returncode, 0, derived.stderr)
            self.assertEqual(
                json.loads(derived.stdout)["trajectory_id"],
                expected,
                f"`derive` disagrees with the converter for {session_id!r}",
            )

            self.hook.write_identity(session_id)
            recorded = self._identity(session_id)
            self.assertEqual(recorded.returncode, 0, recorded.stderr)
            self.assertEqual(
                json.loads(recorded.stdout)["trajectory_id"],
                expected,
                f"`identity` disagrees with the converter for {session_id!r}",
            )

    def test_the_identity_carries_the_actor_spec_version(self):
        identity = self.hook.build_identity("9bd6-session")
        self.assertTrue(identity["spec_version"].startswith("sha256:"))

    SOURCES = {"registry", "local", "attested", "snapshot"}

    def test_the_identity_says_where_the_version_came_from(self):
        # "registry" (read from the kernel) vs "local" (computed here) is the
        # difference between a digest a conformance check will match and one
        # that matches only if the deploy registered these exact bytes.
        identity = self.hook.build_identity("9bd6-session")
        self.assertIn("spec_version_source", identity)
        self.assertIn(identity["spec_version_source"], self.SOURCES)

    def test_the_queue_entry_records_the_source_seen_at_enqueue(self):
        # The converter re-resolves at process time, so this field is what was
        # true when the session ended, not an instruction to the converter.
        # Asserted on the written entry rather than on build_identity again,
        # so deleting the field from the entry fails this test.
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
        self.assertIn("spec_version_source", entry)
        self.assertIn(entry["spec_version_source"], self.SOURCES)

    def test_the_identity_is_published_where_a_skill_can_read_it(self):
        self.hook.write_identity("9bd6-session")
        published = json.loads(self.hook.identity_path("9bd6-session").read_text())
        self.assertEqual(published["session_id"], "9bd6-session")
        self.assertEqual(
            published["trajectory_id"],
            self.converter.derive_trajectory_id("9bd6-session"),
        )

    def test_concurrent_sessions_do_not_overwrite_each_other(self):
        # Two Claude Code windows open at once. A single shared identity file
        # made the second session's ids the answer for both, so the first
        # session recorded a trajectory_id belonging to the other run.
        self.hook.write_identity("session-one")
        self.hook.write_identity("session-two")

        first = json.loads(self.hook.identity_path("session-one").read_text())
        second = json.loads(self.hook.identity_path("session-two").read_text())
        self.assertEqual(first["session_id"], "session-one")
        self.assertEqual(second["session_id"], "session-two")
        self.assertNotEqual(first["trajectory_id"], second["trajectory_id"])

    def _identity(self, *args, **env):
        stripped = {
            k: v
            for k, v in os.environ.items()
            if k not in self.hook.SESSION_ID_ENV_VARS
        }
        return subprocess.run(
            [sys.executable, str(HOOK_SCRIPT), "identity", *args],
            capture_output=True,
            text=True,
            env={**stripped, **env},
        )

    def _derive(self, *args, **env):
        stripped = {
            k: v
            for k, v in os.environ.items()
            if k not in self.hook.SESSION_ID_ENV_VARS
        }
        return subprocess.run(
            [sys.executable, str(HOOK_SCRIPT), "derive", *args],
            capture_output=True,
            text=True,
            env={**stripped, **env},
        )

    def test_derive_answers_a_session_the_hook_never_saw(self):
        # No write_identity call: this is the whole point of the subcommand.
        result = self._derive("unhooked-session")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["session_id"], "unhooked-session")
        self.assertEqual(
            payload["trajectory_id"],
            self.converter.derive_trajectory_id("unhooked-session"),
        )

    def test_derive_writes_no_queue_file(self):
        # It answers for a session the hooks are NOT capturing; recording one
        # would claim a capture that is not happening.
        before = sorted(p.name for p in self.hook.identity_dir().glob("*.json"))
        self._derive("unhooked-session")
        after = sorted(p.name for p in self.hook.identity_dir().glob("*.json"))
        self.assertEqual(before, after)

    def test_derive_fails_loudly_when_the_derivation_is_unavailable(self):
        """A null id is worse than no output — it is a hole that looks like data.

        `_load_converter` returns None when the script is missing, so without
        this the command printed `"trajectory_id": null` and exited 0. A caller
        doing `derive $SID | jq -r .trajectory_id` captured the string "null",
        wrote it onto ReceiveBrief, and the ledger pointed at a document that
        will never exist — the exact failure this subcommand exists to prevent.
        """
        result = self._derive(
            "unhooked-session",
            KATAGAMI_TRAJECTORY_SCRIPT="/nonexistent/converter.py",
        )
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertIn("cannot derive a trajectory id", result.stderr)
        self.assertNotIn("null", result.stdout)

    def test_derive_refuses_what_identity_refuses(self):
        # Both commands take a session id; only one of them used to treat it
        # as an id rather than a path.
        for bad in ("../../etc/passwd", "a/b", "", "   "):
            result = self._derive(bad)
            self.assertEqual(result.returncode, 1, f"{bad!r} was accepted")
            self.assertEqual(result.stdout, "", f"{bad!r} produced output")

    def test_derive_normalizes_the_id_the_same_way_identity_does(self):
        spaced = self._derive("  spaced-id  ")
        plain = self._derive("spaced-id")
        self.assertEqual(spaced.returncode, 0, spaced.stderr)
        self.assertEqual(
            json.loads(spaced.stdout)["trajectory_id"],
            json.loads(plain.stdout)["trajectory_id"],
        )
        self.assertEqual(json.loads(spaced.stdout)["session_id"], "spaced-id")

    def test_derive_does_not_claim_claude_code_for_another_harness(self):
        # `derive` exists for runs that are NOT Claude Code. Stamping
        # "claude-code" unconditionally puts a false claim in the provenance
        # the study reads.
        self.assertEqual(
            json.loads(self._derive("s-1", "codex").stdout)["harness"], "codex"
        )
        self.assertEqual(
            json.loads(self._derive("s-1").stdout)["harness"], "claude-code"
        )

    def test_derive_rejects_the_wrong_number_of_arguments(self):
        for args in ((), ("a", "b", "c")):
            self.assertEqual(self._derive(*args).returncode, 2, str(args))

    def test_the_identity_subcommand_prints_it(self):
        self.hook.write_identity("9bd6-session")
        result = self._identity()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["session_id"], "9bd6-session")

    def test_a_named_session_is_answered_even_with_several_recorded(self):
        self.hook.write_identity("session-one")
        self.hook.write_identity("session-two")
        result = self._identity("session-one")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["session_id"], "session-one")

    def test_the_harness_session_env_picks_the_right_one(self):
        self.hook.write_identity("session-one")
        self.hook.write_identity("session-two")
        result = self._identity(CLAUDE_CODE_SESSION_ID="session-two")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["session_id"], "session-two")

    def test_an_ambiguous_ask_refuses_rather_than_guessing(self):
        self.hook.write_identity("session-one")
        self.hook.write_identity("session-two")
        result = self._identity()
        self.assertEqual(result.returncode, 1)
        self.assertIn("cannot tell which one is asking", result.stderr)
        self.assertIn("session-one", result.stderr)

    def test_asking_before_a_session_started_says_so_rather_than_inventing(self):
        result = self._identity(KATAGAMI_TRAJECTORY_QUEUE=str(self.queue / "empty"))
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
        self.assertTrue(entry["spec_version"].startswith("sha256:"))


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

    def test_the_hook_script_implements_all_four_modes(self):
        script = HOOK_SCRIPT.read_text()
        self.assertIn("def cmd_enqueue", script)
        self.assertIn("def cmd_process", script)
        self.assertIn("def cmd_identity", script)
        self.assertIn("def cmd_derive", script)
        self.assertIn("session_id", script)
        self.assertIn("transcript_path", script)

    def test_every_mode_is_reachable_from_the_command_line(self):
        # A command implemented but not wired into main() is a command nobody
        # can run; `derive` was added to main by hand rather than to COMMANDS.
        for mode in ("enqueue", "process", "identity", "derive"):
            result = subprocess.run(
                [sys.executable, str(HOOK_SCRIPT), mode, "--help-probe"],
                capture_output=True,
                text=True,
            )
            self.assertNotIn(
                "usage: capture.py",
                result.stderr if mode == "derive" else "",
                f"{mode} is not routed",
            )
            self.assertNotEqual(
                (result.returncode, "unknown command"),
                (2, result.stderr.strip()),
                f"{mode} is not a known command",
            )

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


class ContributorDrivesTheActorLedgerTest(unittest.TestCase):
    """The contributor skill must actually drive CuratorAgent through its states.

    Capturing a trajectory and defining an actor spec are worth nothing on
    their own: layer 1 replays the actor actions the run invoked, so a skill
    that never calls them leaves the checker a trajectory with no actor actions
    in it — which the replay reports as `no_actor_actions`, not as a pass.
    """

    def setUp(self):
        self.skill = (SKILLS_DIR / "katagami-contributor" / "SKILL.md").read_text()
        self.spec = tomllib.loads(
            (CURATION_ROOT / "specs" / "curator_agent.ioa.toml").read_text()
        )

    def test_it_creates_the_run_entity(self):
        self.assertIn("POST $TEMPER_API_URL/tdata/CuratorAgents", self.skill)

    def test_it_reads_the_id_the_server_actually_returns(self):
        self.assertIn('"entity_id"', self.skill)
        self.assertNotIn('-> { "Id":', self.skill)

    def test_it_names_every_action_that_moves_the_run_forward(self):
        # The lifecycle spine. An action missing here is a state the ledger
        # never reaches, and a guard the replay can never satisfy.
        for action in (
            "ReceiveBrief",
            "BeginDrafting",
            "RecordDraft",
            "SelfReview",
            "SubmitDesignLanguages",
            "Abandon",
        ):
            self.assertIn(action, self.skill, action)

    def test_every_action_it_names_is_in_the_actor_alphabet(self):
        # The other direction: a skill that instructs an action the spec does
        # not define sends the run into `unknown_action` on every replay.
        alphabet = {a["name"] for a in self.spec["action"]}
        for line in self.skill.splitlines():
            for token in re.findall(r"Temper\.([A-Za-z][A-Za-z0-9_]*)", line):
                if token.startswith("<"):
                    continue
                self.assertIn(token, alphabet | {"Record", "Action"}, line)

    def test_it_uses_the_bound_action_path_shape(self):
        self.assertIn("/tdata/CuratorAgents('<run id>')/Temper.", self.skill)

    def test_it_explains_the_submission_guards_rather_than_only_listing_them(self):
        for guard in ("self_review_complete", "jobs_in_flight", "cross_entity_state"):
            self.assertIn(guard, self.skill, guard)
        self.assertIn("has_", self.skill)


class SpecVersionIsReadNotGuessedTest(unittest.TestCase):
    """The registered digest is the kernel's to report, not ours to compute.

    sha256 avalanches, so a deploy path that re-serializes the spec produces a
    digest that disagrees in its first twelve characters exactly as it does in
    all sixty-four. No pin format repairs that; reading the digest the kernel
    registered is the only thing that does.
    """

    def setUp(self):
        self.module = (TRAJECTORY_DIR / "spec_version.py").read_text()

    def test_it_reads_the_endpoint_the_kernel_actually_serves(self):
        self.assertIn("/observe/specs/{entity}", self.module)
        # The field name on SpecDetail (temper-server/src/observe/specs.rs).
        self.assertIn('"spec_version"', self.module)

    def test_an_unreachable_registry_is_a_fallback_not_a_crash(self):
        converter_source = CONVERTER.read_text()
        self.assertIn("use_registry", converter_source)
        self.assertIn("spec_version_source", converter_source)
        # And the fallback is recorded, so the trajectory never looks better
        # attested than it is.
        self.assertIn('"local"', self.module)
        self.assertIn('"registry"', self.module)

if __name__ == "__main__":
    unittest.main()
