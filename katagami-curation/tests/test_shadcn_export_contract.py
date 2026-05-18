import unittest
from pathlib import Path
import tomllib
import xml.etree.ElementTree as ET


class ShadcnExportContractTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.root = root
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

    def test_design_language_tracks_shadcn_export(self):
        self.assertIn("has_shadcn_export", self.states)
        self.assertIn("shadcn_export_verified", self.states)
        self.assertIn("has_shadcn_component_spec", self.states)
        self.assertIn("shadcn_component_spec_verified", self.states)
        self.assertIn("has_shadcn_preview_shots", self.states)
        self.assertIn("shadcn_preview_shots_verified", self.states)

        attach = self.actions["AttachShadcnExport"]
        self.assertEqual(attach["from"], ["Draft", "UnderReview"])
        self.assertEqual(
            attach["params"],
            [
                "shadcn_export_file_id",
                "shadcn_export_format_version",
                "shadcn_export_manifest",
            ],
        )
        self.assertTrue(
            self._sets_bool("AttachShadcnExport", "has_shadcn_export", "true")
        )
        self.assertTrue(
            self._sets_bool(
                "AttachShadcnExport", "shadcn_export_verified", "false"
            )
        )

        verify = self.actions["VerifyShadcnExport"]
        self.assertEqual(verify["from"], ["Draft", "UnderReview", "Published"])
        self.assertIn({"type": "is_true", "var": "has_shadcn_export"}, verify["guard"])
        self.assertTrue(
            self._sets_bool("VerifyShadcnExport", "shadcn_export_verified", "true")
        )

        component = self.actions["AttachShadcnComponentSpec"]
        self.assertEqual(component["from"], ["Draft", "UnderReview"])
        self.assertEqual(
            component["params"],
            [
                "shadcn_component_spec_file_id",
                "shadcn_component_spec_format_version",
                "shadcn_component_spec_manifest",
            ],
        )
        self.assertTrue(
            self._sets_bool(
                "AttachShadcnComponentSpec",
                "has_shadcn_component_spec",
                "true",
            )
        )
        self.assertTrue(
            self._sets_bool(
                "AttachShadcnComponentSpec",
                "shadcn_component_spec_verified",
                "false",
            )
        )

        shots = self.actions["AttachShadcnPreviewShots"]
        self.assertEqual(shots["from"], ["Draft", "UnderReview"])
        self.assertEqual(
            shots["params"],
            [
                "shadcn_preview_shots_file_id",
                "shadcn_preview_shots_format_version",
                "shadcn_preview_shots_manifest",
            ],
        )
        self.assertTrue(
            self._sets_bool(
                "AttachShadcnPreviewShots", "has_shadcn_preview_shots", "true"
            )
        )
        self.assertTrue(
            self._sets_bool(
                "AttachShadcnPreviewShots",
                "shadcn_preview_shots_verified",
                "false",
            )
        )

    def test_source_spec_changes_invalidate_shadcn_export(self):
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
                    self._sets_bool(action_name, "has_shadcn_export", "false")
                )
                self.assertTrue(
                    self._sets_bool(action_name, "shadcn_export_verified", "false")
                )
                self.assertTrue(
                    self._sets_bool(
                        action_name, "has_shadcn_component_spec", "false"
                    )
                )
                self.assertTrue(
                    self._sets_bool(
                        action_name, "shadcn_component_spec_verified", "false"
                    )
                )
                self.assertTrue(
                    self._sets_bool(action_name, "has_shadcn_preview_shots", "false")
                )
                self.assertTrue(
                    self._sets_bool(
                        action_name, "shadcn_preview_shots_verified", "false"
                    )
                )

    def test_shadcn_artifacts_are_publish_gates(self):
        publish = self.actions["Publish"]
        guards = publish.get("guard", [])
        for var in [
            "has_shadcn_export",
            "shadcn_export_verified",
            "has_shadcn_component_spec",
            "shadcn_component_spec_verified",
            "has_shadcn_preview_shots",
            "shadcn_preview_shots_verified",
        ]:
            self.assertIn({"type": "is_true", "var": var}, guards)

    def test_csdl_exposes_shadcn_fields(self):
        tree = ET.parse(self.commons_root / "specs" / "model.csdl.xml")
        ns = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        entity = tree.find(".//edm:EntityType[@Name='DesignLanguage']", ns)
        self.assertIsNotNone(entity)
        props = {prop.attrib["Name"] for prop in entity.findall("edm:Property", ns)}

        for prop in [
            "ShadcnExportFileId",
            "ShadcnExportFormatVersion",
            "ShadcnExportManifest",
            "HasShadcnExport",
            "ShadcnExportVerified",
            "ShadcnComponentSpecFileId",
            "ShadcnComponentSpecFormatVersion",
            "ShadcnComponentSpecManifest",
            "HasShadcnComponentSpec",
            "ShadcnComponentSpecVerified",
            "ShadcnPreviewShotsFileId",
            "ShadcnPreviewShotsFormatVersion",
            "ShadcnPreviewShotsManifest",
            "HasShadcnPreviewShots",
            "ShadcnPreviewShotsVerified",
        ]:
            self.assertIn(prop, props)

    def test_finalizer_derives_and_verifies_shadcn_export(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        for fragment in [
            "fn render_shadcn_export_projection",
            '"registry:theme"',
            '"cssVars"',
            '"componentManifest"',
            "fn verify_shadcn_export",
            "AttachShadcnExport",
            "VerifyShadcnExport",
            "/katagami/shadcn/{}/registry-theme.json",
            "shadcn_export_projection_refresh_reason",
            "source_invalidated_export",
            "fn render_shadcn_component_spec_projection",
            "fn render_shadcn_preview_shots_projection",
            "fn verify_shadcn_component_spec",
            "fn verify_shadcn_preview_shots",
            "AttachShadcnComponentSpec",
            "AttachShadcnPreviewShots",
            "VerifyShadcnComponentSpec",
            "VerifyShadcnPreviewShots",
            "/katagami/shadcn/{}/components.md",
            "/katagami/shadcn/{}/preview-shots.json",
            "component-recipes-v1",
            "preview-shots-v1",
        ]:
            self.assertIn(fragment, source)

        self.assertLess(
            source.index("verify_shadcn_export(ctx"),
            source.index('"MarkQualityPassed"'),
        )
        self.assertLess(
            source.index("verify_shadcn_component_spec("),
            source.index('"MarkQualityPassed"'),
        )
        self.assertLess(
            source.index("verify_shadcn_preview_shots(ctx"),
            source.index('"MarkQualityPassed"'),
        )

    def test_ui_exposes_preview_route_and_backfill(self):
        ui_lib = (self.root / "ui" / "src" / "lib" / "shadcn-export.ts").read_text()
        preview = (
            self.root / "ui" / "src" / "components" / "shadcn-preview.tsx"
        ).read_text()
        route = (
            self.root
            / "ui"
            / "src"
            / "app"
            / "(site)"
            / "language"
            / "[id]"
            / "shadcn.json"
            / "route.ts"
        ).read_text()
        component_route = (
            self.root
            / "ui"
            / "src"
            / "app"
            / "(site)"
            / "language"
            / "[id]"
            / "shadcn-components.md"
            / "route.ts"
        ).read_text()
        shots_route = (
            self.root
            / "ui"
            / "src"
            / "app"
            / "(site)"
            / "language"
            / "[id]"
            / "shadcn-shots.json"
            / "route.ts"
        ).read_text()
        backfill = (self.root / "scripts" / "backfill-shadcn-exports.mjs").read_text()
        seed = (
            self.root / "scripts" / "normalize-shadcn-theme-seed.mjs"
        ).read_text()

        self.assertIn("buildShadcnRegistryTheme", ui_lib)
        self.assertIn("shadcnComponentSpecMarkdown", ui_lib)
        self.assertIn("shadcnPreviewShotsJson", ui_lib)
        self.assertIn("buildDarkVars", ui_lib)
        self.assertIn("Button", preview)
        self.assertIn("Card", preview)
        self.assertIn("Select", preview)
        self.assertIn("Tabs", preview)
        self.assertIn("component recipes", preview)
        self.assertIn("preview shots", preview)
        self.assertIn("shadcnThemeToJson", route)
        self.assertIn("shadcnComponentSpecMarkdown", component_route)
        self.assertIn("shadcnPreviewShotsJson", shots_route)
        self.assertIn("--apply", backfill)
        self.assertIn("--fixture=", backfill)
        self.assertIn("registry:theme", seed)
        self.assertIn("original_css_vars", seed)

    def test_agent_guidance_makes_shadcn_recipes_first_class(self):
        synth = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "synthesize-language"
            / "SKILL.md"
        ).read_text()
        review = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "review-quality"
            / "SKILL.md"
        ).read_text()
        agent = (self.curation_root / "agents" / "curator" / "AGENT.md").read_text()

        for source in [synth, review, agent]:
            self.assertIn("components.md", source)
            self.assertIn("preview-shots.json", source)

        self.assertIn("AttachShadcnComponentSpec", synth)
        self.assertIn("AttachShadcnPreviewShots", synth)
        self.assertIn("agent-authored", review)


if __name__ == "__main__":
    unittest.main()
