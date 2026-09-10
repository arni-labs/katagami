import json
from pathlib import Path
import tomllib
import unittest
import xml.etree.ElementTree as ET

import cedarpy


COMMONS = Path(__file__).resolve().parents[2] / "katagami-commons"
SPEC_PATH = COMMONS / "specs" / "narrative_structure.ioa.toml"
RECORDS_PATH = COMMONS / "fixtures" / "narrative-structures.json"
CSDL_PATH = COMMONS / "specs" / "model.csdl.xml"
POLICY_PATH = COMMONS / "specs" / "policies" / "narrative_structure.cedar"
RUNTIME_POLICY_PATH = COMMONS / "policies" / "narrative_structure.cedar"

APPROVED_CELL_LINKS = {
    "allegories",
    "choose-your-own-stories",
    "diary-fiction",
    "epistolary-fiction",
    "frame-stories",
    "hypertext-fiction",
    "linked-stories",
}
APPROVED_IDS = {
    "abstract-episodic-structure",
    "alternating-parallel-narrative",
    "anachronic-modular-narrative",
    "aristotelian-complication-and-denouement",
    "braided-essay",
    "branching-narrative",
    "circular-narrative",
    "cumulative-narrative",
    "diary-form",
    "eight-sequence-structure",
    "epistolary-form",
    "field-three-act-structure",
    "forking-path-narrative",
    "frame-narrative",
    "freytag-five-part-dramatic-structure",
    "hypertext-narrative",
    "in-medias-res",
    "interlace-narrative",
    "jo-ha-kyu",
    "kishotenketsu",
    "linked-story-cycle",
    "mise-en-abyme",
    "multiperspectival-narrative",
    "narrative-anthology",
    "nested-narrative",
    "pancha-sandhi",
    "reverse-chronology",
    "ring-composition",
    "split-screen-narrative",
    "sustained-allegory",
    "thompson-four-part-structure",
    "yorke-five-act-structure",
}
REJECTED_IDS = {
    "collage-narrative",
    "picaresque-progression",
    "snyder-beat-sheet",
    "todorov-equilibrium-progression",
}
PUBLIC_DOMAIN_URLS = {
    "https://www.briantriber.com/WritingSamples/Freytag_Drama/Freytag_11_Ch2_P2.html",
    "https://www.gutenberg.org/files/1974/1974-h/1974-h.htm",
}


def _by_name(spec: dict[str, object], section: str) -> dict[str, dict[str, object]]:
    entries = spec[section]
    assert isinstance(entries, list)
    return {entry["name"]: entry for entry in entries}


def _set_bool(variable: str, value: str) -> dict[str, str]:
    return {"type": "set_bool", "var": variable, "value": value}


def _json_param(params: dict[str, object], name: str) -> object:
    encoded = params[name]
    assert isinstance(encoded, str)
    return json.loads(encoded)


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
        assert "non-empty name, slug, and instruction" in verifier["hint"]
        assert "aliases" in verifier["hint"]

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
            "SubmitForReview",
        ]:
            assert _set_bool("structure_verified", "false") in self.actions[name].get(
                "effect", []
            )

    def test_only_identity_inputs_mark_identity_present(self) -> None:
        for name, action in self.actions.items():
            effects = action.get("effect", [])
            if name in {"SetIdentity", "SubmitNarrativeStructure"}:
                assert _set_bool("has_identity", "true") in effects
            else:
                assert _set_bool("has_identity", "true") not in effects

    def test_publish_requires_the_authored_contract_and_verification(self) -> None:
        required = {
            "has_identity",
            "has_instruction",
            "has_movements",
            "has_exemplars",
            "has_sources",
            "structure_verified",
        }
        publish_guards = self.actions["Publish"]["guard"]
        assert {guard["var"] for guard in publish_guards} == required

        required_invariants = {
            "PublishedRequiresIdentity",
            "PublishedRequiresInstruction",
            "PublishedRequiresMovements",
            "PublishedRequiresExemplars",
            "PublishedRequiresSources",
            "PublishedRequiresVerifiedStructure",
        }
        assert set(self.invariants) == required_invariants
        assert all(item["when"] == ["Published"] for item in self.invariants.values())

        submit_guards = self.actions["SubmitForReview"]["guard"]
        assert {guard["var"] for guard in submit_guards} == required - {
            "structure_verified"
        }

        assert self.actions["Publish"]["effect"] == [
            {"type": "increment", "var": "version"}
        ]


