from pathlib import Path
import tomllib
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load_spec(name: str) -> dict:
    return tomllib.loads((ROOT / "specs" / name).read_text())


def action_by_name(spec: dict, name: str) -> dict:
    return next(action for action in spec.get("action", []) if action["name"] == name)


class LaneRoutingContractTest(unittest.TestCase):
    def test_query_tracks_each_output_lane(self):
        spec = load_spec("curation_query.ioa.toml")
        states = {state["name"] for state in spec.get("state", [])}
        actions = {action["name"]: action for action in spec.get("action", [])}

        for state in [
            "output_type",
            "design_language_ids",
            "palette_system_ids",
            "art_style_ids",
        ]:
            self.assertIn(state, states)

        self.assertEqual(actions["PaletteSynthesisComplete"]["to"], "Completed")
        self.assertEqual(actions["PaletteSynthesisComplete"]["params"], ["palette_system_ids"])
        self.assertEqual(actions["ArtStyleSynthesisComplete"]["to"], "Completed")
        self.assertEqual(actions["ArtStyleSynthesisComplete"]["params"], ["art_style_ids"])

    def test_direction_queue_synthesis_uses_routed_job_type(self):
        spec = load_spec("curation_direction.ioa.toml")
        states = {state["name"] for state in spec.get("state", [])}
        queue = action_by_name(spec, "QueueSynthesis")
        trigger = next(
            trigger
            for trigger in queue["triggers"]
            if trigger["name"] == "direction_queue_synthesis_creates_job"
        )

        for state in [
            "output_type",
            "synthesis_job_type",
            "palette_system_ids",
            "art_style_ids",
        ]:
            self.assertIn(state, states)

        self.assertNotEqual(trigger.get("params", {}).get("job_type"), "synthesize")
        self.assertEqual(trigger["params_from"]["job_type"], "synthesis_job_type")

    def test_language_quality_review_triggers_are_not_used_for_direction_fanout(self):
        spec = load_spec("curation_job.ioa.toml")
        complete_synthesis = action_by_name(spec, "CompleteSynthesis")
        triggers = {trigger["name"]: trigger for trigger in complete_synthesis["triggers"]}

        for name in [
            "synthesis_creates_quality_review_job",
            "synthesis_completion_advances_query",
        ]:
            self.assertEqual(
                triggers[name]["guard"],
                {"type": "field_equals", "field": "direction_id", "value": ""},
            )

    def test_palette_and_art_style_complete_their_own_directions(self):
        spec = load_spec("curation_job.ioa.toml")
        palette = action_by_name(spec, "CompletePaletteSynthesis")
        art_style = action_by_name(spec, "CompleteArtStyleSynthesis")

        palette_triggers = {trigger["name"]: trigger for trigger in palette["triggers"]}
        art_style_triggers = {trigger["name"]: trigger for trigger in art_style["triggers"]}

        self.assertEqual(
            palette_triggers["palette_synthesis_completes_direction"]["target_action"],
            "CompletePalette",
        )
        self.assertEqual(
            art_style_triggers["art_style_synthesis_completes_direction"]["target_action"],
            "CompleteArtStyle",
        )

    def test_curation_model_exposes_lane_id_fields(self):
        model = (ROOT / "specs" / "model.csdl.xml").read_text()

        for expected in [
            '<Property Name="OutputType" Type="Edm.String"',
            '<Property Name="SynthesisJobType" Type="Edm.String"',
            '<Property Name="PaletteSystemIds" Type="Edm.String"',
            '<Property Name="ArtStyleIds" Type="Edm.String"',
        ]:
            self.assertIn(expected, model)

    def test_source_search_skill_preserves_palette_query_intent(self):
        skill = (ROOT / "agents" / "curator" / "skills" / "research-direction" / "SKILL.md").read_text()
        launch = (ROOT / "wasm" / "launch_research" / "src" / "lib.rs").read_text()

        self.assertIn("'palette': 'synthesize_palette'", skill)
        self.assertIn("'art_style': 'synthesize_art_style'", skill)
        self.assertIn("'output_type': movement_output_type", skill)
        self.assertIn("infer_output_type(\"palettes trending in 2026\")", launch)
        self.assertIn("infer_output_type(\"pallets trending in 2026\")", launch)


if __name__ == "__main__":
    unittest.main()
