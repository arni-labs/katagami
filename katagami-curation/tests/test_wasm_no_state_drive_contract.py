"""WASM must not drive the state machine.

The state machine is driven by transitions and effects. A WASM module is a
VERIFIER: it reads evidence, computes derived facts, and reports a verdict.
The kernel gives it exactly one sanctioned way to move its own entity — the
callback action in `set_success_result(action, params)` — and exactly one
sanctioned way to move ANOTHER entity: a declared `[[action.triggers]]`
`kind = "entity"` block on the spec.

Anything else — a module POSTing `.../Temper.Publish` at another entity, or
walking one through `SubmitForReview -> MarkQualityPassed -> Publish` in a
loop — is imperative control flow wearing a verifier's clothes. Nothing in
the spec says it happens, so nothing verifies it, and the reachable outcomes
of the system are no longer readable from the specs.

This test is a RATCHET. It reads the specs to learn which actions are real
lifecycle transitions (an action with `to = "..."`), reads the WASM sources
to learn which actions those modules dispatch, and asserts the intersection
is EXACTLY the set recorded in `KNOWN_WASM_DRIVEN_TRANSITIONS` below.

  * Add a new transition-driving dispatch  -> this test fails. Good.
  * Convert one to a declarative trigger   -> this test fails until you
    delete its entry here. Also good: the allowlist is the debt register,
    and it is only allowed to shrink.

Every entry carries WHY it is still imperative and what it is blocked on.
Do not add an entry to silence a failure; add one only to record a defect
you have measured and cannot yet fix.
"""

import re
import tomllib
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CURATION = ROOT / "katagami-curation"
COMMONS = ROOT / "katagami-commons"
WASM_ROOT = CURATION / "wasm"

EDM_NS = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}

# Entities owned by other apps (TemperPaw), so their IOA specs are not in this
# repo. Their lifecycle transitions still count: a katagami WASM module POSTing
# `Sessions('x')/OpenPaw.RecordResult` is driving somebody else's machine.
# Keyed by OData entity set, valued by the actions that carry `to = "..."` in
# the owning app's spec.
EXTERNAL_TRANSITION_ACTIONS = {
    "Sessions": {"Configure", "RecordResult", "Fail", "Cancel", "Start"},
    "SessionLinks": {"Configure", "Fail", "Complete"},
}

# The sanctioned kernel mechanism: a WASM module returns ONE callback action,
# and the kernel dispatches it against the module's OWN entity (the entity the
# trigger fired on). See temper `state/dispatch/wasm.rs` ->
# `dispatch_wasm_callback`, which is hardwired to `ctx.entity_ref`. These are
# not drives; they are the verdict.
CALLBACK_RESULT_FUNCTIONS = ("set_success_result", "set_terminal_job_callback")

