import re
import unittest
from pathlib import Path

# The DesignLanguage spec fields that carry structured JSON. Every one of them
# must reach Temper through json.dumps(...): Python repr emits single quotes,
# which is not JSON, and the value is then permanently unreadable by the UI.
SPEC_FIELDS = (
    "philosophy",
    "tokens",
    "rules",
    "layout_principles",
    "guidance",
    "tags",
    "imagery_direction",
)

_ACTION_BLOCK = re.compile(
    r"temper\.action\(\s*'[^']+',\s*[^,]+,\s*'(?P<action>\w+)',\s*\{"
    r"(?P<body>.*?)\n\}\)",
    re.DOTALL,
)


def action_blocks(skill):
    """Every `temper.action(...)` payload in a skill doc as (action, body)."""
    return [(m.group("action"), m.group("body")) for m in _ACTION_BLOCK.finditer(skill)]


# Params the spec accepts that the skill deliberately does not document.
# `provenance` is declared on SubmitDesignLanguage but is referenced nowhere in
# this repo — no writer sets it, no reader consumes it, and it carries no hint
# distinct from the action's own. Documenting a shape nobody has ever written
# would be a guess, so it stays out until something actually uses it.
UNDOCUMENTED_SPEC_PARAMS = {"provenance"}


def spec_action_params(spec_text, action_name):
    """The declared `params` list of one action in an .ioa.toml spec."""
    start = spec_text.find(f'name = "{action_name}"')
    if start < 0:
        return []
    nxt = spec_text.find("[[action]]", start)
    block = spec_text[start : nxt if nxt > 0 else len(spec_text)]
    params = re.search(r"params\s*=\s*\[(.*?)\]", block, re.DOTALL)
    return re.findall(r'"([a-zA-Z_]+)"', params.group(1)) if params else []


