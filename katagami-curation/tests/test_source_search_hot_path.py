import unittest
from pathlib import Path


class SourceSearchHotPathTests(unittest.TestCase):
    def test_source_search_does_not_archive_full_pages_synchronously(self):
        root = Path(__file__).resolve().parents[1]
        skill = (
            root / "agents" / "curator" / "skills" / "research-direction" / "SKILL.md"
        ).read_text()

        self.assertIn("archive_status", skill)
        self.assertIn("deferred", skill)
        self.assertIn("'file_id': ''", skill)
        self.assertIn("Do not use `temper.write(...)` during `source_search`", skill)
        self.assertNotIn("temper.write('/katagami/sources/'", skill)
        self.assertNotIn('temper.write("/katagami/sources/', skill)

    def test_storage_model_documents_pawfs_artifact_boundary(self):
        root = Path(__file__).resolve().parents[2]
        commons_app = (root / "katagami-commons" / "APP.md").read_text()
        curator_agent = (
            root / "katagami-curation" / "agents" / "curator" / "AGENT.md"
        ).read_text()

        self.assertIn("Source-search jobs", commons_app)
        self.assertIn("must not synchronously write", commons_app)
        self.assertIn("do not write full fetched pages to PawFS", curator_agent)

    def test_curation_session_link_uses_lower_write_volume_poll_budget(self):
        root = Path(__file__).resolve().parents[1]
        builder = (
            root / "wasm" / "build_session_message" / "src" / "lib.rs"
        ).read_text()

        self.assertIn('"MaxChecks": "80"', builder)
        self.assertNotIn('"MaxChecks": "180"', builder)

    def test_curator_skills_use_preloaded_json_helper_contract(self):
        root = Path(__file__).resolve().parents[1]
        curator_root = root / "agents" / "curator"
        docs = [curator_root / "AGENT.md"]
        docs.extend((curator_root / "skills").glob("*/SKILL.md"))

        for doc in docs:
            text = doc.read_text()
            with self.subTest(doc=doc.relative_to(root)):
                self.assertIn("json.dumps", text)
                self.assertIn("without importing", text)
                self.assertNotIn("import json", text)
                self.assertNotIn("from json", text)


if __name__ == "__main__":
    unittest.main()
