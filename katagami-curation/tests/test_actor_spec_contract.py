"""Actor spec contract for the Judged Conformance System (ARN-294).

The point of an actor spec is that the protocol is enforced by the automaton
rather than by prose, so these tests assert the structural properties directly:
which states an action is reachable from, which guards it carries, and which
actions do NOT exist. `temper verify --specs-dir specs` proves the specs are
internally sound; this file proves they say what the protocol requires.
"""

import tomllib
import unittest
import xml.etree.ElementTree as ElementTree
from pathlib import Path

CURATION_ROOT = Path(__file__).resolve().parents[1]
SPECS = CURATION_ROOT / "specs"
POLICIES = CURATION_ROOT / "policies"
COMMONS_POLICIES = CURATION_ROOT.parent / "katagami-commons" / "policies"
MODEL_CSDL = SPECS / "model.csdl.xml"

EDM_NS = "{http://docs.oasis-open.org/odata/ns/edm}"

# A state var's EDM type. Lists are strings holding JSON; counters are ints.
EDM_TYPE_BY_STATE_TYPE = {
    "string": "Edm.String",
    "bool": "Edm.Boolean",
    "counter": "Edm.Int32",
}


def pascal(name):
    return "".join(part.capitalize() for part in name.split("_"))


def load(name):
    return tomllib.loads((SPECS / f"{name}.ioa.toml").read_text())


def actions(spec):
    return {action["name"]: action for action in spec["action"]}


def states(spec):
    return {state["name"]: state for state in spec.get("state", [])}


def invariants(spec):
    return {inv["name"]: inv for inv in spec.get("invariant", [])}


def guards(action):
    guard = action.get("guard", [])
    return guard if isinstance(guard, list) else [guard]


SUBMIT_LANES = {
    "SubmitDesignLanguages": ("DesignLanguage", "design_language_ids", "RecordDesignLanguage"),
    "SubmitArtStyles": ("ArtStyle", "art_style_ids", "RecordArtStyle"),
    "SubmitPaletteSystems": ("PaletteSystem", "palette_system_ids", "RecordPaletteSystem"),
    "SubmitWritingStyles": ("WritingStyle", "writing_style_ids", "RecordWritingStyle"),
}


