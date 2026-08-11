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

import importlib.util
import json
import sys
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
