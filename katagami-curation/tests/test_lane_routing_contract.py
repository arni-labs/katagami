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

    def test_language_synthesis_drains_barrier_not_direct_advance(self):
        # ARN-88: per-direction synthesis must NOT create the quality_review job
        # nor advance the query directly (the old direction_id=="" guarded triggers
        # never fired and stalled the pipeline). CompleteSynthesis now only completes
        # its CurationDirection and records the synthesize job id on the query; the
        # CurationDirection.Complete edge drains the fan-out barrier.
        spec = load_spec("curation_job.ioa.toml")
        complete_synthesis = action_by_name(spec, "CompleteSynthesis")
        triggers = {trigger["name"]: trigger for trigger in complete_synthesis["triggers"]}

        for gone in [
            "synthesis_creates_quality_review_job",
            "synthesis_completion_advances_query",
        ]:
            self.assertNotIn(gone, triggers)

        completes_direction = triggers["synthesis_completes_direction"]
        self.assertEqual(completes_direction["target_entity"], "CurationDirection")
        self.assertEqual(completes_direction["target_action"], "Complete")

        records_job = triggers["synthesis_records_synthesize_job"]
        self.assertEqual(records_job["target_entity"], "CurationQuery")
        self.assertEqual(records_job["target_action"], "RecordSynthesizeJob")
        # each param fed under the list var name so kernel ListAppend reads it; the
        # query accumulates both the synthesize job id and the created language ids.
        self.assertEqual(
            records_job["params_from"],
            {"synthesize_job_ids": "Id", "design_language_ids": "design_language_ids"},
        )

    def test_quality_review_created_once_on_barrier_open(self):
        # ARN-88: the single quality_review job is created by the barrier-open
        # advance on CurationQuery.SynthesisComplete, gated by the counter barrier.
        query = load_spec("curation_query.ioa.toml")
        synth = action_by_name(query, "SynthesisComplete")
        self.assertEqual(
            synth["guard"],
            [
                {"type": "max_count", "var": "directions_pending", "max": 1},
                {"type": "min_count", "var": "directions_total", "min": 1},
            ],
        )
        triggers = {trigger["name"]: trigger for trigger in synth["triggers"]}
        barrier = triggers["barrier_open_creates_quality_review_job"]
        self.assertEqual(barrier["target_entity"], "CurationJob")
        self.assertEqual(barrier["target_action"], "ConfigureAndSubmit")
        self.assertEqual(barrier["params"]["job_type"], "quality_review")
        self.assertEqual(barrier["resolve_target"], {"type": "create"})

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