class CuratorAgentSpecTest(unittest.TestCase):
    def setUp(self):
        self.spec = load("curator_agent")
        self.actions = actions(self.spec)
        self.states = states(self.spec)

    def _submit_actions(self):
        return {
            name: action
            for name, action in self.actions.items()
            if name.startswith("Submit")
        }

    def test_the_protocol_states_are_present_in_order(self):
        self.assertEqual(self.spec["automaton"]["name"], "CuratorAgent")
        self.assertEqual(self.spec["automaton"]["initial"], "BriefReceived")
        for state in ("BriefReceived", "Drafting", "SelfReviewed", "Submitted"):
            self.assertIn(state, self.spec["automaton"]["states"])

    def test_there_is_one_submit_action_per_lane(self):
        self.assertEqual(sorted(self._submit_actions()), sorted(SUBMIT_LANES))

    def test_submit_is_only_reachable_after_self_review(self):
        # The ordering is structural: SelfReviewed is the only source state for
        # every submit, and SelfReview is the only edge into it.
        for name, action in self._submit_actions().items():
            self.assertEqual(action["from"], ["SelfReviewed"], name)
        self.assertEqual(self.actions["SelfReview"]["to"], "SelfReviewed")
        into_self_reviewed = [
            name
            for name, action in self.actions.items()
            if action.get("to") == "SelfReviewed"
        ]
        self.assertEqual(into_self_reviewed, ["SelfReview"])

    def test_submit_is_also_guarded_on_the_self_review_flag(self):
        for name, action in self._submit_actions().items():
            self.assertIn(
                {"type": "is_true", "var": "self_review_complete"},
                guards(action),
                name,
            )

    def test_submit_happens_at_most_once_per_run(self):
        # Every lane lands in the same terminal state, so no second submission
        # of any lane has a legal source state.
        for name, action in self._submit_actions().items():
            self.assertEqual(action["to"], "Submitted", name)
        self.assertEqual(
            invariants(self.spec)["SubmittedIsFinal"]["assert"],
            "no_further_transitions",
        )
        from_submitted = [
            name
            for name, action in self.actions.items()
            if "Submitted" in action.get("from", [])
        ]
        self.assertEqual(from_submitted, [])

    def test_each_lane_checks_its_own_work_against_the_entity_graph(self):
        # The artifact requirements (DESIGN.md, embodiment, landing, proof
        # shots, corpus, ...) are not restated here — they are read off the
        # entity graph, because reaching UnderReview means the entity's own
        # SubmitForReview guard already proved them.
        for name, (entity_type, id_field, _) in SUBMIT_LANES.items():
            action = self.actions[name]
            self.assertIn(
                {
                    "type": "cross_entity_state",
                    "entity_type": entity_type,
                    "entity_id_source": id_field,
                    "required_status": ["UnderReview", "Published"],
                },
                guards(action),
                name,
            )
            self.assertIn(id_field, self.states, id_field)

    def test_a_lane_that_produced_nothing_cannot_be_submitted(self):
        # The kernel resolves a cross-entity guard over an empty list as
        # vacuous truth, so the cross-entity guard alone would let a run submit
        # nothing at all and pass. The companion bool is what closes that.
        for name, (_, id_field, record_action) in SUBMIT_LANES.items():
            flag = f"has_{id_field}"
            self.assertIn(flag, self.states, flag)
            self.assertEqual(self.states[flag]["type"], "bool")
            self.assertEqual(self.states[flag]["initial"], "false")
            self.assertIn({"type": "is_true", "var": flag}, guards(self.actions[name]), name)

            # And the only thing that flips it also appends the id, so the flag
            # cannot be true while the list is empty.
            recorder = self.actions[record_action]
            self.assertEqual(recorder["from"], ["Drafting"], record_action)
            self.assertIn(id_field, recorder["params"], record_action)
            self.assertIn(
                {"type": "list_append", "var": id_field}, recorder["effect"], record_action
            )
            self.assertIn(
                {"type": "set_bool", "var": flag, "value": "true"},
                recorder["effect"],
                record_action,
            )
            setters = [
                other
                for other, action in self.actions.items()
                if any(
                    isinstance(e, dict)
                    and e.get("type") == "set_bool"
                    and e.get("var") == flag
                    for e in action.get("effect", [])
                )
            ]
            self.assertEqual(setters, [record_action], flag)

    def test_the_referenced_commons_guards_are_where_the_requirements_live(self):
        commons_specs = CURATION_ROOT.parent / "katagami-commons" / "specs"
        language = tomllib.loads(
            (commons_specs / "design_language.ioa.toml").read_text()
        )
        submit = next(
            a for a in language["action"] if a["name"] == "SubmitForReview"
        )
        required = {
            g["var"] for g in guards(submit) if g.get("type") == "is_true"
        }
        for expected in (
            "has_valid_design_md",
            "has_embodiment",
            "has_compositions",
            "has_thumbnail",
        ):
            self.assertIn(expected, required, expected)

    def test_the_curator_has_no_publish_action(self):
        # Publishing belongs to HumanCurator. Not "should not be called" —
        # not present.
        for name in self.actions:
            self.assertNotIn("publish", name.lower(), f"{name} is a publish action")

    def test_the_concurrency_budget_caps_the_run_at_ten_jobs(self):
        claim = self.actions["ClaimJob"]
        # max_count is strict (val < max), so max=10 admits ten held claims.
        self.assertIn(
            {"type": "max_count", "var": "jobs_in_flight", "max": 10}, guards(claim)
        )
        self.assertIn(
            {"type": "increment", "var": "jobs_in_flight"}, claim.get("effect", [])
        )
        self.assertIn("jobs_in_flight", self.states)
        self.assertEqual(self.states["jobs_in_flight"]["type"], "counter")

    def test_a_run_cannot_submit_with_work_still_outstanding(self):
        for name, action in self._submit_actions().items():
            self.assertIn(
                {"type": "max_count", "var": "jobs_in_flight", "max": 1},
                guards(action),
                name,
            )

    def test_capture_identity_is_recorded_on_the_run(self):
        for field in ("session_id", "trajectory_id", "spec_version", "harness"):
            self.assertIn(field, self.states)
            self.assertIn(field, self.actions["ReceiveBrief"]["params"])

    def test_a_stalled_run_is_abandoned_rather_than_left_hanging(self):
        timed_out = {t["state"] for t in self.spec["state_timeout"]}
        self.assertEqual(timed_out, {"BriefReceived", "Drafting", "SelfReviewed"})
        for timeout in self.spec["state_timeout"]:
            self.assertEqual(timeout["on_timeout"], "Abandon")


