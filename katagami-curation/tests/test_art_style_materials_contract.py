"""Recipe metadata declaration and real Cedar authorization regressions.

These evaluate actual policies and inspect the IOA/CSDL contracts. They do not
claim dispatcher persistence or live publication verification.
"""
import json
import os
from pathlib import Path
import tomllib
import unittest
import xml.etree.ElementTree as ET

import cedarpy

ROOT = Path(os.environ.get("KATAGAMI_METADATA_TEST_ROOT", Path(__file__).resolve().parents[2]))
COMMONS = ROOT / "katagami-commons"
ACTION = "SetMaterialsAndTechniques"


class ArtStyleMaterialsContractTest(unittest.TestCase):
    def setUp(self):
        self.spec = tomllib.loads((COMMONS / "specs/art_style.ioa.toml").read_text())
        self.actions = {a["name"]: a for a in self.spec["action"]}
        self.policy = (COMMONS / "policies/art_style.cedar").read_text()

    def test_metadata_action_cannot_change_recipe_proof_or_publication(self):
        action = self.actions[ACTION]
        self.assertEqual(action["kind"], "input")
        self.assertEqual(set(action["from"]), {"Draft", "UnderReview", "Published", "Archived"})
        self.assertEqual(action["params"], ["materials", "techniques"])
        # No target state, callbacks or effects may invalidate an existing proof,
        # publish an artifact, or launch verification for this descriptive edit.
        for key in ("to", "effect", "triggers", "guard", "constraints"):
            self.assertFalse(action.get(key), key)

    def test_submit_accepts_metadata_without_requiring_it(self):
        submit = self.actions["SubmitArtStyle"]
        self.assertIn("materials", submit["params"])
        self.assertIn("techniques", submit["params"])
        # Optional descriptive fields must not become quality/submit guards.
        guards = json.dumps(submit.get("guard", []))
        self.assertNotIn("materials", guards)
        self.assertNotIn("techniques", guards)

    def test_csdl_defaults_are_serialized_empty_arrays(self):
        tree = ET.parse(COMMONS / "specs/model.csdl.xml")
        ns = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        entity = tree.find('.//edm:EntityType[@Name="ArtStyle"]', ns)
        self.assertIsNotNone(entity)
        for name in ("Materials", "Techniques"):
            prop = entity.find(f'edm:Property[@Name="{name}"]', ns)
            self.assertIsNotNone(prop, name)
            self.assertEqual(prop.attrib["Type"], "Edm.String")
            self.assertEqual(prop.attrib["Nullable"], "false")
            self.assertEqual(json.loads(prop.attrib["DefaultValue"]), [])

    def decision(self, principal_type, principal_id, attrs, status, acting_for=None):
        context = {"creator_sub": "original-author", "status": status}
        if acting_for is not None:
            context["actingFor"] = acting_for
        principal = {"type": principal_type, "id": principal_id}
        resource = {"type": "ArtStyle", "id": "existing-style"}
        entities = [
            {"uid": principal, "attrs": {"id": principal_id, **attrs}, "parents": []},
            {"uid": resource, "attrs": {}, "parents": []},
        ]
        return cedarpy.is_authorized(
            {"principal": principal, "action": {"type": "Action", "id": ACTION},
             "resource": resource, "context": context}, self.policy, entities,
        ).decision.value

    def test_original_author_and_verified_owner_can_update_published_metadata(self):
        for status in ("Draft", "UnderReview", "Published", "Archived"):
            with self.subTest(status=status):
                self.assertEqual(self.decision("Customer", "original-author", {}, status), "Allow")
                self.assertEqual(self.decision("Customer", "owner", {"role": "owner"}, status), "Allow")

    def test_contributor_must_act_for_the_original_author(self):
        for status in ("Draft", "UnderReview", "Published", "Archived"):
            with self.subTest(status=status):
                attrs = {"agent_type": "contributor"}
                self.assertEqual(self.decision("Agent", "agent", attrs, status, "original-author"), "Allow")
                for acting_for in (None, "", "other-customer"):
                    self.assertEqual(self.decision("Agent", "agent", attrs, status, acting_for), "Deny")

    def test_unrelated_customer_cannot_edit_even_with_claimed_acting_for(self):
        for status in ("Draft", "UnderReview", "Published", "Archived"):
            with self.subTest(status=status):
                self.assertEqual(self.decision("Customer", "other-customer", {}, status), "Deny")
                self.assertEqual(self.decision("Customer", "other-customer", {}, status, "original-author"), "Deny")


if __name__ == "__main__":
    unittest.main()
