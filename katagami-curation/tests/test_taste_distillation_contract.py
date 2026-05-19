import unittest
from pathlib import Path
import tomllib
import xml.etree.ElementTree as ET


class TasteDistillationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(__file__).resolve().parents[1]

    def test_taste_rule_lifecycle_and_fields(self):
        spec = tomllib.loads((self.root / "specs" / "taste_rule.ioa.toml").read_text())
        automaton = spec["automaton"]
        self.assertEqual(automaton["name"], "TasteRule")
        self.assertEqual(automaton["initial"], "Proposed")
        self.assertEqual(
            automaton["states"],
            ["Proposed", "Accepted", "Rejected", "Superseded"],
        )

        states = {state["name"]: state for state in spec["state"]}
        for field in [
            "title",
            "polarity",
            "pattern_type",
            "rule_text",
            "rationale",
            "evidence_language_ids",
            "comparator_language_ids",
            "confidence",
            "source_job_id",
            "report_file_id",
            "evidence_fingerprint",
        ]:
            self.assertIn(field, states)

        actions = {action["name"]: action for action in spec["action"]}
        self.assertEqual(actions["Accept"]["from"], ["Proposed"])
        self.assertEqual(actions["Accept"]["to"], "Accepted")
        self.assertEqual(actions["Reject"]["to"], "Rejected")
        self.assertIn("curator_notes", actions["Accept"]["params"])
        self.assertIn("source_job_id", actions["Define"]["params"])
        self.assertIn("evidence_fingerprint", actions["Define"]["params"])

    def test_taste_rule_is_in_curation_model(self):
        ns = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        tree = ET.parse(self.root / "specs" / "model.csdl.xml")
        entity = tree.find(".//edm:EntityType[@Name='TasteRule']", ns)
        self.assertIsNotNone(entity)
        props = {prop.attrib["Name"] for prop in entity.findall("edm:Property", ns)}
        for prop in [
            "Polarity",
            "RuleText",
            "EvidenceLanguageIds",
            "ComparatorLanguageIds",
            "SourceJobId",
            "ReportFileId",
            "EvidenceFingerprint",
        ]:
            self.assertIn(prop, props)

        entity_set = tree.find(".//edm:EntitySet[@Name='TasteRules']", ns)
        self.assertIsNotNone(entity_set)
        self.assertEqual(
            entity_set.attrib["EntityType"],
            "Katagami.Curation.TasteRule",
        )

    def test_taste_distillation_job_template_and_completion(self):
        job_spec = tomllib.loads((self.root / "specs" / "curation_job.ioa.toml").read_text())
        states = {state["name"]: state for state in job_spec["state"]}
        self.assertEqual(states["taste_rule_ids"]["initial"], "[]")
        self.assertEqual(states["report_file_id"]["initial"], "")

        actions = {action["name"]: action for action in job_spec["action"]}
        complete = actions["CompleteTasteDistillation"]
        self.assertEqual(complete["to"], "Finalizing")
        self.assertEqual(
            complete["params"],
            ["taste_rule_ids", "report_file_id", "output"],
        )

        seed = tomllib.loads((self.root / "seed-data" / "job_templates.toml").read_text())
        templates = [
            action["params"]
            for instance in seed["instance"]
            for action in instance.get("actions", [])
            if action["name"] == "Configure"
        ]
        template = next(t for t in templates if t["job_type"] == "taste_distillation")
        self.assertEqual(template["skill_id"], "taste-distillation")
        self.assertEqual(template["completion_action"], "CompleteTasteDistillation")
        self.assertEqual(
            template["instruction_path"],
            "/agents/curator/skills/taste-distillation/SKILL.md",
        )

    def test_distillation_skill_uses_only_archive_and_featured_signals(self):
        skill = (
            self.root
            / "agents"
            / "curator"
            / "skills"
            / "taste-distillation"
            / "SKILL.md"
        ).read_text()

        self.assertIn("Archive is the only negative signal", skill)
        self.assertIn("Featured is the only positive signal", skill)
        self.assertIn("UnderReview is not a rejection", skill)
        self.assertIn("Create proposed rules only", skill)
        self.assertIn("temper.list('DesignLanguages', \"Status eq 'Archived'\")", skill)
        self.assertIn("temper.list('DesignLanguages', \"Status eq 'Published'\")", skill)
        self.assertIn("temper.list('TasteRules', '')", skill)
        self.assertIn("evidence_fingerprint", skill)
        self.assertIn("skipped_duplicate_fingerprints", skill)
        self.assertIn("short, general proposed\nprompt directives", skill)
        self.assertIn("Do not recommend catalog actions", skill)
        self.assertIn("Accepted rules are already incorporated guidance", skill)
        self.assertIn("Rejected rules are negative meta-evidence", skill)
        self.assertIn("normalized_rule_text", skill)
        self.assertIn("skipped_existing_directives", skill)
        self.assertIn("skipped_rejected_precedents", skill)
        self.assertIn("Use `rule_text` for the short directive only", skill)
        self.assertIn("language-agnostic design tests", skill)
        self.assertIn("Generalize across themes", skill)
        self.assertIn("Cluster the evidence before proposing rules", skill)
        self.assertIn("Would this rule improve a future language with a totally different theme?", skill)
        self.assertIn("aim for 8-14 non-duplicate proposed directives", skill)
        self.assertIn("Evidence clusters considered", skill)
        self.assertIn("evidence_clusters_considered", skill)
        self.assertIn("temper.create('TasteRules'", skill)
        self.assertIn("'CompleteTasteDistillation'", skill)
        self.assertNotIn("temper.action('TasteRules', rule['entity_id'], 'Accept'", skill)

    def test_curator_jobs_load_only_accepted_taste_rules(self):
        synthesize = (
            self.root
            / "agents"
            / "curator"
            / "skills"
            / "synthesize-language"
            / "SKILL.md"
        ).read_text()
        review = (
            self.root
            / "agents"
            / "curator"
            / "skills"
            / "review-quality"
            / "SKILL.md"
        ).read_text()

        for skill in [synthesize, review]:
            self.assertIn("temper.list('TasteRules', \"Status eq 'Accepted'\")", skill)
            self.assertIn("Use only Accepted rules", skill)
            self.assertIn("Proposed", skill)
            self.assertIn("Rejected", skill)
            self.assertIn("Superseded", skill)


if __name__ == "__main__":
    unittest.main()
