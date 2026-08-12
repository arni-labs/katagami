"""The study's three artifacts describe the same behaviors (ARN-298).

The comparison only means something if condition A and condition B cover the
same ground. An item that exists in one encoding and not the other turns the
study into a measurement of coverage rather than of approach — and that is a
silent failure: every document still reads fine on its own.

So the inventory numbers are the join key, and these tests walk them:

    docs/study/behavior-inventory.md      the numbered source of truth
    docs/study/equivalence-map.md         every number, both encodings, its layer
    .agents/behaviors/<actor>/BEHAVIOR.md every number, tagged in an HTML comment

Every number must appear in all three. A number in one and not another fails
here rather than surviving to the study.

The BEHAVIOR.md files must also stay valid against Braintrust's Agent Behavior
format, since condition A is only a fair baseline if it is a real example of the
thing it is standing in for.
"""

import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
STUDY = REPO_ROOT / "docs" / "study"
INVENTORY = STUDY / "behavior-inventory.md"
EQUIVALENCE = STUDY / "equivalence-map.md"
BEHAVIORS = REPO_ROOT / ".agents" / "behaviors"

# CuratorAgent -> C, ReviewAgent -> R, HumanCurator -> H.
ACTORS = {
    "curator-agent": "C",
    "review-agent": "R",
    "human-curator": "H",
}

# `**C12. ...`  — an item's own definition in the inventory.
_ITEM = re.compile(r"^\*\*([CRH])(\d+)\.", re.M)
# `<!-- inventory: C1, C17 -->` — a tagged behavior statement in a BEHAVIOR.md.
_TAG = re.compile(r"<!--\s*inventory:\s*([^>]+?)\s*-->")
# `| C12 | ...` — a row in the equivalence map.
_ROW = re.compile(r"^\|\s*([CRH])(\d+)\s*\|", re.M)


def _inventory_numbers():
    """Every item the inventory defines, as {'C1', 'C2', ...}."""
    return {f"{p}{n}" for p, n in _ITEM.findall(INVENTORY.read_text(encoding="utf-8"))}


def _tagged_numbers(path):
    """Every inventory number a BEHAVIOR.md claims to render."""
    found = set()
    for group in _TAG.findall(path.read_text(encoding="utf-8")):
        for token in group.split(","):
            token = token.strip()
            if token:
                found.add(token)
    return found


def _mapped_numbers():
    return {f"{p}{n}" for p, n in _ROW.findall(EQUIVALENCE.read_text(encoding="utf-8"))}


class StudyArtifactsExistTest(unittest.TestCase):
    def test_every_artifact_is_present(self):
        self.assertTrue(INVENTORY.is_file(), f"missing {INVENTORY}")
        self.assertTrue(EQUIVALENCE.is_file(), f"missing {EQUIVALENCE}")
        for actor in ACTORS:
            self.assertTrue(
                (BEHAVIORS / actor / "BEHAVIOR.md").is_file(),
                f"missing {BEHAVIORS / actor / 'BEHAVIOR.md'}",
            )


class InventoryIsWellFormedTest(unittest.TestCase):
    def setUp(self):
        self.numbers = _inventory_numbers()

    def test_the_inventory_defines_items(self):
        self.assertTrue(self.numbers, "no numbered items found in the inventory")

    def test_every_actor_has_items(self):
        for actor, prefix in ACTORS.items():
            self.assertTrue(
                any(n.startswith(prefix) for n in self.numbers),
                f"no {prefix}* items for {actor}",
            )

    def test_the_numbers_run_from_one_with_no_gaps(self):
        # A gap means an item was deleted and its number left behind, which
        # would make every downstream reference ambiguous.
        for prefix in ACTORS.values():
            got = sorted(
                int(n[1:]) for n in self.numbers if n.startswith(prefix)
            )
            self.assertEqual(
                got,
                list(range(1, len(got) + 1)),
                f"{prefix} numbers are not 1..n with no gaps: {got}",
            )

    def test_every_item_cites_a_source(self):
        # An item with no citation may be describing behavior that is not on
        # this branch, which is the one thing this document must never do.
        text = INVENTORY.read_text(encoding="utf-8")
        blocks = re.split(r"^\*\*[CRH]\d+\.", text, flags=re.M)[1:]
        numbers = sorted(_ITEM.findall(text), key=lambda m: (m[0], int(m[1])))
        ordered = [f"{p}{n}" for p, n in _ITEM.findall(text)]
        for number, block in zip(ordered, blocks):
            self.assertIn("*Source:", block, f"{number} cites no source")

    def test_every_item_declares_how_it_is_enforced(self):
        text = INVENTORY.read_text(encoding="utf-8")
        blocks = re.split(r"^\*\*[CRH]\d+\.", text, flags=re.M)[1:]
        ordered = [f"{p}{n}" for p, n in _ITEM.findall(text)]
        labels = ("— machine", "— policy", "— judgment", "— convention")
        for number, block in zip(ordered, blocks):
            head = block.split("*Source:")[0]
            self.assertTrue(
                any(label in head for label in labels),
                f"{number} does not say whether it is machine/policy/judgment/convention",
            )


