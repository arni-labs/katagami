import unittest
from pathlib import Path
import tomllib


class RemixCreatorContractTests(unittest.TestCase):
    """Saved Remixes are attributed to the signed-in human who made them
    (ARN-143), and anonymous remixes are impossible by construction (ARN-144).
    The Remix entity carries a `has_creator` boolean and a `SetCreator` input
    action that records the Google identity (subject id, email, name, avatar)
    while the mix is still in Draft; Save and Restore are guarded on it and
    the SavedRequiresCreator invariant holds it for the whole Saved state."""

    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.commons_root = root / "katagami-commons"
        self.spec = tomllib.loads(
            (self.commons_root / "specs" / "remix.ioa.toml").read_text()
        )
        self.actions = {action["name"]: action for action in self.spec["action"]}
        self.states = {state["name"]: state for state in self.spec["state"]}
        self.invariants = {
            invariant["name"]: invariant for invariant in self.spec["invariant"]
        }

    def _guard_vars(self, action_name):
        return {
            guard.get("var")
            for guard in self.actions[action_name].get("guard", [])
            if isinstance(guard, dict)
        }

    def test_has_creator_is_a_bool_state_defaulting_to_false(self):
        self.assertIn("has_creator", self.states)
        state = self.states["has_creator"]
        self.assertEqual(state["type"], "bool")
        self.assertEqual(state["initial"], "false")

    def test_set_creator_records_the_full_identity_in_draft(self):
        self.assertIn("SetCreator", self.actions)
        action = self.actions["SetCreator"]
        self.assertEqual(action["kind"], "input")
        self.assertEqual(action["from"], ["Draft"])
        self.assertEqual(
            action["params"],
            ["creator_sub", "creator_email", "creator_name", "creator_avatar_url"],
        )
        self.assertIn(
            {"type": "set_bool", "var": "has_creator", "value": "true"},
            action["effect"],
        )

    def test_save_requires_a_creator(self):
        # Anonymous remixes are impossible: the state machine refuses Save
        # without attribution, regardless of what any frontend does.
        self.assertIn("has_creator", self._guard_vars("Save"))
        self.assertIn("has_selection", self._guard_vars("Save"))

    def test_restore_requires_a_creator(self):
        # Legacy anonymous mixes archived before attribution existed must not
        # be able to re-enter Saved through the restore path.
        self.assertIn("has_creator", self._guard_vars("Restore"))

    def test_saved_state_holds_the_creator_invariant(self):
        self.assertIn("SavedRequiresCreator", self.invariants)
        invariant = self.invariants["SavedRequiresCreator"]
        self.assertEqual(invariant["when"], ["Saved"])
        self.assertEqual(invariant["assert"], "has_creator")


if __name__ == "__main__":
    unittest.main()
