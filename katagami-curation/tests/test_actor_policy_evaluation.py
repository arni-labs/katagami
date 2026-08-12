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

import os
import re
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


COMMONS_POLICIES = POLICIES.parent.parent / "katagami-commons" / "policies"


def policy(name):
    return (POLICIES / f"{name}.cedar").read_text()


def commons_policy(name):
    return (COMMONS_POLICIES / f"{name}.cedar").read_text()


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


class CommonsPolicyDecisionTest(unittest.TestCase):
    """The artifact-side boundary, evaluated rather than assumed (ARN-302).

    Every commons policy that excluded contributors did it with
    `principal has agent_type && principal.agent_type == "contributor"`. The
    agent-type header is OPTIONAL, so that clause asked the caller whether it
    would like the rule applied to it: an Agent that sent no agent type failed
    the `has` test and was ALLOWED to publish a design language.

    The fix mirrors the curation side — an agent that will not declare its type
    gets nothing on the gated actions — and these probes are the evidence, one
    per commons resource that has a boundary at all.
    """

    @classmethod
    def setUpClass(cls):
        if cedarpy is None:
            raise AssertionError(MISSING_CEDAR)

    def decide(self, policy_name, *, action, resource_type, agent_id="some-agent", attrs=None):
        entities = [
            entity("Agent", agent_id, {"id": agent_id, **(attrs or {})}),
            entity(resource_type, "r1", {"id": "r1"}),
        ]
        return cedarpy.is_authorized(
            {
                "principal": {"type": "Agent", "id": agent_id},
                "action": {"type": "Action", "id": action},
                "resource": {"type": resource_type, "id": "r1"},
                "context": {},
            },
            commons_policy(policy_name),
            entities,
        ).decision

    # policy file, resource type, an action behind the boundary, an authoring
    # action a contributor agent legitimately performs.
    ARTIFACTS = (
        ("design_language", "DesignLanguage", "Publish", "Create"),
        ("art_style", "ArtStyle", "Publish", "SetLineage"),
        ("palette_system", "PaletteSystem", "Publish", "Create"),
        ("writing_style", "WritingStyle", "Publish", "Create"),
    )

    # Identity and consent substrate: contributors are excluded entirely.
    SUBSTRATE = (
        ("agent_grant", "AgentGrant"),
        ("member", "Member"),
        ("oauth_client", "OAuthClient"),
    )

    def test_an_undeclared_agent_cannot_publish_any_artifact(self):
        for name, resource_type, gated, _ in self.ARTIFACTS:
            self.assertEqual(
                self.decide(name, action=gated, resource_type=resource_type),
                cedarpy.Decision.Deny,
                f"{name}: an agent that declares no type published {resource_type}",
            )

    def test_a_declared_contributor_still_cannot_publish(self):
        for name, resource_type, gated, _ in self.ARTIFACTS:
            self.assertEqual(
                self.decide(
                    name,
                    action=gated,
                    resource_type=resource_type,
                    attrs={"agent_type": "contributor"},
                ),
                cedarpy.Decision.Deny,
                name,
            )

    def test_the_pipeline_finalizer_still_publishes(self):
        # The fix must not cost the principal the boundary exists to admit.
        for name, resource_type, gated, _ in self.ARTIFACTS:
            self.assertEqual(
                self.decide(
                    name, action=gated, resource_type=resource_type, agent_id="system"
                ),
                cedarpy.Decision.Allow,
                name,
            )

    def test_contributors_may_still_author(self):
        # The boundary is about advancing and publishing, not about making
        # things. Blanket-forbidding agents would have broken the pipeline.
        for name, resource_type, _, authoring in self.ARTIFACTS:
            for attrs in ({}, {"agent_type": "contributor"}):
                self.assertEqual(
                    self.decide(
                        name,
                        action=authoring,
                        resource_type=resource_type,
                        attrs=attrs,
                    ),
                    cedarpy.Decision.Allow,
                    f"{name}: {authoring} refused for attrs={attrs}",
                )

    def test_an_undeclared_agent_gets_nothing_on_identity_or_consent(self):
        # A grant is the human's kill switch over the agent; a Member record is
        # what every other boundary is written against.
        for name, resource_type in self.SUBSTRATE:
            for action in ("Read", "Revoke", "Update"):
                self.assertEqual(
                    self.decide(name, action=action, resource_type=resource_type),
                    cedarpy.Decision.Deny,
                    f"{name}: undeclared agent allowed {action}",
                )

    def test_a_declared_non_contributor_still_operates_the_substrate(self):
        for name, resource_type in self.SUBSTRATE:
            self.assertEqual(
                self.decide(
                    name,
                    action="Read",
                    resource_type=resource_type,
                    attrs={"agent_type": "operations"},
                ),
                cedarpy.Decision.Allow,
                name,
            )

    # Every principal shape that actually reaches these policies, read out of
    # the code that sends the headers. The point of the list is that the fix
    # must be invisible to all of them: it closes an omission, it does not
    # change who may publish.
    LIVE_PRINCIPALS = (
        # mcp/src/temper.ts — contributors act through the MCP.
        ("mcp contributor", "contrib:sub:client", {"agent_type": "contributor"}, False),
        # katagami-curation/wasm/*/src/lib.rs — the finalizer.
        ("wasm finalizer", "system", {"agent_type": "system"}, True),
        # scripts/backfill-shadcn-exports.mjs — not named `system`, declares one.
        ("shadcn backfill", "katagami-finalizer", {"agent_type": "system"}, True),
        # katagami-curation/tests/e2e/*.py — the lane drivers.
        ("e2e driver", "e2e-driver", {"agent_type": "system"}, True),
    )

    def test_the_pipeline_publishes_exactly_as_it_did_before(self):
        """The fix must be invisible to every principal that really exists.

        The pipeline agents legitimately publish languages on the artifact
        side; only contributor-typed agents are forbidden. So this is NOT the
        curation side's human-only rule, and it must never become one: what is
        pinned here is that each real principal still gets the decision its
        role requires, and that the only thing the fix took away was the
        caller that declined to say what it was.
        """
        for label, agent_id, attrs, expected_allow in self.LIVE_PRINCIPALS:
            for name, resource_type, gated, _ in self.ARTIFACTS:
                if name == "art_style" and agent_id != "system":
                    # ArtStyle's finalizer actions were system-only long before
                    # this fix, by a separate attribute-independent forbid.
                    continue
                self.assertEqual(
                    self.decide(
                        name,
                        action=gated,
                        resource_type=resource_type,
                        agent_id=agent_id,
                        attrs=attrs,
                    ),
                    cedarpy.Decision.Allow if expected_allow else cedarpy.Decision.Deny,
                    f"{label} on {resource_type}.{gated}: live behaviour changed",
                )

    def test_a_declared_pipeline_agent_is_never_excluded_by_type_alone(self):
        # The regression this guards against is someone later "hardening" these
        # into the curation side's `forbid(principal is Agent, action in
        # [Publish, ...])` with no `unless`. That reads as stricter and would
        # stop the pipeline publishing anything at all.
        for name, resource_type, gated, _ in self.ARTIFACTS:
            if name == "art_style":
                continue  # system-only by a separate, older rule
            self.assertEqual(
                self.decide(
                    name,
                    action=gated,
                    resource_type=resource_type,
                    agent_id="some-pipeline",
                    attrs={"agent_type": "operations"},
                ),
                cedarpy.Decision.Allow,
                f"{name}: a declared non-contributor agent must still publish",
            )

    # ARN-303: the entity types that had no boundary at all until a stance was
    # decided for each. (policy, resource type, a gated action, an authoring one)
    STANCED = (
        ("design_element", "DesignElement", "Verify", "Render"),
        ("direction", "Direction", "Close", "SetDirection"),
        ("element_manifest", "ElementManifest", "Activate", "SetElements"),
        ("remix", "Remix", "Archive", "SetSelection"),
        ("taxonomy", "Taxonomy", "Publish", "Define"),
    )

    # Deliberately open: every action on it is authoring. Named here so that
    # "no boundary" stays a decision somebody made rather than a gap.
    OPEN_BY_DESIGN = (("design_source", "DesignSource", "Index"),)

    def test_every_commons_entity_type_has_a_policy_with_a_declared_stance(self):
        """An entity with no policy file has no stance — it has an oversight.

        The types this covers were open to everything, not because anyone
        decided they should be, but because nobody had written the file.
        """
        specs = COMMONS_POLICIES.parent / "specs"
        entity_specs = sorted(p.name.replace(".ioa.toml", "") for p in specs.glob("*.ioa.toml"))
        self.assertTrue(entity_specs, "no commons entity specs found")

        missing, unstated = [], []
        for name in entity_specs:
            path = COMMONS_POLICIES / f"{name}.cedar"
            if not path.is_file():
                missing.append(name)
                continue
            if "STANCE:" not in path.read_text().splitlines()[0]:
                unstated.append(name)

        self.assertEqual(missing, [], f"commons entity types with no policy file: {missing}")
        self.assertEqual(
            unstated,
            [],
            "these policies do not declare a stance on their first line, so a "
            f"reader cannot tell open-by-design from nobody-decided: {unstated}",
        )

    def test_the_newly_stanced_types_refuse_undeclared_agents(self):
        for name, resource_type, gated, _ in self.STANCED:
            self.assertEqual(
                self.decide(name, action=gated, resource_type=resource_type),
                cedarpy.Decision.Deny,
                f"{name}: an undeclared agent was allowed {gated}",
            )

    def test_the_newly_stanced_types_refuse_declared_contributors(self):
        for name, resource_type, gated, _ in self.STANCED:
            self.assertEqual(
                self.decide(
                    name,
                    action=gated,
                    resource_type=resource_type,
                    attrs={"agent_type": "contributor"},
                ),
                cedarpy.Decision.Deny,
                name,
            )

    def test_the_newly_stanced_types_leave_authoring_open(self):
        # The pipeline must not notice this change. Authoring is what it does.
        for name, resource_type, _, authoring in self.STANCED:
            for attrs in ({}, {"agent_type": "contributor"}, {"agent_type": "system"}):
                self.assertEqual(
                    self.decide(
                        name, action=authoring, resource_type=resource_type, attrs=attrs
                    ),
                    cedarpy.Decision.Allow,
                    f"{name}: {authoring} refused for attrs={attrs}",
                )

    def test_the_prod_principals_are_unaffected_by_the_new_stances(self):
        for label, agent_id, attrs, _ in self.LIVE_PRINCIPALS:
            for name, resource_type, gated, authoring in self.STANCED:
                # Authoring is open to everyone, the contributor included.
                self.assertEqual(
                    self.decide(
                        name, action=authoring, resource_type=resource_type,
                        agent_id=agent_id, attrs=attrs,
                    ),
                    cedarpy.Decision.Allow,
                    f"{label}: {authoring} on {resource_type} refused",
                )
                # And every declared non-contributor still passes the gate.
                if attrs.get("agent_type") != "contributor":
                    self.assertEqual(
                        self.decide(
                            name, action=gated, resource_type=resource_type,
                            agent_id=agent_id, attrs=attrs,
                        ),
                        cedarpy.Decision.Allow,
                        f"{label}: {gated} on {resource_type} refused",
                    )

    def test_the_open_by_design_type_stays_open(self):
        # DesignSource is the research lane's own index. Gating it would slow
        # the pipeline and protect nothing, and the policy says so out loud.
        for name, resource_type, action in self.OPEN_BY_DESIGN:
            for attrs in ({}, {"agent_type": "contributor"}):
                self.assertEqual(
                    self.decide(name, action=action, resource_type=resource_type, attrs=attrs),
                    cedarpy.Decision.Allow,
                    name,
                )
            self.assertIn("open by design", commons_policy(name))

    def test_no_commons_policy_still_gates_only_on_the_attribute(self):
        # The generic form of the finding: a resource whose only agent
        # exclusion is `has agent_type` is a resource an agent can walk past.
        offenders = []
        for path in sorted(COMMONS_POLICIES.glob("*.cedar")):
            text = path.read_text()
            if "principal has agent_type" not in text:
                continue
            if "principal is Agent" not in text:
                offenders.append(path.name)
        self.assertEqual(
            offenders,
            [],
            "these commons policies exclude agents only by a self-declared "
            f"attribute, so omitting one optional header evades them: {offenders}",
        )

    def test_both_commons_policy_copies_stay_identical(self):
        mirror = COMMONS_POLICIES.parent / "specs" / "policies"
        for path in sorted(COMMONS_POLICIES.glob("*.cedar")):
            other = mirror / path.name
            self.assertTrue(other.is_file(), f"missing mirror: {other}")
            self.assertEqual(
                path.read_text(), other.read_text(), f"{path.name} mirrors diverged"
            )


