"""ARN-315: the commons authorization boundary, evaluated rather than grepped.

Every commons policy base-grants its entity (`permit(principal, action, …)`)
and then narrows it with forbids. The bug this suite exists to prevent is a
forbid that narrows only *some* callers: the artifact policies gated the
advancement/curator actions (Publish, Archive, update/delete) but left the
authoring actions (SetName, SetTokens, SubmitForReview, …) on the base grant,
so any signed-in Customer — including one who is not the creator — could edit
or submit another contributor's draft, and rewrite the credits/provenance of a
published artifact. `feedback_response` was a bare `permit(principal, action)`
with no forbid at all.

The invariant, asserted generically over every commons entity so a new entity
or a loosened policy fails here rather than in production:

  * a Customer who is NOT the creator (and an anonymous Customer with no role)
    is DENIED every state-mutating action — reads and system-emitted `*Event`
    actions stay open;
  * the pipeline (a service agent) is still ALLOWED every mutating action, so
    the boundary does not cost the contribution flow it exists to admit;
  * no commons policy is a bare `permit` with no forbid.

These evaluate the Cedar policies through the interpreter, on requests shaped
the way `temper-server` builds them (the principal carries `id`, `agent_type`
and `role`; the resource carries `creator_sub`/`status`). A silent skip when
cedarpy is absent is a FAILURE, not a pass — see the sibling
`test_actor_policy_evaluation.py` for why that distinction is load-bearing.

    make -C katagami-curation test-integration      # installs cedarpy, runs it
    pip install -r katagami-curation/tests/requirements-dev.txt
"""

import re
import tomllib
import unittest
from pathlib import Path

try:
    import cedarpy
except ImportError:  # pragma: no cover - exercised by the failure below
    cedarpy = None

COMMONS = Path(__file__).resolve().parents[2] / "katagami-commons"
POLICIES = COMMONS / "policies"
SPECS = COMMONS / "specs"

MISSING_CEDAR = (
    "cedarpy is not installed, so the commons policies were NOT evaluated. "
    "These are the only check that the artifact boundary denies a non-creator "
    "Customer; skipping them silently is how the ARN-315 authoring hole reships. "
    "Install the dev dependencies:\n"
    "    pip install -r katagami-curation/tests/requirements-dev.txt\n"
    "or run the repo entrypoint, which does it for you:\n"
    "    make -C katagami-curation test-integration"
)

# Actions that read or are emitted by the state machine — never an attack
# surface, so the boundary leaves them open. Everything else mutates state.
READ_ACTIONS = {"read", "get", "list", "query"}

# The generic OData verbs bypass the named-action ladder: a PATCH/DELETE/POST
# authorizes as lowercase create/update/delete, matching no `[[action]]` name.
# They exist for every entity, so testing them means no entity can vacuously
# pass this suite by exposing no parseable named actions.
GENERIC_MUTATIONS = ("create", "update", "delete")


def policy_text(name):
    return (POLICIES / f"{name}.cedar").read_text()


def resource_type(text):
    m = re.search(r"resource is (\w+)", text)
    return m.group(1) if m else None


def named_actions(entity):
    # Parse the TOML rather than grep it: a `[[action]]` block that lists
    # `from = [...]` before `name` defeats a regex that stops at the first `[`,
    # and a silently-empty action list turns every deny assertion vacuous.
    spec = SPECS / f"{entity}.ioa.toml"
    if not spec.exists():
        return []
    with spec.open("rb") as f:
        data = tomllib.load(f)
    return [a["name"] for a in data.get("action", []) if "name" in a]


# A Customer legitimately CREATES their own record here: saving a remix is a
# signed-in human minting their own token (remix.cedar creator-scopes every
# action after create). Every other commons entity is created by the pipeline
# or a curator, never by an ordinary Customer — so `create` is denied there too.
CUSTOMER_MAY_CREATE = {"remix"}


