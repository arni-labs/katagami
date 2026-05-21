import unittest
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python < 3.11 fallback
    import tomli as tomllib


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
        self.assertIn("Do not call `temper.list('DesignSources', '')`", skill)
        self.assertIn("For targeted requests, create 1-2 directions", skill)
        self.assertIn("Treat each `execute` call as self-contained", skill)
        self.assertIn("fetch at most the top 3", skill)
        self.assertIn("isinstance(fetched, str)", skill)
        self.assertNotIn("temper.write('/katagami/sources/'", skill)
        self.assertNotIn('temper.write("/katagami/sources/', skill)

    def test_synthesis_uses_single_spec_transition_for_new_languages(self):
        root = Path(__file__).resolve().parents[1]
        skill = (
            root / "agents" / "curator" / "skills" / "synthesize-language" / "SKILL.md"
        ).read_text()

        self.assertIn("use `SetSpec` once", skill)
        self.assertIn("'SetSpec'", skill)
        self.assertIn("'philosophy': json.dumps(philosophy", skill)
        self.assertIn("'tags': json.dumps(tags", skill)
        self.assertNotIn("'WritePhilosophy'", skill)
        self.assertNotIn("'SetTokens'", skill)

    def test_synthesis_uses_generated_entity_ids_not_slugs(self):
        root = Path(__file__).resolve().parents[1]
        skill = (
            root / "agents" / "curator" / "skills" / "synthesize-language" / "SKILL.md"
        ).read_text()
        agent = (root / "agents" / "curator" / "AGENT.md").read_text()

        self.assertIn("created_ids = []", skill)
        self.assertIn("lang = temper.create('DesignLanguages', {})", skill)
        self.assertIn("eid = lang['entity_id']", skill)
        self.assertIn("created_ids.append(eid)", skill)
        self.assertIn("not the slug", skill)
        self.assertIn("DesignLanguage IDs are Temper entity IDs", agent)
        self.assertIn("not slugs", agent)
        self.assertNotIn("temper.create('DesignLanguages', {'Id': slug})", skill)
        self.assertNotIn('temper.create("DesignLanguages", {"Id": slug})', skill)

    def test_synthesis_finalizer_rejects_slug_entity_ids(self):
        root = Path(__file__).resolve().parents[1]
        finalizer = (
            root / "wasm" / "finalize_spawned_session" / "src" / "lib.rs"
        ).read_text()
        synth_fn = finalizer[
            finalizer.index("fn verify_synthesized_languages") : finalizer.index(
                "fn verify_quality_reviewed_languages"
            )
        ]

        self.assertIn("verify_generated_language_identity", finalizer)
        self.assertIn('matches!(job_type, "synthesize" | "evolve_language")', synth_fn)
        self.assertIn("uses its slug as the entity ID", finalizer)
        self.assertIn("generated entity_id", finalizer)

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

    def test_curation_doc_references_are_static_packaged_paths(self):
        root = Path(__file__).resolve().parents[1]
        builder = (
            root / "wasm" / "build_session_message" / "src" / "lib.rs"
        ).read_text()

        self.assertIn("static_doc_reference", builder)
        self.assertIn("reference_instruction_doc", builder)
        self.assertIn("reference_knowledge_docs", builder)
        self.assertIn('workspace_id: DOC_WORKSPACE_ID.to_string()', builder)

        seed = tomllib.loads((root / "seed-data" / "job_templates.toml").read_text())
        instruction_paths = []
        for instance in seed["instance"]:
            if instance["type"] != "CurationJobTemplate":
                continue
            for action in instance.get("actions", []):
                if action["name"] == "Configure":
                    instruction_paths.append(action["params"]["instruction_path"])

        self.assertGreater(len(instruction_paths), 0)
        for doc_path in instruction_paths + [
            "/system/knowledge/design-principles.md",
            "/system/knowledge/quality-standards.md",
            "/system/knowledge/feedback-log.md",
        ]:
            with self.subTest(doc_path=doc_path):
                self.assertTrue(
                    (root / doc_path.lstrip("/")).is_file(),
                    f"{doc_path} must be packaged under katagami-curation",
                )

    def test_curation_child_session_setup_batches_independent_work(self):
        root = Path(__file__).resolve().parents[1]
        builder = (
            root / "wasm" / "build_session_message" / "src" / "lib.rs"
        ).read_text()

        self.assertIn("configure_session_and_create_link", builder)
        self.assertIn("ctx.http_call_batch(&[", builder)
        self.assertIn('"child_setup_batch"', builder)

        run_tail = builder[
            builder.index("let link_id = match configure_session_and_create_link") :
            builder.index('ctx.log("info", "build_session_message: completed successfully")')
        ]
        self.assertLess(
            run_tail.index("configure_session_link("),
            run_tail.index("Katagami.Curation.SessionSpawned"),
            "CurationJob should not be marked Running until the SessionLink is configured",
        )

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
