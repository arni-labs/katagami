import unittest
from pathlib import Path
import tomllib
import xml.etree.ElementTree as ET


class QualityReviewFinalizeContractTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.curation_root = root / "katagami-curation"

    def test_curation_job_defaults_to_typed_completion_contract(self):
        spec = tomllib.loads(
            (self.curation_root / "specs" / "curation_job.ioa.toml").read_text()
        )
        states = {state["name"]: state for state in spec["state"]}

        self.assertEqual(
            states["completion_contract"]["initial"],
            "typed-v1",
            "new CurationJobs must use the typed finalize path by default",
        )

        tree = ET.parse(self.curation_root / "specs" / "model.csdl.xml")
        ns = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        job = tree.find(".//edm:EntityType[@Name='CurationJob']", ns)
        self.assertIsNotNone(job)
        completion_contract = job.find("edm:Property[@Name='CompletionContract']", ns)
        self.assertIsNotNone(completion_contract)
        self.assertEqual(
            completion_contract.attrib["DefaultValue"],
            "typed-v1",
            "OData metadata must match the IOA completion_contract default",
        )

    def test_finalize_defaults_missing_contract_to_typed_path(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('.unwrap_or("typed-v1")', source)

    def test_finalize_reattaches_design_md_after_revise_reset(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('entity_bool_any(&fresh, "has_design_md")', source)
        self.assertIn('"AttachDesignMd"', source)
        self.assertIn(
            "Revise resets has_design_md but leaves design_md_file_id intact",
            source,
        )

    def test_finalize_terminalizes_typed_jobs_with_wasm_callbacks(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn set_terminal_job_callback", source)
        self.assertIn("set_success_result(action, &params);", source)
        self.assertIn('fn set_failed_job_callback', source)
        self.assertIn('set_success_result("Fail"', source)
        self.assertNotIn("publish_job_progression", source)
        self.assertNotIn("Katagami.Curation.FinalizeCompletion", source)
        self.assertNotIn("Katagami.Curation.Fail", source)

    def test_failed_job_session_cleanup_tolerates_completed_sessions(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn record_session_failure", source)
        self.assertIn("if session_is_terminal(session_status)", source)
        self.assertIn('Ok("session already terminal")', source)

    def test_finalize_triggers_fail_job_on_wasm_failure(self):
        spec = tomllib.loads(
            (self.curation_root / "specs" / "curation_job.ioa.toml").read_text()
        )
        actions = {action["name"]: action for action in spec["action"]}

        for name in [
            "Complete",
            "CompleteResearch",
            "CompleteSynthesis",
            "CompleteQualityReview",
            "CompleteOrganization",
            "CompleteRegeneration",
            "CompleteEvolution",
        ]:
            trigger = next(
                trigger
                for trigger in actions[name]["triggers"]
                if trigger["name"] == "finalize_spawned_session"
            )
            self.assertEqual(trigger["on_failure"], "Fail")

    def test_review_skill_reviews_published_artifacts_without_reattaching_design_md(self):
        skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "review-quality"
            / "SKILL.md"
        ).read_text()

        self.assertIn("Published artifact review path", skill)
        self.assertIn("A published language must not call `AttachDesignMd`", skill)
        self.assertIn("If the language is `Published`, do not execute this step", skill)
        self.assertIn("do not re-attach DESIGN.md", skill)
        self.assertIn("fields.get(''.join(part.capitalize() for part in name.split('_')))", skill)

    def test_finalizer_design_md_writer_bypasses_workspace_filesystem_actions(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertNotIn("Temper.MkDir", source)
        self.assertNotIn("Temper.CreateFile", source)
        self.assertNotIn("Temper.ResolvePath", source)
        self.assertNotIn("Temper.IncrementFileCount", source)
        self.assertIn('/tdata/Directories', source)
        self.assertIn('/tdata/Files', source)
        self.assertIn("Files('{file_id}')/$value", source)


if __name__ == "__main__":
    unittest.main()
