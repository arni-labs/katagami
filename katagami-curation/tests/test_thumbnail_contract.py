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

        attach = self.actions["AttachThumbnail"]
        self.assertEqual(attach["from"], ["Draft", "UnderReview", "Published"])
        self.assertEqual(attach["params"], ["thumbnail_file_id"])
        self.assertEqual(attach["effect"], "set has_thumbnail true")

        csdl = (self.commons_root / "specs" / "model.csdl.xml").read_text()
        self.assertIn('Property Name="ThumbnailFileId"', csdl)
        self.assertIn('Property Name="HasThumbnail"', csdl)

    def test_thumbnail_is_not_a_v1_publish_guard(self):
        publish = self.actions["Publish"]
        guards = publish.get("guard", [])
        self.assertNotIn({"type": "is_true", "var": "has_thumbnail"}, guards)

    def test_quality_finalizer_gates_on_thumbnail(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn verify_thumbnail", source)
        self.assertIn('verify_thumbnail(ctx, api_url, headers, language_id, &language)?', source)
        self.assertIn('"thumbnail_file_id"', source)
        self.assertIn('"thumbnail"', source)
        self.assertIn('"image/jpeg"', source)
        self.assertIn("looks like text or markup, not a JPEG image", source)

        self.assertLess(
            source.index("verify_thumbnail(ctx, api_url, headers, language_id, &language)?"),
            source.index('"MarkQualityPassed"'),
            "thumbnail verification must happen before quality can pass",
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
            "thumbnail ok: 600x400 JPEG",
        ]:
            self.assertIn(fragment, skill)

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
            "thumbnail ok: 600x400 JPEG",
        ]:
            self.assertIn(fragment, skill)

    def test_curator_agent_lists_thumbnail_artifact_path(self):
        agent = (self.curation_root / "agents" / "curator" / "AGENT.md").read_text()

        self.assertIn("/katagami/thumbnails/{slug}/desktop.jpg", agent)
        self.assertIn("desktop thumbnail", agent)


if __name__ == "__main__":
    unittest.main()