class EveryNumberAppearsEverywhereTest(unittest.TestCase):
    """The join. This is the test that catches drift."""

    def setUp(self):
        self.inventory = _inventory_numbers()
        self.mapped = _mapped_numbers()
        self.tagged = {
            actor: _tagged_numbers(BEHAVIORS / actor / "BEHAVIOR.md")
            for actor in ACTORS
        }

    def test_the_equivalence_map_covers_every_inventory_item(self):
        missing = sorted(self.inventory - self.mapped)
        self.assertEqual(
            missing, [], f"in the inventory but not the equivalence map: {missing}"
        )

    def test_the_equivalence_map_invents_nothing(self):
        extra = sorted(self.mapped - self.inventory)
        self.assertEqual(
            extra, [], f"in the equivalence map but not the inventory: {extra}"
        )

    def test_every_inventory_item_is_rendered_in_its_behavior_file(self):
        for actor, prefix in ACTORS.items():
            expected = {n for n in self.inventory if n.startswith(prefix)}
            missing = sorted(expected - self.tagged[actor])
            self.assertEqual(
                missing,
                [],
                f"{actor}/BEHAVIOR.md renders no statement for: {missing}. "
                "Condition A must cover the same behaviors as condition B or the "
                "study measures coverage instead of approach.",
            )

    def test_no_behavior_file_claims_an_item_that_does_not_exist(self):
        for actor in ACTORS:
            extra = sorted(self.tagged[actor] - self.inventory)
            self.assertEqual(
                extra, [], f"{actor}/BEHAVIOR.md tags unknown items: {extra}"
            )

    def test_no_behavior_file_claims_another_actors_item(self):
        for actor, prefix in ACTORS.items():
            foreign = sorted(n for n in self.tagged[actor] if not n.startswith(prefix))
            self.assertEqual(
                foreign, [], f"{actor}/BEHAVIOR.md tags another actor's items: {foreign}"
            )


