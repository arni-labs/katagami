import json
from pathlib import Path
import tomllib
import unittest
import xml.etree.ElementTree as ET


COMMONS = Path(__file__).resolve().parents[2] / "katagami-commons"
SPEC_PATH = COMMONS / "specs" / "narrative_structure.ioa.toml"
RECORDS_PATH = COMMONS / "fixtures" / "narrative-structures.json"
CSDL_PATH = COMMONS / "specs" / "model.csdl.xml"
POLICY_PATH = COMMONS / "specs" / "policies" / "narrative_structure.cedar"

APPROVED_CELL_LINKS = {
    "allegories",
    "choose-your-own-stories",
    "diary-fiction",
    "epistolary-fiction",
    "frame-stories",
    "hypertext-fiction",
    "linked-stories",
}
REJECTED_IDS = {
    "collage-narrative",
    "picaresque-progression",
    "snyder-beat-sheet",
    "todorov-equilibrium-progression",
}


def _by_name(spec: dict[str, object], section: str) -> dict[str, dict[str, object]]:
    entries = spec[section]
    assert isinstance(entries, list)
    return {entry["name"]: entry for entry in entries}


def _set_bool(variable: str, value: str) -> dict[str, str]:
    return {"type": "set_bool", "var": variable, "value": value}


class NarrativeStructureSpecTests(unittest.TestCase):
    def setUp(self) -> None:
        self.spec = tomllib.loads(SPEC_PATH.read_text(encoding="utf-8"))
        self.actions = _by_name(self.spec, "action")
        self.invariants = _by_name(self.spec, "invariant")

    def test_lifecycle_matches_writing_style(self) -> None:
        automaton = self.spec["automaton"]
        assert automaton == {
            "name": "NarrativeStructure",
            "states": ["Draft", "UnderReview", "Published", "Archived"],
            "initial": "Draft",
            "allow_indefinite_states": [
                "Draft",
                "UnderReview",
                "Published",
                "Archived",
            ],
        }

    def test_only_internal_verifier_can_mark_the_contract_verified(self) -> None:
        verifier = self.actions["MarkStructureVerified"]
        assert verifier["kind"] == "internal"
        assert _set_bool("structure_verified", "true") in verifier["effect"]

        for name, action in self.actions.items():
            if name == "MarkStructureVerified":
                continue
            assert _set_bool("structure_verified", "true") not in action.get(
                "effect", []
            )

    def test_authoring_changes_invalidate_verification(self) -> None:
        for name in [
            "SetIdentity",
            "SetInstruction",
            "SetMovements",
            "SetExemplars",
            "SetSources",
            "SetEncyclopediaLinks",
            "SubmitNarrativeStructure",
        ]:
            assert _set_bool("structure_verified", "false") in self.actions[name].get(
                "effect", []
            )

    def test_publish_requires_the_authored_contract_and_verification(self) -> None:
        required = {
            "has_instruction",
            "has_movements",
            "has_exemplars",
            "has_sources",
            "structure_verified",
        }
        publish_guards = self.actions["Publish"]["guard"]
        assert {guard["var"] for guard in publish_guards} == required

        required_invariants = {
            "PublishedRequiresInstruction",
            "PublishedRequiresMovements",
            "PublishedRequiresExemplars",
            "PublishedRequiresSources",
            "PublishedRequiresVerifiedStructure",
        }
        assert set(self.invariants) == required_invariants
        assert all(item["when"] == ["Published"] for item in self.invariants.values())


