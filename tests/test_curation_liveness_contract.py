from pathlib import Path
import tomllib
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load_spec(name: str) -> dict:
    return tomllib.loads((ROOT / "specs" / name).read_text())


def state_timeout_map(spec: dict) -> dict[str, dict]:
    return {item["state"]: item for item in spec.get("state_timeout", [])}


def indefinite_states(spec: dict) -> set[str]:
    return set(spec["automaton"].get("allow_indefinite_states", []))


def action_by_name(spec: dict, name: str) -> dict:
    return next(action for action in spec.get("action", []) if action["name"] == name)


def wasm_triggers(spec: dict, module: str) -> list[dict]:
    triggers = []
    for action in spec.get("action", []):
        for trigger in action.get("triggers", []):
            if trigger.get("kind") == "wasm" and trigger.get("module") == module:
                triggers.append(trigger)
    return triggers


class CurationLivenessContractTest(unittest.TestCase):
    def test_curation_query_active_states_time_out_to_failed(self):
        spec = load_spec("curation_query.ioa.toml")
        timeouts = state_timeout_map(spec)

        for state in ["Researching", "Synthesizing", "Organizing"]:
            self.assertNotIn(state, indefinite_states(spec))
            self.assertEqual(timeouts[state]["on_timeout"], "Fail")
            self.assertIn("error_message", timeouts[state]["params"])

    def test_curation_job_active_states_time_out_to_failed(self):
        spec = load_spec("curation_job.ioa.toml")
        timeouts = state_timeout_map(spec)

        self.assertIn("Queued", action_by_name(spec, "Fail")["from"])
        for state in ["Queued", "Ready", "Running", "Finalizing"]:
            self.assertNotIn(state, indefinite_states(spec))
            self.assertEqual(timeouts[state]["on_timeout"], "Fail")
            self.assertIn("error_message", timeouts[state]["params"])

        for module in ["build_session_message", "finalize_spawned_session"]:
            triggers = wasm_triggers(spec, module)
            self.assertGreater(len(triggers), 0)
            for trigger in triggers:
                self.assertEqual(trigger.get("timeout_secs"), "300")

    def test_curation_direction_synthesizing_times_out_to_failed(self):
        spec = load_spec("curation_direction.ioa.toml")
        timeouts = state_timeout_map(spec)

        self.assertNotIn("Synthesizing", indefinite_states(spec))
        self.assertEqual(timeouts["Synthesizing"]["on_timeout"], "Fail")
        self.assertIn("error_message", timeouts["Synthesizing"]["params"])


if __name__ == "__main__":
    unittest.main()
