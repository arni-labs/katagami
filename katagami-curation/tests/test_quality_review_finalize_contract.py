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

        self.assertIn('bool_field(&fresh_bools, "has_design_md")', source)
        self.assertIn('"AttachDesignMd"', source)
        self.assertIn(
            "Revise resets has_design_md but leaves design_md_file_id intact",
            source,
        )


if __name__ == "__main__":
    unittest.main()