class ReviewAgentSpecTest(unittest.TestCase):
    def setUp(self):
        self.spec = load("review_agent")
        self.actions = actions(self.spec)

    def test_the_protocol_states_are_present(self):
        self.assertEqual(self.spec["automaton"]["name"], "ReviewAgent")
        self.assertEqual(self.spec["automaton"]["initial"], "SubmissionReceived")
        for state in ("SubmissionReceived", "Reviewing", "VerdictRecorded"):
            self.assertIn(state, self.spec["automaton"]["states"])

    def test_the_verdict_is_recorded_once_and_is_terminal(self):
        self.assertEqual(self.actions["RecordVerdict"]["from"], ["Reviewing"])
        self.assertEqual(self.actions["RecordVerdict"]["to"], "VerdictRecorded")
        self.assertEqual(
            invariants(self.spec)["VerdictRecordedIsFinal"]["assert"],
            "no_further_transitions",
        )

    def test_the_review_agent_has_no_publish_action(self):
        for name in self.actions:
            self.assertNotIn("publish", name.lower(), f"{name} is a publish action")

    def test_capture_identity_is_recorded_on_the_review(self):
        params = self.actions["ReceiveSubmission"]["params"]
        for field in ("session_id", "trajectory_id", "spec_version", "harness"):
            self.assertIn(field, params)


class HumanCuratorSpecTest(unittest.TestCase):
    def setUp(self):
        self.spec = load("human_curator")
        self.actions = actions(self.spec)
        self.states = states(self.spec)

    def test_the_role_states_are_present(self):
        self.assertEqual(self.spec["automaton"]["name"], "HumanCurator")
        for state in (
            "SubmissionAssigned",
            "Reviewing",
            "Published",
            "ReturnedWithCritique",
            "Escalated",
        ):
            self.assertIn(state, self.spec["automaton"]["states"])

    def test_the_record_models_a_role_and_never_a_person(self):
        # Identity lives on Member. The role points at its holder through an
        # opaque reference and carries no personal field of its own.
        self.assertIn("assignee_ref", self.states)
        for field in self.states:
            for personal in ("name", "email", "phone", "address"):
                self.assertNotIn(
                    personal, field.lower(), f"{field} looks like a personal field"
                )

    def test_publish_requires_the_machine_review_to_have_ruled_first(self):
        publish_guards = guards(self.actions["Publish"])
        self.assertIn({"type": "is_true", "var": "has_review_verdict"}, publish_guards)
        self.assertIn(
            {
                "type": "cross_entity_state",
                "entity_type": "ReviewAgent",
                "entity_id_source": "review_agent_id",
                "required_status": ["VerdictRecorded"],
            },
            publish_guards,
        )

    def test_publish_is_reachable_only_from_reviewing_and_only_once(self):
        self.assertEqual(self.actions["Publish"]["from"], ["Reviewing"])
        self.assertEqual(
            invariants(self.spec)["PublishedIsFinal"]["assert"],
            "no_further_transitions",
        )

    def test_an_unanswered_assignment_escalates_instead_of_stalling(self):
        overdue = self.actions["ReviewOverdue"]
        self.assertEqual(overdue["to"], "Escalated")
        self.assertEqual(
            sorted(overdue["from"]), ["Reviewing", "SubmissionAssigned"]
        )
        timeouts = {t["state"]: t for t in self.spec["state_timeout"]}
        self.assertEqual(
            sorted(timeouts), ["Reviewing", "SubmissionAssigned"]
        )
        for timeout in timeouts.values():
            self.assertEqual(timeout["on_timeout"], "ReviewOverdue")
        # Escalation re-routes; it never bypasses the review.
        self.assertEqual(self.actions["Reassign"]["to"], "SubmissionAssigned")

    def test_returning_a_submission_requires_a_written_critique(self):
        self.assertIn("critique", self.actions["ReturnWithCritique"]["params"])


