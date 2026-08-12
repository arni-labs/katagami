"""Layer 1 conformance replay contract (ARN-294 / ARN-295).

Layer 1 is the half of the Judged Conformance System that is supposed to be
unarguable: given a captured trajectory and an actor spec, the same replay
produces the same verdict every time. These tests build trajectories that
violate the protocol in specific ways and assert the replay names the violation.

They also pin the two properties that make a verdict trustworthy: a version
that is a function of the spec file, and an explicit list of the guards the
replay could NOT check — so a pass is never read as covering more than it did.
"""

import hashlib
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAJECTORY_DIR = REPO_ROOT / "scripts" / "trajectory"
SPECS = Path(__file__).resolve().parents[1] / "specs"


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


spec_version = _load("spec_version")
conformance = _load("conformance_check")

CURATOR_VERSION = spec_version.compute_version("CuratorAgent")


def call(turn_id, action, *, url=True, success=True, entity="run-1"):
    """One decision that drove a CuratorAgent entity.

    The shapes are the real ones: a `Bash` call carries the request in its
    `command`, an MCP invocation carries `{entity_type, action, entity_id}`.
    A URL sitting in any other argument is text that was written, not a
    request that was made — see `RequestTargetTest`.
    """
    target = f"https://temper/tdata/CuratorAgents('{entity}')/Temper.{action}"
    choice = (
        {"action": "Bash", "arguments": {"command": f"curl -X POST {target}"}}
        if url
        else {
            "action": "mcp__temper__execute",
            "arguments": {
                "entity_type": "CuratorAgent",
                "action": action,
                "entity_id": entity,
            },
        }
    )
    return {
        "turn_id": turn_id,
        "span_id": f"span-{turn_id}",
        "timestamp": "2026-08-11T10:00:00Z",
        "error": False,
        "messages": [],
        "decisions": [
            {
                "decision_id": f"dec-{turn_id}",
                "decision_type": "tool_selection",
                "choice": choice,
                "consequence": {"success": success},
            }
        ],
    }


def trajectory(turns, *, version=None):
    return {
        "trajectory_id": "traj-test",
        "version": "0.1.0",
        "metadata": {
            "trajectory_id": "traj-test",
            "spec_version": version or CURATOR_VERSION,
            "agent_id": "katagami-contributor",
        },
        "turns": turns,
    }


CONFORMING = [
    call(1, "ReceiveBrief"),
    call(2, "BeginDrafting"),
    call(3, "RecordDesignLanguage"),
    call(4, "SelfReview"),
    call(5, "SubmitDesignLanguages"),
]


class SpecVersionTest(unittest.TestCase):
    def test_the_version_is_the_kernels_content_hash(self):
        # `spec_content_hash` (temper-store-turso) is sha256 over the raw
        # registered ioa_source, and `names_same_spec` compares two versions
        # after stripping only a `sha256:` prefix. A version in any other
        # format can never equal the registered one, which means 409 on every
        # POST /api/conformance/check — the canonical layer 1 judging nothing.
        self.assertTrue(CURATOR_VERSION.startswith("sha256:"))
        digest = spec_version.bare_version(CURATOR_VERSION)
        self.assertEqual(len(digest), 64)
        self.assertEqual(
            digest,
            hashlib.sha256((SPECS / "curator_agent.ioa.toml").read_bytes()).hexdigest(),
        )

    def test_the_version_is_stable_across_runs(self):
        self.assertEqual(CURATOR_VERSION, spec_version.compute_version("CuratorAgent"))

    def test_each_actor_gets_its_own_version(self):
        versions = {
            actor: spec_version.compute_version(actor)
            for actor in ("CuratorAgent", "ReviewAgent", "HumanCurator", "TrajectoryVerdict")
        }
        self.assertEqual(len(set(versions.values())), len(versions))

    def _version_of(self, source):
        scratch = Path(self.enterContext(tempfile.TemporaryDirectory()))
        path = scratch / "curator_agent.ioa.toml"
        path.write_text(source)
        return spec_version.compute_version(str(path))

    def test_any_edit_to_the_file_produces_a_new_version(self):
        # The kernel hashes raw source, so this is the kernel's rule, not ours:
        # a reflowed comment is a new version. The cost is real and it is paid
        # by the snapshot store, which keeps the exact source under each hash
        # so an older version stays retrievable after the file moves on.
        source = (SPECS / "curator_agent.ioa.toml").read_text()
        self.assertNotEqual(
            self._version_of("# a reflowed comment\n" + source), CURATOR_VERSION
        )

    def test_a_protocol_change_does_invalidate_them(self):
        source = (SPECS / "curator_agent.ioa.toml").read_text().replace(
            'from = ["SelfReviewed"]', 'from = ["Drafting", "SelfReviewed"]', 1
        )
        self.assertNotEqual(self._version_of(source), CURATOR_VERSION)

    def test_an_agent_id_with_no_actor_contract_is_not_guessed(self):
        self.assertEqual(
            spec_version.actor_for_agent_id("katagami-contributor"), "CuratorAgent"
        )
        self.assertIsNone(spec_version.actor_for_agent_id("some-other-agent"))


