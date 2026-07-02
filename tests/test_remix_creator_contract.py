import unittest
from pathlib import Path
import tomllib


class RemixCreatorContractTests(unittest.TestCase):
    """Saved Remixes are attributed to the signed-in human who made them
    (ARN-143). The Remix entity carries a `has_creator` boolean and a
    `SetCreator` input action that records the Google identity (subject id,
    email, name, avatar) while the mix is still in Draft — before Save pins it.
    Attribution is identity, not lifecycle: SetCreator must not gate Save."""

    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.commons_root = root / "katagami-commons"
        self.spec = tomllib.loads(
            (self.commons_root / "specs" / "remix.ioa.toml").read_text()
        )
        self.actions = {action["name"]: action for action in self.spec["action"]}
        self.states = {state["name"]: state for state in self.spec["state"]}

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

    def test_save_does_not_require_a_creator(self):
        # Anonymous historical remixes and agent-made remixes must stay valid:
        # Save's guard is selection-only.
        save = self.actions["Save"]
        for guard in save.get("guard", []):
            self.assertNotEqual(guard.get("var"), "has_creator")


if __name__ == "__main__":
    unittest.main()
