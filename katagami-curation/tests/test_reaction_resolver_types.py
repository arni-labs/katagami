import unittest
from pathlib import Path
import tomllib


class ReactionResolverTypeTests(unittest.TestCase):
    def test_legacy_reactions_file_is_not_shipped(self):
        root = Path(__file__).resolve().parents[1]
        self.assertFalse(
            (root / "reactions" / "reactions.toml").exists(),
            "katagami-curation must not ship legacy reactions.toml",
        )

    def test_inline_create_triggers_exist_for_followup_jobs(self):
        # ARN-88 fan-out barrier: the quality_review job is no longer created by a
        # per-direction synthesis trigger on CurationJob. It is created exactly once
        # by barrier_open_creates_quality_review_job on CurationQuery.SynthesisComplete
        # (asserted in test_barrier_opens_quality_review_on_synthesis_complete). The
        # remaining create-on-CurationJob triggers are the synthesize fan-out and the
        # organize follow-up.
        root = Path(__file__).resolve().parents[1]
        direction_spec = tomllib.loads(
            (root / "specs" / "curation_direction.ioa.toml").read_text()
        )
        job_spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())

        create_triggers = [
            trigger
            for spec in [direction_spec, job_spec]
            for action in spec["action"]
            for trigger in action.get("triggers", [])
            if trigger["kind"] == "entity"
            and trigger["target_entity"] == "CurationJob"
            and trigger["target_action"] == "ConfigureAndSubmit"
            and trigger["resolve_target"]["type"] == "create"
        ]

        self.assertEqual(
            {
                "direction_queue_synthesis_creates_job",
                "review_creates_organization_job",
            },
            {trigger["name"] for trigger in create_triggers},
        )

        for trigger in create_triggers:
            self.assertEqual(trigger["params"]["completion_contract"], "typed-v1")

    def test_old_synthesis_coordination_triggers_are_gone(self):
        # ARN-88: the direction_id=="" guarded triggers that stalled the pipeline,
        # plus the legacy PublishSynthesisCompletion path, are deleted outright.
        root = Path(__file__).resolve().parents[1]
        job_spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())

        trigger_names = {
            trigger["name"]
            for action in job_spec["action"]
            for trigger in action.get("triggers", [])
        }
        for gone in [
            "synthesis_creates_quality_review_job",
            "synthesis_completion_advances_query",
            "legacy_synthesis_completion_advances_query",
        ]:
            self.assertNotIn(gone, trigger_names)

        action_names = {action["name"] for action in job_spec["action"]}
        self.assertNotIn("PublishSynthesisCompletion", action_names)

    def test_inline_query_advancement_triggers_exist(self):
        # ARN-88: synthesis no longer advances the query directly. The remaining
        # CurationJob->CurationQuery triggers are research-completion, organization
        # completion, the empty-fan-out fast-fail, and job-failure propagation.
        root = Path(__file__).resolve().parents[1]
        job_spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())
        triggers = {
            trigger["name"]: trigger
            for action in job_spec["action"]
            for trigger in action.get("triggers", [])
            if trigger.get("kind") == "entity"
        }

        for name, target_action in {
            "research_completion_advances_query": "ResearchComplete",
            "empty_fanout_fails_query": "Fail",
            "organization_completion_finishes_query": "OrganizationComplete",
            "legacy_research_completion_advances_query": "ResearchComplete",
            "legacy_organization_completion_finishes_query": "OrganizationComplete",
            "job_failure_fails_query": "Fail",
        }.items():
            self.assertIn(name, triggers)
            self.assertEqual(triggers[name]["target_entity"], "CurationQuery")
            self.assertEqual(triggers[name]["target_action"], target_action)

        # job_failure_fails_query must only fire for non-direction jobs so a
        # per-direction synthesize failure drains the barrier instead of racing
        # the query into Failed.
        self.assertEqual(
            triggers["job_failure_fails_query"]["guard"],
            {"type": "field_equals", "field": "direction_id", "value": ""},
        )

    def test_fan_out_barrier_counters_and_wiring(self):
        # ARN-88: the engine-provable counter barrier on CurationQuery.
        root = Path(__file__).resolve().parents[1]
        query_spec = tomllib.loads(
            (root / "specs" / "curation_query.ioa.toml").read_text()
        )
        direction_spec = tomllib.loads(
            (root / "specs" / "curation_direction.ioa.toml").read_text()
        )

        # Both barrier counters exist on CurationQuery.
        counters = {
            state["name"]: state
            for state in query_spec["state"]
            if state.get("type") == "counter"
        }
        for name in ["directions_pending", "directions_total"]:
            self.assertIn(name, counters)
            self.assertEqual(counters[name]["initial"], "0")

        query_actions = {a["name"]: a for a in query_spec["action"]}

        # IncrementDirectionsPending widens BOTH counters.
        inc = query_actions["IncrementDirectionsPending"]
        self.assertEqual(
            inc["effect"],
            [
                {"type": "increment", "var": "directions_pending"},
                {"type": "increment", "var": "directions_total"},
            ],
        )

        # DecrementDirectionsPending narrows the live counter and re-evaluates the
        # barrier via a same_id self-reaction.
        dec = query_actions["DecrementDirectionsPending"]
        self.assertEqual(dec["from"], ["Synthesizing"])
        self.assertEqual(dec["effect"], [{"type": "decrement", "var": "directions_pending"}])
        self_trigger = next(
            t for t in dec["triggers"] if t["name"] == "decrement_reevaluates_barrier_open"
        )
        self.assertEqual(self_trigger["target_entity"], "CurationQuery")
        self.assertEqual(self_trigger["target_action"], "SynthesisComplete")
        self.assertEqual(self_trigger["resolve_target"], {"type": "same_id"})
        # Barrier-open advance is scoped to the design_language lane; palette/
        # art_style share the fan-out counters but must not advance to Organizing.
        self.assertEqual(
            self_trigger["guard"],
            {"type": "field_equals", "field": "output_type", "value": "design_language"},
        )

        # SynthesisComplete is gated by the barrier guard.
        synth = query_actions["SynthesisComplete"]
        self.assertEqual(
            synth["guard"],
            [
                {"type": "max_count", "var": "directions_pending", "max": 1},
                {"type": "min_count", "var": "directions_total", "min": 1},
            ],
        )

        # The single quality_review job is created on barrier-open, not per-direction,
        # and is scoped to the languages the fan-out produced via the job `input`
        # (a declared ConfigureAndSubmit param).
        barrier_trigger = next(
            t for t in synth["triggers"] if t["name"] == "barrier_open_creates_quality_review_job"
        )
        self.assertEqual(barrier_trigger["target_entity"], "CurationJob")
        self.assertEqual(barrier_trigger["target_action"], "ConfigureAndSubmit")
        self.assertEqual(barrier_trigger["params"]["job_type"], "quality_review")
        self.assertEqual(barrier_trigger["params_from"]["input"], "design_language_ids")
        self.assertEqual(barrier_trigger["resolve_target"], {"type": "create"})

        # RecordSynthesizeJob appends the vars it is fed (param name == var name for
        # both the synthesize job id list and the accumulated language id list).
        record = query_actions["RecordSynthesizeJob"]
        self.assertEqual(record["params"], ["synthesize_job_ids", "design_language_ids"])
        self.assertEqual(
            record["effect"],
            [
                {"type": "list_append", "var": "synthesize_job_ids"},
                {"type": "list_append", "var": "design_language_ids"},
            ],
        )

        # QueueSynthesis widens the barrier; every terminal direction edge drains it.
        direction_actions = {a["name"]: a for a in direction_spec["action"]}
        queue_triggers = {
            t["name"]: t for t in direction_actions["QueueSynthesis"]["triggers"]
        }
        widen = queue_triggers["queue_synthesis_widens_query_barrier"]
        self.assertEqual(widen["target_action"], "IncrementDirectionsPending")
        self.assertEqual(widen["resolve_target"], {"type": "field", "field": "query_id"})

        for action_name in ["Complete", "CompletePalette", "CompleteArtStyle", "Fail"]:
            narrows = [
                t
                for t in direction_actions[action_name].get("triggers", [])
                if t["target_entity"] == "CurationQuery"
                and t["target_action"] == "DecrementDirectionsPending"
            ]
            self.assertEqual(
                len(narrows), 1, f"{action_name} must drain the barrier exactly once"
            )

    def test_typed_completion_actions_keep_legacy_complete_compatibility(self):
        root = Path(__file__).resolve().parents[1]
        spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())
        actions = {action["name"]: action for action in spec["action"]}

        self.assertIn("Complete", actions)
        for name in [
            "CompleteResearch",
            "CompleteSynthesis",
            "CompleteQualityReview",
            "CompleteOrganization",
            "CompleteRegeneration",
            "CompleteEvolution",
            "CompleteTasteDistillation",
            "CompletePaletteSynthesis",
            "CompleteArtStyleSynthesis",
        ]:
            self.assertIn(name, actions)
            self.assertEqual(actions[name]["to"], "Finalizing")

    def test_job_templates_cover_all_job_types(self):
        root = Path(__file__).resolve().parents[1]
        seed = tomllib.loads((root / "seed-data" / "job_templates.toml").read_text())
        job_types = {
            action["params"]["job_type"]
            for instance in seed["instance"]
            for action in instance.get("actions", [])
            if action["name"] == "Configure"
        }

        self.assertEqual(
            {
                "source_search",
                "synthesize",
                "quality_review",
                "organize_taxonomy",
                "regenerate_embodiment",
                "evolve_language",
                "taste_distillation",
                "synthesize_palette",
                "synthesize_art_style",
            },
            job_types,
        )


if __name__ == "__main__":
    unittest.main()