class TrajectoryVerdictSpecTest(unittest.TestCase):
    def setUp(self):
        self.spec = load("trajectory_verdict")
        self.actions = actions(self.spec)
        self.states = states(self.spec)

    def test_recorded_is_terminal(self):
        self.assertEqual(self.spec["automaton"]["name"], "TrajectoryVerdict")
        self.assertEqual(self.actions["Record"]["to"], "Recorded")
        self.assertEqual(
            invariants(self.spec)["RecordedIsFinal"]["assert"],
            "no_further_transitions",
        )

    def test_every_required_field_exists_and_is_settable(self):
        required = [
            "trajectory_id",
            "session_id",
            "actor_spec",
            "spec_version",
            "layer",
            "passed",
            "violations",
            "judged_by",
            "judged_at",
        ]
        for field in required:
            self.assertIn(field, self.states, field)
            self.assertIn(field, self.actions["Record"]["params"], field)
        self.assertEqual(self.states["passed"]["type"], "bool")

    def test_the_verdict_timestamp_does_not_collide_with_the_platform_column(self):
        # Every entity already has a CreatedAt column. A state var called
        # created_at would map onto it and the two would drift apart.
        self.assertNotIn("created_at", self.states)

    def test_both_layers_are_documented_on_the_spec(self):
        text = (SPECS / "trajectory_verdict.ioa.toml").read_text()
        self.assertIn('layer = "deterministic"', text)
        self.assertIn('layer = "llm"', text)
        self.assertIn("never overrides layer 1", text)


class CsdlExposesEverySpecTest(unittest.TestCase):
    """An automaton with no entity set is a spec nobody can call.

    `temper verify` proves each IOA file is sound and says nothing about the
    CSDL, so a new spec can pass verification while `POST /tdata/<Set>` returns
    404 for it. This walks every spec in the directory rather than the four that
    were missing, so the next one that is added is caught the same way.
    """

    @classmethod
    def setUpClass(cls):
        cls.schema = ElementTree.parse(MODEL_CSDL).getroot().find(f".//{EDM_NS}Schema")
        cls.entity_types = {
            entity.get("Name"): entity
            for entity in cls.schema.findall(f"{EDM_NS}EntityType")
        }
        container = cls.schema.find(f"{EDM_NS}EntityContainer")
        cls.entity_sets = {
            entity_set.get("EntityType").rsplit(".", 1)[-1]: entity_set.get("Name")
            for entity_set in container.findall(f"{EDM_NS}EntitySet")
        }
        cls.specs = {}
        for path in sorted(SPECS.glob("*.ioa.toml")):
            spec = tomllib.loads(path.read_text())
            cls.specs[spec["automaton"]["name"]] = spec

    def _properties(self, name):
        return {
            prop.get("Name"): prop
            for prop in self.entity_types[name].findall(f"{EDM_NS}Property")
        }

    def test_every_automaton_has_an_entity_type_and_an_entity_set(self):
        for name in self.specs:
            self.assertIn(name, self.entity_types, f"{name} has no EntityType")
            self.assertIn(name, self.entity_sets, f"{name} has no EntitySet")

    def test_every_state_variable_is_exposed_with_the_right_type(self):
        for name, spec in self.specs.items():
            properties = self._properties(name)
            for state in spec.get("state", []):
                prop_name = pascal(state["name"])
                self.assertIn(
                    prop_name, properties, f"{name}.{state['name']} is not in the CSDL"
                )
                expected = EDM_TYPE_BY_STATE_TYPE.get(state["type"])
                if expected:
                    self.assertEqual(
                        properties[prop_name].get("Type"),
                        expected,
                        f"{name}.{prop_name}",
                    )

    def test_every_entity_carries_the_platform_columns(self):
        for name in self.specs:
            properties = self._properties(name)
            for column in ("Id", "State", "CreatedAt", "UpdatedAt"):
                self.assertIn(column, properties, f"{name} has no {column}")
            self.assertEqual(properties["Id"].get("Type"), "Edm.Guid", name)

    def test_the_declared_initial_state_is_the_state_columns_default(self):
        for name, spec in self.specs.items():
            self.assertEqual(
                self._properties(name)["State"].get("DefaultValue"),
                spec["automaton"]["initial"],
                name,
            )

    def test_the_actor_entity_sets_are_the_paths_the_skills_call(self):
        for actor in ("CuratorAgent", "ReviewAgent", "HumanCurator", "TrajectoryVerdict"):
            self.assertEqual(self.entity_sets[actor], f"{actor}s", actor)


