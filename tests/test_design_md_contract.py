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
        self.assertIn("has_published_assets", self.states)

        attach = self.actions["AttachDesignMd"]
        self.assertEqual(attach["from"], ["Draft", "UnderReview"])
        self.assertEqual(
            attach["params"],
            [
                "design_md_file_id",
                "design_md_lint_result",
                "design_md_format_version",
            ],
        )
        self.assertTrue(self._sets_bool("AttachDesignMd", "has_design_md", "true"))
        # PR-5: VerifyDesignMd was deleted; has_valid_design_md is now set from
        # the design_md_lint_result param at attach time. The finalizer's
        # verify_design_md_metadata still rejects a non-clean lint result before
        # SubmitForReview, so this stays sound.
        self.assertTrue(
            self._sets_bool("AttachDesignMd", "has_valid_design_md", "true")
        )
        self.assertNotIn("design_md_verified", self.states)
        self.assertNotIn("VerifyDesignMd", self.actions)
        self.assertTrue(
            self._sets_bool("AttachDesignMd", "has_published_assets", "false")
        )

        attach_assets = self.actions["AttachPublishedAssets"]
        self.assertEqual(
            attach_assets["params"],
            [
                "thumbnail_asset_id",
                "thumbnail_asset_url",
                "embodiment_asset_id",
                "embodiment_asset_url",
                "design_md_asset_id",
                "design_md_asset_url",
            ],
        )
        self.assertTrue(
            self._sets_bool("AttachPublishedAssets", "has_published_assets", "true")
        )

    def test_attach_design_md_sets_validity_from_lint_at_attach_time(self):
        # PR-5 relocated has_design_md / has_valid_design_md from the deleted
        # VerifyDesignMd verifier action into AttachDesignMd, driven by the
        # design_md_lint_result param. The finalizer still gates on the lint.
        self.assertNotIn("VerifyDesignMd", self.actions)
        self.assertTrue(self._sets_bool("AttachDesignMd", "has_design_md", "true"))
        self.assertTrue(
            self._sets_bool("AttachDesignMd", "has_valid_design_md", "true")
        )
        self.assertIn("design_md_lint_result", self.actions["AttachDesignMd"]["params"])

    def test_published_languages_do_not_accept_design_md_reattach(self):
        attach = self.actions["AttachDesignMd"]
        self.assertNotIn("Published", attach["from"])
        self.assertIn("Revise first", attach["hint"])

        finalizer = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()
        self.assertNotIn("fn revise_published_for_design_md", finalizer)
        self.assertNotIn('"AttachDesignMd"', finalizer)
        self.assertIn("verify_design_md_metadata", finalizer)
        # The WASM-trusted VerifyDesignMd dispatch was removed in PR-5; the
        # finalizer's lint-metadata byte check stays the runtime gate.
        self.assertNotIn('"VerifyDesignMd"', finalizer)

    def test_publish_requires_valid_design_md(self):
        publish = self.actions["Publish"]
        guards = publish.get("guard", [])
        for var in [
            "has_valid_design_md",
            "has_published_assets",
            "quality_review_passed",
        ]:
            self.assertIn({"type": "is_true", "var": var}, guards)
        # The deleted *_verified copy-boolean guards are replaced by the
        # design_md File Ready/Locked cross_entity_state guard.
        self.assertNotIn({"type": "is_true", "var": "design_md_verified"}, guards)
        self.assertNotIn({"type": "is_true", "var": "embodiment_verified"}, guards)
        self.assertIn(
            {
                "type": "cross_entity_state",
                "entity_type": "File",
                "entity_id_source": "design_md_file_id",
                "required_status": ["Ready", "Locked"],
            },
            guards,
        )

        invariants = {
            invariant["name"]: invariant for invariant in self.spec["invariant"]
        }
        self.assertEqual(
            invariants["PublishedRequiresValidDesignMd"]["assert"],
            "has_valid_design_md",
        )
        self.assertNotIn("PublishedRequiresVerifiedDesignMd", invariants)
        self.assertEqual(
            invariants["PublishedRequiresPublicAssets"]["assert"],
            "has_published_assets",
        )

    def test_review_requires_valid_design_md(self):
        submit = self.actions["SubmitForReview"]
        guards = submit.get("guard", [])
        for var in [
            "has_design_md",
            "has_valid_design_md",
        ]:
            self.assertIn({"type": "is_true", "var": var}, guards)
        self.assertNotIn({"type": "is_true", "var": "design_md_verified"}, guards)
        self.assertIn(
            {
                "type": "cross_entity_state",
                "entity_type": "File",
                "entity_id_source": "design_md_file_id",
                "required_status": ["Ready", "Locked"],
            },
            guards,
        )

    def test_source_spec_changes_invalidate_design_md(self):
        for action_name in [
            "SetName",
            "SetSpec",
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
                # design_md_verified copy-boolean was deleted in PR-5.
                self.assertFalse(
                    self._sets_bool(action_name, "design_md_verified", "false")
                )
                self.assertTrue(
                    self._sets_bool(action_name, "has_published_assets", "false")
                )
                self.assertTrue(
                    self._sets_bool(action_name, "quality_review_passed", "false")
                )

    def test_set_spec_is_complete_hot_path_transition(self):
        set_spec = self.actions["SetSpec"]
        self.assertEqual(set_spec["from"], ["Draft", "UnderReview"])
        self.assertEqual(
            set_spec["params"],
            [
                "name",
                "slug",
                "philosophy",
                "tokens",
                "rules",
                "layout_principles",
                "guidance",
                "tags",
            ],
        )
        for var in [
            "has_philosophy",
            "has_tokens",
            "has_rules",
            "has_layout",
            "has_guidance",
        ]:
            self.assertTrue(self._sets_bool("SetSpec", var, "true"))

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
            "katagami-design-md-contract",
            "AttachDesignMd",
            "/katagami/design-md/",
            "ZERO lint errors and ZERO lint warnings",
            "Warnings are blocking",
        ]:
            self.assertIn(fragment, review_skill)
        self.assertRegex(review_skill, r"never\s+store the shell transcript")
        self.assertNotIn("npx @google/design.md", review_skill)
        self.assertIn("'design_md_format_version': 'alpha'", review_skill)

    def test_synthesize_skill_uses_embedded_design_md_gate(self):
        synth_skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "synthesize-language"
            / "SKILL.md"
        ).read_text()

        for fragment in [
            "katagami-design-md-contract",
            "AttachDesignMd",
            "/katagami/design-md/",
            "Warnings are blocking",
            "AttachEmbodiment` invalidates DESIGN.md",
            "post-embodiment DESIGN.md attachment is mandatory",
        ]:
            self.assertIn(fragment, synth_skill)
        self.assertRegex(synth_skill, r"never\s+store the shell transcript")
        self.assertNotIn("npx @google/design.md", synth_skill)
        self.assertIn("'design_md_format_version': 'alpha'", synth_skill)

    def test_embedded_quality_knowledge_uses_same_design_md_gate(self):
        quality_standards = (
            self.curation_root / "system" / "knowledge" / "quality-standards.md"
        ).read_text()

        self.assertIn("katagami-design-md-contract", quality_standards)
        self.assertNotIn("npx @google/design.md", quality_standards)

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
            "DesignMdAssetId",
            "DesignMdAssetUrl",
            "DesignMdLintResult",
            "DesignMdFormatVersion",
            "HasPublishedAssets",
            "QualityReviewPassed",
        ]:
            self.assertIn(prop, props)
        # PR-5 removed the WASM-trusted *Verified copy-boolean projections.
        for prop in ["DesignMdVerified", "EmbodimentVerified"]:
            self.assertNotIn(prop, props)


if __name__ == "__main__":
    unittest.main()
