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

    def test_curation_job_preserves_parent_session_for_approval_routing(self):
        spec = load_spec("curation_job.ioa.toml")
        model = (ROOT / "specs" / "model.csdl.xml").read_text()
        build_session = (
            ROOT / "wasm" / "build_session_message" / "src" / "lib.rs"
        ).read_text()
        finalizer = (
            ROOT / "wasm" / "finalize_spawned_session" / "src" / "lib.rs"
        ).read_text()

        state_names = {state["name"] for state in spec.get("state", [])}
        self.assertIn("parent_session_id", state_names)
        for action_name in ["Configure", "ConfigureAndSubmit"]:
            self.assertIn("parent_session_id", action_by_name(spec, action_name)["params"])

        self.assertIn('<Property Name="ParentSessionId" Type="Edm.String"', model)
        self.assertIn('"ParentSessionId": parent_session_id.clone()', build_session)
        self.assertIn('"parent_session_id".to_string()', build_session)
        self.assertNotIn("curation_job_create_body(parent_session_id)", finalizer)
        self.assertNotIn("add_parent_session_id(&mut configure_body", finalizer)
        self.assertNotIn("create_configure_submit_job", finalizer)
        self.assertIn("Follow-up job creation", finalizer)

    def test_curation_direction_synthesizing_times_out_to_failed(self):
        spec = load_spec("curation_direction.ioa.toml")
        timeouts = state_timeout_map(spec)

        self.assertNotIn("Synthesizing", indefinite_states(spec))
        self.assertEqual(timeouts["Synthesizing"]["on_timeout"], "Fail")
        self.assertIn("error_message", timeouts["Synthesizing"]["params"])


if __name__ == "__main__":
    unittest.main()