class SourceSearchHotPathTests(unittest.TestCase):
    def test_source_search_does_not_archive_full_pages_synchronously(self):
        root = Path(__file__).resolve().parents[1]
        skill = (
            root / "agents" / "curator" / "skills" / "research-direction" / "SKILL.md"
        ).read_text()

        self.assertIn("archive_status", skill)
        self.assertIn("deferred", skill)
        self.assertIn("'file_id': ''", skill)
        self.assertIn("Do not use `temper.write(...)` during `source_search`", skill)
        self.assertIn("Do not call `temper.list('DesignSources', '')`", skill)
        self.assertIn("spawn 1-2 directions", skill)
        self.assertIn("Treat each `execute` call as self-contained", skill)
        self.assertIn("fetch at most the top 3", skill)
        self.assertIn("isinstance(fetched, str)", skill)
        self.assertNotIn("temper.write('/katagami/sources/'", skill)
        self.assertNotIn('temper.write("/katagami/sources/', skill)

    def test_synthesis_uses_single_spec_transition_for_new_languages(self):
        root = Path(__file__).resolve().parents[1]
        skill = (
            root / "agents" / "curator" / "skills" / "synthesize-language" / "SKILL.md"
        ).read_text()

        self.assertIn("use `SetSpec` once", skill)
        self.assertIn("'SetSpec'", skill)
        self.assertNotIn("'WritePhilosophy'", skill)
        self.assertNotIn("'SetTokens'", skill)

    def test_synthesis_skill_documents_every_param_the_spec_accepts(self):
        # The skill IS the contract the curator agent follows, so a param the
        # spec accepts but the skill omits is a param that never gets sent.
        # This shipped: the documented payload carried 31 of 36 params, dropping
        # parent_ids / lineage_type / generation_number / provenance_tier, so
        # every remix authored from this skill was published as an original
        # with no link back to its parent. Comparing against the spec — rather
        # than a hand-listed set — means a param added to the spec later fails
        # here until the skill teaches the agent to send it.
        root = Path(__file__).resolve().parents[1]
        commons = Path(__file__).resolve().parents[2] / "katagami-commons"
        skill = (
            root / "agents" / "curator" / "skills" / "synthesize-language" / "SKILL.md"
        ).read_text()
        spec = (commons / "specs" / "design_language.ioa.toml").read_text()

        declared = spec_action_params(spec, "SubmitDesignLanguage")
        self.assertTrue(declared, "could not read SubmitDesignLanguage params")

        bodies = [b for action, b in action_blocks(skill) if action == "SubmitDesignLanguage"]
        self.assertTrue(bodies, "skill documents no SubmitDesignLanguage call")

        for param in declared:
            if param in UNDOCUMENTED_SPEC_PARAMS:
                continue
            for body in bodies:
                self.assertIn(
                    f"'{param}'",
                    body,
                    f"SubmitDesignLanguage accepts '{param}' but the skill never sends it",
                )

    def test_synthesis_json_dumps_every_spec_field_in_every_submit_block(self):
        # Auditing one match lets a second, broken payload ship untouched: the
        # one-call hot path used to pass its object params as bare ellipses
        # while the SetSpec block forty lines above spelled out json.dumps, and
        # the old first-match assertion was satisfied by SetSpec alone.
        root = Path(__file__).resolve().parents[1]
        skill = (
            root / "agents" / "curator" / "skills" / "synthesize-language" / "SKILL.md"
        ).read_text()

        # 'AuthorComplete' is not an action on DesignLanguages. The one-call
        # hot path is 'SubmitDesignLanguage'; the ladder entry is 'SetSpec'.
        self.assertNotIn("AuthorComplete", skill)
        self.assertIn("'SubmitDesignLanguage'", skill)

        blocks = action_blocks(skill)
        self.assertEqual(
            skill.count("temper.action("),
            len(blocks),
            "an action payload did not parse, so the json.dumps audit skipped it",
        )

        def keys_in(body, field):
            return list(re.finditer(r"['\"]%s['\"]\s*:\s*" % field, body))

        spec_blocks = [
            (action, body)
            for action, body in blocks
            if any(keys_in(body, field) for field in SPEC_FIELDS)
        ]
        actions = sorted(action for action, _ in spec_blocks)
        self.assertIn("SetSpec", actions)
        self.assertIn("SubmitDesignLanguage", actions)

        covered = set()
        for action, body in spec_blocks:
            for field in SPEC_FIELDS:
                for match in keys_in(body, field):
                    covered.add(field)
                    value = body[match.end() :]
                    with self.subTest(action=action, field=field):
                        self.assertTrue(
                            value.startswith("json.dumps("),
                            "%s passes '%s': %s — every object/array param must "
                            "be json.dumps(...), never str(), repr, or an "
                            "f-string" % (action, field, value.split("\n")[0]),
                        )

        self.assertEqual(set(SPEC_FIELDS), covered)

    def test_synthesis_uses_generated_entity_ids_not_slugs(self):
        root = Path(__file__).resolve().parents[1]
        skill = (
            root / "agents" / "curator" / "skills" / "synthesize-language" / "SKILL.md"
        ).read_text()
        agent = (root / "agents" / "curator" / "AGENT.md").read_text()

        self.assertIn("created_ids = []", skill)
        self.assertIn("lang = temper.create('DesignLanguages', {})", skill)
        self.assertIn("eid = lang['entity_id']", skill)
        self.assertIn("created_ids.append(eid)", skill)
        self.assertIn("not the slug", skill)
        self.assertIn("DesignLanguage IDs are Temper entity IDs", agent)
        self.assertIn("not slugs", agent)
        self.assertNotIn("temper.create('DesignLanguages', {'Id': slug})", skill)
        self.assertNotIn('temper.create("DesignLanguages", {"Id": slug})', skill)

    def test_synthesis_finalizer_rejects_slug_entity_ids(self):
        root = Path(__file__).resolve().parents[1]
        finalizer = (
            root / "wasm" / "finalize_spawned_session" / "src" / "lib.rs"
        ).read_text()
        synth_fn = finalizer[
            finalizer.index("fn verify_synthesized_languages") : finalizer.index(
                "fn verify_quality_reviewed_languages"
            )
        ]

        self.assertIn("fn verify_language_identity", finalizer)
        self.assertIn("verify_language_identity(language_id, &language)?", synth_fn)
        self.assertIn("uses its slug as the entity ID", finalizer)
        self.assertIn("generated entity_id", finalizer)

    def test_storage_model_documents_pawfs_artifact_boundary(self):
        root = Path(__file__).resolve().parents[2]
        commons_app = (root / "katagami-commons" / "APP.md").read_text()
        curator_agent = (
            root / "katagami-curation" / "agents" / "curator" / "AGENT.md"
        ).read_text()

        self.assertIn("Source-search jobs", commons_app)
        self.assertIn("must not synchronously write", commons_app)
        self.assertIn("do not write full fetched pages to PawFS", curator_agent)

    def test_curation_session_link_uses_lower_write_volume_poll_budget(self):
        root = Path(__file__).resolve().parents[1]
        builder = (
            root / "wasm" / "build_session_message" / "src" / "lib.rs"
        ).read_text()

        self.assertIn('"MaxChecks": "80"', builder)
        self.assertNotIn('"MaxChecks": "180"', builder)

    def test_session_builder_has_no_embedded_doc_fallback(self):
        root = Path(__file__).resolve().parents[1]
        builder = (
            root / "wasm" / "build_session_message" / "src" / "lib.rs"
        ).read_text()
        production_builder = builder.split("#[cfg(test)]", 1)[0]

        self.assertNotIn("include_str!", production_builder)
        self.assertNotIn("embedded_loaded_doc", production_builder)
        self.assertNotIn("embedded_doc_content", production_builder)
        self.assertNotIn("Fallback read commands", production_builder)
        self.assertNotIn("file was not available", production_builder)

    def test_curator_skills_use_preloaded_json_helper_contract(self):
        root = Path(__file__).resolve().parents[1]
        curator_root = root / "agents" / "curator"
        docs = [curator_root / "AGENT.md"]
        docs.extend((curator_root / "skills").glob("*/SKILL.md"))

        for doc in docs:
            text = doc.read_text()
            with self.subTest(doc=doc.relative_to(root)):
                self.assertIn("json.dumps", text)
                self.assertIn("without importing", text)
                self.assertNotIn("import json", text)
                self.assertNotIn("from json", text)


if __name__ == "__main__":
    unittest.main()