class NarrativeStructureRecordTests(unittest.TestCase):
    def setUp(self) -> None:
        self.payload = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
        self.records = self.payload["records"]

    def test_payload_is_prepared_for_the_declared_entity_action(self) -> None:
        assert self.payload["format"] == "katagami:narrative-structures/v1"
        assert self.payload["entity_set"] == "NarrativeStructures"
        assert self.payload["deployment"] == "not-deployed"
        assert len(self.records) == 32
        assert len({record["id"] for record in self.records}) == 32
        assert REJECTED_IDS.isdisjoint(record["id"] for record in self.records)
        assert all(
            record["action"] == "SubmitNarrativeStructure" for record in self.records
        )

    def test_every_record_has_the_publish_evidence_fields(self) -> None:
        for record in self.records:
            params = record["params"]
            assert params["name"]
            assert params["slug"] == record["id"]
            assert params["instruction"]
            assert params["aliases"]
            assert len(params["exemplars"]) >= 2
            assert params["sources"]
            assert set(params["encyclopedia_cell_ids"]) <= APPROVED_CELL_LINKS

            for exemplar in params["exemplars"]:
                assert set(exemplar) <= {"work", "creator"}
                assert exemplar["work"]
            for source in params["sources"]:
                assert source["url"].startswith("https://")
                assert source["handling"] in {
                    "public_domain",
                    "cited_and_paraphrased",
                }

    def test_movements_are_a_closed_union(self) -> None:
        kinds: set[str] = set()
        for record in self.records:
            movements = record["params"]["movements"]
            kind = movements["kind"]
            kinds.add(kind)
            if kind == "fixed":
                assert set(movements) == {"kind", "parts"}
                sequence = movements["parts"]
            elif kind == "rule":
                assert set(movements) == {"kind", "rule", "example"}
                assert movements["rule"]
                sequence = movements["example"]
            else:
                raise AssertionError(f"unknown movement kind: {kind}")

            assert sequence
            assert [part["position"] for part in sequence] == list(
                range(1, len(sequence) + 1)
            )
            assert all(set(part) == {"position", "name"} for part in sequence)
            assert all(part["name"] for part in sequence)

        assert kinds == {"fixed", "rule"}

    def test_task_required_non_latin_aliases_are_preserved(self) -> None:
        aliases = {
            record["id"]: set(record["params"]["aliases"])
            for record in self.records
        }
        assert "起承転結" in aliases["kishotenketsu"]
        assert "序破急" in aliases["jo-ha-kyu"]
        assert "पञ्चसन्धि" in aliases["pancha-sandhi"]

    def test_production_verified_cell_links_are_exact(self) -> None:
        actual = {
            cell_id
            for record in self.records
            for cell_id in record["params"]["encyclopedia_cell_ids"]
        }
        assert actual == APPROVED_CELL_LINKS


class NarrativeStructureRegistrationTests(unittest.TestCase):
    def test_csdl_registers_the_entity_fields_and_set(self) -> None:
        root = ET.parse(CSDL_PATH).getroot()
        namespace = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        entity = root.find(".//edm:EntityType[@Name='NarrativeStructure']", namespace)
        assert entity is not None
        properties = {
            item.attrib["Name"] for item in entity.findall("edm:Property", namespace)
        }
        assert {
            "Id",
            "State",
            "Name",
            "Slug",
            "Instruction",
            "Aliases",
            "Movements",
            "Exemplars",
            "Sources",
            "EncyclopediaCellIds",
            "HasInstruction",
            "HasMovements",
            "HasExemplars",
            "HasSources",
            "StructureVerified",
            "VerificationReport",
            "Version",
        } <= properties
        assert root.find(
            ".//edm:EntitySet[@Name='NarrativeStructures']"
            "[@EntityType='Katagami.NarrativeStructure']",
            namespace,
        ) is not None

    def test_policy_names_every_mutating_action(self) -> None:
        spec = tomllib.loads(SPEC_PATH.read_text(encoding="utf-8"))
        policy = POLICY_PATH.read_text(encoding="utf-8")
        mutating_actions = {
            action["name"]
            for action in spec["action"]
            if action["kind"] != "output"
        }
        assert "resource is NarrativeStructure" in policy
        assert {
            name for name in mutating_actions if f'Action::"{name}"' not in policy
        } == set()
