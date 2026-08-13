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


class CuratorAgentSpecTest(unittest.TestCase):
    def setUp(self):
        self.spec = load("curator_agent")
        self.actions = actions(self.spec)
        self.states = states(self.spec)

    def test_the_protocol_states_are_present(self):
        self.assertEqual(self.spec["automaton"]["name"], "CuratorAgent")
        self.assertEqual(self.spec["automaton"]["initial"], "Idle")
        for state in (
            "Idle",
            "ReadingQuery",
            "Searching",
            "SourcesReady",
            "DirectionsReady",
            "ReadingDirection",
            "Authoring",
            "SurfacesRendered",
            "Looking",
            "LanguageUnderReview",
            "Abandoned",
        ):
            self.assertIn(state, self.spec["automaton"]["states"])

    def test_research_is_take_query_then_search_then_index_then_derive(self):
        self.assertEqual(self.actions["TakeQuery"]["from"], ["Idle"])
        self.assertEqual(self.actions["TakeQuery"]["to"], "ReadingQuery")
        self.assertEqual(self.actions["SearchTheWeb"]["to"], "Searching")
        self.assertEqual(self.actions["IndexSources"]["to"], "SourcesReady")
        self.assertEqual(self.actions["DeriveDirections"]["to"], "DirectionsReady")
        self.assertEqual(self.actions["CompleteResearch"]["from"], ["DirectionsReady"])

    def test_take_query_requires_the_live_query_and_job(self):
        types = {
            g["entity_type"]
            for g in guards(self.actions["TakeQuery"])
            if g.get("type") == "cross_entity_state"
        }
        self.assertEqual(types, {"CurationJob", "CurationQuery"})

    def test_cannot_index_before_searching(self):
        self.assertIn(
            {"type": "min_count", "var": "searches_run", "min": 1},
            guards(self.actions["IndexSources"]),
        )

    def test_cannot_derive_before_indexing(self):
        self.assertIn(
            {"type": "min_count", "var": "sources_indexed", "min": 1},
            guards(self.actions["DeriveDirections"]),
        )

    def test_synthesize_is_direction_then_parts_then_look(self):
        self.assertEqual(self.actions["TakeDirection"]["to"], "ReadingDirection")
        self.assertEqual(self.actions["ReadDesignRules"]["to"], "Authoring")
        self.assertEqual(self.actions["RenderSurfaces"]["from"], ["Authoring"])
        self.assertEqual(self.actions["LookAtLanding"]["to"], "Looking")
        self.assertEqual(self.actions["LookAtEmbodiment"]["to"], "Looking")
        self.assertEqual(self.actions["LookAtDashboard"]["to"], "Looking")
        self.assertEqual(self.actions["SubmitLanguage"]["from"], ["Looking"])

    def test_research_refuses_fewer_than_three_directions(self):
        self.assertIn(
            {"type": "min_count", "var": "directions_derived", "min": 3},
            guards(self.actions["CompleteResearch"]),
        )
        self.assertIn(
            {"type": "max_count", "var": "directions_derived", "max": 5},
            guards(self.actions["DeriveDirections"]),
        )

    def test_render_requires_every_named_part(self):
        required = {
            "design_rules_read",
            "concept_authored",
            "tokens_authored",
            "katagami_spec_authored",
            "design_md_authored",
            "landing_authored",
            "embodiment_authored",
            "dashboard_authored",
            "shadcn_authored",
            "thumbnail_authored",
        }
        got = {
            g["var"]
            for g in guards(self.actions["RenderSurfaces"])
            if g.get("type") == "is_true"
        }
        self.assertEqual(required, got)

    def test_take_direction_requires_the_live_direction_and_job(self):
        types = {
            g["entity_type"]
            for g in guards(self.actions["TakeDirection"])
            if g.get("type") == "cross_entity_state"
        }
        self.assertEqual(types, {"CurationJob", "CurationDirection"})

    def test_submit_language_requires_under_review_after_every_look(self):
        action = self.actions["SubmitLanguage"]
        self.assertEqual(action["from"], ["Looking"])
        language = [
            g
            for g in guards(action)
            if g.get("type") == "cross_entity_state"
        ]
        self.assertEqual(language[0]["entity_type"], "DesignLanguage")
        self.assertEqual(language[0]["required_status"], ["UnderReview"])
        required = {g["var"] for g in guards(action) if g.get("type") == "is_true"}
        self.assertTrue(
            {"landing_looked", "embodiment_looked", "dashboard_looked"} <= required
        )

    def test_a_fix_returns_to_authoring_so_the_look_must_happen_again(self):
        self.assertEqual(self.actions["FixSurfaces"]["from"], ["Looking"])
        self.assertEqual(self.actions["FixSurfaces"]["to"], "Authoring")

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

    def test_the_curator_has_no_publish_or_quality_review_action(self):
        for name in self.actions:
            self.assertNotIn("publish", name.lower(), f"{name} is a publish action")
            self.assertNotIn("quality", name.lower(), f"{name} is a quality-review action")

    def test_capture_identity_is_recorded_on_the_run(self):
        for field in ("session_id", "trajectory_id", "spec_version", "harness"):
            self.assertIn(field, self.states)
            self.assertIn(field, self.actions["RecordCapture"]["params"])

    def test_a_stalled_hold_is_abandoned_rather_than_left_hanging(self):
        live = set(self.spec["automaton"]["states"]) - {"Idle", "Abandoned"}
        timed_out = {t["state"] for t in self.spec["state_timeout"]}
        self.assertEqual(timed_out, live)
        for timeout in self.spec["state_timeout"]:
            self.assertEqual(timeout["on_timeout"], "Abandon")

    def test_revision_rounds_are_bounded(self):
        self.assertIn(
            {"type": "max_count", "var": "revision_rounds", "max": 12},
            guards(self.actions["FixSurfaces"]),
        )
        self.assertEqual(
            invariants(self.spec)["FixRoundsBounded"]["assert"],
            "revision_rounds <= 12",
        )
        self.assertIn("SeenBeforeSubmit", invariants(self.spec))
        self.assertIn("OneLanguageOneSubmit", invariants(self.spec))
        self.assertIn("LanguageHasEveryPart", invariants(self.spec))

    def test_cedar_permit_enumerates_every_input_action(self):
        policy = (POLICIES / "curator_agent.cedar").read_text()
        for name, action in self.actions.items():
            if action.get("kind") == "input":
                self.assertIn(f'Action::"{name}"', policy, name)


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

    def test_accept_submission_requires_the_language_under_review(self):
        cross = [
            g
            for g in guards(self.actions["AcceptSubmission"])
            if g.get("type") == "cross_entity_state"
        ]
        self.assertEqual(cross[0]["entity_type"], "DesignLanguage")
        self.assertEqual(cross[0]["required_status"], ["UnderReview"])
        self.assertTrue(cross[0].get("required"))

    def test_the_review_agent_has_no_publish_action(self):
        for name in self.actions:
            self.assertNotIn("publish", name.lower(), f"{name} is a publish action")

    def test_capture_identity_is_recorded_on_the_review(self):
        params = self.actions["RecordSubmissionRef"]["params"]
        for field in ("session_id", "trajectory_id", "spec_version", "harness"):
            self.assertIn(field, params)

    def test_verdict_requires_the_examination(self):
        required = {
            "artifacts_fetched",
            "design_md_opened",
            "landing_opened",
            "embodiment_opened",
            "dashboard_opened",
            "shadcn_opened",
            "thumbnail_opened",
            "landing_inspected",
            "embodiment_inspected",
            "dashboard_inspected",
            "hero_verified",
            "art_style_verified",
            "rules_checked",
            "claims_checked",
        }
        got = {g["var"] for g in guards(self.actions["RecordVerdict"]) if g.get("type") == "is_true"}
        self.assertTrue(required <= got)

    def test_repair_rounds_are_bounded(self):
        self.assertIn(
            {"type": "max_count", "var": "repair_rounds", "max": 6},
            guards(self.actions["RecordRepair"]),
        )

    def test_cedar_permit_enumerates_every_input_action(self):
        policy = (POLICIES / "review_agent.cedar").read_text()
        for name, action in self.actions.items():
            if action.get("kind") == "input":
                self.assertIn(f'Action::"{name}"', policy, name)


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
        self.assertIn({"type": "is_true", "var": "has_publish_approval"}, publish_guards)
        self.assertIn(
            {
                "type": "cross_entity_state",
                "entity_type": "ReviewAgent",
                "entity_id_source": "review_agent_id",
                "required_status": ["VerdictRecorded"],
                # Without `required`, the kernel resolves this guard over an
                # ABSENT review_agent_id as vacuously true, so an assignment
                # that linked no review at all published as though one had
                # happened.
                "required": True,
            },
            publish_guards,
        )

    def test_the_publish_hint_admits_what_the_guard_cannot_check(self):
        # The kernel compares a related entity's status, not its fields, so
        # nothing ties the linked review to THIS submission. A hint that
        # claimed otherwise would be the documentation asserting a guarantee
        # the machine does not provide.
        hint = self.actions["Publish"].get("hint", "")
        self.assertIn("NOT MACHINE-CHECKED", hint)
        self.assertIn("reviewed_submission_ids", hint)
        self.assertIn(
            "reviewed_submission_ids",
            {v["name"] for v in self.spec.get("state", [])},
        )

    def test_publish_is_reachable_only_from_reviewing_and_only_once(self):
        self.assertEqual(self.actions["Publish"]["from"], ["Reviewing"])
        self.assertEqual(self.actions["ApprovePublish"]["from"], ["Reviewing"])
        self.assertEqual(
            invariants(self.spec)["PublishedIsFinal"]["assert"],
            "no_further_transitions",
        )
        self.assertEqual(
            invariants(self.spec)["HumanDecidesPublish"]["assert"],
            "has_publish_approval && has_review_verdict",
        )
        self.assertEqual(
            invariants(self.spec)["CritiqueReopens"]["assert"],
            "no_further_transitions",
        )
        self.assertIn("OneHolder", invariants(self.spec))

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

    def test_escalation_stops_after_three(self):
        bound = {"type": "max_count", "var": "escalation_count", "max": 3}
        self.assertIn(bound, guards(self.actions["ReviewOverdue"]))
        self.assertIn(bound, guards(self.actions["Reassign"]))
        self.assertEqual(
            invariants(self.spec)["EscalationLoopBounded"]["assert"],
            "escalation_count <= 3",
        )

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

    def test_every_policy_file_is_mirrored_byte_for_byte(self):
        """Both copies are loaded, so a change to one of them is half a change.

        The per-spec check above only looks at the four actor policies, and the
        gap cost a merged fix: f0451470 set out to "remove dead launch_research
        permits from wasm.cedar", edited specs/policies/wasm.cedar, and left
        policies/wasm.cedar granting them — reviewed, merged, half applied.
        Which copy a tenant loads depends on the install path, so a reader of
        either one cannot tell what is actually enforced.
        """
        mirror = POLICIES.parent / "specs" / "policies"
        primaries = sorted(p.name for p in POLICIES.glob("*.cedar"))
        mirrored = sorted(p.name for p in mirror.glob("*.cedar"))
        self.assertEqual(
            primaries,
            mirrored,
            "these two directories do not hold the same policy files, so the "
            "policy set a tenant gets depends on which one it loaded",
        )
        for name in primaries:
            self.assertEqual(
                (POLICIES / name).read_text(),
                (mirror / name).read_text(),
                f"{name}: the two copies have diverged",
            )

    def test_reading_recorded_agent_content_is_an_allowlist_not_a_default(self):
        # ARN-295: the conformance and ATIF endpoints ask Cedar for
        # `read_trajectories` on `Trajectory` and carry no principal-kind
        # bypass, so without this policy both answer 403 to every caller.
        policy = (POLICIES / "trajectory.cedar").read_text()
        self.assertIn('Action::"read_trajectories"', policy)
        self.assertIn("resource is Trajectory", policy)
        self.assertIn('principal == Agent::"katagami-judge"', policy)
        # The judge skill runs under exactly that principal, and documents the
        # 403 an operator sees when the permit is absent.
        judge = (
            CURATION_ROOT.parent / "mcp" / "skills" / "katagami-judge" / "SKILL.md"
        ).read_text()
        self.assertIn("x-temper-principal-id: katagami-judge", judge)
        self.assertIn("read_trajectories", judge)

    def test_no_agent_principal_may_publish_on_the_role_record(self):
        policy = (POLICIES / "human_curator.cedar").read_text()
        self.assertIn('forbid(', policy)
        self.assertIn('Action::"ApprovePublish"', policy)
        self.assertIn('Action::"Publish"', policy)
        self.assertIn('Action::"ReturnWithCritique"', policy)
        self.assertIn("has_publish_approval", policy)
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
