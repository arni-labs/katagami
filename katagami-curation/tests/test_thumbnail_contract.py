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
        self.assertIn("has_published_assets", self.states)
        # The WASM-trusted thumbnail_verified copy-boolean was deleted in PR-5;
        # thumbnail readiness is now engine-enforced via the cross_entity_state
        # File guard on SubmitForReview/Publish.
        self.assertNotIn("thumbnail_verified", self.states)
        self.assertNotIn("VerifyThumbnail", self.actions)

        attach = self.actions["AttachThumbnail"]
        self.assertEqual(attach["from"], ["Draft", "UnderReview"])
        self.assertEqual(attach["params"], ["thumbnail_file_id"])
        self.assertTrue(self._sets_bool("AttachThumbnail", "has_thumbnail", "true"))
        self.assertFalse(
            self._sets_bool("AttachThumbnail", "thumbnail_verified", "false")
        )
        self.assertTrue(
            self._sets_bool("AttachThumbnail", "has_published_assets", "false")
        )

        attach_verified = self.actions["AttachVerifiedThumbnail"]
        self.assertEqual(attach_verified["from"], ["Draft", "UnderReview"])
        self.assertIn("Revise first", attach_verified["hint"])
        self.assertFalse(
            self._sets_bool("AttachVerifiedThumbnail", "thumbnail_verified", "true")
        )

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

    def test_publish_requires_ready_thumbnail(self):
        publish = self.actions["Publish"]
        guards = publish.get("guard", [])
        self.assertIn({"type": "is_true", "var": "has_thumbnail"}, guards)
        self.assertIn({"type": "is_true", "var": "has_published_assets"}, guards)
        # Engine-enforced thumbnail readiness replaces the deleted
        # is_true thumbnail_verified copy-boolean guard.
        self.assertNotIn({"type": "is_true", "var": "thumbnail_verified"}, guards)
        self.assertIn(
            {
                "type": "cross_entity_state",
                "entity_type": "File",
                "entity_id_source": "thumbnail_file_id",
                "required_status": ["Ready", "Locked"],
            },
            guards,
        )

        invariants = {
            invariant["name"]: invariant for invariant in self.spec["invariant"]
        }
        self.assertEqual(
            invariants["PublishedRequiresThumbnail"]["assert"],
            "has_thumbnail",
        )
        self.assertNotIn("PublishedRequiresVerifiedThumbnail", invariants)
        self.assertEqual(
            invariants["PublishedRequiresPublicAssets"]["assert"],
            "has_published_assets",
        )

    def test_publish_requires_ready_composition_files(self):
        publish = self.actions["Publish"]
        guards = publish.get("guard", [])
        for field in ["landing_file_id", "dashboard_file_id"]:
            self.assertIn(
                {
                    "type": "cross_entity_state",
                    "entity_type": "File",
                    "entity_id_source": field,
                    "required_status": ["Ready", "Locked"],
                },
                guards,
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
        self.assertIn({"type": "is_true", "var": "has_embodiment"}, guards)
        self.assertIn({"type": "is_true", "var": "has_thumbnail"}, guards)
        # The deleted *_verified copy-booleans are replaced by cross_entity_state
        # File Ready/Locked guards on the embodiment and thumbnail Files.
        self.assertNotIn({"type": "is_true", "var": "embodiment_verified"}, guards)
        self.assertNotIn({"type": "is_true", "var": "thumbnail_verified"}, guards)
        for field in ["embodiment_file_id", "thumbnail_file_id"]:
            self.assertIn(
                {
                    "type": "cross_entity_state",
                    "entity_type": "File",
                    "entity_id_source": field,
                    "required_status": ["Ready", "Locked"],
                },
                guards,
            )

    def test_quality_finalizer_gates_on_thumbnail(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn verify_file_field", source)
        self.assertIn("thumbnail_mime_type_is_acceptable", source)
        self.assertIn("thumbnail_payload_looks_text_encoded_image", source)
        # The finalizer no longer dispatches the WASM-trusted VerifyThumbnail
        # verifier action; thumbnail readiness is engine-enforced via the spec
        # cross_entity_state File guard. The byte-level content check stays.
        self.assertNotIn('"VerifyThumbnail"', source)
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
        self.assertIn("thumbnail file looks like text, markup, or base64", source)
        self.assertIn("rather than image bytes", source)

        self.assertNotIn("fn verify_thumbnail", source)
        self.assertNotIn("fn verify_and_mark_thumbnail", source)
        self.assertNotIn('"AttachVerifiedThumbnail"', source)
        self.assertNotIn("fn revise_published_for_thumbnail", source)

        finalizer = source.index("fn verify_quality_reviewed_languages")
        mark_quality = source.index('"MarkQualityPassed"', finalizer)
        self.assertLess(
            source.index(
                "let verified_language = verify_complete_language_artifacts",
                finalizer,
            ),
            source.index(
                "publish_public_assets(ctx, api_url, headers, language_id, &under_review)?",
                finalizer,
            ),
            "public assets must be published after thumbnail verification",
        )
        self.assertLess(
            source.index(
                "publish_public_assets(ctx, api_url, headers, language_id, &under_review)?",
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
            "let verified_language = verify_complete_language_artifacts",
            synth_fn,
        )
        self.assertIn(
            '"thumbnail_file_id"',
            source,
        )
        # VerifyThumbnail dispatch removed in PR-5; readiness is engine-enforced.
        self.assertNotIn('"VerifyThumbnail"', source)

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
