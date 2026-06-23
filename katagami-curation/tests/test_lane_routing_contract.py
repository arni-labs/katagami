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

    def test_direction_configure_and_queue_uses_routed_job_type(self):
        # Engine-owned identity: Configure + QueueSynthesis collapsed into the single
        # ConfigureAndQueue action (mirrors CurationJob.ConfigureAndSubmit). It still
        # fires direction_queue_synthesis_creates_job, which routes the lane job by the
        # direction's synthesis_job_type. The caller never sets identity (query_id/
        # source_search_job_id/workspace_id) — those are stamped by the SpawnDirection
        # create trigger — so they are no longer ConfigureAndQueue params.
        spec = load_spec("curation_direction.ioa.toml")
        states = {state["name"] for state in spec.get("state", [])}
        queue = action_by_name(spec, "ConfigureAndQueue")
        self.assertEqual(queue["from"], ["Discovered"])
        self.assertEqual(queue["to"], "Synthesizing")
        for identity in ["query_id", "source_search_job_id", "workspace_id"]:
            self.assertNotIn(identity, queue["params"])
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

    def test_spawn_direction_stamps_engine_owned_identity(self):
        # Root-cause fix: the source_search agent calls CurationJob.SpawnDirection with
        # CONTENT only; the engine mints the CurationDirection and stamps its identity
        # from the JOB's own engine-set fields (query_id, Id, workspace_id), so the
        # fan-out barrier (queue_synthesis_widens_query_barrier resolving on the
        # direction's query_id) always lands on the real CurationQuery. The agent never
        # supplies query_id/source_search_job_id/workspace_id.
        job = load_spec("curation_job.ioa.toml")
        spawn = action_by_name(job, "SpawnDirection")

        # Callable N times from Running (no `to`), mirroring RecordProgress.
        self.assertEqual(spawn["from"], ["Running"])
        self.assertNotIn("to", spawn)

        # Params are direction CONTENT only — no identity fields.
        for identity in ["query_id", "source_search_job_id", "workspace_id"]:
            self.assertNotIn(identity, spawn["params"])
        self.assertEqual(
            spawn["params"],
            [
                "task",
                "scope",
                "target_direction",
                "palette_direction",
                "output_type",
                "synthesis_job_type",
                "source_ids",
                "topic_allowlist",
                "synth_input",
            ],
        )

        trigger = next(
            t for t in spawn["triggers"]
            if t["name"] == "spawn_direction_creates_direction"
        )
        self.assertEqual(trigger["target_entity"], "CurationDirection")
        self.assertEqual(trigger["target_action"], "ConfigureAndQueue")
        self.assertEqual(trigger["resolve_target"], {"type": "create"})
        # Identity is stamped from the source_search JOB's own fields:
        # query_id and workspace_id are the job's persisted state, Id is this job's id.
        self.assertEqual(trigger["params_from"]["query_id"], "query_id")
        self.assertEqual(trigger["params_from"]["source_search_job_id"], "Id")
        self.assertEqual(trigger["params_from"]["workspace_id"], "workspace_id")
        # Content is forwarded through too (action params project into the job's
        # fields, which params_from reads).
        for content in [
            "task",
            "scope",
            "target_direction",
            "palette_direction",
            "output_type",
            "synthesis_job_type",
            "source_ids",
            "topic_allowlist",
            "synth_input",
        ]:
            self.assertEqual(trigger["params_from"][content], content)

    def test_research_skill_only_id_is_its_own_job(self):
        # The skill makes ZERO calls that set a direction's identity. It calls
        # CurationJob.SpawnDirection on its OWN job_id with content-only params, and no
        # longer creates CurationDirections or sets query_id/workspace_id on them.
        skill = (ROOT / "agents" / "curator" / "skills" / "research-direction" / "SKILL.md").read_text()
        self.assertIn("temper.action('CurationJobs', job_id, 'SpawnDirection'", skill)
        self.assertNotIn("temper.create('CurationDirections'", skill)
        self.assertNotIn("'QueueSynthesis'", skill)
        # synth_input must no longer carry the unbound query_id/direction_id identity.
        self.assertNotIn("'query_id': query_id", skill)
        self.assertNotIn("'direction_id': direction_id", skill)

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
