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
