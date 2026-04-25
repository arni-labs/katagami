import unittest
from pathlib import Path
import tomllib


class ReactionResolverTypeTests(unittest.TestCase):
    def test_specs_do_not_use_nested_action_triggers(self):
        root = Path(__file__).resolve().parents[1]
        for path in (root / "specs").glob("*.ioa.toml"):
            spec = tomllib.loads(path.read_text())
            for action in spec.get("action", []):
                self.assertNotIn(
                    "triggers",
                    action,
                    f"{path.name} uses nested action.triggers, which current Temper does not parse",
                )

    def test_temper_native_create_reactions_exist_for_followup_jobs(self):
        root = Path(__file__).resolve().parents[1]
        reactions = tomllib.loads((root / "reactions" / "reactions.toml").read_text())

        create_reactions = [
            reaction
            for reaction in reactions["reaction"]
            if reaction["then"]["entity_type"] == "CurationJob"
            and reaction["resolve_target"]["type"] == "create"
        ]

        self.assertEqual(
            {
                "direction_queue_synthesis_creates_job",
                "synthesis_creates_quality_review_job",
                "review_creates_organization_job",
            },
            {reaction["name"] for reaction in create_reactions},
        )

        for reaction in create_reactions:
            self.assertEqual(reaction["then"]["action"], "ConfigureAndSubmit")
            self.assertEqual(reaction["then"]["params"]["completion_contract"], "typed-v1")

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