class PlatformPermitDecisionTest(unittest.TestCase):
    """Permits this app needs on the KERNEL's own resources (ARN-295).

    Every other policy here governs an entity this app declares. These govern
    the platform actions the app's agents ask the kernel for — today one pair,
    `read_trajectories` on `Trajectory`, which gates the two endpoints layer 1
    of the judge is built on:

        POST /api/conformance/check
        GET  /api/ots/trajectories/<id>/atif

    Neither endpoint has a principal-kind bypass and the kernel ships no
    built-in permit for the pair, so an app that does not grant it gets 403 on
    both — which is how they shipped: reachable only after a policy rule was
    posted by hand at runtime, and not by anything a test could have caught.
    Hence `test_every_documented_platform_permit_is_granted` below, which is
    the general form of that failure.

    Decisions here are evaluated over the WHOLE policy set both apps load into
    the tenant, not one file, because that is what the kernel merges and
    because a permit is only as good as the forbids sitting next to it.
    """

    @classmethod
    def setUpClass(cls):
        if cedarpy is None:
            raise AssertionError(MISSING_CEDAR)

    REPO_ROOT = POLICIES.parent.parent

    # `permit for `action` on `Resource`` — the way the kernel's own denial
    # body and the skills that quote it state a required permit.
    DOCUMENTED_PERMIT = re.compile(
        r"permit for (?:action )?`([a-z_]+)` on (?:resource )?`([A-Za-z]\w*)`"
    )

    # Every platform permit this app depends on, and the principal that must
    # hold it. Adding a gated kernel endpoint to a skill means adding its pair
    # here and shipping the policy that grants it.
    PLATFORM_PERMITS = {
        ("read_trajectories", "Trajectory"): ("Agent", "katagami-judge", {"agent_type": "judge"}),
    }

    def tenant_policies(self):
        """Both apps' policies, concatenated the way the tenant loads them."""
        return "\n".join(
            path.read_text()
            for directory in (POLICIES, COMMONS_POLICIES)
            for path in sorted(directory.glob("*.cedar"))
        )

    def decide(self, principal, *, action="read_trajectories", resource_type="Trajectory"):
        """One request shaped the way the endpoint builds it.

        The resource carries NO attributes and its id is `unknown`: these
        endpoints pass an empty attribute map, so Cedar sees
        `Trajectory::"unknown"` and has nothing but the principal to decide on
        (temper-authz engine::evaluate_request, resource_id_from_attrs).

        `agentTypeVerified` is false, and not by omission. The endpoints build
        their context through `SecurityContext::with_agent_context`, which
        stamps it false on every request because the identity came off
        unauthenticated headers (ARN-255). A permit conditioned on it being
        true — the shape temper's own project-management app uses — would
        refuse every caller these endpoints can have.
        """
        principal_type, principal_id, attrs = principal
        entities = [
            entity(principal_type, principal_id, {"id": principal_id, **attrs}),
            {"uid": {"type": resource_type, "id": "unknown"}, "attrs": {}, "parents": []},
        ]
        return cedarpy.is_authorized(
            {
                "principal": {"type": principal_type, "id": principal_id},
                "action": {"type": "Action", "id": action},
                "resource": {"type": resource_type, "id": "unknown"},
                "context": {"agentTypeVerified": False},
            },
            self.tenant_policies(),
            entities,
        ).decision

    JUDGE = ("Agent", "katagami-judge", {"agent_type": "judge"})
    PLATFORM = ("Agent", "system", {})
    CONTRIBUTOR = ("Agent", "katagami-contributor", {"agent_type": "contributor"})
    REVIEWER = ("Agent", "katagami-reviewer", {"agent_type": "reviewer"})
    UNDECLARED_AGENT = ("Agent", "agent-sneaky", {})
    ADMIN = ("Admin", "ops-1", {})
    ANONYMOUS = ("Customer", "anonymous", {})
    E2E_DRIVER = ("Agent", "e2e-driver", {"agent_type": "system"})

    def test_the_judge_reads_the_run_it_is_judging(self):
        # The whole point of the permit: without this decision, layer 1 of the
        # two-layer judge cannot run in production at all.
        self.assertEqual(self.decide(self.JUDGE), cedarpy.Decision.Allow)

    def test_the_platform_reads_a_run_it_replays_itself(self):
        # Same principal trajectory_verdict.cedar admits on Record, for the
        # same reason: a verdict written from a replay implies reading the run.
        self.assertEqual(self.decide(self.PLATFORM), cedarpy.Decision.Allow)

    def test_the_judged_agent_cannot_read_the_corpus(self):
        self.assertEqual(self.decide(self.CONTRIBUTOR), cedarpy.Decision.Deny)

    def test_the_reviewer_has_no_business_in_the_trajectories(self):
        # It rules on the artifacts, not on the run that produced them. Named
        # here so that admitting it later is a decision somebody makes.
        self.assertEqual(self.decide(self.REVIEWER), cedarpy.Decision.Deny)

    def test_an_agent_that_declares_no_type_reads_nothing(self):
        self.assertEqual(self.decide(self.UNDECLARED_AGENT), cedarpy.Decision.Deny)

    def test_an_admin_kind_principal_gets_no_bypass_here(self):
        # `require_trajectory_content_auth` drops the Admin/System shortcut the
        # aggregate observe views keep, precisely because principal kind is a
        # request header nothing authenticates. The policy must not put it back.
        self.assertEqual(self.decide(self.ADMIN), cedarpy.Decision.Deny)

    def test_an_unauthenticated_caller_reads_nothing(self):
        self.assertEqual(self.decide(self.ANONYMOUS), cedarpy.Decision.Deny)

    def test_a_test_credential_is_not_a_judge(self):
        self.assertEqual(self.decide(self.E2E_DRIVER), cedarpy.Decision.Deny)

    def test_the_permit_grants_that_one_action_and_no_other(self):
        # `read_trajectories` is the only platform action on this resource the
        # app has a use for; a permit written against `action` would have
        # carried whatever the kernel adds to `Trajectory` later.
        for action in ("write_trajectories", "delete_trajectories", "read_events"):
            self.assertEqual(
                self.decide(self.JUDGE, action=action),
                cedarpy.Decision.Deny,
                f"the judge was granted {action} on Trajectory",
            )

    def test_the_permit_does_not_reach_other_kernel_resources(self):
        for resource_type in ("Entity", "Spec", "AgentAudit"):
            self.assertEqual(
                self.decide(self.JUDGE, resource_type=resource_type),
                cedarpy.Decision.Deny,
                f"read_trajectories was granted on {resource_type}",
            )

    def _markdown_files(self):
        """Every prose file in the checkout, dependencies and dot-dirs aside.

        `.md` is a path suffix here, not a promise of a file: the site routes
        include a directory called `DESIGN.md`, which is the page that serves
        one.
        """
        for directory, subdirs, filenames in os.walk(self.REPO_ROOT):
            subdirs[:] = [
                d for d in subdirs if not d.startswith(".") and d != "node_modules"
            ]
            for filename in filenames:
                path = Path(directory) / filename
                if path.suffix == ".md" and path.is_file():
                    yield path

    def test_every_documented_platform_permit_is_granted(self):
        """A permit the docs say a caller needs must be one this app ships.

        The generic form of the ARN-295 finding. A kernel endpoint that
        requires a Cedar permit no policy grants is unreachable in production,
        and nothing in this repo noticed: `read_trajectories` appeared in a
        skill's 403 table and in no `.cedar` file, and the gap surfaced only
        when a live run hit the endpoint and got 403.

        So the skills' own documentation of the permit is what this reads. Any
        pair written down as required has to be declared in PLATFORM_PERMITS
        with the principal that needs it, and that principal has to actually be
        allowed it by the policies as they stand.
        """
        documented = set()
        for path in self._markdown_files():
            for action, resource_type in self.DOCUMENTED_PERMIT.findall(
                path.read_text(encoding="utf-8", errors="replace")
            ):
                documented.add((action, resource_type))

        self.assertIn(
            ("read_trajectories", "Trajectory"),
            documented,
            "the judge skill no longer documents the permit its endpoints "
            "require, so this test can no longer tell whether one is missing",
        )

        undeclared = sorted(documented - set(self.PLATFORM_PERMITS))
        self.assertEqual(
            undeclared,
            [],
            "these Cedar permits are documented as required by an endpoint this "
            "app calls, but no test says who needs them. Declare each in "
            f"PLATFORM_PERMITS and ship the policy that grants it: {undeclared}",
        )

        for (action, resource_type), principal in sorted(self.PLATFORM_PERMITS.items()):
            self.assertEqual(
                self.decide(principal, action=action, resource_type=resource_type),
                cedarpy.Decision.Allow,
                f"no policy in this app grants `{action}` on `{resource_type}` to "
                f"{principal[0]}::\"{principal[1]}\", so the endpoints behind it "
                "answer 403 to the principal that has to call them",
            )


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

    # --- An agent cannot shed its agent-ness by omitting a header ----------

    # `x-temper-agent-type` is OPTIONAL. A guard written against
    # `principal has agent_type` therefore asks the caller whether it would
    # like the rule applied to it, and an Agent that simply omitted the header
    # was granted AssignSubmission, Publish and ReturnWithCritique.
    UNDECLARED_AGENT = ("Agent", "agent-sneaky", {})

    def test_an_agent_that_declares_no_type_publishes_nothing(self):
        for action in ("Publish", "ReturnWithCritique"):
            self.assertDenied(
                "human_curator",
                principal=self.UNDECLARED_AGENT,
                action=action,
                **self._assignment(assignee="agent-sneaky"),
            )

    def test_an_agent_that_declares_no_type_gets_nothing_on_the_role_record(self):
        for action in ("AssignSubmission", "ReviewOverdue", "Reassign", "BeginReview"):
            self.assertDenied(
                "human_curator",
                principal=self.UNDECLARED_AGENT,
                action=action,
                **self._assignment(assignee="agent-sneaky"),
            )

    def test_declaring_a_type_still_lets_the_pipeline_route_work(self):
        # The fix must not cost the agents that do declare themselves.
        self.assertAllowed(
            "human_curator",
            principal=self.OTHER_AGENT,
            action="AssignSubmission",
            **self._assignment(),
        )

    def test_an_undeclared_agent_cannot_rule_on_a_review_or_a_verdict(self):
        self.assertDenied(
            "review_agent",
            principal=self.UNDECLARED_AGENT,
            action="RecordVerdict",
            **self.REVIEW,
        )
        self.assertDenied(
            "trajectory_verdict",
            principal=self.UNDECLARED_AGENT,
            action="Record",
            **self.VERDICT,
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
