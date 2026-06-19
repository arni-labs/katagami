import unittest
from pathlib import Path


class ArtifactReadyContractTests(unittest.TestCase):
    def setUp(self):
        self.curation_root = Path(__file__).resolve().parents[1]
        self.finalizer = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()
        self.skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "synthesize-language"
            / "SKILL.md"
        ).read_text()

    def test_finalizer_requires_ready_file_metadata_before_value_read(self):
        self.assertIn("fn verify_ready_file_artifact", self.finalizer)
        self.assertIn('load_entity(ctx, api_url, headers, "Files", file_id)', self.finalizer)
        self.assertIn('file_status != "Ready"', self.finalizer)
        self.assertIn("expected Ready", self.finalizer)
        for field in ["Path", "Name", "MimeType"]:
            self.assertIn(field, self.finalizer)

        verify_file_value = self.finalizer.split("fn verify_file_value", 1)[1].split(
            "fn verify_file_body", 1
        )[0]
        self.assertIn("verify_ready_file_artifact(", verify_file_value)
        self.assertLess(
            verify_file_value.index("verify_ready_file_artifact("),
            verify_file_value.index("read_file_value("),
        )

    def test_finalizer_recovers_created_thumbnail_files_before_defecting(self):
        self.assertIn("fn recover_created_file_artifact", self.finalizer)
        self.assertIn("fn recoverable_image_bytes_from_text", self.finalizer)

        ready_check = self.finalizer[
            self.finalizer.index("fn verify_ready_file_artifact") : self.finalizer.index(
                "fn verify_thumbnail"
            )
        ]
        self.assertIn('file_status == "Created"', ready_check)
        self.assertIn("recover_created_file_artifact(", ready_check)
        self.assertLess(
            ready_check.index("recover_created_file_artifact("),
            ready_check.index("expected Ready"),
            "Created file recovery must happen before returning the Ready-state defect",
        )
        self.assertIn("streaming PUT $value", self.finalizer)
        self.assertIn("same file id", self.finalizer)

    def test_finalizer_does_not_create_fallback_design_languages(self):
        self.assertNotIn("create_fallback_synthesis_language", self.finalizer)
        self.assertNotIn("fallback_synthesis_seed_fields", self.finalizer)
        self.assertNotIn(
            "deterministic fallback DesignLanguage",
            self.finalizer,
        )

    def test_finalizer_does_not_deterministically_generate_creative_artifacts(self):
        synth = self.finalizer[
            self.finalizer.index("fn verify_synthesized_languages") : self.finalizer.index(
                "fn verify_generated_language_identity"
            )
        ]
        self.assertNotIn("repair_synthesis_partial_language(", synth)
        verify_compositions = self.finalizer.split("fn verify_compositions", 1)[1].split(
            "fn refresh_composition_projections", 1
        )[0]
        self.assertNotIn("refresh_composition_projections(", verify_compositions)
        verify_design_md = self.finalizer.split("fn verify_design_md", 1)[1].split(
            "fn refresh_design_md_projection", 1
        )[0]
        self.assertNotIn("refresh_design_md_projection(", verify_design_md)
        verify_shadcn = self.finalizer.split("fn verify_shadcn_export", 1)[1].split(
            "fn refresh_shadcn_export_projection", 1
        )[0]
        self.assertNotIn("refresh_shadcn_export_projection(", verify_shadcn)

    def test_finalizer_surfaces_structured_slug_entity_defects(self):
        self.assertIn("missing_design_language_entity", self.finalizer)
        self.assertIn("invalid_reported_language_ids", self.finalizer)
        self.assertIn("build_repair_instructions", self.finalizer)
        self.assertIn("repair_instructions", self.finalizer)

    def test_finalizer_routes_all_artifact_verification_through_repair_contract(self):
        self.assertIn("fn push_repairable_language_defect", self.finalizer)
        self.assertIn("fn apply_published_revision_status", self.finalizer)

        quality_start = self.finalizer.index("fn verify_quality_reviewed_languages")
        quality_end = self.finalizer.index("fn ensure_language_under_review", quality_start)
        quality = self.finalizer[quality_start:quality_end]

        for fragment in [
            "verify_design_md(",
            "verify_shadcn_export(",
            "verify_shadcn_component_spec(",
            "verify_shadcn_preview_shots(",
            "push_repairable_language_defect(",
            '"repair_pending": true',
            "quality_review completed without any design_language_ids",
        ]:
            self.assertIn(fragment, quality)

        synth_start = self.finalizer.index("fn verify_synthesized_languages")
        synth_end = self.finalizer.index("fn verify_generated_language_identity", synth_start)
        synth = self.finalizer[synth_start:synth_end]
        composition_defect = synth.index(
            "completion found composition defects for DesignLanguage"
        )
        submit_for_review = synth.index('"SubmitForReview"')
        self.assertLess(
            composition_defect,
            submit_for_review,
            "synthesis must collect composition defects before advancing to review",
        )

    def test_curator_skill_attaches_only_verified_ready_files(self):
        for token in [
            "def require_ready_file",
            "temper.get('Files', file_id)",
            "'Status'",
            "'Ready'",
            "'Path'",
            "'Name'",
            "'MimeType'",
            "'SizeBytes'",
        ]:
            self.assertIn(token, self.skill)

        for token in [
            "embodiment_file_id = require_ready_file(",
            "thumbnail_file_id = require_ready_file(",
            "component_spec_file_id = require_ready_file(",
            "preview_shots_file_id = require_ready_file(",
        ]:
            self.assertIn(token, self.skill)
