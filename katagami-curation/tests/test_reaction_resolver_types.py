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
                "synthesis_creates_quality_review_job",
                "review_creates_organization_job",
            },
            {trigger["name"] for trigger in create_triggers},
        )

        for trigger in create_triggers:
            self.assertEqual(trigger["params"]["completion_contract"], "typed-v1")

    def test_inline_query_advancement_triggers_exist(self):
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
            "synthesis_completion_advances_query": "SynthesisComplete",
            "organization_completion_finishes_query": "OrganizationComplete",
            "legacy_research_completion_advances_query": "ResearchComplete",
            "legacy_synthesis_completion_advances_query": "SynthesisComplete",
            "legacy_organization_completion_finishes_query": "OrganizationComplete",
            "job_failure_fails_query": "Fail",
        }.items():
            self.assertIn(name, triggers)
            self.assertEqual(triggers[name]["target_entity"], "CurationQuery")
            self.assertEqual(triggers[name]["target_action"], target_action)

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
            },
            job_types,
        )


if __name__ == "__main__":
    unittest.main()
