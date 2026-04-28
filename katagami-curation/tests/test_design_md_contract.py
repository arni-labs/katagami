import unittest
from pathlib import Path
import tomllib
import xml.etree.ElementTree as ET


class DesignMdContractTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.commons_root = root / "katagami-commons"
        self.curation_root = root / "katagami-curation"
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

    def test_design_language_tracks_design_md_validity(self):
        self.assertIn("has_design_md", self.states)
        self.assertIn("has_valid_design_md", self.states)

        attach = self.actions["AttachDesignMd"]
        self.assertEqual(
            attach["params"],
            [
                "design_md_file_id",
                "design_md_lint_result",
                "design_md_format_version",
            ],
        )
        self.assertTrue(self._sets_bool("AttachDesignMd", "has_design_md", "true"))
        self.assertTrue(
            self._sets_bool("AttachDesignMd", "has_valid_design_md", "false")
        )
        self.assertTrue(
            self._sets_bool("AttachDesignMd", "design_md_verified", "false")
        )

    def test_publish_requires_valid_design_md(self):
        publish = self.actions["Publish"]
        guards = publish.get("guard", [])
        for var in [
            "has_valid_design_md",
            "design_md_verified",
            "embodiment_verified",
            "quality_review_passed",
        ]:
            self.assertIn({"type": "is_true", "var": var}, guards)

        invariants = {
            invariant["name"]: invariant for invariant in self.spec["invariant"]
        }
        self.assertEqual(
            invariants["PublishedRequiresValidDesignMd"]["assert"],
            "has_valid_design_md",
        )
        self.assertEqual(
            invariants["PublishedRequiresVerifiedDesignMd"]["assert"],
            "design_md_verified",
        )

    def test_source_spec_changes_invalidate_design_md(self):
        for action_name in [
            "SetName",
            "WritePhilosophy",
            "SetTokens",
            "SetRules",
            "SetLayout",
            "SetGuidance",
            "SetImageryDirection",
            "SetGenerativeCanvas",
            "AttachEmbodiment",
        ]:
            with self.subTest(action=action_name):
                self.assertTrue(
                    self._sets_bool(action_name, "has_design_md", "false")
                )
                self.assertTrue(
                    self._sets_bool(action_name, "has_valid_design_md", "false")
                )
                self.assertTrue(
                    self._sets_bool(action_name, "design_md_verified", "false")
                )
                self.assertTrue(
                    self._sets_bool(action_name, "quality_review_passed", "false")
                )

    def test_review_skill_owns_design_md_gate(self):
        review_skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "review-quality"
            / "SKILL.md"
        ).read_text()

        for fragment in [
            "@google/design.md lint",
            "AttachDesignMd",
            "/katagami/design-md/",
            "ZERO lint errors and ZERO lint warnings",
            "Warnings are blocking",
        ]:
            self.assertIn(fragment, review_skill)

    def test_csdl_exposes_design_md_fields(self):
        tree = ET.parse(self.commons_root / "specs" / "model.csdl.xml")
        ns = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        entity = tree.find(".//edm:EntityType[@Name='DesignLanguage']", ns)
        self.assertIsNotNone(entity)
        props = {
            prop.attrib["Name"]
            for prop in entity.findall("edm:Property", ns)
        }

        for prop in [
            "DesignMdFileId",
            "DesignMdLintResult",
            "DesignMdFormatVersion",
            "DesignMdVerified",
            "EmbodimentVerified",
            "QualityReviewPassed",
        ]:
            self.assertIn(prop, props)


if __name__ == "__main__":
    unittest.main()
