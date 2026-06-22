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

    def test_language_synthesis_advances_direction_to_reviewing(self):
        # C1/C4: the agent drives its own SubmitForReview, gated by CompleteSynthesis's
        # cross_entity_state guard requiring every produced language to be UnderReview.
        # Synthesis then advances its CurationDirection Synthesizing->Reviewing
        # (Synthesized), which creates THIS direction's per-direction quality_review job
        # and does NOT yet narrow the barrier; the barrier narrows when review
        # terminates. The query still accumulates the full language set for organize scope.
        spec = load_spec("curation_job.ioa.toml")
        complete_synthesis = action_by_name(spec, "CompleteSynthesis")
        triggers = {trigger["name"]: trigger for trigger in complete_synthesis["triggers"]}

        for gone in [
            "synthesis_creates_quality_review_job",
            "synthesis_completion_advances_query",
        ]:
            self.assertNotIn(gone, triggers)

        # C1 keystone: CompleteSynthesis is gated on every produced language already
        # being UnderReview/Published (the agent's in-session SubmitForReview).
        self.assertEqual(
            complete_synthesis["guard"],
            [
                {
                    "type": "cross_entity_state",
                    "entity_type": "DesignLanguage",
                    "entity_id_source": "design_language_ids",
                    "required_status": ["UnderReview", "Published"],
                }
            ],
        )
        self.assertIn("design_language_id", complete_synthesis["params"])

        completes_direction = triggers["synthesis_completes_direction"]
        self.assertEqual(completes_direction["target_entity"], "CurationDirection")
        self.assertEqual(completes_direction["target_action"], "Synthesized")
        # the scalar single-language id is carried to the direction for the
        # Quarantine -> Archive cascade resolver.
        self.assertEqual(
            completes_direction["params_from"]["design_language_id"], "design_language_id"
        )

        records_job = triggers["synthesis_records_synthesize_job"]
        self.assertEqual(records_job["target_entity"], "CurationQuery")
        self.assertEqual(records_job["target_action"], "RecordSynthesizeJob")
        # each param fed under the list var name so kernel ListAppend reads it; the
        # query accumulates both the synthesize job id and the created language ids.
        self.assertEqual(
            records_job["params_from"],
            {"synthesize_job_ids": "Id", "design_language_ids": "design_language_ids"},
        )

    def test_per_direction_review_job_created_on_synthesized(self):
        # C4: per-direction review. The quality_review job is created when each
        # CurationDirection is Synthesized (scoped to that direction's own languages),
        # NOT once at the query barrier. SynthesisComplete is now a bare advance that
        # creates the single organize_taxonomy job.
        direction = load_spec("curation_direction.ioa.toml")
        synthesized = action_by_name(direction, "Synthesized")
        self.assertEqual(synthesized["from"], ["Synthesizing"])
        self.assertEqual(synthesized["to"], "Reviewing")
        d_triggers = {t["name"]: t for t in synthesized["triggers"]}
        review_job = d_triggers["direction_synthesized_creates_review_job"]
        self.assertEqual(review_job["target_entity"], "CurationJob")
        self.assertEqual(review_job["target_action"], "ConfigureAndSubmit")
        self.assertEqual(review_job["params"]["job_type"], "quality_review")
        # per-direction scope: this direction's own languages, plus its direction_id
        # so a review failure routes to job_failure_fails_direction.
        self.assertEqual(review_job["params_from"]["input"], "design_language_ids")
        self.assertEqual(review_job["params_from"]["direction_id"], "Id")
        self.assertEqual(review_job["resolve_target"], {"type": "create"})

        query = load_spec("curation_query.ioa.toml")
        synth = action_by_name(query, "SynthesisComplete")
        self.assertEqual(
            synth["guard"],
            [
                {"type": "max_count", "var": "directions_pending", "max": 1},
                {"type": "min_count", "var": "directions_total", "min": 1},
                {"type": "min_count", "var": "directions_completed", "min": 1},
            ],
        )
        q_triggers = {t["name"]: t for t in synth.get("triggers", [])}
        # the per-query review job is gone; the single organize job is created here.
        self.assertNotIn("barrier_open_creates_quality_review_job", q_triggers)
        organize = q_triggers["barrier_open_creates_organize_job"]
        self.assertEqual(organize["params"]["job_type"], "organize_taxonomy")
        self.assertEqual(organize["resolve_target"], {"type": "create"})

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
        # C5: launch_research is deleted. Lane inference (both query-level and
        # per-direction) lives in the source_search agent skill; the skill records the
        # concrete output_type on the query at CompleteResearch.
        skill = (ROOT / "agents" / "curator" / "skills" / "research-direction" / "SKILL.md").read_text()

        self.assertIn("'palette': 'synthesize_palette'", skill)
        self.assertIn("'art_style': 'synthesize_art_style'", skill)
        self.assertIn("'output_type': movement_output_type", skill)
        # per-query lane inference moved from launch_research WASM into the skill.
        self.assertIn("output_type = 'palette'", skill)
        self.assertIn("output_type = 'art_style'", skill)
        self.assertIn("output_type = 'design_language'", skill)
        # the skill records the concrete lane on the query via CompleteResearch.
        self.assertIn("'output_type': output_type", skill)

    def test_launch_research_wasm_is_deleted(self):
        # C5: the launch_research module and its manifest entries are gone; the
        # source_search job is created by an inline entity trigger on Submit.
        self.assertFalse(
            (ROOT / "wasm" / "launch_research").exists(),
            "launch_research WASM module must be deleted",
        )
        app = (ROOT / "app.toml").read_text()
        self.assertNotIn('name = "launch_research"', app)
        build = (ROOT / "wasm" / "build.sh").read_text()
        self.assertNotIn("launch_research", build)
        # No spec may reference the deleted WASM module.
        for spec_name in ["curation_query.ioa.toml", "curation_job.ioa.toml"]:
            spec_text = (ROOT / "specs" / spec_name).read_text()
            self.assertNotIn('module = "launch_research"', spec_text)

        # The inline Submit trigger creates the source_search job (mirrors
        # direction_queue_synthesis_creates_job).
        query = load_spec("curation_query.ioa.toml")
        submit = action_by_name(query, "Submit")
        trigger = next(
            t for t in submit["triggers"]
            if t["name"] == "submit_creates_source_search_job"
        )
        self.assertEqual(trigger["target_entity"], "CurationJob")
        self.assertEqual(trigger["target_action"], "ConfigureAndSubmit")
        self.assertEqual(trigger["params"]["job_type"], "source_search")
        self.assertEqual(trigger["resolve_target"], {"type": "create"})


if __name__ == "__main__":
    unittest.main()