class NarrativeStructureRecordTests(unittest.TestCase):
    def setUp(self) -> None:
        self.payload = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
        self.records = self.payload["records"]

    def test_payload_is_prepared_for_the_declared_entity_action(self) -> None:
        assert self.payload["format"] == "katagami:narrative-structures/v1"
        assert self.payload["entity_set"] == "NarrativeStructures"
        assert self.payload["deployment"] == "not-deployed"
        assert len(self.records) == 32
        assert {record["id"] for record in self.records} == APPROVED_IDS
        assert REJECTED_IDS.isdisjoint(record["id"] for record in self.records)
        assert all(
            record["action"] == "SubmitNarrativeStructure" for record in self.records
        )

    def test_json_parameters_match_the_string_backed_odata_contract(self) -> None:
        json_fields = {
            "aliases",
            "movements",
            "exemplars",
            "sources",
            "encyclopedia_cell_ids",
        }
        for record in self.records:
            params = record["params"]
            for field in json_fields:
                assert isinstance(params[field], str)
                json.loads(params[field])

    def test_every_record_has_the_publish_evidence_fields(self) -> None:
        for record in self.records:
            params = record["params"]
            assert params["name"]
            assert params["slug"] == record["id"]
            assert params["instruction"]
            aliases = _json_param(params, "aliases")
            exemplars = _json_param(params, "exemplars")
            sources = _json_param(params, "sources")
            encyclopedia_cell_ids = _json_param(params, "encyclopedia_cell_ids")
            assert isinstance(aliases, list) and aliases
            assert isinstance(exemplars, list) and len(exemplars) >= 2
            assert isinstance(sources, list) and sources
            assert isinstance(encyclopedia_cell_ids, list)
            assert set(encyclopedia_cell_ids) <= APPROVED_CELL_LINKS

            for exemplar in exemplars:
                assert set(exemplar) <= {"work", "creator"}
                assert exemplar["work"]
            for source in sources:
                assert source["url"].startswith("https://")
                assert source["handling"] in {
                    "public_domain",
                    "cited_and_paraphrased",
                }

    def test_movements_are_a_closed_union(self) -> None:
        kinds: set[str] = set()
        for record in self.records:
            movements = _json_param(record["params"], "movements")
            assert isinstance(movements, dict)
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

    def test_an_optional_epilogue_is_a_rule_not_a_fixed_required_part(self) -> None:
        record = next(
            item for item in self.records if item["id"] == "thompson-four-part-structure"
        )
        movements = _json_param(record["params"], "movements")
        assert isinstance(movements, dict)
        assert movements["kind"] == "rule"
        rule = movements["rule"].lower()
        assert "optional" in rule
        assert "epilogue" in rule

    def test_variable_or_conditional_movements_use_rule_form(self) -> None:
        records = {item["id"]: item for item in self.records}

        for record_id in {
            "aristotelian-complication-and-denouement",
            "forking-path-narrative",
        }:
            movements = _json_param(records[record_id]["params"], "movements")
            assert isinstance(movements, dict)
            assert movements["kind"] == "rule"

        forking_rule = _json_param(
            records["forking-path-narrative"]["params"], "movements"
        )["rule"].lower()
        assert "two or more" in forking_rule

        aristotelian_rule = _json_param(
            records["aristotelian-complication-and-denouement"]["params"],
            "movements",
        )["rule"].lower()
        assert "when present" in aristotelian_rule

    def test_task_required_non_latin_aliases_are_preserved(self) -> None:
        aliases = {
            record["id"]: set(_json_param(record["params"], "aliases"))
            for record in self.records
        }
        assert "起承転結" in aliases["kishotenketsu"]
        assert "序破急" in aliases["jo-ha-kyu"]
        assert "पञ्चसन्धि" in aliases["pancha-sandhi"]

    def test_only_public_domain_source_text_is_marked_for_reuse(self) -> None:
        public_domain_urls = {
            source["url"]
            for record in self.records
            for source in _json_param(record["params"], "sources")
            if source["handling"] == "public_domain"
        }
        assert public_domain_urls == PUBLIC_DOMAIN_URLS

    def test_production_verified_cell_links_are_exact(self) -> None:
        actual = {
            cell_id
            for record in self.records
            for cell_id in _json_param(record["params"], "encyclopedia_cell_ids")
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
            "HasIdentity",
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

    def test_runtime_policy_matches_the_spec_copy_and_declares_its_stance(self) -> None:
        policy = POLICY_PATH.read_text(encoding="utf-8")
        assert RUNTIME_POLICY_PATH.read_text(encoding="utf-8") == policy
        assert policy.splitlines()[0].startswith("// STANCE:")

    def test_policy_decisions_keep_mutation_with_owners_and_curation(self) -> None:
        policy = POLICY_PATH.read_text(encoding="utf-8")

        def decide(
            principal_type: str,
            principal_id: str,
            attributes: dict[str, str],
            action: str,
        ) -> cedarpy.Decision:
            entities = [
                {
                    "uid": {"type": principal_type, "id": principal_id},
                    "attrs": {"id": principal_id, **attributes},
                    "parents": [],
                },
                {
                    "uid": {"type": "NarrativeStructure", "id": "ring-composition"},
                    "attrs": {"id": "ring-composition"},
                    "parents": [],
                },
            ]
            result = cedarpy.is_authorized(
                {
                    "principal": {"type": principal_type, "id": principal_id},
                    "action": {"type": "Action", "id": action},
                    "resource": {
                        "type": "NarrativeStructure",
                        "id": "ring-composition",
                    },
                    "context": {},
                },
                policy,
                entities,
            )
            return result.decision

        for principal_type, principal_id, attributes in [
            ("Customer", "owner", {"role": "owner"}),
            ("Agent", "curation", {"agent_type": "curation-service"}),
        ]:
            for action in ["SetInstruction", "SubmitForReview", "Archive", "create"]:
                assert (
                    decide(principal_type, principal_id, attributes, action)
                    == cedarpy.Decision.Allow
                )
            for action in ["MarkStructureVerified", "Publish", "update", "delete"]:
                assert (
                    decide(principal_type, principal_id, attributes, action)
                    == cedarpy.Decision.Deny
                )

        for principal_type, principal_id in [
            ("System", "system"),
            ("Agent", "service:wasm-runtime"),
        ]:
            for action in ["MarkStructureVerified", "Publish"]:
                assert (
                    decide(principal_type, principal_id, {}, action)
                    == cedarpy.Decision.Allow
                )
            for action in ["SetInstruction", "create", "update", "delete"]:
                assert (
                    decide(principal_type, principal_id, {}, action)
                    == cedarpy.Decision.Deny
                )

        for principal_type, principal_id, attributes in [
            ("Admin", "admin", {}),
            ("Customer", "curator", {"role": "curator"}),
            ("Customer", "member", {"role": "member"}),
            ("Agent", "undeclared", {}),
            ("Agent", "contributor", {"agent_type": "contributor"}),
            ("Agent", "operator", {"agent_type": "operator"}),
            ("Agent", "wasm", {"agent_type": "wasm-module"}),
        ]:
            assert (
                decide(principal_type, principal_id, attributes, "SetInstruction")
                == cedarpy.Decision.Deny
            )
            assert (
                decide(principal_type, principal_id, attributes, "Publish")
                == cedarpy.Decision.Deny
            )
            assert (
                decide(principal_type, principal_id, attributes, "create")
                == cedarpy.Decision.Deny
            )
            assert (
                decide(
                    principal_type,
                    principal_id,
                    attributes,
                    "MarkStructureVerified",
                )
                == cedarpy.Decision.Deny
            )
