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

    def test_finalizer_never_recovers_created_files(self):
        self.assertNotIn("fn recover_created_file_artifact", self.finalizer)
        self.assertNotIn("recoverable_image_bytes_from_text", self.finalizer)
        self.assertNotIn("recoverable_artifact_bytes_from_text", self.finalizer)
        self.assertNotIn("put_file_value_stream", self.finalizer)
        self.assertNotIn("streaming PUT $value", self.finalizer)
        self.assertNotIn("same file id", self.finalizer)

        ready_check = self.finalizer[
            self.finalizer.index("fn verify_ready_file_artifact") : self.finalizer.index(
                "fn verify_ready_file_metadata"
            )
        ]
        self.assertIn('file_status != "Ready"', ready_check)
        self.assertIn("expected Ready", ready_check)
        self.assertNotIn('file_status == "Created"', ready_check)
        self.assertNotIn("recover", ready_check.lower())

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
