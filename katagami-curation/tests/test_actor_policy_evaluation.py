"""Cedar decisions for the actor records, evaluated rather than grepped (ARN-294).

`test_actor_spec_contract.py` asserts the policy TEXT says what it should. That
catches a deleted clause and misses a clause that reads correctly and decides
the opposite. These tests run the policies through Cedar and assert the
decisions, on requests shaped the way the server builds them: the principal
carries `id`, `agent_type` and `role`; the resource carries the entity's state
fields, which is where `assignee_ref` comes from
(`temper-server/src/state/entity_ops.rs::load_authz_resource_snapshot`).

Requires the Cedar bindings, which are not a runtime dependency of this repo:

    pip install cedarpy

Without them the module skips, in the same way the Harbor conversion tests do.
"""

import unittest
from pathlib import Path

try:
    import cedarpy
except ImportError:  # pragma: no cover - exercised by skipping
    cedarpy = None

POLICIES = Path(__file__).resolve().parents[1] / "policies"


def policy(name):
    return (POLICIES / f"{name}.cedar").read_text()


def entity(uid_type, uid_id, attrs):
    return {
        "uid": {"type": uid_type, "id": uid_id},
        "attrs": attrs,
        "parents": [],
    }


@unittest.skipUnless(cedarpy is not None, "cedarpy not installed (pip install cedarpy)")
class ActorPolicyDecisionTest(unittest.TestCase):
    def decide(self, policy_name, *, principal, action, resource, resource_attrs=None):
        principal_type, principal_id, principal_attrs = principal
        resource_type, resource_id = resource
        attrs = {"id": resource_id, **(resource_attrs or {})}
        entities = [
            entity(principal_type, principal_id, {"id": principal_id, **principal_attrs}),
            entity(resource_type, resource_id, attrs),
        ]
        result = cedarpy.is_authorized(
            {
                "principal": {"type": principal_type, "id": principal_id},
                "action": {"type": "Action", "id": action},
                "resource": {"type": resource_type, "id": resource_id},
                "context": {},
            },
            policy(policy_name),
            entities,
        )
        return result.decision

    def assertAllowed(self, *args, **kwargs):
        self.assertEqual(self.decide(*args, **kwargs), cedarpy.Decision.Allow)

    def assertDenied(self, *args, **kwargs):
        self.assertEqual(self.decide(*args, **kwargs), cedarpy.Decision.Deny)

    # --- HumanCurator: publishing is the assigned human's -----------------

    HOLDER = ("Customer", "member-alice", {})
    OTHER_HUMAN = ("Customer", "member-bob", {})
    CONTRIBUTOR = ("Agent", "katagami-contributor", {"agent_type": "contributor"})
    OTHER_AGENT = ("Agent", "some-pipeline", {"agent_type": "operations"})
    ANONYMOUS = ("Customer", "anonymous", {})

    def _assignment(self, assignee="member-alice"):
        return {
            "resource": ("HumanCurator", "assign-1"),
            "resource_attrs": {"assignee_ref": assignee, "status": "Reviewing"},
        }

    def test_the_assigned_holder_may_publish(self):
        self.assertAllowed(
            "human_curator", principal=self.HOLDER, action="Publish", **self._assignment()
        )

    def test_another_authenticated_human_may_not_publish_someone_elses_assignment(self):
        self.assertDenied(
            "human_curator",
            principal=self.OTHER_HUMAN,
            action="Publish",
            **self._assignment(),
        )

    def test_an_assignment_with_no_holder_is_not_publishable(self):
        self.assertDenied(
            "human_curator",
            principal=self.HOLDER,
            action="Publish",
            **self._assignment(assignee=""),
        )

    def test_no_agent_publishes_even_as_the_named_holder(self):
        for agent in (self.CONTRIBUTOR, self.OTHER_AGENT):
            self.assertDenied(
                "human_curator",
                principal=agent,
                action="Publish",
                **self._assignment(assignee=agent[1]),
            )

    def test_returning_with_critique_is_bound_the_same_way(self):
        self.assertAllowed(
            "human_curator",
            principal=self.HOLDER,
            action="ReturnWithCritique",
            **self._assignment(),
        )
        self.assertDenied(
            "human_curator",
            principal=self.OTHER_HUMAN,
            action="ReturnWithCritique",
            **self._assignment(),
        )

    def test_assigning_is_still_open_to_the_pipeline(self):
        # The binding covers the two decisions that are the human's; routing
        # work to the role is not one of them.
        self.assertAllowed(
            "human_curator",
            principal=self.OTHER_AGENT,
            action="AssignSubmission",
            **self._assignment(),
        )

    def test_a_contributor_cannot_touch_the_role_record_at_all(self):
        self.assertDenied(
            "human_curator",
            principal=self.CONTRIBUTOR,
            action="AssignSubmission",
            **self._assignment(),
        )

    def test_an_unauthenticated_caller_is_nobody(self):
        self.assertDenied(
            "human_curator",
            principal=self.ANONYMOUS,
            action="AssignSubmission",
            **self._assignment(),
        )

    # --- ReviewAgent: the verdict is the reviewer's -----------------------

    REVIEW = {"resource": ("ReviewAgent", "review-1"), "resource_attrs": {"status": "Reviewing"}}

    def test_the_review_role_records_the_verdict(self):
        self.assertAllowed(
            "review_agent",
            principal=("Agent", "katagami-reviewer", {"agent_type": "reviewer"}),
            action="RecordVerdict",
            **self.REVIEW,
        )

    def test_the_pipeline_may_record_it_too(self):
        self.assertAllowed(
            "review_agent",
            principal=("Agent", "system", {}),
            action="RecordVerdict",
            **self.REVIEW,
        )

    def test_nobody_else_records_a_review_verdict(self):
        for principal in (self.CONTRIBUTOR, self.OTHER_AGENT, self.HOLDER):
            self.assertDenied(
                "review_agent",
                principal=principal,
                action="RecordVerdict",
                **self.REVIEW,
            )

    def test_findings_are_bound_the_same_way_as_the_verdict(self):
        self.assertDenied(
            "review_agent",
            principal=self.OTHER_AGENT,
            action="RecordFinding",
            **self.REVIEW,
        )

    def test_reading_a_review_stays_open(self):
        self.assertAllowed(
            "review_agent", principal=self.OTHER_AGENT, action="BeginReview", **self.REVIEW
        )

    # --- TrajectoryVerdict: only the judge writes a verdict ---------------

    VERDICT = {
        "resource": ("TrajectoryVerdict", "verdict-1"),
        "resource_attrs": {"status": "Pending"},
    }

    def test_the_judge_records_a_verdict(self):
        self.assertAllowed(
            "trajectory_verdict",
            principal=("Agent", "katagami-judge", {"agent_type": "judge"}),
            action="Record",
            **self.VERDICT,
        )

    def test_an_admin_cannot_fabricate_a_verdict(self):
        self.assertDenied(
            "trajectory_verdict",
            principal=("Admin", "ops-1", {}),
            action="Record",
            **self.VERDICT,
        )

    def test_the_judged_agent_cannot_write_its_own_verdict(self):
        self.assertDenied(
            "trajectory_verdict",
            principal=self.CONTRIBUTOR,
            action="Record",
            **self.VERDICT,
        )

    # --- CuratorAgent: its own ledger, but not anonymously ----------------

    RUN = {"resource": ("CuratorAgent", "run-1"), "resource_attrs": {"status": "Drafting"}}

    def test_the_curator_writes_its_own_ledger(self):
        self.assertAllowed(
            "curator_agent", principal=self.CONTRIBUTOR, action="RecordDraft", **self.RUN
        )

    def test_an_unauthenticated_caller_writes_no_ledger(self):
        self.assertDenied(
            "curator_agent", principal=self.ANONYMOUS, action="RecordDraft", **self.RUN
        )


if __name__ == "__main__":
    unittest.main()