class ActorPolicyBoundaryTest(unittest.TestCase):
    """Cedar must tighten the publish boundary and never re-grant it."""

    def test_a_policy_exists_for_every_new_spec(self):
        for name in (
            "curator_agent",
            "review_agent",
            "human_curator",
            "trajectory_verdict",
        ):
            policy = POLICIES / f"{name}.cedar"
            self.assertTrue(policy.is_file(), f"missing policy: {policy}")
            # The app mirrors its policies into specs/policies/; both copies
            # are loaded depending on the install path.
            mirrored = POLICIES.parent / "specs" / "policies" / f"{name}.cedar"
            self.assertTrue(mirrored.is_file(), f"missing mirror: {mirrored}")
            self.assertEqual(policy.read_text(), mirrored.read_text())

    def test_no_agent_principal_may_publish_on_the_role_record(self):
        policy = (POLICIES / "human_curator.cedar").read_text()
        self.assertIn('forbid(', policy)
        self.assertIn('Action::"Publish"', policy)
        self.assertIn('Action::"ReturnWithCritique"', policy)
        # Written against `has agent_type` rather than one value, so a new
        # agent type cannot quietly inherit the human's authority.
        self.assertIn("principal has agent_type", policy)

    def test_the_existing_commons_boundary_is_referenced_not_restated(self):
        policy = (POLICIES / "human_curator.cedar").read_text()
        self.assertIn("design_language.cedar", policy)
        self.assertIn("art_style.cedar", policy)
        # And the referenced policies still carry the contributor forbid they
        # are being credited with.
        for name in ("design_language", "art_style"):
            commons = (COMMONS_POLICIES / f"{name}.cedar").read_text()
            self.assertIn('Action::"Publish"', commons)
            self.assertIn('principal.agent_type == "contributor"', commons)

    def test_a_contributor_may_not_rule_on_its_own_work(self):
        review = (POLICIES / "review_agent.cedar").read_text()
        self.assertIn('Action::"RecordVerdict"', review)
        self.assertIn('principal.agent_type == "contributor"', review)
        verdict = (POLICIES / "trajectory_verdict.cedar").read_text()
        self.assertIn('Action::"Record"', verdict)
        self.assertIn('principal.agent_type == "contributor"', verdict)

    def test_publishing_is_bound_to_the_assignment_holder(self):
        # Forbidding agents is not enough on its own: without this any other
        # authenticated human could publish somebody else's assignment.
        policy = (POLICIES / "human_curator.cedar").read_text()
        self.assertIn("unless", policy)
        self.assertIn("principal.id == resource.assignee_ref", policy)
        self.assertIn('resource.assignee_ref != ""', policy)
        # And the spec says assignee_ref carries what the binding compares to.
        spec = (SPECS / "human_curator.ioa.toml").read_text()
        self.assertIn("principal id", spec.lower())

    def test_recording_a_verdict_is_an_allowlist_not_a_default(self):
        review = (POLICIES / "review_agent.cedar").read_text()
        self.assertIn("unless", review)
        self.assertIn('principal == Agent::"katagami-reviewer"', review)
        verdict = (POLICIES / "trajectory_verdict.cedar").read_text()
        self.assertIn("unless", verdict)
        self.assertIn('principal == Agent::"katagami-judge"', verdict)
        # The judge skill runs under exactly that principal.
        judge = (
            CURATION_ROOT.parent / "mcp" / "skills" / "katagami-judge" / "SKILL.md"
        ).read_text()
        self.assertIn("x-temper-principal-id: katagami-judge", judge)

    def test_no_actor_record_is_writable_by_an_unauthenticated_caller(self):
        for name in (
            "curator_agent",
            "review_agent",
            "human_curator",
            "trajectory_verdict",
        ):
            policy = (POLICIES / f"{name}.cedar").read_text()
            self.assertIn('principal.id == "anonymous"', policy, name)


if __name__ == "__main__":
    unittest.main()
