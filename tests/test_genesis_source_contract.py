from pathlib import Path
import tomllib
import unittest


CURATION_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = CURATION_ROOT.parent
CURRENT_COMMONS_HASH = "9fb0622f3caa7a6d885856f233e42410fc19f3fc"


class GenesisSourceContractTest(unittest.TestCase):
    def test_curation_depends_on_current_genesis_commons(self):
        app = tomllib.loads((CURATION_ROOT / "app.toml").read_text())
        commons_deps = [
            dep
            for dep in app["dependencies"]
            if dep.startswith("katagami/katagami-commons@")
        ]

        self.assertEqual([f"katagami/katagami-commons@{CURRENT_COMMONS_HASH}"], commons_deps)

    def test_app_guides_describe_multi_lane_palette_and_art_style_jobs(self):
        curation_guide = (CURATION_ROOT / "APP.md").read_text()
        commons_guide = (REPO_ROOT / "katagami-commons" / "APP.md").read_text()

        for expected in [
            "synthesize_palette",
            "CompletePaletteSynthesis",
            "synthesize_art_style",
            "CompleteArtStyleSynthesis",
            "Multi-lane remix",
        ]:
            self.assertIn(expected, curation_guide)

        for expected in ["PaletteSystem", "ArtStyle", "synthesize_palette", "synthesize_art_style"]:
            self.assertIn(expected, commons_guide)

    def test_genesis_sync_promotes_and_verifies_latest(self):
        script = (REPO_ROOT / "scripts" / "sync-genesis-katagami.sh").read_text()

        self.assertIn("Temper.Git.PublishNewVersion", script)
        self.assertIn("LatestVersionHash", script)
        self.assertIn("publish_latest", script)
        self.assertIn("latest_hash_for", script)
        self.assertIn('d.get("fields", {}).get("LatestVersionHash", "")', script)
        self.assertIn("configure_git_http_headers \"$dest\"", script)
        self.assertIn("git -C \"$repo\" config --add \"$key\" \"X-Tenant-Id: ${TENANT}\"", script)
        self.assertNotIn("mapfile", script)
        self.assertNotIn("App.PublishNewVersion", script)
        self.assertLess(
            script.index('push_app "katagami-commons"'),
            script.index('push_app "katagami-curation"'),
        )


if __name__ == "__main__":
    unittest.main()
