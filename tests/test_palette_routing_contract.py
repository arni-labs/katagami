from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PaletteRoutingContractTest(unittest.TestCase):
    def test_palette_query_routes_to_palette_system_not_design_language(self):
        finalizer = (ROOT / "wasm" / "finalize_spawned_session" / "src" / "lib.rs").read_text()
        direction_spec = (ROOT / "specs" / "curation_direction.ioa.toml").read_text()
        query_spec = (ROOT / "specs" / "curation_query.ioa.toml").read_text()
        palette_skill = (ROOT / "agents" / "curator" / "skills" / "synthesize-palette" / "SKILL.md").read_text()

        self.assertIn("infer_output_type_from_task", finalizer)
        self.assertIn('"synthesize_palette"', finalizer)
        self.assertIn('"output_type": output_type', finalizer)
        self.assertIn('"palette_system_ids"', finalizer)
        self.assertIn('"output_type": "palette_system"', finalizer)
        self.assertIn('"design_language_ids": "[]"', finalizer)
        self.assertIn("job_type", finalizer)

        self.assertIn('name = "output_type"', direction_spec)
        self.assertIn('name = "palette_system_ids"', direction_spec)
        self.assertIn('params = ["design_language_ids", "palette_system_ids", "output_type"]', direction_spec)
        self.assertIn('name = "output_type"', query_spec)
        self.assertIn('name = "palette_system_ids"', query_spec)

        self.assertIn("PaletteSystems", palette_skill)
        self.assertIn("CompletePaletteSynthesis", palette_skill)
        self.assertNotIn("temper.create('DesignLanguages'", palette_skill)
        self.assertNotIn('temper.create("DesignLanguages"', palette_skill)


if __name__ == "__main__":
    unittest.main()