# ---------------------------------------------------------------------------
# The debt register.
#
# Each key is "<module>: <EntitySet>.<Action>". Each value says why the drive
# is still imperative. Entries are removed as conversions land; new entries
# require a deliberate edit and a reviewer who reads the reason.
# ---------------------------------------------------------------------------
KNOWN_WASM_DRIVEN_TRANSITIONS = {
    # --- DesignLanguage: the auto-publish path (ARN-320) ---
    "finalize_spawned_session: DesignLanguages.SubmitForReview": (
        "ensure_language_under_review() walks Draft -> UnderReview for every id in "
        "the job's design_language_ids. Declarative equivalent is an "
        "[[action.triggers]] kind=\"entity\" block on the CurationJob's typed "
        "completion action. BLOCKED: TargetResolver::Field reads a scalar string "
        "field; design_language_ids is a JSON array. The kernel has no list "
        "fan-out resolver."
    ),
    "finalize_spawned_session: DesignLanguages.Publish": (
        "ensure_language_published() walks UnderReview -> Published. This is what "
        "carries design languages past the human review gate with no human. Same "
        "blocker as SubmitForReview: no list fan-out target resolver."
    ),
    # --- ArtStyle / PaletteSystem: walk_lane_entity_to_published ---
    "finalize_spawned_session: ArtStyles.SubmitForReview": (
        "walk_lane_entity_to_published() loops over the job's art_style_ids JSON "
        "array. Same blocker: no list fan-out target resolver."
    ),
    "finalize_spawned_session: ArtStyles.Publish": (
        "walk_lane_entity_to_published() walks UnderReview -> Published with no "
        "human. Same blocker: the job carries a JSON array of ids and the kernel "
        "has no list fan-out target resolver."
    ),
    "finalize_spawned_session: PaletteSystems.SubmitForReview": (
        "walk_lane_entity_to_published() loops over the job's palette_system_ids "
        "JSON array. Same blocker: no list fan-out target resolver."
    ),
    "finalize_spawned_session: PaletteSystems.Publish": (
        "walk_lane_entity_to_published() walks UnderReview -> Published with no "
        "human. Same blocker: no list fan-out target resolver."
    ),
    # --- WritingStyle: stops at UnderReview by design (curator gate) ---
    "finalize_spawned_session: WritingStyles.SubmitForReview": (
        "verify_synthesized_writing_styles() walks Draft -> UnderReview and STOPS "
        "there; the curator publishes. The stop is correct, the walk is still "
        "imperative. Loops over writing_style_ids. Same blocker."
    ),
    # --- Sessions: cross-app, needs the TARGET's own fields ---
    "finalize_spawned_session: Sessions.RecordResult": (
        "record_session_success() reports the agent session's result. Declarative "
        "equivalent is a trigger on the CurationJob resolving session_id (a scalar "
        "field — the fan-out blocker does NOT apply here). BLOCKED differently: "
        "RecordResult's params (conversation, session_leaf_id, repl_file_id, token "
        "counts) are read off the SESSION entity, and [action.triggers.params_from] "
        "can only copy fields from the SOURCE entity."
    ),
    "finalize_spawned_session: Sessions.Fail": (
        "record_session_failure(). Convertible: scalar session_id target, and Fail "
        "takes only error_message, which the job already carries. Left in place in "
        "this change only because it shares record_session_* plumbing with "
        "RecordResult; converting one without the other splits the path."
    ),
    # --- build_session_message ---
    "build_session_message: Sessions.Configure": (
        "The session's own configuration. The module creates the Session entity, so "
        "there is no source entity whose spec could declare a trigger for it; "
        "resolve_target type=\"create\" would mint the id but [action.triggers.params] "
        "cannot carry the computed user_message. Needs the prompt to land on a field "
        "first."
    ),
    "build_session_message: SessionLinks.Configure": (
        "Same shape as Sessions.Configure: the module creates the SessionLink and "
        "configures it in the same breath."
    ),
    "build_session_message: CurationJobs.SessionSpawned": (
        "Ready -> Running on the module's OWN entity. CONVERTIBLE TODAY via the "
        "kernel callback: set_success_result(\"SessionSpawned\", {session_id, "
        "workspace_id}). Deliberately not converted in this change because PR #209 "
        "(claude/split-rulebooks) is editing this module and its committed .wasm; "
        "resolving that conflict is not this change's call."
    ),
    "build_session_message: CurationJobs.Fail": (
        "dispatch_curation_job_failure() on SessionLink setup failure. The trigger "
        "already declares on_failure = \"Fail\", so this is a duplicate imperative "
        "path; it exists to attach a specific error_message. Same PR #209 hold."
    ),
}


def _load_transition_actions():
    """action name -> set of automaton names that declare it as a transition."""
    transitions = {}
    for spec_dir in (COMMONS / "specs", CURATION / "specs"):
        for path in sorted(spec_dir.glob("*.ioa.toml")):
            spec = tomllib.loads(path.read_text())
            automaton = spec["automaton"]["name"]
            for action in spec.get("action", []):
                # A lifecycle transition is an action that moves the entity to a
                # new state. Actions without `to` only write fields/guard vars —
                # a verifier flipping its own verified-fact booleans is exactly
                # what a verifier is for, and is not in scope here.
                if action.get("to"):
                    transitions.setdefault(action["name"], set()).add(automaton)
    return transitions


