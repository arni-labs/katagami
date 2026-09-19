"""Evaluate prepublication attribution and the Morrow Ink approval regression."""

from pathlib import Path

import cedarpy
import pytest
import tomllib

COMMONS = Path(__file__).resolve().parents[2] / "katagami-commons"
POLICY_PATHS = (
    COMMONS / "policies/art_style.cedar",
    COMMONS / "specs/policies/art_style.cedar",
)
ATTRIBUTION = ("SetCredits", "SetModelProvenance")
MORROW_ID = "en-01a0abbb-f9e8-7d81-bd20-0543f014c8e2"


def allowed(
    action: str,
    status: str | None,
    *,
    kind: str = "Agent",
    agent_type: str | None = "harness",
    role: str | None = None,
    creator: str = "rita",
    acting_for: str | None = "rita",
    extra_policy: str = "",
) -> bool:
    # Temper injects persisted entity fields into context. Do not manufacture
    # resource attributes that the deployed evaluator does not receive.
    principal_id = "codex" if kind == "Agent" else "rita"
    attrs = {"id": principal_id}
    if agent_type is not None:
        attrs["agent_type"] = agent_type
    if role is not None:
        attrs["role"] = role
    context = {"creator_sub": creator}
    if status is not None:
        context["status"] = status
    if acting_for is not None:
        context["actingFor"] = acting_for
    result = cedarpy.is_authorized(
        {
            "principal": {"type": kind, "id": principal_id},
            "action": {"type": "Action", "id": action},
            "resource": {"type": "ArtStyle", "id": MORROW_ID},
            "context": context,
        },
        "\n".join(path.read_text() for path in POLICY_PATHS) + extra_policy,
        [{"uid": {"type": kind, "id": principal_id}, "attrs": attrs, "parents": []}],
    )
    return bool(result.decision == cedarpy.Decision.Allow)


@pytest.mark.parametrize("action", ATTRIBUTION)
@pytest.mark.parametrize("status", ["Draft", "UnderReview"])
@pytest.mark.parametrize("agent_type", [None, "harness", "contributor"])
def test_agents_can_author_prepublication_attribution(
    action: str, status: str, agent_type: str | None
) -> None:
    assert allowed(action, status, agent_type=agent_type)


@pytest.mark.parametrize("action", ATTRIBUTION)
@pytest.mark.parametrize("status", ["Draft", "UnderReview"])
def test_creator_can_author_own_prepublication_attribution(
    action: str, status: str
) -> None:
    assert allowed(action, status, kind="Customer", agent_type=None, role="contributor")
    assert not allowed(
        action,
        status,
        kind="Customer",
        agent_type=None,
        role="contributor",
        creator="someone-else",
    )


@pytest.mark.parametrize("action", ATTRIBUTION)
@pytest.mark.parametrize("status", [None, "", "Unexpected", "Published", "Archived"])
@pytest.mark.parametrize("kind", ["Agent", "Customer"])
def test_attribution_fails_closed_outside_authoring_states(
    action: str, status: str | None, kind: str
) -> None:
    assert not allowed(action, status, kind=kind)


@pytest.mark.parametrize("action", (*ATTRIBUTION, "SubmitArtStyle"))
@pytest.mark.parametrize("acting_for", [None, "", "someone-else"])
def test_verified_contributor_still_needs_matching_ownership(
    action: str, acting_for: str | None
) -> None:
    assert not allowed(action, "Draft", agent_type="contributor", acting_for=acting_for)


@pytest.mark.parametrize(
    "action",
    [
        "Publish",
        "SubmitForReview",
        "AttachArtStyleReview",
        "MarkQualityPassed",
        "AttachPublishedAssets",
        "RecordVerificationJob",
        "SetCreator",
        "update",
        "delete",
    ],
)
@pytest.mark.parametrize("agent_type", [None, "harness", "contributor"])
def test_finalization_and_generic_writes_remain_denied(
    action: str, agent_type: str | None
) -> None:
    assert not allowed(action, "Draft", agent_type=agent_type)


@pytest.mark.parametrize(
    "status", [None, "Draft", "UnderReview", "Published", "Archived"]
)
@pytest.mark.parametrize("action", (*ATTRIBUTION, "Publish", "AttachArtStyleReview"))
def test_service_and_owner_policy_access_is_unchanged(
    action: str, status: str | None
) -> None:
    assert allowed(action, status, agent_type="curation-service")
    assert allowed(action, status, kind="Customer", agent_type=None, role="owner")


def test_recorded_narrow_approval_can_author_but_cannot_override_forbids() -> None:
    permit = (
        'permit(principal == Agent::"codex", action == Action::"SetCredits", '
        f'resource == ArtStyle::"{MORROW_ID}");'
    )
    assert allowed(
        "SetCredits", "Draft", creator="", acting_for=None, extra_policy=permit
    )
    assert not allowed("SetCredits", "Published", extra_policy=permit)
    publish_permit = permit.replace("SetCredits", "Publish")
    assert not allowed("Publish", "Draft", extra_policy=publish_permit)


def test_stale_forbid_still_blocks_until_every_installed_copy_is_replaced() -> None:
    stale = 'forbid(principal, action == Action::"SetCredits", resource is ArtStyle);'
    assert not allowed("SetCredits", "Draft", extra_policy=stale)


def test_state_machine_preserves_review_invalidation() -> None:
    with (COMMONS / "specs/art_style.ioa.toml").open("rb") as source:
        actions = {a["name"]: a for a in tomllib.load(source)["action"]}
    expected = {
        "SetCredits": {"has_source_basis_review", "quality_review_passed"},
        "SetModelProvenance": {
            "has_prompt_review",
            "has_portability_evidence",
            "quality_review_passed",
        },
    }
    for action, invalidated in expected.items():
        assert actions[action]["from"] == ["Draft", "UnderReview"]
        cleared = {
            effect["var"]
            for effect in actions[action]["effect"]
            if effect.get("type") == "set_bool" and effect.get("value") == "false"
        }
        assert invalidated <= cleared


def test_policy_mirrors_are_identical() -> None:
    assert POLICY_PATHS[0].read_bytes() == POLICY_PATHS[1].read_bytes()
