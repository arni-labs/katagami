from pathlib import Path
import tomllib
import unittest


CURATION_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = CURATION_ROOT.parent
CURRENT_GENESIS_DEPS = {
    "temperpaw/paw-fs": "737c0ac23d95b8d412cb4f632c2926b720835eef",
    "temperpaw/paw-agent": "c832c1cd0a8bd492436ca2fb93ae86f870eb8209",
    "temperpaw/paw-research": "3a35ee25aa4f97430fe09c956412d6a31e15d6bf",
    "katagami/katagami-commons": "a06df6b4b0a0dc95c73a38a2c971be44754426ec",
}


class GenesisSourceContractTest(unittest.TestCase):
    def test_curation_depends_on_current_genesis_apps(self):
        app = tomllib.loads((CURATION_ROOT / "app.toml").read_text())
        pinned_deps = dict(dep.rsplit("@", 1) for dep in app["dependencies"])

        self.assertEqual(CURRENT_GENESIS_DEPS, pinned_deps)

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
        self.assertIn("clean_generated_files", script)
        self.assertIn("find \"$dir\" -type d", script)
        self.assertIn("-name 'target'", script)
        self.assertIn("--exclude='__pycache__/'", script)
        self.assertIn("--exclude='*.py[co]'", script)
        self.assertIn("--exclude='target/'", script)
        self.assertIn("pin_curation_commons_dependency", script)
        self.assertIn('local commons_hash="${4:-}"', script)
        self.assertIn(
            'push_app "katagami-curation" "katagami-curation" "${WORK_DIR}/katagami-curation" "$commons_hash"',
            script,
        )
        self.assertNotIn("mapfile", script)
        self.assertNotIn("App.PublishNewVersion", script)
        self.assertLess(
            script.index('push_app "katagami-commons"'),
            script.index('push_app "katagami-curation"'),
        )


if __name__ == "__main__":
    unittest.main()