def _load_entity_set_map():
    """OData entity set -> automaton (entity type) short name."""
    mapping = {}
    for csdl in (COMMONS / "specs" / "model.csdl.xml", CURATION / "specs" / "model.csdl.xml"):
        tree = ET.parse(csdl)
        for entity_set in tree.iter("{http://docs.oasis-open.org/odata/ns/edm}EntitySet"):
            mapping[entity_set.attrib["Name"]] = entity_set.attrib["EntityType"].rsplit(".", 1)[-1]
    return mapping


def _split_call_args(source, open_paren_idx):
    """Split a Rust call's argument list at top-level commas.

    `source[open_paren_idx]` must be the '('. Returns (args, end_idx) where
    end_idx is the index of the matching ')'.
    """
    depth = 0
    args = []
    current = []
    i = open_paren_idx
    in_string = False
    escaped = False
    while i < len(source):
        ch = source[i]
        if in_string:
            current.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            current.append(ch)
            i += 1
            continue
        if ch in "([{":
            depth += 1
            if depth == 1 and ch == "(":
                i += 1
                continue
            current.append(ch)
            i += 1
            continue
        if ch in ")]}":
            depth -= 1
            if depth == 0 and ch == ")":
                args.append("".join(current).strip())
                return [a for a in args if a], i
            current.append(ch)
            i += 1
            continue
        if ch == "," and depth == 1:
            args.append("".join(current).strip())
            current = []
            i += 1
            continue
        current.append(ch)
        i += 1
    raise AssertionError("unterminated call argument list in WASM source")


def _literal(arg):
    """Return the value of a Rust string literal argument, else None."""
    match = re.fullmatch(r'"((?:[^"\\]|\\.)*)"', arg.strip())
    return match.group(1) if match else None


def _function_spans(source):
    """[(fn_name, [param names], body_start, body_end)] for every `fn` in source."""
    spans = []
    for match in re.finditer(r"\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\s*\(", source):
        name = match.group(1)
        params_open = match.end() - 1
        try:
            raw_params, params_close = _split_call_args(source, params_open)
        except AssertionError:
            continue
        params = []
        for raw in raw_params:
            param = raw.split(":", 1)[0].strip()
            param = re.sub(r"^(mut|ref)\s+", "", param)
            params.append(param)
        brace = source.find("{", params_close)
        if brace == -1:
            continue
        depth = 0
        i = brace
        while i < len(source):
            if source[i] == "{":
                depth += 1
            elif source[i] == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        spans.append((name, params, brace, i))
    return spans


def _enclosing_function(spans, index):
    best = None
    for name, params, start, end in spans:
        if start <= index <= end:
            if best is None or start > best[2]:
                best = (name, params, start, end)
    return best


def _forwarded_literals(source, fn_name, param_index):
    """Literals passed at `param_index` to every call of `fn_name` in source."""
    literals = set()
    for match in re.finditer(rf"\b{re.escape(fn_name)}\s*\(", source):
        args, _ = _split_call_args(source, match.end() - 1)
        if param_index < len(args):
            value = _literal(args[param_index])
            if value is not None:
                literals.add(value)
    return literals


# `dispatch_action(ctx, api_url, headers, set_name, entity_id, action, params)`
DISPATCH_SET_ARG = 3
DISPATCH_ACTION_ARG = 5

# Raw OData action URLs the modules build by hand, e.g.
#   {api_url}/tdata/Sessions('{session_id}')/OpenPaw.RecordResult
URL_ACTION_RE = re.compile(
    r"/tdata/(?P<set>[A-Za-z][A-Za-z0-9_]*)\('[^']*'\)/(?P<ns>[A-Za-z][A-Za-z0-9_.]*)\.(?P<action>[A-Za-z{][A-Za-z0-9_}]*)"
)