class ReplayTest(unittest.TestCase):
    def _check(self, turns, **kwargs):
        return conformance.check(trajectory(turns, **kwargs), "CuratorAgent")

    def test_a_conforming_run_passes(self):
        verdict = self._check(CONFORMING)
        self.assertTrue(verdict["passed"], verdict["violations"])
        self.assertEqual(verdict["final_state"], "Submitted")
        self.assertEqual(verdict["layer"], "deterministic")
        self.assertEqual(verdict["spec_version"], CURATOR_VERSION)

    def test_submitting_without_self_review_is_an_illegal_transition(self):
        turns = [
            call(1, "ReceiveBrief"),
            call(2, "BeginDrafting"),
            call(3, "RecordDesignLanguage"),
            call(4, "SubmitDesignLanguages"),
        ]
        verdict = self._check(turns)
        self.assertFalse(verdict["passed"])
        kinds = {v["kind"] for v in verdict["violations"]}
        self.assertIn("illegal_transition", kinds)
        self.assertEqual(verdict["violations"][0]["turn_id"], 4)

    def test_a_second_submission_lands_in_a_terminal_state(self):
        verdict = self._check(CONFORMING + [call(6, "SubmitArtStyles")])
        self.assertFalse(verdict["passed"])
        self.assertEqual(verdict["violations"][0]["kind"], "terminal_state_violation")

    def test_a_lane_that_produced_nothing_trips_its_guard(self):
        turns = [
            call(1, "ReceiveBrief"),
            call(2, "BeginDrafting"),
            call(3, "SelfReview"),
            call(4, "SubmitDesignLanguages"),
        ]
        verdict = self._check(turns)
        self.assertFalse(verdict["passed"])
        violation = verdict["violations"][0]
        self.assertEqual(violation["kind"], "guard_violation")
        self.assertIn("has_design_language_ids", violation["detail"])

    def test_the_concurrency_budget_is_enforced_at_eleven_claims(self):
        turns = [call(1, "ReceiveBrief"), call(2, "BeginDrafting")]
        turns += [call(3 + i, "ClaimJob") for i in range(11)]
        verdict = self._check(turns)
        self.assertFalse(verdict["passed"])
        violation = next(v for v in verdict["violations"] if v["kind"] == "guard_violation")
        self.assertIn("jobs_in_flight", violation["detail"])

    def test_ten_claims_are_within_budget(self):
        turns = [call(1, "ReceiveBrief"), call(2, "BeginDrafting")]
        turns += [call(3 + i, "ClaimJob") for i in range(10)]
        self.assertTrue(self._check(turns)["passed"])

    def test_an_action_outside_the_alphabet_is_named(self):
        verdict = self._check([call(1, "Publish")])
        self.assertEqual(verdict["violations"][0]["kind"], "unknown_action")

    def test_an_output_action_cannot_be_invoked(self):
        verdict = self._check([call(1, "ReceiveBrief"), call(2, "CuratorSubmittedEvent")])
        kinds = {v["kind"] for v in verdict["violations"]}
        self.assertIn("output_action_invoked", kinds)

    def test_a_run_with_no_actor_actions_does_not_pass_by_default(self):
        # Silence is not conformance: a curator that never drove its record
        # produced no evidence, and "no evidence" must not read as "fine".
        empty = [
            {
                "turn_id": 1,
                "messages": [],
                "decisions": [
                    {
                        "decision_id": "dec-1",
                        "choice": {"action": "Read", "arguments": {"file_path": "/x"}},
                        "consequence": {"success": True},
                    }
                ],
            }
        ]
        verdict = self._check(empty)
        self.assertFalse(verdict["passed"])
        self.assertEqual(verdict["violations"][0]["kind"], "no_actor_actions")

    def test_a_rejected_call_changes_nothing(self):
        turns = [
            call(1, "ReceiveBrief"),
            call(2, "SubmitDesignLanguages", success=False),
            call(3, "BeginDrafting"),
        ]
        verdict = self._check(turns)
        self.assertTrue(verdict["passed"], verdict["violations"])
        self.assertEqual(verdict["final_state"], "Drafting")

    def test_cross_entity_guards_are_reported_as_unchecked_not_as_satisfied(self):
        verdict = self._check(CONFORMING)
        self.assertTrue(verdict["passed"])
        kinds = {u["kind"] for u in verdict["unverifiable"]}
        self.assertIn("cross_entity_state", kinds)

    def test_calls_are_recognized_from_an_explicit_argument_pair_too(self):
        turns = [call(1, "ReceiveBrief", url=False), call(2, "BeginDrafting", url=False)]
        verdict = self._check(turns)
        self.assertEqual(verdict["final_state"], "Drafting")

    def test_reading_a_property_is_not_mistaken_for_an_action(self):
        # GET /tdata/CuratorAgents('run-1')/State reads a property. Counting it
        # as an unknown action would invent a violation the run never made.
        turns = list(CONFORMING)
        turns.append(
            {
                "turn_id": 6,
                "decisions": [
                    {
                        "decision_id": "dec-6",
                        "choice": {
                            "action": "Bash",
                            "arguments": {
                                "url": "https://temper/tdata/CuratorAgents('run-1')/State"
                            },
                        },
                        "consequence": {"success": True},
                    }
                ],
            }
        )
        verdict = self._check(turns)
        self.assertTrue(verdict["passed"], verdict["violations"])

    def test_an_unnamespaced_action_call_is_still_replayed(self):
        turns = [
            {
                "turn_id": 1,
                "decisions": [
                    {
                        "decision_id": "dec-1",
                        "choice": {
                            "action": "Bash",
                            "arguments": {
                                "command": "curl -X POST "
                                "https://temper/tdata/CuratorAgents('r')/ReceiveBrief"
                            },
                        },
                        "consequence": {"success": True},
                    }
                ],
            }
        ]
        self.assertEqual(len(self._check(turns)["actions_replayed"]), 1)

    def test_another_entitys_calls_are_not_mistaken_for_this_actors(self):
        turns = list(CONFORMING)
        turns.append(
            {
                "turn_id": 6,
                "decisions": [
                    {
                        "decision_id": "dec-6",
                        "choice": {
                            "action": "Bash",
                            "arguments": {
                                "url": "https://temper/tdata/CurationJobs('j')/Temper.Complete"
                            },
                        },
                        "consequence": {"success": True},
                    }
                ],
            }
        )
        self.assertTrue(self._check(turns)["passed"])


