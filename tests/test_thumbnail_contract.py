import unittest
from pathlib import Path
import tomllib


class ThumbnailContractTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.commons_root = root / "katagami-commons"
        self.curation_root = root / "katagami-curation"
        self.spec = tomllib.loads(
            (self.commons_root / "specs" / "design_language.ioa.toml").read_text()
        )
        self.actions = {action["name"]: action for action in self.spec["action"]}
        self.states = {state["name"]: state for state in self.spec["state"]}

    def test_design_language_tracks_thumbnail_attachment(self):
        self.assertIn("has_thumbnail", self.states)
        self.assertIn("thumbnail_verified", self.states)
        self.assertIn("has_published_assets", self.states)

        attach = self.actions["AttachThumbnail"]
        self.assertEqual(attach["from"], ["Draft", "UnderReview"])
        self.assertEqual(attach["params"], ["thumbnail_file_id"])
        self.assertTrue(self._sets_bool("AttachThumbnail", "has_thumbnail", "true"))
        self.assertTrue(
            self._sets_bool("AttachThumbnail", "thumbnail_verified", "false")
        )
        self.assertTrue(
            self._sets_bool("AttachThumbnail", "has_published_assets", "false")
        )

        verify = self.actions["VerifyThumbnail"]
        self.assertEqual(verify["from"], ["Draft", "UnderReview", "Published"])
        self.assertIn({"type": "is_true", "var": "has_thumbnail"}, verify["guard"])
        self.assertTrue(
            self._sets_bool("VerifyThumbnail", "thumbnail_verified", "true")
        )

        attach_verified = self.actions["AttachVerifiedThumbnail"]
        self.assertEqual(attach_verified["from"], ["Draft", "UnderReview"])
        self.assertIn("Revise first", attach_verified["hint"])

        assets = self.actions["AttachPublishedAssets"]
        self.assertEqual(assets["from"], ["Draft", "UnderReview", "Published"])
        self.assertTrue(
            self._sets_bool("AttachPublishedAssets", "has_published_assets", "true")
        )

        csdl = (self.commons_root / "specs" / "model.csdl.xml").read_text()
        self.assertIn('Property Name="ThumbnailFileId"', csdl)
        self.assertIn('Property Name="ThumbnailAssetId"', csdl)
        self.assertIn('Property Name="ThumbnailAssetUrl"', csdl)
        self.assertIn('Property Name="EmbodimentAssetId"', csdl)
        self.assertIn('Property Name="EmbodimentAssetUrl"', csdl)
        self.assertIn('Property Name="DesignMdAssetId"', csdl)
        self.assertIn('Property Name="DesignMdAssetUrl"', csdl)
        self.assertIn('Property Name="HasPublishedAssets"', csdl)
        self.assertIn('Property Name="HasThumbnail"', csdl)
        self.assertIn('Property Name="ThumbnailVerified"', csdl)
        self.assertIn('Property Name="HasPublishedAssets"', csdl)

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

    def test_publish_requires_verified_thumbnail(self):
        publish = self.actions["Publish"]
        guards = publish.get("guard", [])
        self.assertIn({"type": "is_true", "var": "has_thumbnail"}, guards)
        self.assertIn({"type": "is_true", "var": "thumbnail_verified"}, guards)
        self.assertIn({"type": "is_true", "var": "has_published_assets"}, guards)

        invariants = {
            invariant["name"]: invariant for invariant in self.spec["invariant"]
        }
        self.assertEqual(
            invariants["PublishedRequiresThumbnail"]["assert"],
            "has_thumbnail",
        )
        self.assertEqual(
            invariants["PublishedRequiresVerifiedThumbnail"]["assert"],
            "thumbnail_verified",
        )
        self.assertEqual(
            invariants["PublishedRequiresPublicAssets"]["assert"],
            "has_published_assets",
        )

    def test_archived_languages_have_governed_restore_path(self):
        self.assertIn(
            "Archived",
            self.spec["automaton"]["allow_indefinite_states"],
        )
        archive = self.actions["Archive"]
        self.assertEqual(archive["from"], ["Draft", "UnderReview", "Published"])
        self.assertEqual(archive["to"], "Archived")
        self.assertEqual(archive["params"], ["curator_notes"])
        self.assertIn("governed restore path", archive["hint"])

        restore = self.actions["Restore"]
        self.assertEqual(restore["from"], ["Archived"])
        self.assertEqual(restore["to"], "UnderReview")
        self.assertEqual(restore["params"], ["curator_notes"])

        invariants = {
            invariant["name"]: invariant for invariant in self.spec["invariant"]
        }
        self.assertNotIn("ArchivedIsFinal", invariants)

    def test_submit_for_review_requires_thumbnail(self):
        submit = self.actions["SubmitForReview"]
        guards = submit.get("guard", [])
        self.assertIn({"type": "is_true", "var": "embodiment_verified"}, guards)
        self.assertIn({"type": "is_true", "var": "has_thumbnail"}, guards)
        self.assertIn({"type": "is_true", "var": "thumbnail_verified"}, guards)
        self.assertIn("finalizer-verified embodiment file", submit["hint"])
        self.assertIn("verified gallery thumbnail", submit["hint"])

    def test_quality_finalizer_gates_on_thumbnail(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn verify_thumbnail", source)
        self.assertIn("fn verify_and_mark_thumbnail", source)
        self.assertIn('verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language)?', source)
        self.assertIn('verify_thumbnail(ctx, api_url, headers, language_id, language)?', source)
        self.assertIn('"VerifyThumbnail"', source)
        self.assertIn('"AttachVerifiedThumbnail"', source)
        self.assertIn("entity_bool_any(&fresh, \"has_thumbnail\")", source)
        self.assertIn("fn revise_published_for_thumbnail", source)
        self.assertIn('"thumbnail_file_id"', source)
        self.assertIn('"thumbnail"', source)
        self.assertIn("fn publish_public_assets", source)
        self.assertIn('"AttachPublishedAssets"', source)
        self.assertIn("/api/files/publish-artifact", source)
        self.assertNotIn("/api/files/publish-asset", source)
        self.assertIn('"owner_ref_type": "DesignLanguage"', source)
        self.assertIn('"owner_ref_id": language_id', source)
        self.assertIn('"namespace": "katagami/design-languages"', source)
        self.assertIn('"label": label', source)
        self.assertIn('"artifact"', source)
        self.assertIn('"design_md"', source)
        self.assertIn('"design_md_asset_id"', source)
        self.assertIn('"design_md_asset_url"', source)
        self.assertIn('"image/jpeg"', source)
        self.assertIn("upload decoded browser-renderable image bytes", source)
        self.assertIn("not browser-renderable image bytes", source)

        finalizer = source.index("fn verify_quality_reviewed_languages")
        mark_quality = source.index('"MarkQualityPassed"', finalizer)
        self.assertLess(
            source.index(
                "verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language)?",
                finalizer,
            ),
            source.index(
                "publish_public_assets(ctx, api_url, headers, language_id, &language)?",
                finalizer,
            ),
            "public assets must be published after thumbnail verification",
        )
        self.assertLess(
            source.index(
                "publish_public_assets(ctx, api_url, headers, language_id, &language)?",
                finalizer,
            ),
            mark_quality,
            "public assets must be attached before quality can pass",
        )

    def test_synthesis_finalizer_gates_on_thumbnail(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()
        synth_fn = source[
            source.index("fn verify_synthesized_languages") : source.index(
                "fn verify_quality_reviewed_languages"
            )
        ]

        self.assertIn(
            "verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language)",
            synth_fn,
        )
        self.assertIn(
            "completion requires a valid gallery thumbnail before review",
            synth_fn,
        )

    def test_synthesize_skill_generates_and_attaches_thumbnail(self):
        skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "synthesize-language"
            / "SKILL.md"
        ).read_text()

        for fragment in [
            "Generate and verify the gallery thumbnail",
            "AttachThumbnail",
            "thumbnail_file_id",
            "/katagami/thumbnails/",
            "1440x960",
            "600x400",
            "full_page=False",
            "playwright ready",
            "[exit code: 0]",
            "thumbnail ok: 600x400 JPEG",
            "binary=True",
            "__temperpaw_image",
            "'mime_type': 'image/jpeg'",
            "VerifyThumbnail",
            "Do not call `VerifyThumbnail` or `SubmitForReview`",
        ]:
            self.assertIn(fragment, skill)

        self.assertNotIn("'VerifyThumbnail', {})", skill)
        self.assertNotIn("'SubmitForReview', {})", skill)
        self.assertNotIn("lstrip().startswith('/9j/')", skill)
        self.assertNotIn("thumbnail read returned base64 text", skill)

    def test_quality_review_skill_generates_and_attaches_thumbnail(self):
        skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "review-quality"
            / "SKILL.md"
        ).read_text()

        for fragment in [
            "Generate and verify the gallery thumbnail",
            "AttachThumbnail",
            "thumbnail_file_id",
            "/katagami/thumbnails/",
            "1440x960",
            "600x400",
            "full_page=False",
            "playwright ready",
            "[exit code: 0]",
            "thumbnail ok: 600x400 JPEG",
            "binary=True",
            "__temperpaw_image",
            "'mime_type': 'image/jpeg'",
        ]:
            self.assertIn(fragment, skill)

        self.assertNotIn("'VerifyThumbnail', {})", skill)
        self.assertNotIn("lstrip().startswith('/9j/')", skill)
        self.assertNotIn("thumbnail read returned base64 text", skill)

    def test_curator_agent_lists_thumbnail_artifact_path(self):
        agent = (self.curation_root / "agents" / "curator" / "AGENT.md").read_text()

        self.assertIn("/katagami/thumbnails/{slug}/desktop.jpg", agent)
        self.assertIn("desktop thumbnail", agent)


if __name__ == "__main__":
    unittest.main()
