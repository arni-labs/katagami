import unittest
from pathlib import Path
import tomllib


class ProvenanceContractTests(unittest.TestCase):
    """Provenance records WHO did the creative work (ADR-0016), distinct from
    lineage (WHAT a language descends from). The DesignLanguage entity carries a
    `provenance_tier` string with a closed value set, a `has_provenance` receipts
    boolean, and a `SetProvenanceTier` action to record both."""

    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.commons_root = root / "katagami-commons"
        self.spec = tomllib.loads(
            (self.commons_root / "specs" / "design_language.ioa.toml").read_text()
        )
        self.actions = {action["name"]: action for action in self.spec["action"]}
        self.states = {state["name"]: state for state in self.spec["state"]}

    def _effect_entries(self, action_name):
        effect = self.actions[action_name].get("effect", [])
        if isinstance(effect, str):
            return [effect]
        return effect

    def _sets_bool(self, action_name, var, value):
        for effect in self._effect_entries(action_name):
            if isinstance(effect, dict):
                if (
                    effect.get("type") == "set_bool"
                    and effect.get("var") == var
                    and effect.get("value") == value
                ):
                    return True
            elif effect == f"set {var} {value}":
                return True
        return False

    def test_provenance_tier_is_a_string_state_defaulting_to_agent_generated(self):
        self.assertIn("provenance_tier", self.states)
        tier = self.states["provenance_tier"]
        self.assertEqual(tier["type"], "string")
        # Defaults to the pipeline's own output; human work is tagged explicitly.
        self.assertEqual(tier["initial"], "agent_generated")

    def test_has_provenance_is_a_bool_state(self):
        self.assertIn("has_provenance", self.states)
        self.assertEqual(self.states["has_provenance"]["type"], "bool")

    def test_set_provenance_tier_records_tier_and_lineage_card(self):
        self.assertIn("SetProvenanceTier", self.actions)
        action = self.actions["SetProvenanceTier"]
        # The submitter records the tier plus a JSON lineage card (the receipts).
        self.assertIn("provenance_tier", action["params"])
        self.assertIn("provenance", action["params"])
        # Recording provenance flips the has_provenance receipts flag.
        self.assertTrue(
            self._sets_bool("SetProvenanceTier", "has_provenance", "true")
        )


if __name__ == "__main__":
    unittest.main()
