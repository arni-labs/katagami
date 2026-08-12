"""The art-style rules must reach art-style jobs, and only art-style jobs.

`knowledge/rules/` used to hold one file. Rules 46-48 governed art styles but
sat at the end of `design-language.md`, under headings about radius and
typography — including the consent gate, which is the only rule in the library
whose breach is a legal problem rather than an ugly page. They now live in
`art-style.md`.

A split like this fails quietly in two directions, so both are checked here:

* fold them back together and the art-style lane is judged on typography while
  the design-language lane inherits rules it cannot act on;
* leave the routing alone and the art-style lane gets no rulebook at all, which
  is worse than the status quo it replaced.

The check runs all the way to the committed ``.wasm``, because that blob is
what production actually inlines: the nested ``knowledge/rules/`` path does not
resolve as a deployed File entity, so every session falls through to the
compiled-in copy. A rulebook edit that is not in the blob has not shipped.
"""

import re
import tomllib
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES_DIR = ROOT / "knowledge" / "rules"
DESIGN_LANGUAGE = RULES_DIR / "design-language.md"
ART_STYLE = RULES_DIR / "art-style.md"
WASM_SRC = ROOT / "wasm" / "build_session_message" / "src" / "lib.rs"
WASM_BLOB = ROOT / "wasm" / "build_session_message" / "build_session_message.wasm"
JOB_TEMPLATES = ROOT / "seed-data" / "job_templates.toml"

# One distinctive clause from each art-style rule. Short enough to survive
# rewording of the surrounding sentence, specific enough that no
# design-language rule could contain it by accident.
ART_STYLE_MARKERS = {
    "1 (the prompt)": "the aesthetic prompt itself remains byte-for-byte the same across models",
    "2 (behavioral proof)": "Reference images are optional examples, never the backbone",
    "3 (sources and rights)": "attribution alone is not permission",
}

ART_STYLE_SKILL = "synthesize-art-style"
DESIGN_LANGUAGE_SKILL = "synthesize-language"


def _numbered_rules(text):
    return [
        int(match.group(1))
        for match in re.finditer(r"^(\d+)\. ", text, flags=re.MULTILINE)
    ]


def _configured_templates():
    seed = tomllib.loads(JOB_TEMPLATES.read_text())
    return [
        action["params"]
        for instance in seed["instance"]
        for action in instance.get("actions", [])
        if action["name"] == "Configure"
    ]


class ArtStyleRulebookTests(unittest.TestCase):
    """The file exists, is a rulebook, and holds all three rules."""

    def test_the_art_style_rulebook_is_a_sibling_of_the_design_language_one(self):
        self.assertTrue(
            ART_STYLE.is_file(),
            f"{ART_STYLE} is missing — the art-style rules have no rulebook",
        )
        text = ART_STYLE.read_text()
        self.assertTrue(text.startswith("# Art style rules\n"))
        self.assertEqual(
            _numbered_rules(text),
            [1, 2, 3],
            "the art-style rulebook must carry rules 1-3 and nothing else",
        )

    def test_every_art_style_rule_survived_the_move(self):
        text = ART_STYLE.read_text()
        for rule, marker in ART_STYLE_MARKERS.items():
            with self.subTest(rule=rule):
                self.assertIn(marker, text)


class DesignLanguageRulebookTests(unittest.TestCase):
    """What is left behind is 45 design-language rules, unrenumbered."""

    def test_the_design_language_rulebook_keeps_rules_one_to_fortyfive(self):
        self.assertEqual(_numbered_rules(DESIGN_LANGUAGE.read_text()), list(range(1, 46)))

    def test_the_design_language_rulebook_no_longer_governs_art_styles(self):
        text = DESIGN_LANGUAGE.read_text()
        self.assertNotIn(
            "## Art style",
            text,
            "the art-style section is back in the design-language rulebook",
        )
        for rule, marker in ART_STYLE_MARKERS.items():
            with self.subTest(rule=rule):
                self.assertNotIn(
                    marker,
                    text,
                    "the two rulebooks have been folded back together",
                )


class RulebookRoutingTests(unittest.TestCase):
    """Each authoring lane is wired to its own rulebook, job type included."""

    def setUp(self):
        self.source = WASM_SRC.read_text()

    def test_both_rulebooks_are_compiled_into_the_module(self):
        for name in ("design-language.md", "art-style.md"):
            with self.subTest(rulebook=name):
                self.assertIn(
                    f'include_str!("../../../knowledge/rules/{name}")',
                    self.source,
                    f"{name} is not compiled in, so a session that cannot reach "
                    "the docs workspace would get no rulebook",
                )

    def test_each_skill_resolves_to_its_own_rulebook(self):
        routing = dict(
            re.findall(
                r'"([a-z-]+)" => Some\(&([A-Z_]+)\),',
                self.source,
            )
        )
        self.assertEqual(routing.get(DESIGN_LANGUAGE_SKILL), "DESIGN_LANGUAGE_RULEBOOK")
        self.assertEqual(routing.get(ART_STYLE_SKILL), "ART_STYLE_RULEBOOK")

    def test_the_art_style_job_type_runs_the_skill_that_gets_the_art_style_rules(self):
        """The end-to-end binding: job_type -> skill_id -> rulebook."""
        template = next(
            t
            for t in _configured_templates()
            if t["job_type"] == "synthesize_art_style"
        )
        self.assertEqual(template["skill_id"], ART_STYLE_SKILL)

        language_lanes = {
            t["job_type"]
            for t in _configured_templates()
            if t["skill_id"] == DESIGN_LANGUAGE_SKILL
        }
        self.assertIn("synthesize", language_lanes)
        self.assertNotIn("synthesize_art_style", language_lanes)


class CompiledRulebookTests(unittest.TestCase):
    """Production inlines the blob, so the blob is what has to be right."""

    @classmethod
    def setUpClass(cls):
        cls.blob = WASM_BLOB.read_bytes()

    def test_the_committed_wasm_carries_both_rulebooks_verbatim(self):
        for path in (ART_STYLE, DESIGN_LANGUAGE):
            with self.subTest(rulebook=path.name):
                self.assertIn(
                    path.read_bytes(),
                    self.blob,
                    f"{path.name} is not in the committed wasm — rebuild it:\n"
                    "  cd katagami-curation/wasm && ./build.sh",
                )

    def test_the_consent_gate_reaches_the_lane_that_can_breach_it(self):
        self.assertIn(
            ART_STYLE_MARKERS["3 (sources and rights)"].encode(),
            self.blob,
        )


if __name__ == "__main__":
    unittest.main()
