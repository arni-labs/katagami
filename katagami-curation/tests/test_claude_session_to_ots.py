"""ATIF -> OTS mapping contract (ARN-293).

The fixtures are hand-built: `claude_transcript_minimal.jsonl` is a synthetic
Claude Code transcript, and `claude_transcript_minimal.atif.json` is what the
pinned Harbor converter produces from it. No real user transcript is ever
copied into this repository.

The golden ATIF lets the mapping assertions run everywhere, including
environments without Harbor installed. The one test that does need Harbor
compares the live conversion against that golden, so converter drift is caught
the moment anyone runs the suite in an environment that has the pin.
"""

import hashlib
import importlib.util
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAJECTORY_DIR = REPO_ROOT / "scripts" / "trajectory"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
TRANSCRIPT = FIXTURES / "claude_transcript_minimal.jsonl"
GOLDEN_ATIF = FIXTURES / "claude_transcript_minimal.atif.json"


def _load(module_name):
    sys.path.insert(0, str(TRAJECTORY_DIR))
    try:
        spec = importlib.util.spec_from_file_location(
            module_name, TRAJECTORY_DIR / f"{module_name}.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.remove(str(TRAJECTORY_DIR))


converter = _load("claude_session_to_ots")
harbor_adapter = _load("harbor_adapter")
# The converter imported this on the way in. Reaching for the same module
# object rather than loading a second copy keeps `SpecVersionError` one class:
# two loads give two identically-named exception types, and `assertRaises`
# against the wrong one never matches.
spec_version_module = sys.modules["spec_version"]


def _harbor_available():
    try:
        harbor_adapter.require_harbor()
    except harbor_adapter.HarborUnavailable:
        return False
    return True


class AtifToOtsTests(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        self.atif = json.loads(GOLDEN_ATIF.read_text())
        self.ots = converter.atif_to_ots(
            self.atif,
            agent_id="katagami-contributor",
            session_id="00000000-0000-4000-8000-000000000000",
            trajectory_id="traj-fixture",
            spec_version="CuratorAgent@fixture",
        )

    def test_every_atif_step_becomes_a_turn(self):
        # More than one turn: a trajectory with a single turn cannot show an
        # ordering violation, which is the whole point of capturing it.
        self.assertGreater(len(self.ots["turns"]), 1)
        self.assertEqual(len(self.ots["turns"]), len(self.atif["steps"]))
        self.assertEqual(
            [turn["turn_id"] for turn in self.ots["turns"]],
            [step["step_id"] for step in self.atif["steps"]],
        )

    def test_decisions_carry_cause_id_linking_to_their_tool_call(self):
        decisions = [d for turn in self.ots["turns"] for d in turn["decisions"]]
        self.assertEqual(len(decisions), 2)
        call_ids = {
            call["tool_call_id"]
            for step in self.atif["steps"]
            for call in step.get("tool_calls") or []
        }
        for decision in decisions:
            self.assertIn("cause_id", decision)
            self.assertIn(decision["cause_id"], call_ids)
            self.assertEqual(decision["decision_type"], "tool_selection")

    def test_contract_fields_are_present_on_metadata(self):
        metadata = self.ots["metadata"]
        self.assertEqual(metadata["harness"], "claude-code")
        self.assertEqual(metadata["spec_version"], "CuratorAgent@fixture")
        self.assertEqual(metadata["agent_id"], "katagami-contributor")
        self.assertEqual(self.ots["trajectory_id"], "traj-fixture")
        # The current Temper ingest indexes on metadata.trajectory_id; both
        # must agree or the judge cannot find the document it just posted.
        self.assertEqual(metadata["trajectory_id"], "traj-fixture")
        self.assertEqual(self.ots["version"], converter.OTS_VERSION)

    def test_harness_defaults_to_claude_code(self):
        default = converter.atif_to_ots(
            self.atif,
            agent_id="a",
            session_id="s",
            trajectory_id="t",
        )
        self.assertEqual(default["metadata"]["harness"], "claude-code")
        self.assertEqual(converter.DEFAULT_HARNESS, "claude-code")

    def test_tool_error_marks_the_turn_and_downgrades_the_outcome(self):
        errored = [turn for turn in self.ots["turns"] if turn["error"]]
        self.assertEqual(len(errored), 1)
        failed = [
            d
            for turn in self.ots["turns"]
            for d in turn["decisions"]
            if not d["consequence"]["success"]
        ]
        self.assertEqual(len(failed), 1)
        self.assertEqual(failed[0]["consequence"]["error_type"], "tool_error")
        self.assertEqual(self.ots["metadata"]["outcome"], "partial_success")

    def test_outcome_can_be_overridden_by_the_caller(self):
        forced = converter.atif_to_ots(
            self.atif,
            agent_id="a",
            session_id="s",
            trajectory_id="t",
            outcome="failure",
        )
        self.assertEqual(forced["metadata"]["outcome"], "failure")

    def test_tool_calls_and_their_results_are_paired_as_messages(self):
        tool_turn = next(turn for turn in self.ots["turns"] if turn["decisions"])
        calls = [
            m for m in tool_turn["messages"] if m["content"]["type"] == "tool_call"
        ]
        responses = [
            m for m in tool_turn["messages"] if m["content"]["type"] == "tool_response"
        ]
        self.assertEqual(len(calls), 2)
        self.assertEqual(len(responses), 2)
        self.assertEqual(
            [c["content"]["data"]["tool_call_id"] for c in calls],
            [r["content"]["data"]["tool_call_id"] for r in responses],
        )
        for response in responses:
            self.assertEqual(response["role"], "tool")

    def test_token_id_fields_are_absent_when_the_stack_did_not_supply_them(self):
        # Claude Code records token counts, not ids. Absent is the honest
        # answer; a fabricated mask is worse than no mask.
        for turn in self.ots["turns"]:
            self.assertNotIn("prompt_token_ids", turn)
            self.assertNotIn("completion_token_ids", turn)
            self.assertNotIn("logprobs", turn)
            self.assertNotIn("response_mask", turn)

    def test_token_id_fields_are_copied_when_the_stack_does_supply_them(self):
        atif = json.loads(GOLDEN_ATIF.read_text())
        agent_step = next(s for s in atif["steps"] if s["source"] == "agent")
        agent_step["metrics"]["prompt_token_ids"] = [1, 2, 3]
        agent_step["metrics"]["completion_token_ids"] = [4, 5]
        agent_step["metrics"]["logprobs"] = [-0.1, -0.2]

        ots = converter.atif_to_ots(
            atif, agent_id="a", session_id="s", trajectory_id="t"
        )
        turn = next(t for t in ots["turns"] if t["turn_id"] == agent_step["step_id"])
        self.assertEqual(turn["prompt_token_ids"], [1, 2, 3])
        self.assertEqual(turn["completion_token_ids"], [4, 5])
        self.assertEqual(turn["logprobs"], [-0.1, -0.2])
        # response_mask has no ATIF source and is never invented here.
        self.assertNotIn("response_mask", turn)

    def test_ids_are_deterministic_so_a_retry_is_not_a_duplicate(self):
        again = converter.atif_to_ots(
            self.atif,
            agent_id="katagami-contributor",
            session_id="00000000-0000-4000-8000-000000000000",
            trajectory_id="traj-fixture",
            spec_version="CuratorAgent@fixture",
        )
        self.assertEqual(json.dumps(again, sort_keys=True), json.dumps(self.ots, sort_keys=True))
        self.assertEqual(
            converter.derive_trajectory_id("abc"), converter.derive_trajectory_id("abc")
        )

    def test_timestamps_are_normalized_to_utc(self):
        self.assertTrue(self.ots["metadata"]["timestamp_start"].endswith("Z"))
        self.assertTrue(self.ots["metadata"]["timestamp_end"].endswith("Z"))
        self.assertEqual(self.ots["metadata"]["duration_ms"], 12000.0)

    def test_a_trajectory_without_timestamps_is_refused_not_invented(self):
        atif = json.loads(GOLDEN_ATIF.read_text())
        for step in atif["steps"]:
            step.pop("timestamp", None)
        with self.assertRaises(converter.TrajectoryError):
            converter.atif_to_ots(atif, agent_id="a", session_id="s", trajectory_id="t")

    def test_custom_context_records_the_converter_provenance(self):
        custom = json.loads(self.ots["context"]["custom_context"])
        self.assertEqual(custom["harness"], "claude-code")
        # OTS has no session field of its own; without this a stored document
        # cannot be traced back to its session once the request headers are gone.
        self.assertEqual(custom["session_id"], "00000000-0000-4000-8000-000000000000")
        self.assertEqual(custom["atif_schema_version"], "ATIF-v1.7")
        self.assertEqual(
            custom["converter"], f"harbor@{harbor_adapter.HARBOR_PINNED_VERSION}"
        )
        # The ATIF token totals have no OTS home of their own; they ride here
        # rather than being dropped.
        self.assertEqual(custom["final_metrics"]["total_prompt_tokens"], 3400)

    def test_tools_used_are_recorded_as_context_entities(self):
        self.assertEqual(
            self.ots["context"]["entities"],
            [{"type": "tool", "id": "Read", "name": "Read"}],
        )


class UnobservedCallTests(unittest.TestCase):
    """A tool call with no result is not a successful tool call.

    Claude interrupted between issuing a call and persisting its result leaves
    a call with no observation. Recording that as `success: true` puts an
    unfinished operation into the corpus as an example of a finished one.
    """

    def setUp(self):
        self.atif = json.loads(GOLDEN_ATIF.read_text())
        step = next(s for s in self.atif["steps"] if s.get("tool_calls"))
        # Drop every observation from the step, keeping the calls.
        step["observation"] = {"results": []}
        self.ots = converter.atif_to_ots(
            self.atif, agent_id="a", session_id="s", trajectory_id="t"
        )
        self.turn = next(t for t in self.ots["turns"] if t["decisions"])

    def test_an_unobserved_call_is_not_recorded_as_a_success(self):
        for decision in self.turn["decisions"]:
            self.assertFalse(decision["consequence"]["success"])
            self.assertEqual(decision["consequence"]["error_type"], "no_result")

    def test_the_turn_is_marked_and_the_outcome_is_downgraded(self):
        self.assertTrue(self.turn["error"])
        self.assertEqual(self.ots["metadata"]["outcome"], "partial_success")

    def test_a_call_that_did_get_a_result_is_still_a_success(self):
        atif = json.loads(GOLDEN_ATIF.read_text())
        ots = converter.atif_to_ots(atif, agent_id="a", session_id="s", trajectory_id="t")
        successes = [
            d
            for turn in ots["turns"]
            for d in turn["decisions"]
            if d["consequence"]["success"]
        ]
        self.assertEqual(len(successes), 1)


class MultimodalContentTests(unittest.TestCase):
    """Images are evidence. A trajectory that drops them cannot be judged on taste."""

    # An image source as `harbor_adapter.archive_images` leaves it once the
    # file has been copied into the capture archive.
    ARCHIVED = {
        "media_type": "image/png",
        "path": "/archive/images/abc123.png",
        "sha256": "abc123",
        "bytes": 2048,
        "available": True,
    }

    def _ots_with(self, source):
        atif = json.loads(GOLDEN_ATIF.read_text())
        step = next(s for s in atif["steps"] if s.get("tool_calls"))
        step["observation"]["results"][0]["content"] = [
            {"type": "text", "text": "rendered the landing page"},
            {"type": "image", "source": source},
        ]
        return converter.atif_to_ots(
            atif, agent_id="a", session_id="s", trajectory_id="t"
        )

    def setUp(self):
        self.ots = self._ots_with(dict(self.ARCHIVED))

    def _tool_response(self, ots=None):
        return next(
            m
            for turn in (ots or self.ots)["turns"]
            for m in turn["messages"]
            if m["content"]["type"] == "tool_response"
            and m["content"]["data"].get("attachments")
        )

    def test_an_archived_image_keeps_a_path_that_opens(self):
        data = self._tool_response()["content"]["data"]
        self.assertEqual(
            data["attachments"],
            [
                {
                    "type": "image",
                    "media_type": "image/png",
                    "available": True,
                    "sha256": "abc123",
                    "bytes": 2048,
                    "path": "/archive/images/abc123.png",
                }
            ],
        )

    def test_an_unarchived_image_carries_no_path_at_all(self):
        # The bug this replaces: a relative path into a deleted temp tree,
        # indistinguishable from a path a judge could open.
        ots = self._ots_with(
            {
                "media_type": "image/png",
                "sha256": "def456",
                "available": False,
                "unavailable_reason": "the image is past the archive's size bounds",
            }
        )
        attachment = self._tool_response(ots)["content"]["data"]["attachments"][0]
        self.assertNotIn("path", attachment)
        self.assertFalse(attachment["available"])
        self.assertEqual(attachment["sha256"], "def456")
        self.assertIn("size bounds", attachment["unavailable_reason"])

    def test_a_raw_reference_that_never_reached_the_archive_is_marked_unavailable(self):
        ots = self._ots_with({"media_type": "image/png", "path": "landing.png"})
        attachment = self._tool_response(ots)["content"]["data"]["attachments"][0]
        self.assertNotIn("path", attachment)
        self.assertFalse(attachment["available"])

    def test_the_text_still_marks_where_the_image_was(self):
        # The marker carries the hash as well as the path: `OTSMessage` has no
        # attachments field, so on the kernel read path the marker is ALL a
        # judge gets.
        data = self._tool_response()["content"]["data"]
        self.assertIn("rendered the landing page", data["content"])
        self.assertIn(
            "[image image/png sha256:abc123 /archive/images/abc123.png]",
            data["content"],
        )

    def test_the_marker_says_unavailable_rather_than_naming_a_dead_path(self):
        ots = self._ots_with(
            {"media_type": "image/png", "sha256": "def456", "available": False}
        )
        content = self._tool_response(ots)["content"]["data"]["content"]
        self.assertIn("[image image/png unavailable sha256:def456]", content)

    def test_a_user_message_keeps_its_images_too(self):
        atif = json.loads(GOLDEN_ATIF.read_text())
        user = next(s for s in atif["steps"] if s["source"] == "user")
        user["message"] = [
            {"type": "text", "text": "look at this"},
            {
                "type": "image",
                "source": {
                    "media_type": "image/webp",
                    "path": "/archive/images/a.webp",
                    "available": True,
                },
            },
        ]
        ots = converter.atif_to_ots(atif, agent_id="a", session_id="s", trajectory_id="t")
        message = ots["turns"][0]["messages"][0]
        self.assertEqual(message["attachments"][0]["media_type"], "image/webp")


class ImageArchiveTests(unittest.TestCase):
    """Referenced images are copied out before their directory disappears."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="katagami-images-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.staged = self.root / "staged"
        self.staged.mkdir()
        self.archive = self.root / "archive"

    def _document(self, path):
        return {
            "steps": [
                {
                    "message": [
                        {"type": "image", "source": {"media_type": "image/png", "path": path}}
                    ]
                }
            ]
        }

    def test_a_real_image_is_copied_and_hashed(self):
        (self.staged / "shot.png").write_bytes(b"pretend-png-bytes")
        document = self._document("shot.png")

        counts = harbor_adapter.archive_images(
            document, roots=[self.staged], image_dir=self.archive
        )

        source = document["steps"][0]["message"][0]["source"]
        self.assertEqual(counts["archived"], 1)
        self.assertTrue(source["available"])
        self.assertTrue(Path(source["path"]).is_file())
        self.assertEqual(
            Path(source["path"]).read_bytes(), b"pretend-png-bytes"
        )
        self.assertEqual(
            source["sha256"],
            hashlib.sha256(b"pretend-png-bytes").hexdigest(),
        )
        # The copy survives the staged tree being torn down, which is the
        # entire point.
        shutil.rmtree(self.staged)
        self.assertTrue(Path(source["path"]).is_file())

    def test_a_reference_to_nothing_becomes_an_explicit_marker(self):
        document = self._document("gone.png")

        counts = harbor_adapter.archive_images(
            document, roots=[self.staged], image_dir=self.archive
        )

        source = document["steps"][0]["message"][0]["source"]
        self.assertEqual(counts["missing"], 1)
        self.assertNotIn("path", source)
        self.assertFalse(source["available"])
        self.assertIn("no file was found", source["unavailable_reason"])
        self.assertEqual(source["source_ref"], "gone.png")

    def test_an_oversize_image_is_identified_by_hash_and_not_copied(self):
        big = b"x" * (harbor_adapter.MAX_ARCHIVED_IMAGE_BYTES + 1)
        (self.staged / "huge.png").write_bytes(big)
        document = self._document("huge.png")

        counts = harbor_adapter.archive_images(
            document, roots=[self.staged], image_dir=self.archive
        )

        source = document["steps"][0]["message"][0]["source"]
        self.assertEqual(counts["hashed_only"], 1)
        self.assertNotIn("path", source)
        self.assertFalse(source["available"])
        self.assertEqual(source["sha256"], hashlib.sha256(big).hexdigest())

    def test_without_an_archive_the_hash_is_still_recorded(self):
        (self.staged / "shot.png").write_bytes(b"bytes")
        document = self._document("shot.png")

        harbor_adapter.archive_images(document, roots=[self.staged], image_dir=None)

        source = document["steps"][0]["message"][0]["source"]
        self.assertNotIn("path", source)
        self.assertFalse(source["available"])
        self.assertEqual(source["sha256"], hashlib.sha256(b"bytes").hexdigest())

    def test_images_are_found_wherever_they_sit_in_the_document(self):
        (self.staged / "deep.png").write_bytes(b"deep")
        document = {
            "steps": [
                {
                    "observation": {
                        "results": [
                            {
                                "content": [
                                    {
                                        "type": "image",
                                        "source": {
                                            "media_type": "image/png",
                                            "path": "deep.png",
                                        },
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]
        }

        counts = harbor_adapter.archive_images(
            document, roots=[self.staged], image_dir=self.archive
        )
        self.assertEqual(counts["archived"], 1)


class RedactionTests(unittest.TestCase):
    """Nothing leaves this converter without passing through redaction."""

    def setUp(self):
        self.atif = json.loads(GOLDEN_ATIF.read_text())
        step = next(s for s in self.atif["steps"] if s.get("tool_calls"))
        step["tool_calls"][0]["arguments"] = {
            "command": "curl -H 'Authorization: Bearer abcdef0123456789abcdef' https://x"
        }
        step["observation"]["results"][0]["content"] = (
            "TEMPER_API_KEY=ghp_0123456789abcdefghijklmnopqrstuvwxyz"
        )
        step["reasoning_content"] = (
            "the key is sk-ant-api03-AAAABBBBCCCCDDDDEEEEFFFF and "
            "DB_PASSWORD=correct-horse-battery"
        )
        user = next(s for s in self.atif["steps"] if s["source"] == "user")
        user["message"] = "deploy with AKIAIOSFODNN7EXAMPLE"
        self.rendered = json.dumps(
            converter.atif_to_ots(
                self.atif, agent_id="a", session_id="s", trajectory_id="t"
            )
        )

    def test_no_credential_shape_survives_anywhere_in_the_document(self):
        for secret in (
            "abcdef0123456789abcdef",
            "ghp_0123456789abcdefghijklmnopqrstuvwxyz",
            "sk-ant-api03-AAAABBBBCCCCDDDDEEEEFFFF",
            "AKIAIOSFODNN7EXAMPLE",
            "correct-horse-battery",
        ):
            self.assertNotIn(secret, self.rendered, secret)

    def test_tool_arguments_and_results_and_reasoning_are_all_covered(self):
        self.assertIn("[redacted:bearer]", self.rendered)  # tool arguments
        self.assertIn("[redacted:github-token]", self.rendered)  # tool output
        self.assertIn("[redacted:anthropic-key]", self.rendered)  # reasoning
        self.assertIn("[redacted:env]", self.rendered)  # unshaped, named value
        self.assertIn("[redacted:aws-key-id]", self.rendered)  # user message

    def test_a_structured_result_is_redacted_by_key_not_only_by_shape(self):
        atif = json.loads(GOLDEN_ATIF.read_text())
        step = next(s for s in atif["steps"] if s.get("tool_calls"))
        step["observation"]["results"][0]["content"] = {
            "config": {"api_key": "opaque-value-no-shape"}
        }
        rendered = json.dumps(
            converter.atif_to_ots(atif, agent_id="a", session_id="s", trajectory_id="t")
        )
        self.assertNotIn("opaque-value-no-shape", rendered)
        self.assertIn("[redacted:key]", rendered)

    def test_the_decision_summary_is_redacted_as_well_as_the_message(self):
        # The judge reads result_summary; a secret that survived only there
        # would be just as leaked.
        decisions = json.loads(self.rendered)["turns"][1]["decisions"]
        self.assertIn("[redacted:github-token]", decisions[0]["consequence"]["result_summary"])


class SpecVersionResolutionTests(unittest.TestCase):
    def setUp(self):
        # Never touch the real ~/.katagami archive from a test.
        self.snapshots = tempfile.TemporaryDirectory(prefix="katagami-snapshots-")
        self.addCleanup(self.snapshots.cleanup)
        patch = mock.patch.dict(
            os.environ,
            {
                "KATAGAMI_TRAJECTORY_QUEUE": str(Path(self.snapshots.name) / "queue"),
                "KATAGAMI_SPEC_SNAPSHOT_DIR": self.snapshots.name,
                "KATAGAMI_SPEC_ATTESTATION_DIR": str(
                    Path(self.snapshots.name) / "attestations"
                ),
            },
        )
        patch.start()
        self.addCleanup(patch.stop)
        # These tests are about the local half. Unset the registry so they
        # neither reach the network nor depend on a developer's environment.
        os.environ.pop("TEMPER_API_URL", None)

    def test_the_version_is_computed_from_the_agents_actor_spec(self):
        version = converter.resolve_spec_version(
            spec_version=None, actor_spec=None, agent_id="katagami-contributor"
        ).version
        self.assertTrue(version.startswith("sha256:"))

    def test_the_stamped_version_is_one_the_kernel_can_compare(self):
        # The kernel's `spec_content_hash` is sha256 over the registered
        # ioa_source, and `names_same_spec` strips only a `sha256:` prefix
        # before an exact match. A version in any other shape makes
        # POST /api/conformance/check answer 409 for every captured run, which
        # leaves the canonical layer 1 unable to judge anything.
        version = converter.resolve_spec_version(
            spec_version=None, actor_spec="CuratorAgent", agent_id="katagami-contributor"
        ).version
        source = (
            REPO_ROOT / "katagami-curation" / "specs" / "curator_agent.ioa.toml"
        ).read_bytes()
        self.assertEqual(
            spec_version_module.bare_version(version),
            hashlib.sha256(source).hexdigest(),
        )

    def test_resolving_snapshots_the_spec_it_resolved(self):
        version = converter.resolve_spec_version(
            spec_version=None, actor_spec="CuratorAgent", agent_id="katagami-contributor"
        ).version
        stored = spec_version_module.load_snapshot(version, Path(self.snapshots.name))
        self.assertIsNotNone(stored, "capture must record the contract it stamped")
        self.assertEqual(stored["version"], version)
        self.assertIn("automaton", stored["source"])

    def test_an_unverifiable_explicit_version_is_refused(self):
        # The whole point: a version nobody can produce is not provenance.
        with self.assertRaises(spec_version_module.SpecVersionError) as caught:
            converter.resolve_spec_version(
                spec_version="X@1", actor_spec="CuratorAgent", agent_id="katagami-contributor"
            )
        self.assertIn("X@1", str(caught.exception))

    def _snapshot_an_older_spec(self):
        """Snapshot a real variant of the spec, as capture would have at the time."""
        root = Path(self.snapshots.name)
        current = (
            REPO_ROOT / "katagami-curation" / "specs" / "curator_agent.ioa.toml"
        ).read_text()
        older_source = "# the spec as it stood when the run happened\n" + current

        scratch = Path(self.enterContext(tempfile.TemporaryDirectory()))
        older_path = scratch / "curator_agent.ioa.toml"
        older_path.write_text(older_source, encoding="utf-8")
        version, _ = spec_version_module.snapshot_spec(str(older_path), root)
        return version

    def test_an_explicit_version_is_accepted_when_a_snapshot_backs_it(self):
        # A run that executed under a spec this checkout has since changed.
        older = self._snapshot_an_older_spec()
        self.assertNotEqual(older, spec_version_module.compute_version("CuratorAgent"))
        self.assertEqual(
            converter.resolve_spec_version(
                spec_version=older,
                actor_spec="CuratorAgent",
                agent_id="katagami-contributor",
            ).version,
            older,
        )

    def test_a_snapshot_that_does_not_hash_to_its_own_name_is_not_provenance(self):
        # Without recomputing the hash, anything on disk under the right file
        # name reads back as the contract a run executed under.
        older = "sha256:" + "ab" * 32
        spec_version_module.snapshot_path(older, Path(self.snapshots.name)).write_text(
            json.dumps({"version": older, "actor": "CuratorAgent", "source": "invented"}),
            encoding="utf-8",
        )
        with self.assertRaises(spec_version_module.SpecVersionError) as caught:
            converter.resolve_spec_version(
                spec_version=older,
                actor_spec="CuratorAgent",
                agent_id="katagami-contributor",
            )
        self.assertIn("does not contain the spec it claims", str(caught.exception))

    def test_a_snapshot_of_a_different_actor_cannot_be_stamped_on_this_run(self):
        review_version, _ = spec_version_module.snapshot_spec(
            "ReviewAgent", Path(self.snapshots.name)
        )
        with self.assertRaises(spec_version_module.SpecVersionError) as caught:
            converter.resolve_spec_version(
                spec_version=review_version,
                actor_spec="CuratorAgent",
                agent_id="katagami-contributor",
            )
        self.assertIn("ReviewAgent", str(caught.exception))

    def test_a_version_with_no_spec_and_no_snapshot_is_refused(self):
        with self.assertRaises(spec_version_module.SpecVersionError):
            converter.resolve_spec_version(
                spec_version="sha256:" + "cd" * 32, actor_spec=None, agent_id="unknown-agent"
            )

    def test_an_unmapped_agent_yields_nothing_rather_than_a_guess(self):
        self.assertIsNone(
            converter.resolve_spec_version(
                spec_version=None, actor_spec=None, agent_id="unknown-agent"
            ).version
        )

    def test_a_snapshot_is_written_once_and_never_rewritten(self):
        root = Path(self.snapshots.name)
        version, path = spec_version_module.snapshot_spec("CuratorAgent", root)
        first = path.read_text(encoding="utf-8")
        spec_version_module.snapshot_spec("CuratorAgent", root)
        self.assertEqual(path.read_text(encoding="utf-8"), first)

        # A file under this version's name whose content is something else is
        # a corrupted archive. Saying so is the only safe answer: the whole
        # scheme rests on the hash identifying exactly one contract.
        path.write_text(
            json.dumps({"version": version, "actor": "CuratorAgent", "source": "other"}),
            encoding="utf-8",
        )
        with self.assertRaises(spec_version_module.SpecVersionError) as caught:
            spec_version_module.snapshot_spec("CuratorAgent", root)
        self.assertIn("does not contain the spec it claims", str(caught.exception))

    def test_two_captures_racing_on_the_same_spec_both_succeed(self):
        # Both SessionStart hooks snapshot the same spec at once. A shared
        # staging filename made the loser rename a file the winner had already
        # moved away, and the run was queued to failed/ over a no-op write.
        root = Path(self.snapshots.name)
        results = []
        errors = []

        def snapshot():
            try:
                results.append(spec_version_module.snapshot_spec("CuratorAgent", root))
            except Exception as exc:  # noqa: BLE001 - the failure is the finding
                errors.append(exc)

        threads = [threading.Thread(target=snapshot) for _ in range(8)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(errors, [])
        self.assertEqual(len({version for version, _ in results}), 1)
        self.assertEqual(
            sorted(p.name for p in root.iterdir()),
            [spec_version_module.snapshot_path(results[0][0], root).name],
            "a staged .partial file was left behind",
        )


class RegisteredVersionTests(unittest.TestCase):
    """The digest the kernel registered beats the one computed here.

    A local hash is only the registered hash if the deploy registered these
    exact bytes. Nothing local can tell you whether it did, and sha256
    avalanches, so a re-serialized spec disagrees at twelve characters exactly
    as it does at sixty-four — no pin format repairs it. Reading the digest off
    `GET /observe/specs/{entity}` is what removes the risk.
    """

    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory()))
        # EVERY store this code writes to, not just the snapshot one. Missing
        # the attestation directory put fabricated records — a digest of all
        # `f`s, attributed to a server that does not exist — into the real
        # ~/.katagami archive, where a later capture would have accepted them
        # as provenance.
        patch = mock.patch.dict(
            os.environ,
            {
                "KATAGAMI_TRAJECTORY_QUEUE": str(self.root / "queue"),
                "KATAGAMI_SPEC_SNAPSHOT_DIR": str(self.root / "spec-snapshots"),
                "KATAGAMI_SPEC_ATTESTATION_DIR": str(self.root / "spec-attestations"),
                "TEMPER_API_URL": "https://temper.example",
                "TEMPER_TENANT_ID": "katagami",
            },
        )
        patch.start()
        self.addCleanup(patch.stop)
        self.local = spec_version_module.compute_version("CuratorAgent")

    def _serving(self, digest, capture=None):
        """Patch the one HTTP seam, so no test needs a server."""

        def fake_get(url, headers, timeout):
            if capture is not None:
                capture["url"] = url
                capture["headers"] = headers
            if digest is None:
                raise OSError("connection refused")
            return {"entity_type": "CuratorAgent", "spec_version": digest}

        return mock.patch.object(spec_version_module, "_http_get_json", fake_get)

    def _stamp(self, **kwargs):
        return converter.resolve_spec_version(
            spec_version=None,
            actor_spec="CuratorAgent",
            agent_id="katagami-contributor",
            **kwargs,
        )

    def test_the_registered_digest_is_preferred_over_the_local_one(self):
        deployed = "f" * 64
        call = {}
        with self._serving(deployed, call):
            stamp = self._stamp()

        self.assertEqual(stamp.version, "sha256:" + deployed)
        self.assertEqual(stamp.source, "registry")
        self.assertEqual(stamp.local_version, self.local)
        self.assertIn("/observe/specs/CuratorAgent", call["url"])
        self.assertEqual(call["headers"]["X-Tenant-Id"], "katagami")

    def test_a_disagreement_is_reported_loudly_rather_than_swallowed(self):
        # The normalization signal arriving: the bytes the deploy registered
        # are not the bytes in this checkout.
        with self._serving("f" * 64):
            stamp = self._stamp()

        self.assertTrue(stamp.warnings, "a divergent registry digest must warn")
        warning = " ".join(stamp.warnings)
        self.assertIn("sha256:" + "f" * 64, warning)
        self.assertIn(self.local, warning)
        self.assertIn("not byte-identical", warning)

    def test_agreement_is_quiet(self):
        with self._serving(spec_version_module.bare_version(self.local)):
            stamp = self._stamp()
        self.assertEqual(stamp.version, self.local)
        self.assertEqual(stamp.source, "registry")
        self.assertEqual(stamp.warnings, [])

    def test_an_unreachable_registry_falls_back_and_says_so(self):
        with self._serving(None):
            stamp = self._stamp()

        self.assertEqual(stamp.version, self.local)
        self.assertEqual(stamp.source, "local")
        self.assertTrue(stamp.warnings)
        self.assertIn("could not read the registered spec version", stamp.warnings[0])

    def test_no_configured_api_falls_back_without_a_network_call(self):
        os.environ.pop("TEMPER_API_URL", None)
        with mock.patch.object(
            spec_version_module,
            "_http_get_json",
            side_effect=AssertionError("must not call out"),
        ):
            stamp = self._stamp()
        self.assertEqual(stamp.source, "local")
        self.assertIn("TEMPER_API_URL is not set", " ".join(stamp.warnings))

    def test_the_registry_read_can_be_turned_off(self):
        with mock.patch.object(
            spec_version_module,
            "_http_get_json",
            side_effect=AssertionError("must not call out"),
        ):
            stamp = self._stamp(use_registry=False)
        self.assertEqual(stamp.version, self.local)
        self.assertEqual(stamp.source, "local")

    def test_the_source_travels_on_the_trajectory_as_a_tag(self):
        # It must ride in `tags`, which the kernel models and returns. Written
        # as a metadata field of its own it was dropped on ingest, so the
        # canonical read always said "absent" — which a judge reads as
        # "locally computed", the wrong answer for a kernel-reported digest.
        ots = converter.atif_to_ots(
            json.loads(GOLDEN_ATIF.read_text()),
            agent_id="katagami-contributor",
            session_id="s",
            trajectory_id="t",
            spec_version="sha256:" + "f" * 64,
            spec_version_source="registry",
        )
        self.assertIn("spec-version-source:registry", ots["metadata"]["tags"])
        # And not as an invented field the kernel would silently discard.
        self.assertNotIn("spec_version_source", ots["metadata"])

    def test_caller_tags_are_kept_alongside_the_provenance_tag(self):
        ots = converter.atif_to_ots(
            json.loads(GOLDEN_ATIF.read_text()),
            agent_id="a",
            session_id="s",
            trajectory_id="t",
            spec_version="sha256:" + "f" * 64,
            spec_version_source="local",
            tags=["lane:design-language"],
        )
        self.assertEqual(
            ots["metadata"]["tags"],
            ["lane:design-language", "spec-version-source:local"],
        )

    def test_a_registry_answer_survives_to_the_next_offline_run(self):
        # Capture reads the registry when it queues a session; the converter
        # runs at the NEXT session start, which may be offline. Without the
        # recorded attestation the queued version would look hand-typed and the
        # trajectory would be dropped.
        with self._serving("f" * 64):
            first = self._stamp()

        with self._serving(None):
            second = converter.resolve_spec_version(
                spec_version=first.version,
                actor_spec="CuratorAgent",
                agent_id="katagami-contributor",
            )
        self.assertEqual(second.version, first.version)
        self.assertEqual(second.source, "attested")

    def test_a_non_digest_answer_is_refused_rather_than_stamped(self):
        # A captive portal or gateway error page answering 200 with a JSON body
        # that happens to carry `spec_version` would otherwise poison the stamp
        # of every capture behind it, labelled `registry`.
        for junk in ("not-a-hash", "", "   ", "zz" * 32, "sha256:" + "g" * 64):
            with self._serving(junk):
                stamp = self._stamp()
            self.assertEqual(stamp.version, self.local, junk)
            self.assertEqual(stamp.source, "local", junk)
            self.assertTrue(stamp.warnings, junk)

    def test_a_registry_answer_is_case_normalised(self):
        with self._serving(("A" * 64).lower().upper()):
            stamp = self._stamp()
        self.assertEqual(stamp.version, "sha256:" + "a" * 64)
        self.assertEqual(stamp.source, "registry")

    def test_the_credential_is_not_followed_to_another_host(self):
        # urllib re-sends Authorization across a redirect to any host; a parked
        # domain or a misconfigured proxy answering 302 would be handed the
        # bearer token.
        import urllib.error

        def redirecting(url, headers, timeout):
            raise urllib.error.HTTPError(url, 302, "Found", {"Location": "https://evil"}, None)

        with mock.patch.object(spec_version_module, "_http_get_json", redirecting):
            stamp = self._stamp()
        self.assertEqual(stamp.source, "local")
        self.assertIn("302", " ".join(stamp.warnings))

    def test_an_attestation_from_another_kernel_is_flagged(self):
        with self._serving("f" * 64):
            first = self._stamp()

        with mock.patch.dict(os.environ, {"TEMPER_API_URL": "https://other.example"}):
            with self._serving(None):
                second = converter.resolve_spec_version(
                    spec_version=first.version,
                    actor_spec="CuratorAgent",
                    agent_id="katagami-contributor",
                )
        self.assertEqual(second.source, "attested")
        self.assertIn("says nothing about another", " ".join(second.warnings))

    def test_a_corrupt_attestation_does_not_block_a_snapshotted_version(self):
        older = self._snapshot_an_older_spec()
        spec_version_module.attestation_path(older).parent.mkdir(
            parents=True, exist_ok=True
        )
        spec_version_module.attestation_path(older).write_text("{not json", encoding="utf-8")

        with self._serving(None):
            stamp = converter.resolve_spec_version(
                spec_version=older,
                actor_spec="CuratorAgent",
                agent_id="katagami-contributor",
            )
        self.assertEqual(stamp.version, older)
        self.assertEqual(stamp.source, "snapshot")
        self.assertIn("unusable attestation", " ".join(stamp.warnings))

    def _snapshot_an_older_spec(self):
        current = (
            REPO_ROOT / "katagami-curation" / "specs" / "curator_agent.ioa.toml"
        ).read_text()
        scratch = Path(self.enterContext(tempfile.TemporaryDirectory()))
        path = scratch / "curator_agent.ioa.toml"
        path.write_text("# as it stood when the run happened\n" + current, encoding="utf-8")
        version, _ = spec_version_module.snapshot_spec(str(path))
        return version

    def test_a_hostile_timeout_setting_cannot_hang_a_session_hook(self):
        for value in ("inf", "nan", "-1", "0", "not-a-number"):
            with mock.patch.dict(os.environ, {"KATAGAMI_SPEC_REGISTRY_TIMEOUT": value}):
                timeout = spec_version_module.registry_timeout()
            self.assertTrue(0 < timeout < 3600, f"{value} -> {timeout}")

    def test_an_unattested_unsnapshotted_version_is_still_refused(self):
        with self._serving(None):
            with self.assertRaises(spec_version_module.SpecVersionError) as caught:
                converter.resolve_spec_version(
                    spec_version="sha256:" + "ab" * 32,
                    actor_spec="CuratorAgent",
                    agent_id="katagami-contributor",
                )
        self.assertIn("nor shown to have come from the kernel", str(caught.exception))


class PostingIdentityTests(unittest.TestCase):
    """The posting identity is configuration, never a command line argument."""

    def _env(self, **values):
        patch = mock.patch.dict(os.environ, values, clear=False)
        patch.start()
        self.addCleanup(patch.stop)
        for name in converter.PRINCIPAL_ENV_VARS:
            if name not in values:
                os.environ.pop(name, None)

    def test_the_configured_principal_is_used(self):
        self._env(TEMPER_PRINCIPAL_ID="katagami-contributor")
        self.assertEqual(
            converter.resolve_agent_id(requested=None, posting=True),
            "katagami-contributor",
        )

    def test_the_older_env_name_still_works(self):
        self._env(KATAGAMI_AGENT_ID="katagami-reviewer")
        self.assertEqual(
            converter.resolve_agent_id(requested=None, posting=True), "katagami-reviewer"
        )

    def test_a_matching_assertion_is_allowed(self):
        self._env(TEMPER_PRINCIPAL_ID="katagami-contributor")
        self.assertEqual(
            converter.resolve_agent_id(requested="katagami-contributor", posting=True),
            "katagami-contributor",
        )

    def test_a_mismatched_override_is_refused(self):
        # The bypass this closes: one role's credential filing a run under
        # another role's name, purely because the name was a CLI argument.
        self._env(TEMPER_PRINCIPAL_ID="katagami-contributor")
        with self.assertRaises(converter.TrajectoryError) as caught:
            converter.resolve_agent_id(requested="katagami-judge", posting=True)
        self.assertIn("katagami-contributor", str(caught.exception))

    def test_posting_without_a_configured_identity_is_refused(self):
        self._env()
        with self.assertRaises(converter.TrajectoryError):
            converter.resolve_agent_id(requested="anyone-at-all", posting=True)

    def test_a_local_conversion_may_label_itself(self):
        # Writing a file claims nothing to anybody.
        self._env()
        self.assertEqual(
            converter.resolve_agent_id(requested="katagami-contributor", posting=False),
            "katagami-contributor",
        )


class PostTrajectoryTests(unittest.TestCase):
    def test_every_required_header_is_sent(self):
        captured = {}

        class _Response:
            status = 201

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

        def _fake_urlopen(request, timeout=None):
            captured["url"] = request.full_url
            captured["headers"] = {k.lower(): v for k, v in request.header_items()}
            captured["body"] = json.loads(request.data.decode())
            return _Response()

        with mock.patch.object(converter.urllib.request, "urlopen", _fake_urlopen):
            status = converter.post_trajectory(
                {"trajectory_id": "traj-1", "turns": []},
                api_url="https://temper.example",
                api_key="secret-token",
                agent_id="katagami-contributor",
                session_id="sess-1",
                tenant_id="katagami",
                trajectory_id="traj-1",
            )

        self.assertEqual(status, 201)
        self.assertEqual(
            captured["url"], "https://temper.example/api/ots/trajectories"
        )
        headers = captured["headers"]
        self.assertEqual(headers["x-agent-id"], "katagami-contributor")
        self.assertEqual(headers["x-session-id"], "sess-1")
        self.assertEqual(headers["x-tenant-id"], "katagami")
        self.assertEqual(headers["x-trajectory-id"], "traj-1")
        self.assertEqual(headers["authorization"], "Bearer secret-token")
        self.assertEqual(headers["content-type"], "application/json")
        # The claimed agent and the request principal are the same identity, so
        # the server has something to correlate the credential against.
        self.assertEqual(headers["x-temper-principal-kind"], "agent")
        self.assertEqual(headers["x-temper-principal-id"], "katagami-contributor")

    def test_posting_without_a_credential_is_refused(self):
        def _never_called(request, timeout=None):  # pragma: no cover - must not run
            raise AssertionError("posted without a credential")

        with mock.patch.object(converter.urllib.request, "urlopen", _never_called):
            with self.assertRaises(converter.TrajectoryError) as raised:
                converter.post_trajectory(
                    {"turns": []},
                    api_url="https://temper.example",
                    api_key=None,
                    agent_id="katagami-contributor",
                    session_id="s",
                    tenant_id="t",
                    trajectory_id="tr",
                )
        self.assertIn("TEMPER_API_KEY", str(raised.exception))

    def test_an_unreachable_ingest_raises_rather_than_passing_silently(self):
        def _boom(request, timeout=None):
            raise converter.urllib.error.URLError("connection refused")

        with mock.patch.object(converter.urllib.request, "urlopen", _boom):
            with self.assertRaises(converter.TrajectoryError):
                converter.post_trajectory(
                    {"turns": []},
                    api_url="https://temper.example",
                    api_key=None,
                    agent_id="a",
                    session_id="s",
                    tenant_id="t",
                    trajectory_id="tr",
                )


@unittest.skipUnless(
    _harbor_available(),
    f"harbor {harbor_adapter.HARBOR_PINNED_VERSION} not installed "
    "(pip install -r scripts/trajectory/requirements.txt)",
)
class HarborConversionTests(unittest.TestCase):
    """Runs only where the pin is installed; catches converter drift."""

    maxDiff = None

    def test_live_conversion_matches_the_checked_in_golden(self):
        produced = harbor_adapter.transcript_to_atif(
            TRANSCRIPT, session_id="00000000-0000-4000-8000-000000000000"
        )
        self.assertEqual(produced, json.loads(GOLDEN_ATIF.read_text()))

    def test_a_missing_transcript_raises(self):
        with self.assertRaises(harbor_adapter.HarborConversionError):
            harbor_adapter.transcript_to_atif(FIXTURES / "does-not-exist.jsonl")


if __name__ == "__main__":
    unittest.main()