class VersionGateTest(unittest.TestCase):
    def test_a_trajectory_with_no_spec_version_is_refused(self):
        document = trajectory(CONFORMING)
        document["metadata"].pop("spec_version")
        with self.assertRaises(conformance.ConformanceError):
            conformance.check(document, "CuratorAgent")

    def test_a_trajectory_from_a_different_spec_version_is_refused(self):
        with self.assertRaises(conformance.ConformanceError) as raised:
            conformance.check(
                trajectory(CONFORMING, version="sha256:" + "de" * 32),
                "CuratorAgent",
            )
        self.assertIn("not a judgement", str(raised.exception))

    def test_the_prefix_is_not_a_different_contract(self):
        # The kernel strips `sha256:` from both sides before comparing; a
        # producer that wrote the prefix and one that did not ran the same spec.
        document = trajectory(CONFORMING)
        document["metadata"]["spec_version"] = spec_version.bare_version(CURATOR_VERSION)
        self.assertTrue(conformance.check(document, "CuratorAgent")["passed"])


class PerEntityReplayTest(unittest.TestCase):
    """One actor spec governs many entities, and each is its own machine.

    Replaying them as one merged machine let a run carry state from an entity
    that did the work to an entity that did not.
    """

    def _check(self, turns):
        return conformance.check(trajectory(turns), "CuratorAgent")

    def test_one_entity_cannot_submit_on_anothers_progress(self):
        # `run-a` walks the protocol as far as SelfReviewed; `run-b` then
        # submits having done nothing at all. Merged, the machine was sitting
        # in SelfReviewed and called it legal.
        turns = [
            call(1, "ReceiveBrief", entity="run-a"),
            call(2, "BeginDrafting", entity="run-a"),
            call(3, "RecordDesignLanguage", entity="run-a"),
            call(4, "SelfReview", entity="run-a"),
            call(5, "SubmitDesignLanguages", entity="run-b"),
        ]
        verdict = self._check(turns)

        self.assertFalse(verdict["passed"])
        offence = next(
            v for v in verdict["violations"] if v["kind"] == "illegal_transition"
        )
        self.assertEqual(offence["entity_id"], "run-b")
        self.assertEqual(verdict["entities_replayed"], 2)

    def test_two_entities_each_doing_the_whole_protocol_both_pass(self):
        # The other direction: legitimate concurrency must not read as a
        # violation just because two runs interleave.
        turns = []
        turn_id = 0
        for entity in ("run-a", "run-b"):
            for action in (
                "ReceiveBrief",
                "BeginDrafting",
                "RecordDesignLanguage",
                "SelfReview",
                "SubmitDesignLanguages",
            ):
                turn_id += 1
                turns.append(call(turn_id, action, entity=entity))

        verdict = self._check(turns)

        self.assertTrue(verdict["passed"], verdict["violations"])
        self.assertEqual(verdict["entities_replayed"], 2)
        self.assertEqual(
            verdict["final_states"], {"run-a": "Submitted", "run-b": "Submitted"}
        )

    def test_interleaved_entities_do_not_trip_each_other(self):
        turns = []
        turn_id = 0
        for action in (
            "ReceiveBrief",
            "BeginDrafting",
            "RecordDesignLanguage",
            "SelfReview",
            "SubmitDesignLanguages",
        ):
            for entity in ("run-a", "run-b"):
                turn_id += 1
                turns.append(call(turn_id, action, entity=entity))

        verdict = self._check(turns)
        self.assertTrue(verdict["passed"], verdict["violations"])

    def test_a_single_entity_run_still_reports_one_final_state(self):
        verdict = self._check(CONFORMING)
        self.assertEqual(verdict["final_state"], "Submitted")
        self.assertEqual(verdict["entities_replayed"], 1)

    def test_several_entities_report_no_single_final_state(self):
        turns = [
            call(1, "ReceiveBrief", entity="run-a"),
            call(2, "ReceiveBrief", entity="run-b"),
        ]
        verdict = self._check(turns)
        self.assertEqual(verdict["final_state"], "")
        self.assertEqual(len(verdict["final_states"]), 2)

    def test_calls_naming_no_entity_are_flagged_as_unverifiable(self):
        turns = [call(1, "ReceiveBrief", url=False, entity="")]
        verdict = self._check(turns)
        kinds = {u["kind"] for u in verdict["unverifiable"]}
        self.assertIn("unidentified_entity", kinds)
        self.assertFalse(verdict["evidence_complete"])