def mutating_actions(entity):
    named = [
        a
        for a in named_actions(entity)
        if a.lower() not in READ_ACTIONS and not a.endswith("Event")
    ]
    generic = [
        a
        for a in GENERIC_MUTATIONS
        if not (a == "create" and entity in CUSTOMER_MAY_CREATE)
    ]
    return named + generic


def entity(uid_type, uid_id, attrs):
    return {"uid": {"type": uid_type, "id": uid_id}, "attrs": attrs, "parents": []}


def decide(text, rtype, action, principal, attrs, resource_attrs=None, context=None):
    entities = [
        entity(principal, "p1", {"id": "p1", **attrs}),
        entity(rtype, "r1", {"id": "r1", **(resource_attrs or {})}),
    ]
    return cedarpy.is_authorized(
        {
            "principal": {"type": principal, "id": "p1"},
            "action": {"type": "Action", "id": action},
            "resource": {"type": rtype, "id": "r1"},
            "context": context or {},
        },
        text,
        entities,
    ).decision


def commons_entities():
    return sorted(p.stem for p in POLICIES.glob("*.cedar"))


# Artifact entities carry a human contribution flow: a creator authors their own
# draft. The other commons policies (identity substrate, feedback) admit no human
# author at all, so they are exercised only by the generic deny/allow invariants.
ARTIFACTS = ("design_language", "art_style", "palette_system")


class CedarBindingsInstalled(unittest.TestCase):
    def test_bindings_present(self):
        self.assertIsNotNone(cedarpy, MISSING_CEDAR)


class CommonsAuthzConformance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if cedarpy is None:
            raise AssertionError(MISSING_CEDAR)

    def test_no_policy_is_a_bare_permit_without_a_forbid(self):
        # A base grant with no forbid is `feedback_response` before ARN-315:
        # everyone, every action. Every commons policy must narrow its grant.
        for name in commons_entities():
            text = policy_text(name)
            self.assertRegex(
                text,
                r"permit\(principal,\s*action,\s*resource is",
                f"{name}: expected the commons base-grant shape",
            )
            self.assertRegex(
                text,
                r"forbid\(",
                f"{name}: base-grants its entity with no forbid — every "
                f"principal is allowed every action (the ARN-315 class)",
            )

    def test_every_entity_enumerates_named_actions(self):
        # A parse regression (or a spec layout the enumerator can't read) would
        # leave an entity with no named actions, and the deny assertions below
        # would pass vacuously. Every commons entity that has a spec must expose
        # at least one named action here, so that failure is loud.
        for name in commons_entities():
            if not (SPECS / f"{name}.ioa.toml").exists():
                continue
            self.assertTrue(
                named_actions(name),
                f"{name}: zero named actions parsed — the deny checks below would "
                f"pass vacuously; the enumerator is broken",
            )

    def test_a_non_creator_customer_is_denied_every_mutation(self):
        # The core invariant. A signed-in human who is not the creator of the
        # record (role=contributor, the default) gets nothing that mutates.
        for name in commons_entities():
            text = policy_text(name)
            rtype = resource_type(text)
            self.assertIsNotNone(rtype, f"{name}: no `resource is` type")
            for action in mutating_actions(name):
                self.assertEqual(
                    decide(
                        text,
                        rtype,
                        action,
                        "Customer",
                        {"role": "contributor"},
                        {"creator_sub": "someone-else"},
                    ),
                    cedarpy.Decision.Deny,
                    f"{name}.{action}: a non-creator Customer was ALLOWED to mutate",
                )

    def test_an_anonymous_customer_is_denied_every_mutation(self):
        for name in commons_entities():
            text = policy_text(name)
            rtype = resource_type(text)
            for action in mutating_actions(name):
                self.assertEqual(
                    decide(
                        text,
                        rtype,
                        action,
                        "Customer",
                        {},
                        {"creator_sub": "someone-else"},
                    ),
                    cedarpy.Decision.Deny,
                    f"{name}.{action}: an anonymous Customer was ALLOWED to mutate",
                )

    def test_a_service_agent_keeps_every_mutation(self):
        # The boundary must not cost the pipeline the flow it exists to admit.
        for name in commons_entities():
            text = policy_text(name)
            rtype = resource_type(text)
            for action in mutating_actions(name):
                self.assertEqual(
                    decide(text, rtype, action, "Agent", {"agent_type": "operator"}),
                    cedarpy.Decision.Allow,
                    f"{name}.{action}: the pipeline (operator) was DENIED",
                )