class PublishedCountsMatchTheItemsTest(unittest.TestCase):
    """The summary tables are recomputed, not remembered.

    Rita approves this inventory by reading it. A totals table that has drifted
    from the list above it misrepresents the thing being approved — and a
    hand-maintained count drifts the first time an item is added.
    """

    LABELS = ("machine", "policy", "judgment", "convention")

    def _labelled_items(self):
        text = INVENTORY.read_text(encoding="utf-8")
        numbers = [f"{p}{n}" for p, n in _ITEM.findall(text)]
        blocks = re.split(r"^\*\*[CRH]\d+\.", text, flags=re.M)[1:]
        out = {}
        for number, block in zip(numbers, blocks):
            head = block.split("*Source:")[0]
            found = [label for label in self.LABELS if f"— {label}" in head]
            self.assertEqual(len(found), 1, f"{number}: expected one label, got {found}")
            out[number] = found[0]
        return out

    def test_the_inventory_totals_table_matches_the_items(self):
        items = self._labelled_items()
        text = INVENTORY.read_text(encoding="utf-8")
        for prefix, actor in (("C", "CuratorAgent"), ("R", "ReviewAgent"), ("H", "HumanCurator")):
            mine = [label for number, label in items.items() if number.startswith(prefix)]
            counts = [
                len(mine),
                *(sum(1 for label in mine if label == name) for name in self.LABELS),
            ]
            row = re.search(rf"^\| {actor} \| (\d+) \([CRH]1–[CRH]\d+\) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|",
                            text, re.M)
            self.assertIsNotNone(row, f"no totals row for {actor}")
            self.assertEqual(
                [int(g) for g in row.groups()],
                counts,
                f"{actor}: the totals table says {row.groups()}, the items say {counts}",
            )

    def test_the_equivalence_map_layer_totals_match_its_rows(self):
        text = EQUIVALENCE.read_text(encoding="utf-8")
        rows = re.findall(r"^\|\s*([CRH])(\d+)\s*\|.*\|\s*([^|]+?)\s*\|\s*$", text, re.M)
        self.assertTrue(rows, "no mapped rows found")
        for prefix, actor in (("C", "CuratorAgent"), ("R", "ReviewAgent"), ("H", "HumanCurator")):
            mine = [layer for p, _, layer in rows if p == prefix]
            counts = [
                sum(1 for layer in mine if layer.startswith("1")),
                sum(1 for layer in mine if layer == "2"),
                sum(1 for layer in mine if layer == "—"),
                len(mine),
            ]
            row = re.search(rf"^\| {actor} \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|", text, re.M)
            self.assertIsNotNone(row, f"no layer totals row for {actor}")
            self.assertEqual(
                [int(g) for g in row.groups()],
                counts,
                f"{actor}: the layer table says {row.groups()}, the rows say {counts}",
            )


class BehaviorFilesFollowTheBraintrustFormatTest(unittest.TestCase):
    """Condition A is only a fair baseline if it is a valid instance of the format.

    Structural rules from the Agent Behavior specification: the directory name is
    the identifier, the file is `BEHAVIOR.md`, and the frontmatter carries a
    `name` matching the directory and a non-empty `description`.
    """

    NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

    def _frontmatter(self, actor):
        text = (BEHAVIORS / actor / "BEHAVIOR.md").read_text(encoding="utf-8")
        self.assertTrue(text.startswith("---\n"), f"{actor}: no YAML frontmatter")
        _, block, body = text.split("---\n", 2)
        fields = {}
        for line in block.splitlines():
            if ":" in line and not line.startswith((" ", "\t")):
                key, value = line.split(":", 1)
                fields[key.strip()] = value.strip()
        return fields, body

    def test_the_name_matches_the_directory_and_the_character_rules(self):
        for actor in ACTORS:
            fields, _ = self._frontmatter(actor)
            name = fields.get("name")
            self.assertEqual(name, actor, f"{actor}: name must match the directory")
            self.assertLessEqual(len(name), 64, f"{actor}: name over 64 characters")
            self.assertRegex(name, self.NAME, f"{actor}: name is not lowercase-hyphen")
            self.assertFalse(
                name.startswith("-") or name.endswith("-"),
                f"{actor}: name must not start or end with a hyphen",
            )

    def test_the_description_is_present_and_within_length(self):
        for actor in ACTORS:
            fields, _ = self._frontmatter(actor)
            description = fields.get("description", "")
            self.assertTrue(description, f"{actor}: description is required")
            self.assertLessEqual(
                len(description), 1024, f"{actor}: description over 1024 characters"
            )

    def test_the_body_is_not_empty(self):
        for actor in ACTORS:
            _, body = self._frontmatter(actor)
            self.assertTrue(body.strip(), f"{actor}: empty body")

    def test_the_six_recommended_dimensions_are_used(self):
        # The format calls these flexible guidance; the study uses all six so
        # condition A is the strongest honest version of itself rather than a
        # thin one that would lose for the wrong reason.
        for actor in ACTORS:
            _, body = self._frontmatter(actor)
            for dimension in (
                "Intent",
                "Evidence",
                "Decision",
                "Execution",
                "Recovery",
                "Failure modes",
            ):
                self.assertIn(
                    f"**{dimension}.**", body, f"{actor}: no {dimension} content"
                )

    def test_the_conduct_is_stated_in_rfc_2119_terms(self):
        for actor in ACTORS:
            _, body = self._frontmatter(actor)
            self.assertIn("MUST", body, f"{actor}: no MUST-level conduct")


if __name__ == "__main__":
    unittest.main()