class RequestTargetTest(unittest.TestCase):
    """A URL that was written is not a call that was made.

    The scan used to serialize every argument of every tool call, so editing
    this repository's own skill docs — which are full of OData examples —
    registered as the run performing those transitions.
    """

    def _check(self, turns):
        return conformance.check(trajectory(turns), "CuratorAgent")

    def _tool_call(self, tool, arguments):
        return {
            "turn_id": 1,
            "decisions": [
                {
                    "decision_id": "dec-1",
                    "choice": {"action": tool, "arguments": arguments},
                    "consequence": {"success": True},
                }
            ],
        }

    URL = "https://temper/tdata/CuratorAgents('r')/Temper.SubmitDesignLanguages"

    def _extracted(self, tool, arguments):
        """What the replay believes the run actually invoked.

        Asserted on extraction rather than on `actions_replayed`, because a
        call that IS seen and is an illegal transition never reaches the
        replayed list — so an empty list there would pass whether the call was
        counted or not.
        """
        return conformance.extract_actor_calls(
            trajectory([self._tool_call(tool, arguments)]),
            "CuratorAgent",
            frozenset({"SubmitDesignLanguages", "ReceiveBrief"}),
        )

    def test_writing_a_file_that_mentions_an_action_is_not_performing_it(self):
        self.assertEqual(
            self._extracted("Write", {"file_path": "SKILL.md", "content": self.URL}), []
        )
        verdict = self._check(
            [self._tool_call("Write", {"file_path": "SKILL.md", "content": self.URL})]
        )
        self.assertEqual(
            {v["kind"] for v in verdict["violations"]}, {"no_actor_actions"}
        )

    def test_editing_a_file_that_mentions_an_action_is_not_performing_it(self):
        self.assertEqual(
            self._extracted(
                "Edit",
                {"file_path": "SKILL.md", "old_string": "x", "new_string": self.URL},
            ),
            [],
        )

    def test_reading_a_file_that_mentions_an_action_is_not_performing_it(self):
        self.assertEqual(self._extracted("Read", {"file_path": self.URL}), [])

    def test_a_url_outside_the_request_argument_of_an_http_tool_is_ignored(self):
        # Bash issues requests through `command`; a URL in `description` is prose.
        self.assertEqual(
            self._extracted("Bash", {"command": "ls", "description": self.URL}), []
        )

    def test_the_real_request_argument_still_counts(self):
        for tool, arguments in (
            ("Bash", {"command": f"curl -X POST {self.URL}"}),
            ("WebFetch", {"url": self.URL}),
            ("mcp__temper__execute", {"code": f"temper.post('{self.URL}')"}),
        ):
            calls = self._extracted(tool, arguments)
            self.assertEqual(len(calls), 1, tool)
            self.assertEqual(calls[0]["action"], "SubmitDesignLanguages", tool)
            self.assertEqual(calls[0]["entity_id"], "r", tool)


if __name__ == "__main__":
    unittest.main()