class ArtifactContributionBoundary(unittest.TestCase):
    """The artifact allow-side: a creator authors their own draft, but never
    advances or reattributes it, and reads stay public."""

    @classmethod
    def setUpClass(cls):
        if cedarpy is None:
            raise AssertionError(MISSING_CEDAR)

    # (authoring action a creator legitimately makes, a curator-only action,
    #  an attribution action reachable from Published)
    PROBES = {
        "design_language": ("SetName", "Publish", "SetCredits"),
        "art_style": ("SetName", "Publish", "SetCredits"),
        "palette_system": ("SetName", "Publish", "SetCredits"),
    }

    def test_creator_authors_own_draft(self):
        for name in ARTIFACTS:
            text = policy_text(name)
            rtype = resource_type(text)
            authoring = self.PROBES[name][0]
            self.assertEqual(
                decide(
                    text,
                    rtype,
                    authoring,
                    "Customer",
                    {"role": "contributor"},
                    {"creator_sub": "p1"},
                ),
                cedarpy.Decision.Allow,
                f"{name}.{authoring}: the creator was DENIED authoring their own record",
            )

    def test_creator_cannot_advance_or_reattribute_own_record(self):
        for name in ARTIFACTS:
            text = policy_text(name)
            rtype = resource_type(text)
            _, curator_action, attribution = self.PROBES[name]
            for action in (curator_action, attribution):
                self.assertEqual(
                    decide(
                        text,
                        rtype,
                        action,
                        "Customer",
                        {"role": "contributor"},
                        {"creator_sub": "p1", "status": "Published"},
                    ),
                    cedarpy.Decision.Deny,
                    f"{name}.{action}: the creator reached a curator/attribution action",
                )

    def test_owner_may_act_and_reads_stay_open(self):
        for name in ARTIFACTS:
            text = policy_text(name)
            rtype = resource_type(text)
            self.assertEqual(
                decide(text, rtype, "Publish", "Customer", {"role": "owner"}),
                cedarpy.Decision.Allow,
                f"{name}: owner was DENIED a curator action",
            )
            self.assertEqual(
                decide(text, rtype, "read", "Customer", {"role": "contributor"}),
                cedarpy.Decision.Allow,
                f"{name}: a public read was DENIED",
            )


class FeedbackResponseBoundary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if cedarpy is None:
            raise AssertionError(MISSING_CEDAR)

    def test_only_service_and_owner_curator_touch_feedback(self):
        text = policy_text("feedback_response")
        rtype = "FeedbackResponse"
        for action in ("SetAnswers", "Submit", "read", "create"):
            self.assertEqual(
                decide(text, rtype, action, "Customer", {"role": "contributor"}),
                cedarpy.Decision.Deny,
                f"feedback_response.{action}: a Customer reached it directly",
            )
            self.assertEqual(
                decide(text, rtype, action, "Customer", {}),
                cedarpy.Decision.Deny,
                f"feedback_response.{action}: an anonymous Customer reached it",
            )
            self.assertEqual(
                decide(text, rtype, action, "Agent", {"agent_type": "operator"}),
                cedarpy.Decision.Allow,
                f"feedback_response.{action}: the server action (operator) was DENIED",
            )
        self.assertEqual(
            decide(text, rtype, "read", "Customer", {"role": "owner"}),
            cedarpy.Decision.Allow,
            "feedback_response.read: owner was DENIED",
        )


if __name__ == "__main__":
    unittest.main()
