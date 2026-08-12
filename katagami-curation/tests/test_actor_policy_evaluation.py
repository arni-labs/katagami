"""Cedar decisions for the actor records, evaluated rather than grepped (ARN-294).

`test_actor_spec_contract.py` asserts the policy TEXT says what it should. That
catches a deleted clause and misses a clause that reads correctly and decides
the opposite. These tests run the policies through Cedar and assert the
decisions, on requests shaped the way the server builds them: the principal
carries `id`, `agent_type` and `role`; the resource carries the entity's state
fields, which is where `assignee_ref` comes from
(`temper-server/src/state/entity_ops.rs::load_authz_resource_snapshot`).

Requires the Cedar bindings. They ARE a dev dependency of this repo
(`tests/requirements-dev.txt`), installed by the `make test-integration`
entrypoint, and a missing interpreter is a FAILURE rather than a skip.

That distinction matters more here than anywhere else in the suite. These are
the only tests that evaluate the authorization policies rather than grepping
their text, so a silent skip means the publish boundary, the escalation
allowlist, and the judge binding all go unchecked while the run still reports
green — which is exactly how a policy regression reaches production looking
reviewed.

    make test-integration            # installs the dep, then runs everything
    pip install -r tests/requirements-dev.txt   # or install it yourself
"""

import unittest
from pathlib import Path

try:
    import cedarpy
except ImportError:  # pragma: no cover - exercised by the failure below
    cedarpy = None

POLICIES = Path(__file__).resolve().parents[1] / "policies"

MISSING_CEDAR = (
    "cedarpy is not installed, so the Cedar policies were NOT evaluated. These "
    "tests are the only check that the policies decide what their text says; "
    "skipping them silently is how a publish-boundary regression ships. Install "
    "the dev dependencies:\n"
    "    pip install -r katagami-curation/tests/requirements-dev.txt\n"
    "or run the repo entrypoint, which does it for you:\n"
    "    make -C katagami-curation test-integration"
)


def policy(name):
    return (POLICIES / f"{name}.cedar").read_text()


def entity(uid_type, uid_id, attrs):
    return {
        "uid": {"type": uid_type, "id": uid_id},
        "attrs": attrs,
        "parents": [],
    }


class CedarBindingsTest(unittest.TestCase):
    """The interpreter itself is the first assertion, not a precondition."""

    def test_the_cedar_bindings_are_installed(self):
        self.assertIsNotNone(cedarpy, MISSING_CEDAR)


class TestsLeaveTheRealArchiveAloneTest(unittest.TestCase):
    """No test may write into the operator's own capture archive.

    A test that forgot to redirect one store wrote fabricated spec attestations
    — a digest of all `f`s, attributed to a server that does not exist — into
    `~/.katagami/trajectory-queue/`, where the next real capture would have read
    them back as provenance. Nothing about that was visible from the test's own
    output: it passed.

    Checked here rather than in the capture tests because it is a property of
    the whole suite, and because the test that caused it was the one that would
    have had to notice.
    """

    ARCHIVE = Path.home() / ".katagami" / "trajectory-queue"

    def test_the_suite_planted_no_spec_attestations(self):
        attestations = self.ARCHIVE / "spec-attestations"
        planted = (
            sorted(p.name for p in attestations.glob("*.json"))
            if attestations.is_dir()
            else []
        )
        self.assertEqual(
            planted,
            [],
            "these files are in the REAL capture archive. A test that does not redirect "
            "KATAGAMI_SPEC_ATTESTATION_DIR and KATAGAMI_TRAJECTORY_QUEUE wrote them, and a "
            "real capture would read them back as provenance: " + ", ".join(planted),
        )


class TestsActuallyRunTest(unittest.TestCase):
    """A test that cannot run is not a passing test — the same rule as above.

    Two methods with one name in a class is the quiet version: Python keeps the
    second and the first never executes, so the assertion it was written to make
    silently stops being made while the suite still reports green. Checked
    across the whole suite because it is a typo, and typos are not confined to
    one file.
    """

    def test_no_test_method_name_is_defined_twice_in_a_class(self):
        import ast

        duplicates = []
        for path in sorted(Path(__file__).resolve().parent.glob("test_*.py")):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if not isinstance(node, ast.ClassDef):
                    continue
                seen = set()
                for item in node.body:
                    if not isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        continue
                    if not item.name.startswith("test"):
                        continue
                    if item.name in seen:
                        duplicates.append(
                            f"{path.name}:{item.lineno} {node.name}.{item.name}"
                        )
                    seen.add(item.name)
        self.assertEqual(
            duplicates,
            [],
            "these test methods are shadowed by a later definition and never run: "
            + ", ".join(duplicates),
        )


class ActorPolicyDecisionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Not skipUnless: a skip reports green for policies nobody evaluated.
        if cedarpy is None:
            raise AssertionError(MISSING_CEDAR)

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

    # --- HumanCurator: escalation is not a route around the binding ---

    ESCALATION = ("Agent", "katagami-curation-escalation", {"agent_type": "operations"})
    SYSTEM = ("Agent", "system", {})

    def _escalated(self, assignee="member-alice"):
        return {
            "resource": ("HumanCurator", "assign-1"),
            "resource_attrs": {"assignee_ref": assignee, "status": "Escalated"},
        }

    def test_the_platform_and_the_escalation_role_may_raise_an_overdue(self):
        for principal in (self.SYSTEM, self.ESCALATION):
            self.assertAllowed(
                "human_curator",
                principal=principal,
                action="ReviewOverdue",
                **self._assignment(),
            )

    def test_the_holder_may_say_they_cannot_get_to_it(self):
        self.assertAllowed(
            "human_curator",
            principal=self.HOLDER,
            action="ReviewOverdue",
            **self._assignment(),
        )

    def test_a_bystander_cannot_escalate_someone_elses_assignment(self):
        for principal in (self.OTHER_HUMAN, self.OTHER_AGENT):
            self.assertDenied(
                "human_curator",
                principal=principal,
                action="ReviewOverdue",
                **self._assignment(),
            )

    def test_only_the_escalation_allowlist_reassigns(self):
        for principal in (self.SYSTEM, self.ESCALATION):
            self.assertAllowed(
                "human_curator",
                principal=principal,
                action="Reassign",
                **self._escalated(),
            )

    def test_a_bystander_cannot_reassign_work_to_themselves(self):
        # The two-step bypass: reassign the record to yourself, then publish,
        # since Publish is bound to whoever assignee_ref names.
        for principal in (self.OTHER_HUMAN, self.OTHER_AGENT, self.HOLDER):
            self.assertDenied(
                "human_curator",
                principal=principal,
                action="Reassign",
                **self._escalated(),
            )

    def test_an_action_outside_the_human_curator_alphabet_is_denied(self):
        # A blanket `permit(principal, action, ...)` would allow this, and
        # would allow every action added to the spec after this policy.
        self.assertDenied(
            "human_curator",
            principal=self.SYSTEM,
            action="SomeActionAddedLater",
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

    def test_the_lifecycle_actions_are_admitted_by_name(self):
        for action in ("ReceiveSubmission", "BeginReview", "Abandon"):
            self.assertAllowed(
                "review_agent", principal=self.OTHER_AGENT, action=action, **self.REVIEW
            )

    def test_an_action_outside_the_review_alphabet_is_denied(self):
        # The bug this replaces: `permit(principal, action, ...)` left every
        # transition the forbids did not name globally writable, including any
        # action added to review_agent.ioa.toml later.
        for action in ("SomeActionAddedLater", "ReviewVerdictRecordedEvent"):
            self.assertDenied(
                "review_agent", principal=self.OTHER_AGENT, action=action, **self.REVIEW
            )

    # --- CuratorAgent / TrajectoryVerdict: same default closed ------------

    def test_the_curator_alphabet_is_admitted_by_name(self):
        for action in ("ReceiveBrief", "SelfReview", "SubmitDesignLanguages"):
            self.assertAllowed(
                "curator_agent",
                principal=self.CONTRIBUTOR,
                action=action,
                **{"resource": ("CuratorAgent", "run-1"), "resource_attrs": {}},
            )

    def test_an_unknown_curator_action_is_denied(self):
        self.assertDenied(
            "curator_agent",
            principal=self.CONTRIBUTOR,
            action="Publish",
            **{"resource": ("CuratorAgent", "run-1"), "resource_attrs": {}},
        )

    def test_an_unknown_verdict_action_is_denied(self):
        self.assertDenied(
            "trajectory_verdict",
            principal=("Agent", "katagami-judge", {"agent_type": "judge"}),
            action="Amend",
            **self.VERDICT,
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