class WasmDoesNotDriveTheStateMachineTests(unittest.TestCase):
    def setUp(self):
        self.transitions = _load_transition_actions()
        self.entity_sets = _load_entity_set_map()
        self.modules = sorted(WASM_ROOT.glob("*/src/*.rs"))
        self.assertTrue(self.modules, "no WASM sources found under katagami-curation/wasm")

    # -- helpers ----------------------------------------------------------

    def _is_transition(self, entity_set, action):
        external = EXTERNAL_TRANSITION_ACTIONS.get(entity_set)
        if external is not None:
            return action in external
        automaton = self.entity_sets.get(entity_set)
        if automaton is None:
            return False
        return automaton in self.transitions.get(action, set())

    def _dispatch_sites(self, module_name, source):
        """{(entity_set, action)} dispatched from one module, plus unresolved."""
        spans = _function_spans(source)
        sites = set()
        unresolved = []

        for match in re.finditer(r"(?<!fn )\bdispatch_action\s*\(", source):
            args, _ = _split_call_args(source, match.end() - 1)
            if len(args) <= DISPATCH_ACTION_ARG:
                unresolved.append(f"{module_name}: dispatch_action call with {len(args)} args")
                continue
            raw_set = args[DISPATCH_SET_ARG]
            raw_action = args[DISPATCH_ACTION_ARG]

            enclosing = _enclosing_function(spans, match.start())
            enclosing_name = enclosing[0] if enclosing else None
            enclosing_params = enclosing[1] if enclosing else []

            def resolve(raw, label):
                value = _literal(raw)
                if value is not None:
                    return {value}
                identifier = raw.strip()
                if enclosing_name and identifier in enclosing_params:
                    forwarded = _forwarded_literals(
                        source, enclosing_name, enclosing_params.index(identifier)
                    )
                    if forwarded:
                        return forwarded
                unresolved.append(
                    f"{module_name}: cannot resolve {label} '{identifier}' for a "
                    f"dispatch_action call inside fn {enclosing_name}"
                )
                return set()

            for entity_set in resolve(raw_set, "entity set"):
                for action in resolve(raw_action, "action"):
                    sites.add((entity_set, action))

        for match in URL_ACTION_RE.finditer(source):
            action = match.group("action")
            if action.startswith("{"):
                # The generic `dispatch_action` helper's own URL template.
                continue
            sites.add((match.group("set"), action))

        return sites, unresolved

    def _callback_actions(self, source):
        callbacks = set()
        for fn in CALLBACK_RESULT_FUNCTIONS:
            for match in re.finditer(rf"\b{fn}\s*\(", source):
                args, _ = _split_call_args(source, match.end() - 1)
                for arg in args:
                    value = _literal(arg)
                    if value:
                        callbacks.add(value)
                        break
                    if _literal(arg) == "":
                        break
        return callbacks

    # -- the contract -----------------------------------------------------

    def test_every_wasm_action_dispatch_is_statically_resolvable(self):
        """A dispatch we cannot read is a dispatch we cannot govern."""
        unresolved = []
        for path in self.modules:
            _, module_unresolved = self._dispatch_sites(path.parts[-3], path.read_text())
            unresolved.extend(module_unresolved)
        self.assertEqual(
            [],
            unresolved,
            "every WASM action dispatch must name its entity set and action "
            "statically, so this contract can see it:\n  " + "\n  ".join(unresolved),
        )

    def test_wasm_modules_do_not_drive_lifecycle_transitions(self):
        """The ratchet. Only shrinks."""
        found = {}
        for path in self.modules:
            module_name = path.parts[-3]
            source = path.read_text()
            sites, _ = self._dispatch_sites(module_name, source)
            for entity_set, action in sites:
                if self._is_transition(entity_set, action):
                    found[f"{module_name}: {entity_set}.{action}"] = True

        actual = set(found)
        expected = set(KNOWN_WASM_DRIVEN_TRANSITIONS)

        added = sorted(actual - expected)
        self.assertEqual(
            [],
            added,
            "WASM must never drive the state machine — the state machine is "
            "driven by transitions and effects. These modules dispatch lifecycle "
            "transitions (actions with `to = \"...\"`) that no spec declares:\n  "
            + "\n  ".join(added)
            + "\n\nExpress the transition declaratively instead: a "
            "[[action.triggers]] kind=\"entity\" block on the source action, or "
            "the module's single kernel callback via set_success_result(action, "
            "params) when the target is the module's own entity.",
        )

        removed = sorted(expected - actual)
        self.assertEqual(
            [],
            removed,
            "these imperative drives are gone — delete their entries from "
            "KNOWN_WASM_DRIVEN_TRANSITIONS so the register keeps telling the "
            "truth:\n  " + "\n  ".join(removed),
        )

    def test_debt_register_entries_explain_themselves(self):
        for key, reason in KNOWN_WASM_DRIVEN_TRANSITIONS.items():
            self.assertRegex(
                key,
                r"^[a-z_]+: [A-Za-z]+\.[A-Za-z]+$",
                f"register key '{key}' must be '<module>: <EntitySet>.<Action>'",
            )
            self.assertGreater(
                len(reason.split()),
                12,
                f"register entry '{key}' must say WHY it is still imperative and "
                "what it is blocked on — a bare entry is how debt becomes design",
            )

    def test_repair_job_creation_is_a_declared_trigger_not_an_imperative_walk(self):
        """The conversion this change landed: no hand-rolled job Create/Submit.

        `maybe_spawn_repair_job` used to POST /tdata/CurationJobs, then
        Configure, then Submit — minting an entity and walking it Queued ->
        Ready from inside the verifier. It now returns the repair brief in the
        Fail callback params and a declared trigger creates the job.
        """
        source = (WASM_ROOT / "finalize_spawned_session" / "src" / "lib.rs").read_text()
        for gone in (
            "/tdata/CurationJobs\"",
            "KatagamiCuration.{action}",
            "KatagamiCuration.Configure",
        ):
            self.assertNotIn(
                gone,
                source,
                "the finalizer must not create or submit CurationJobs by hand; "
                "the repair job is minted by the failure_spawns_repair_job trigger",
            )

        spec = tomllib.loads((CURATION / "specs" / "curation_job.ioa.toml").read_text())
        fail_action = next(a for a in spec["action"] if a["name"] == "Fail")
        triggers = {t["name"]: t for t in fail_action.get("triggers", [])}
        self.assertIn(
            "failure_spawns_repair_job",
            triggers,
            "CurationJob.Fail must declare the repair-job trigger",
        )
        trigger = triggers["failure_spawns_repair_job"]
        self.assertEqual(trigger["kind"], "entity")
        self.assertEqual(trigger["target_entity"], "CurationJob")
        self.assertEqual(trigger["target_action"], "ConfigureAndSubmit")
        self.assertEqual(trigger["resolve_target"]["type"], "create")
        self.assertEqual(
            trigger["params_from"]["input"],
            "repair_input",
            "the repair brief must travel from the failed job's own field",
        )
        # The guard is what keeps every ordinary failure from minting a job.
        self.assertEqual(trigger["guard"]["type"], "not")
        self.assertEqual(trigger["guard"]["guard"]["field"], "repair_input")
        self.assertEqual(trigger["guard"]["guard"]["value"], "")

        for param in (
            "repair_input",
            "repair_job_type",
            "repair_language_id",
            "repair_model",
            "repair_provider",
            "repair_direction_id",
        ):
            self.assertIn(
                param,
                fail_action["params"],
                f"CurationJob.Fail must declare '{param}' so the finalizer's "
                "verdict lands on a field the trigger can read",
            )


if __name__ == "__main__":
    unittest.main()
