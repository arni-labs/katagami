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

    def test_source_fanout_job_creation_is_explicit(self):
        root = Path(__file__).resolve().parents[1]
        direction_spec = tomllib.loads(
            (root / "specs" / "curation_direction.ioa.toml").read_text()
        )
        job_spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())

        create_triggers = {
            trigger["name"]: action["name"]
            for spec in [direction_spec, job_spec]
            for action in spec["action"]
            for trigger in action.get("triggers", [])
            if trigger["kind"] == "entity"
            and trigger["target_entity"] == "CurationJob"
            and trigger["target_action"] == "ConfigureAndSubmit"
            and trigger["resolve_target"]["type"] == "create"
        }

        self.assertEqual(
            {
                "direction_queue_synthesis_creates_job": "QueueSynthesis",
            },
            create_triggers,
        )

        for trigger_name in create_triggers:
            trigger = next(
                trigger
                for spec in [direction_spec, job_spec]
                for action in spec["action"]
                for trigger in action.get("triggers", [])
                if trigger["name"] == trigger_name
            )
            self.assertEqual(trigger["params"]["completion_contract"], "typed-v1")

    def test_typed_completion_actions_do_not_advance_before_validation(self):
        root = Path(__file__).resolve().parents[1]
        job_spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())
        typed_completion_actions = {
            "CompleteResearch",
            "CompleteSynthesis",
            "CompleteQualityReview",
            "CompleteOrganization",
            "CompleteRegeneration",
            "CompleteEvolution",
            "CompleteTasteDistillation",
        }

        for action in job_spec["action"]:
            if action["name"] not in typed_completion_actions:
                continue
            entity_triggers = [
                trigger
                for trigger in action.get("triggers", [])
                if trigger.get("kind") == "entity"
            ]
            self.assertEqual(
                [],
                entity_triggers,
                f"{action['name']} must only submit a completion attempt; follow-up entity side effects must be emitted by validator-gated internal actions",
            )

    def test_validator_gated_query_advancement_triggers_exist(self):
        root = Path(__file__).resolve().parents[1]
        job_spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())
        trigger_owners = {
            trigger["name"]: (action["name"], trigger)
            for action in job_spec["action"]
            for trigger in action.get("triggers", [])
            if trigger.get("kind") == "entity"
        }

        for name, (owner, target_action) in {
            "validated_research_completion_advances_query": (
                "PublishResearchCompletion",
                "ResearchComplete",
            ),
            "validated_synthesis_completion_advances_query": (
                "PublishSynthesisCompletion",
                "SynthesisComplete",
            ),
            "validated_organization_completion_finishes_query": (
                "PublishOrganizationCompletion",
                "OrganizationComplete",
            ),
        }.items():
            self.assertIn(name, trigger_owners)
            action_name, trigger = trigger_owners[name]
            self.assertEqual(action_name, owner)
            self.assertEqual(trigger["target_entity"], "CurationQuery")
            self.assertEqual(trigger["target_action"], target_action)

        research_trigger = trigger_owners["validated_research_completion_advances_query"][1]
        self.assertNotIn("synthesize_job_id", research_trigger.get("params", {}))
        self.assertEqual(
            research_trigger["params_from"]["synthesize_job_id"],
            "followup_job_id",
        )

        self.assertNotIn(
            "review_creates_organization_job",
            trigger_owners,
            "quality review must let finalize_spawned_session prove publishability before organizing",
        )
        self.assertNotIn(
            "job_failure_fails_query",
            trigger_owners,
            "failed jobs must be classified by finalize_spawned_session so transient provider streams can retry",
        )

    def test_repair_required_reenters_same_job(self):
        root = Path(__file__).resolve().parents[1]
        spec = tomllib.loads((root / "specs" / "curation_job.ioa.toml").read_text())
        actions = {action["name"]: action for action in spec["action"]}

        repair = actions["RepairRequired"]
        self.assertEqual(repair["from"], ["Finalizing"])
        self.assertEqual(repair["to"], "Ready")
        self.assertEqual(
            set(repair["params"]),
            {"error_message", "retry_attempts", "input"},
        )
        self.assertEqual(
            ["build_session_message"],
            [
                trigger["name"]
                for trigger in repair.get("triggers", [])
                if trigger.get("kind") == "wasm"
            ],
        )

    def test_completion_state_transitions_are_idempotent_for_concurrent_finalizers(self):
        root = Path(__file__).resolve().parents[1]
        query_spec = tomllib.loads((root / "specs" / "curation_query.ioa.toml").read_text())
        direction_spec = tomllib.loads(
            (root / "specs" / "curation_direction.ioa.toml").read_text()
        )

        query_actions = {action["name"]: action for action in query_spec["action"]}
        direction_actions = {action["name"]: action for action in direction_spec["action"]}

        self.assertIn("Synthesizing", query_actions["ResearchComplete"]["from"])
        self.assertIn("Organizing", query_actions["SynthesisComplete"]["from"])
        self.assertIn("Completed", query_actions["OrganizationComplete"]["from"])
        self.assertIn("Completed", direction_actions["Complete"]["from"])

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
            },
            job_types,
        )

    def test_regeneration_uses_compact_repair_skill(self):
        root = Path(__file__).resolve().parents[1]
        seed = tomllib.loads((root / "seed-data" / "job_templates.toml").read_text())
        templates = {
            action["params"]["job_type"]: action["params"]
            for instance in seed["instance"]
            for action in instance.get("actions", [])
            if action["name"] == "Configure"
        }
        regen = templates["regenerate_embodiment"]

        self.assertEqual(regen["skill_id"], "regenerate-embodiment")
        self.assertEqual(
            regen["instruction_path"],
            "/agents/curator/skills/regenerate-embodiment/SKILL.md",
        )
        self.assertEqual(regen["completion_action"], "CompleteRegeneration")
        self.assertEqual(regen["template_version"], "2")


if __name__ == "__main__":
    unittest.main()
