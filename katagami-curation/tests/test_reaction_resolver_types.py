import tomllib
import unittest
from pathlib import Path


ALLOWED_RESOLVER_TYPES = {
    "field",
    "same_id",
    "static",
    "create_if_missing",
    "create",
}


def iter_reaction_files():
    root = Path(__file__).resolve().parents[1]
    yield root / "reactions" / "reactions.toml"
    yield root / "specs" / "reactions.toml"


class ReactionResolverTypeTests(unittest.TestCase):
    def test_reaction_resolver_types_match_temper_parser_contract(self):
        for path in iter_reaction_files():
            parsed = tomllib.loads(path.read_text())
            for reaction in parsed["reaction"]:
                resolver_type = reaction["resolve_target"]["type"]
                self.assertIn(
                    resolver_type,
                    ALLOWED_RESOLVER_TYPES,
                    (
                        f"{path}: reaction '{reaction['name']}' uses unsupported "
                        f"resolver type {resolver_type!r}"
                    ),
                )


if __name__ == "__main__":
    unittest.main()
