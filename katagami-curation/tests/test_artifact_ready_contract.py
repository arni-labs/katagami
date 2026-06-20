import unittest
from pathlib import Path


class ArtifactReadyContractTests(unittest.TestCase):
    """Artifact-ready contracts enforced by the finalizer and authoring skill."""

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
        self.assertIn("expected Ready", self.finalizer)
        for field in ["Path", "Name", "MimeType", "SizeBytes"]:
            self.assertIn(field, self.finalizer)

        verify_file_artifact = self.finalizer.split("fn verify_file_artifact", 1)[1].split(
            "fn verify_ready_file_artifact", 1
        )[0]
        self.assertIn("verify_ready_file_artifact(", verify_file_artifact)
        self.assertLess(
            verify_file_artifact.index("verify_ready_file_artifact("),
            verify_file_artifact.index("read_file_value("),
        )

    def test_finalizer_recovers_created_thumbnail_files_before_defecting(self):
        self.assertIn("fn recover_created_file_artifact", self.finalizer)
        self.assertIn("fn confirm_recovered_file_artifact", self.finalizer)
        self.assertIn("FILE_RECOVERY_CONFIRM_ATTEMPTS", self.finalizer)
        self.assertNotIn('artifact_kind != "thumbnail"', self.finalizer)
        self.assertIn("recoverable_artifact_bytes_from_text", self.finalizer)
        self.assertIn("fn recoverable_image_bytes_from_text", self.finalizer)
        self.assertIn("FILE_UPLOAD_STREAM_CHUNK_BYTES", self.finalizer)

        ready_check = self.finalizer[
            self.finalizer.index("fn verify_ready_file_artifact") : self.finalizer.index(
                "fn verify_ready_file_metadata"
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

    def test_finalizer_tolerates_recovery_projection_lag(self):
        self.assertIn("fn entity_status_value", self.finalizer)
        self.assertIn("let field_status = fields", self.finalizer)
        self.assertIn('.or_else(|| fields.get("Status"))', self.finalizer)
        self.assertIn('aggregate_status == "Created"', self.finalizer)
        self.assertIn("fn recovered_file_value_is_readable", self.finalizer)
        self.assertIn("because $value is readable while status projection", self.finalizer)
        self.assertIn("Failed to confirm recovered Files", self.finalizer)

    def test_finalizer_normalizes_legacy_inline_file_projection_shape(self):
        self.assertIn("fn file_size_bytes", self.finalizer)
        self.assertIn("inline_file_content(file)", self.finalizer)
        self.assertIn("fn file_name_from_path", self.finalizer)
        self.assertIn("file_name_from_path(&path)", self.finalizer)
        self.assertIn("using inline Content fallback", self.finalizer)
        self.assertIn("default_artifact_mime_type", self.finalizer)
        self.assertIn('"embodiment" | "landing_composition" | "dashboard_composition"', self.finalizer)

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


if __name__ == "__main__":
    unittest.main()
