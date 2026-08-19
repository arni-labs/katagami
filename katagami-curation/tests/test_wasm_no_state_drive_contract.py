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

import collections
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
#
# Derived from temperpaw `os-apps/paw-agent/specs/session.ioa.toml`,
# `os-apps/paw-agent/specs/session_link.ioa.toml`, and
# `os-apps/paw-fs/specs/workspace.ioa.toml` by the same rule used for the local
# specs — an action carrying `to = "..."` — MINUS self-loops (`from == [to]`),
# which move nothing. That exclusion is why `Workspace.ResolvePath` (a stat,
# Active -> Active) and `Session.CheckSandboxReady` are absent, and why
# `Session.Configure` is absent entirely: it declares no `to` at all.
#
# Regenerate after a TemperPaw spec change; a stale set here can only
# UNDER-report, which is the direction that matters.
EXTERNAL_TRANSITION_ACTIONS = {
    "Sessions": {
        "Cancel", "CheckSteering", "CompactionAuthExpired", "CompactionAuthReady",
        "CompactionComplete", "ContextReady", "ContextReadyAuthSkipped",
        "ContinueWithSteering", "Fail", "FinalizeResult", "FinalizeResultNoReply",
        "HandleToolResults", "NeedsCompaction", "PauseForApproval",
        "PauseForPlanApproval", "ProcessToolCalls", "ProviderAuthExpired",
        "ProviderAuthReady", "ProviderResponseReady", "Provision",
        "ProvisionWorkspace", "RecordResult", "RecordResultInlineReply",
        "RecordResultNoReply", "RecoverFromRestart", "RecoveryComplete", "Resume",
        "ResumeAfterApproval", "ResumeFromCheckpoint", "ResumeWithPlanApproval",
        "ResumeWithPlanChanges", "SandboxReady", "TimeoutFail", "WorkspaceReady",
    },
    "SessionLinks": {"Configure", "NotifyFailed", "ParentNotified"},
    "Workspaces": {"Archive", "Freeze", "Thaw"},
}

# The sanctioned kernel mechanism: a WASM module returns ONE callback action,
# and the kernel dispatches it against the module's OWN entity (the entity the
# trigger fired on). See temper `state/dispatch/wasm.rs` ->
# `dispatch_wasm_callback`, which is hardwired to `ctx.entity_ref`. Those are
# not drives; they are the verdict, and they never appear below because they
# carry no entity set — there is nothing for the module to choose.
#
# `dispatch_action` is the ONE helper through which these modules may reach
# another entity's action. The contract can only read what it can name, so the
# identifier is also forbidden from appearing in any form that would let a call
# hide behind another name (an alias, a re-export, a function pointer).
DISPATCH_HELPER = "dispatch_action"

# ---------------------------------------------------------------------------
# The debt register.
#
# Each key is "<module>: <EntitySet>.<Action>". Each value is
# (call_sites, why_it_is_still_imperative). The count is pinned so that adding a
# SECOND dispatch of an already-registered drive fails too — identity alone
# would let imperative control flow grow silently under an existing entry.
# Entries are removed as conversions land; new ones require a deliberate edit
# and a reviewer who reads the reason.
# ---------------------------------------------------------------------------
KNOWN_WASM_DRIVEN_TRANSITIONS = {
    # --- DesignLanguage: the auto-publish path (ARN-320) ---
    "finalize_spawned_session: DesignLanguages.SubmitForReview": (
        1,
        "ensure_language_under_review() walks Draft -> UnderReview for every id in "
        "the job's design_language_ids. Declarative equivalent is an "
        "[[action.triggers]] kind=\"entity\" block on the CurationJob's typed "
        "completion action. BLOCKED: TargetResolver::Field reads a scalar string "
        "field; design_language_ids is a JSON array. The kernel has no list "
        "fan-out resolver."
    ),
    "finalize_spawned_session: DesignLanguages.Publish": (
        1,
        "ensure_language_published() walks UnderReview -> Published. This is what "
        "carries design languages past the human review gate with no human. Same "
        "blocker as SubmitForReview: no list fan-out target resolver."
    ),
    # --- ArtStyle / PaletteSystem: walk_lane_entity_to_published ---
    "finalize_spawned_session: ArtStyles.SubmitForReview": (
        1,
        "walk_lane_entity_to_published() loops over the job's art_style_ids JSON "
        "array. Same blocker: no list fan-out target resolver."
    ),
    "finalize_spawned_session: ArtStyles.Publish": (
        1,
        "walk_lane_entity_to_published() walks UnderReview -> Published with no "
        "human. Same blocker: the job carries a JSON array of ids and the kernel "
        "has no list fan-out target resolver."
    ),
    "finalize_spawned_session: PaletteSystems.SubmitForReview": (
        1,
        "walk_lane_entity_to_published() loops over the job's palette_system_ids "
        "JSON array. Same blocker: no list fan-out target resolver."
    ),
    "finalize_spawned_session: PaletteSystems.Publish": (
        1,
        "walk_lane_entity_to_published() walks UnderReview -> Published with no "
        "human. Same blocker: no list fan-out target resolver."
    ),
    # --- WritingStyle: stops at UnderReview by design (curator gate) ---
    "finalize_spawned_session: WritingStyles.SubmitForReview": (
        1,
        "verify_synthesized_writing_styles() walks Draft -> UnderReview and STOPS "
        "there; the curator publishes. The stop is correct, the walk is still "
        "imperative. Loops over writing_style_ids. Same blocker."
    ),
    # --- Sessions: cross-app, needs the TARGET's own fields ---
    "finalize_spawned_session: Sessions.RecordResult": (
        1,
        "record_session_success() reports the agent session's result. Declarative "
        "equivalent is a trigger on the CurationJob resolving session_id (a scalar "
        "field — the fan-out blocker does NOT apply here). BLOCKED differently: "
        "RecordResult's params (conversation, session_leaf_id, repl_file_id, token "
        "counts) are read off the SESSION entity, and [action.triggers.params_from] "
        "can only copy fields from the SOURCE entity."
    ),
    "finalize_spawned_session: Sessions.Fail": (
        1,
        "record_session_failure(). Convertible: scalar session_id target, and Fail "
        "takes only error_message, which the job already carries. Left in place in "
        "this change only because it shares record_session_* plumbing with "
        "RecordResult; converting one without the other splits the path."
    ),
    # --- build_session_message ---
    "build_session_message: SessionLinks.Configure": (
        1,
        "The module creates the SessionLink and configures it in the same breath, "
        "walking it Created -> Watching. There is no source entity whose spec could "
        "declare the trigger: resolve_target type=\"create\" would mint the id, but "
        "[action.triggers.params] carries literals only and the link's configuration "
        "is computed. Needs the computed values to land on a field first."
    ),
    "build_session_message: CurationJobs.SessionSpawned": (
        1,
        "Ready -> Running on the module's OWN entity. CONVERTIBLE TODAY via the "
        "kernel callback: set_success_result(\"SessionSpawned\", {session_id, "
        "workspace_id}). Deliberately not converted in this change because PR #209 "
        "(claude/split-rulebooks) is editing this module and its committed .wasm; "
        "resolving that conflict is not this change's call."
    ),
    "build_session_message: CurationJobs.Fail": (
        1,
        "dispatch_curation_job_failure() on SessionLink setup failure. The trigger "
        "already declares on_failure = \"Fail\", so this is a duplicate imperative "
        "path; it exists to attach a specific error_message. Same PR #209 hold."
    ),
}

# Minting an entity is the other half of driving a machine — an entity comes
# into existence in its initial state, which is a transition nothing declared.
# The finalizer no longer does it (that was this change). What remains is
# `build_session_message`, and it is pinned here so a new one is a deliberate
# edit rather than a quiet habit.
KNOWN_WASM_ENTITY_CREATES = {
    "build_session_message: Sessions": (
        "POSTs /tdata/Sessions to mint the agent session the job will run in. "
        "The declarative form is [[action.triggers]] kind=\"entity\" with "
        "resolve_target type=\"create\" on CurationJob.ConfigureAndSubmit, but "
        "the session's Configure carries the computed user_message, which "
        "[action.triggers.params] cannot hold — it takes literals only. Blocked "
        "until the built prompt lands on a CurationJob field first."
    ),
    "build_session_message: SessionLinks": (
        "POSTs /tdata/SessionLinks to mint the parent/child watch link. Same "
        "blocker as Sessions: the link's configuration is computed here."
    ),
    "build_session_message: Workspaces": (
        "POSTs /tdata/Workspaces to ensure the shared docs workspace exists. A "
        "get-or-create, not a lifecycle drive; the declarative equivalent is "
        "resolve_target type=\"create_if_missing\" from a source entity that "
        "carries the workspace id, which no CurationJob field holds today."
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


# A helper may forward through several layers (`walk_lane_entity_to_published`
# takes a set name and hands it to `attach_taste_vector`, which hands it to
# `dispatch_action`). Stopping at one layer would let a transition hide two
# calls deep, so resolution follows the chain. The bound is a cycle guard, not
# a design limit.
MAX_FORWARD_DEPTH = 6


def _forwarded_literals(source, spans, fn_name, param_index, depth=0, seen=None):
    """Literals reaching `param_index` of `fn_name`, following forwarders.

    A call site that passes a literal contributes it. A call site that passes
    one of ITS OWN enclosing function's parameters recurses one level up.
    Returns (literals, unresolved_descriptions).
    """
    seen = seen or set()
    key = (fn_name, param_index)
    if depth > MAX_FORWARD_DEPTH or key in seen:
        return set(), [f"forwarding chain for {fn_name}(arg {param_index}) is cyclic or too deep"]
    seen = seen | {key}

    literals = set()
    unresolved = []
    for match in re.finditer(rf"(?<!fn )\b{re.escape(fn_name)}\s*\(", source):
        args, _ = _split_call_args(source, match.end() - 1)
        if param_index >= len(args):
            continue
        raw = args[param_index]
        value = _literal(raw)
        if value is not None:
            literals.add(value)
            continue
        identifier = raw.strip().lstrip("&").strip()
        caller = _enclosing_function(spans, match.start())
        if caller and identifier in caller[1]:
            deeper, deeper_unresolved = _forwarded_literals(
                source, spans, caller[0], caller[1].index(identifier), depth + 1, seen
            )
            literals |= deeper
            unresolved.extend(deeper_unresolved)
        else:
            unresolved.append(
                f"{fn_name}(arg {param_index}) receives non-literal '{identifier}' "
                f"from fn {caller[0] if caller else '<top level>'}"
            )
    return literals, unresolved


# `dispatch_action(ctx, api_url, headers, set_name, entity_id, action, params)`
DISPATCH_SET_ARG = 3
DISPATCH_ACTION_ARG = 5

# Raw OData action URLs the modules build by hand, e.g.
#   {api_url}/tdata/Sessions('{session_id}')/OpenPaw.RecordResult
# The key may be quoted (string key) or bare (Guid key), so both are matched.
URL_ACTION_RE = re.compile(
    r"/tdata/(?P<set>[A-Za-z][A-Za-z0-9_]*)"
    r"\(\s*'?[^')]*'?\s*\)"
    r"/(?P<ns>[A-Za-z][A-Za-z0-9_.]*)\.(?P<action>[A-Za-z{][A-Za-z0-9_}]*)"
)

# A `/tdata/` URL that is only a read or a create — no action segment. The set
# name may be a `{placeholder}`, because with no action segment there is nothing
# for this contract to miss. The only trailing segment allowed is an OData
# system segment (`/$value`, `/$count`): the leading `$` is what distinguishes
# it from the `Namespace.Action` shape.
URL_PLAIN_RE = re.compile(
    r"^/tdata/(?:[A-Za-z][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})"
    r"(?:\(\s*'?[^')]*'?\s*\))?"
    r"(?:/\$[a-z]+)?"
    r"(?:[?][^\"]*)?$"
)

# The one generic template, inside `dispatch_action` itself. Its set and action
# are resolved from the call sites, not from this string.
GENERIC_DISPATCH_TEMPLATE = "/tdata/{set_name}('{entity_id}')/Temper.{action}"

# A dangling `Namespace.Action` suffix — the second half of a URL split across
# two literals (`format!("{base}/Temper.Publish")`) so neither one looks like a
# dispatch. Every component is required to be PascalCase, which is what keeps
# ordinary paths out: `/DESIGN.md` and `/registry-theme.json` end in a lowercase
# or hyphenated component, action names never do.
BARE_ACTION_SEGMENT_RE = re.compile(
    r"(?:^|/)(?:[A-Z][A-Za-z0-9_]*\.)+"
    r"(?:[A-Z][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})$"
)

# PascalCase dotted literals that are DATA, not URL fragments. Each one has to
# earn its place here by being read as a value rather than concatenated into a
# path — the pattern above cannot tell the two apart structurally.
HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"}

# Only these can dispatch an action or change anything. A GET cannot drive a
# state machine, so a read whose URL is bound to a variable one line earlier is
# not this contract's business.
MUTATING_HTTP_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Non-OData endpoints these modules legitimately call. Adding one is a
# deliberate act; the point is that the whole path is visible in one literal.
KNOWN_NON_ODATA_PATHS = {"/api/files/publish-artifact", "/embed", "/paw/"}

# HTTP targets that are a bare variable rather than an inline format!. Each has
# to earn its place: the value comes from trigger config, not from concatenating
# an entity path with an action name.
KNOWN_VARIABLE_URL_TARGETS = {
    # The taste-embedding service URL, read from `katagami_embed_url` config.
    "embed_url",
}

NON_URL_DOTTED_LITERALS = {
    # Stored on the SessionLink as ParentActionNamespace so paw-agent can build
    # ITS OWN callback to the parent job. Never concatenated here.
    "Katagami.Curation",
}


class WasmDoesNotDriveTheStateMachineTests(unittest.TestCase):
    def setUp(self):
        self.transitions = _load_transition_actions()
        self.entity_sets = _load_entity_set_map()
        # rglob, not glob: a module that grows a nested `src/foo/bar.rs` must
        # not fall outside the contract just by moving into a subdirectory.
        self.modules = sorted(
            p for p in WASM_ROOT.rglob("*.rs") if "target" not in p.parts
        )
        self.assertTrue(self.modules, "no WASM sources found under katagami-curation/wasm")

    # -- helpers ----------------------------------------------------------

    def _is_transition(self, entity_set, action):
        external = EXTERNAL_TRANSITION_ACTIONS.get(entity_set)
        if external is not None:
            return action in external
        automaton = self.entity_sets.get(entity_set)
        if automaton is None:
            # Unreachable: test_every_dispatch_target_is_a_known_entity_set
            # fails first. Never guess "not a transition" for an unknown set —
            # that is how a drive hides.
            raise AssertionError(f"unknown entity set '{entity_set}'")
        return automaton in self.transitions.get(action, set())

    def _dispatch_sites(self, module_name, source, count=False):
        """Dispatches from one module, plus anything unresolvable.

        With `count`, returns a {(entity_set, action): call_sites} mapping so a
        second call site of an already-registered drive is visible; otherwise a
        plain set.
        """
        spans = _function_spans(source)
        sites = collections.Counter()
        unresolved = []

        helper_span = next(
            ((s, e) for name, _, s, e in spans if name == DISPATCH_HELPER), None
        )

        for match in re.finditer(rf"(?<!fn )\b{DISPATCH_HELPER}\s*\(", source):
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
                identifier = raw.strip().lstrip("&").strip()
                if enclosing_name and identifier in enclosing_params:
                    forwarded, forward_unresolved = _forwarded_literals(
                        source, spans, enclosing_name, enclosing_params.index(identifier)
                    )
                    unresolved.extend(f"{module_name}: {u}" for u in forward_unresolved)
                    if forwarded:
                        return forwarded
                unresolved.append(
                    f"{module_name}: cannot resolve {label} '{identifier}' for a "
                    f"dispatch_action call inside fn {enclosing_name}"
                )
                return set()

            for entity_set in resolve(raw_set, "entity set"):
                for action in resolve(raw_action, "action"):
                    sites[(entity_set, action)] += 1

        for match in URL_ACTION_RE.finditer(source):
            action = match.group("action")
            if action.startswith("{"):
                # An interpolated action name in a hand-built URL. Exactly ONE
                # of these is legitimate: `dispatch_action`'s own template,
                # whose set and action are resolved from its call sites above.
                # Anywhere else it is the historical
                # `.../KatagamiCuration.{action}` loop idiom — the very shape
                # this contract exists to stop — so it is unresolved, not
                # skipped.
                inside_helper = helper_span and helper_span[0] <= match.start() <= helper_span[1]
                if not inside_helper:
                    unresolved.append(
                        f"{module_name}: hand-built action URL with an interpolated "
                        f"action '{action}' outside fn {DISPATCH_HELPER} — route it "
                        "through dispatch_action so the action is readable"
                    )
                continue
            sites[(match.group("set"), action)] += 1

        return (sites if count else set(sites)), unresolved

    # -- the contract -----------------------------------------------------

    def test_every_http_target_is_a_literal_this_contract_can_read(self):
        """The last door: assembling the URL out of tokens.

            let base = format!("{api_url}/tdata/CurationJobs('{id}')");
            let ns = "Katagami.Curation";
            let url = format!("{base}/{ns}.{}", actions[i]);
            ctx.http_call("POST", &url, headers, "{}")

        Every piece is individually innocent, and no complete action URL exists
        anywhere in the file. The only way to see through that is to require
        each HTTP call's target to be an INLINE format string whose literal
        this contract recognizes. A URL held in a variable first, or a format
        literal that is only fragments, fails here.
        """
        offenders = []
        for path in self.modules:
            module_name = path.parts[-3]
            source = path.read_text()
            spans = _function_spans(source)
            wrapper = next(((s, e) for n, _, s, e in spans if n == "http_call"), None)
            for match in re.finditer(r"(?<!fn )\bhttp_call\s*\(", source):
                if wrapper and wrapper[0] <= match.start() <= wrapper[1]:
                    # The module's own thin wrapper forwarding its arguments.
                    # Its callers are what this loop checks.
                    continue
                args, _ = _split_call_args(source, match.end() - 1)
                # ctx.http_call(method, url, headers, body) or
                # http_call(ctx, method, url, headers, body)
                url_arg = None
                literal_method = False
                for idx, arg in enumerate(args):
                    value = _literal(arg)
                    if value in HTTP_METHODS:
                        literal_method = True
                        if value not in MUTATING_HTTP_METHODS:
                            break
                        url_arg = args[idx + 1] if idx + 1 < len(args) else None
                        break
                if literal_method and url_arg is None:
                    continue  # a read
                if url_arg is None:
                    offenders.append(
                        f"{module_name}: http_call with a non-literal method — the "
                        "verb has to be readable before the target can be judged"
                    )
                    continue
                target = url_arg.strip().lstrip("&").strip()
                if target in KNOWN_VARIABLE_URL_TARGETS:
                    continue
                fmt = re.match(r'format!\s*\(\s*(r#)?"((?:[^"\\]|\\.)*)"', target)
                if not fmt:
                    offenders.append(
                        f"{module_name}: http_call target '{target[:60]}' is not an "
                        "inline format! literal"
                    )
                    continue
                literal = fmt.group(2)
                if "/tdata/" in literal or any(
                    p in literal for p in KNOWN_NON_ODATA_PATHS
                ):
                    continue
                offenders.append(
                    f"{module_name}: http_call format literal {literal!r} names no "
                    "path this contract recognizes — it looks assembled from pieces"
                )
        self.assertEqual(
            [],
            offenders,
            "every HTTP target in a WASM module must be an inline format! whose "
            "literal shows the whole path, so the action scan can read it. Build "
            "the URL in one place, or route the dispatch through "
            f"{DISPATCH_HELPER}:\n  " + "\n  ".join(offenders),
        )

    def test_every_declared_wasm_module_has_readable_source(self):
        """A binary with no source is a module this contract cannot read.

        The scan works on Rust. Shipping `wasm/rogue/rogue.wasm` with a spec
        trigger naming `module = "rogue"` and no Cargo project would leave every
        assertion here green while that binary POSTs whatever it likes. So every
        module the app declares must have source, and every committed `.wasm`
        must belong to a declared module.
        """
        app = tomllib.loads((CURATION / "app.toml").read_text())
        declared = {m["name"] for m in app.get("wasm_modules", [])}
        self.assertTrue(declared, "app.toml declares no wasm_modules")

        sourceless = sorted(
            name for name in declared if not (WASM_ROOT / name / "src").is_dir()
        )
        self.assertEqual(
            [],
            sourceless,
            "these modules are declared in app.toml but ship no readable Rust "
            "source, so nothing can audit what they dispatch:\n  "
            + "\n  ".join(sourceless),
        )

        # Committed binaries, ignoring cargo build output.
        binaries = {
            p.stem
            for p in WASM_ROOT.rglob("*.wasm")
            if "target" not in p.parts
        }
        undeclared = sorted(binaries - declared)
        self.assertEqual(
            [],
            undeclared,
            "these committed .wasm binaries belong to no module declared in "
            "app.toml — an undeclared binary is an unaudited one:\n  "
            + "\n  ".join(undeclared),
        )

        # Also pin the reverse direction against the specs: a trigger may only
        # name a module the app declares.
        for spec_path in sorted((CURATION / "specs").glob("*.ioa.toml")):
            spec = tomllib.loads(spec_path.read_text())
            for action in spec.get("action", []):
                for trigger in action.get("triggers", []):
                    if trigger.get("kind") != "wasm":
                        continue
                    self.assertIn(
                        trigger["module"],
                        declared,
                        f"{spec_path.name}:{action['name']} fires WASM module "
                        f"'{trigger['module']}', which app.toml does not declare",
                    )

    def test_the_dispatch_helper_cannot_be_reached_under_another_name(self):
        """The scan finds calls by name, so the name must be the only handle.

        `use self::dispatch_action as post_action;` or `let d = dispatch_action;`
        would give the module a second way to reach the same helper that the
        call-site regex never sees. Every occurrence of the identifier must
        therefore be either its definition or a direct call.
        """
        offenders = []
        for path in self.modules:
            module_name = path.parts[-3]
            source = path.read_text()
            for match in re.finditer(rf"\b{DISPATCH_HELPER}\b", source):
                before = source[max(0, match.start() - 3):match.start()]
                after = source[match.end():match.end() + 2]
                if before.endswith("fn ") or after.lstrip().startswith("("):
                    continue
                line = source[:match.start()].count("\n") + 1
                offenders.append(
                    f"{module_name}:{line} '{DISPATCH_HELPER}' used as a value, "
                    f"not called: ...{source[max(0, match.start() - 40):match.end() + 20].strip()}..."
                )
        self.assertEqual(
            [],
            offenders,
            "the action-dispatch helper must only ever be defined and called by "
            "its own name — aliasing it hides dispatches from this contract:\n  "
            + "\n  ".join(offenders),
        )

    def test_every_dispatch_target_is_a_known_entity_set(self):
        """An unknown target must fail, never default to 'not a transition'.

        Classification needs the target's spec. When a module dispatches at an
        entity set this repo has never heard of, the honest answer is "I cannot
        tell", and the only safe rendering of that is a failure — silently
        calling it a field write is how a drive hides.
        """
        unknown = set()
        for path in self.modules:
            module_name = path.parts[-3]
            sites, _ = self._dispatch_sites(module_name, path.read_text())
            for entity_set, _action in sites:
                if entity_set in EXTERNAL_TRANSITION_ACTIONS:
                    continue
                if entity_set in self.entity_sets:
                    continue
                unknown.add(f"{module_name}: {entity_set}")
        self.assertEqual(
            set(),
            unknown,
            "these entity sets are in neither this repo's CSDL nor "
            "EXTERNAL_TRANSITION_ACTIONS, so this contract cannot tell whether "
            "the dispatched action is a lifecycle transition. Add the owning "
            "app's transitions to EXTERNAL_TRANSITION_ACTIONS:\n  "
            + "\n  ".join(sorted(unknown)),
        )

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

    def test_every_odata_url_in_wasm_is_a_shape_this_contract_understands(self):
        """Close the false-negative door on the URL scan.

        The dangerous direction for a guard like this is a MISS, and the way to
        miss one is to assemble the action URL out of pieces so no single
        literal looks like a dispatch. So: every `/tdata/` string literal in
        every module must be a shape this file recognizes — a plain
        collection/entity URL, a fully-formed action URL, or the one generic
        template inside `dispatch_action`. A half-built path fails here rather
        than sliding past the scan above.
        """
        offenders = []
        literal_re = re.compile(r'"((?:[^"\\\n]|\\.)*)"')
        for path in self.modules:
            module_name = path.parts[-3]
            for raw in literal_re.findall(path.read_text()):
                if "/tdata/" not in raw:
                    continue
                fragment = raw[raw.index("/tdata/"):]
                if fragment == GENERIC_DISPATCH_TEMPLATE:
                    continue
                if URL_ACTION_RE.search(fragment):
                    continue
                if URL_PLAIN_RE.match(fragment):
                    continue
                offenders.append(f"{module_name}: {raw!r}")

            # The other half of the split-URL trick: build the entity part in
            # one literal (which passes as a plain read) and append the action
            # segment in a second literal that never contains `/tdata/`. Any
            # bare `Namespace.Action` fragment is therefore an offender too.
            for raw in literal_re.findall(path.read_text()):
                if "/tdata/" in raw:
                    continue
                if raw in NON_URL_DOTTED_LITERALS:
                    continue
                if BARE_ACTION_SEGMENT_RE.search(raw):
                    offenders.append(f"{module_name}: bare action segment {raw!r}")
        self.assertEqual(
            [],
            offenders,
            "these /tdata/ literals are not a recognized URL shape, so the "
            "transition scan above cannot see what they dispatch. Build the "
            "whole path in one literal, or route it through dispatch_action:\n  "
            + "\n  ".join(offenders),
        )

    def test_wasm_modules_do_not_drive_lifecycle_transitions(self):
        """The ratchet. Only shrinks."""
        found = {}
        for path in self.modules:
            module_name = path.parts[-3]
            source = path.read_text()
            sites, _ = self._dispatch_sites(module_name, source, count=True)
            for (entity_set, action), n in sites.items():
                if self._is_transition(entity_set, action):
                    key = f"{module_name}: {entity_set}.{action}"
                    found[key] = found.get(key, 0) + n

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

        # Identity is not enough: a SECOND call site of an already-registered
        # drive is more imperative control flow, and a set comparison would not
        # notice it. The register pins how many.
        grew = sorted(
            f"{key}: {found[key]} call sites, register says "
            f"{KNOWN_WASM_DRIVEN_TRANSITIONS[key][0]}"
            for key in actual & expected
            if found[key] != KNOWN_WASM_DRIVEN_TRANSITIONS[key][0]
        )
        self.assertEqual(
            [],
            grew,
            "the number of imperative dispatch sites changed. Growing one is "
            "not allowed; shrinking one means updating the count:\n  "
            + "\n  ".join(grew),
        )

    def test_wasm_modules_do_not_mint_entities(self):
        """The other half of the offense, ratcheted the same way.

        A POST to a bare collection creates an entity in its initial state — a
        transition no spec declared. `create` / `create_if_missing` target
        resolvers are the declarative form.
        """
        found = set()
        collection_re = re.compile(r'"[^"]*/tdata/([A-Za-z][A-Za-z0-9_]*)"')
        for path in self.modules:
            module_name = path.parts[-3]
            for entity_set in collection_re.findall(path.read_text()):
                found.add(f"{module_name}: {entity_set}")

        expected = set(KNOWN_WASM_ENTITY_CREATES)
        self.assertEqual(
            [],
            sorted(found - expected),
            "a WASM module must not mint entities by POSTing a collection — use "
            "an [[action.triggers]] kind=\"entity\" block with resolve_target "
            "type=\"create\" or \"create_if_missing\":\n  "
            + "\n  ".join(sorted(found - expected)),
        )
        self.assertEqual(
            [],
            sorted(expected - found),
            "these hand-rolled entity creates are gone — delete their entries "
            "from KNOWN_WASM_ENTITY_CREATES:\n  " + "\n  ".join(sorted(expected - found)),
        )

    def test_debt_register_entries_explain_themselves(self):
        for key, reason in KNOWN_WASM_ENTITY_CREATES.items():
            self.assertGreater(
                len(reason.split()),
                12,
                f"create-register entry '{key}' must say WHY it is still "
                "imperative and what it is blocked on",
            )
        for key, (call_sites, reason) in KNOWN_WASM_DRIVEN_TRANSITIONS.items():
            self.assertRegex(
                key,
                r"^[a-z_]+: [A-Za-z]+\.[A-Za-z]+$",
                f"register key '{key}' must be '<module>: <EntitySet>.<Action>'",
            )
            self.assertGreater(call_sites, 0, f"register entry '{key}' claims no call sites")
            self.assertGreater(
                len(reason.split()),
                12,
                f"register entry '{key}' must say WHY it is still imperative and "
                "what it is blocked on — a bare entry is how debt becomes design",
            )

    def _curation_job_spec(self):
        return tomllib.loads((CURATION / "specs" / "curation_job.ioa.toml").read_text())

    @staticmethod
    def _triggers(action):
        return {t["name"]: t for t in action.get("triggers", [])}

    def test_the_finalizer_no_longer_creates_or_submits_jobs_by_hand(self):
        """`maybe_spawn_repair_job` POSTed /tdata/CurationJobs, then Configure,
        then Submit — minting an entity and walking it Queued -> Ready from
        inside a verifier. All three are gone."""
        source = (WASM_ROOT / "finalize_spawned_session" / "src" / "lib.rs").read_text()
        for gone in (
            '/tdata/CurationJobs"',
            "KatagamiCuration.{action}",
            "KatagamiCuration.Configure",
            "maybe_spawn_repair_job",
        ):
            self.assertNotIn(
                gone,
                source,
                "the finalizer must not create or submit CurationJobs by hand; "
                "the repair job is minted by the failure_spawns_repair_job trigger",
            )

    def test_the_repair_verdict_is_an_action_not_a_field_on_fail(self):
        """The property that makes a stale re-arm impossible.

        `sync_fields` only writes params PRESENT in a call, so a marker field
        set by one failure outlives Retry and re-arms on the next state timeout
        or WASM `on_failure` — neither of which can carry a clearing param.
        Binding the spawn to a distinct ACTION removes the field the staleness
        would live in.
        """
        spec = self._curation_job_spec()
        fail = next(a for a in spec["action"] if a["name"] == "Fail")

        self.assertEqual(
            ["error_message"],
            fail["params"],
            "CurationJob.Fail must carry no repair params — a repair verdict "
            "riding on the ordinary failure action is exactly the sticky-marker "
            "bug this shape exists to prevent",
        )
        self.assertNotIn(
            "failure_spawns_repair_job",
            self._triggers(fail),
            "the repair trigger must hang off FailWithRepair, not Fail: every "
            "state_timeout and every WASM on_failure dispatches Fail",
        )

        for state_timeout in spec.get("state_timeout", []):
            self.assertEqual(
                "Fail",
                state_timeout["on_timeout"],
                "a state timeout must never take the repair path — it has no "
                "verifier verdict behind it",
            )

    def test_repair_job_creation_is_a_declared_trigger_not_an_imperative_walk(self):
        spec = self._curation_job_spec()
        repair_fail = next(a for a in spec["action"] if a["name"] == "FailWithRepair")
        fail = next(a for a in spec["action"] if a["name"] == "Fail")

        self.assertEqual(repair_fail["kind"], "internal")
        self.assertEqual(repair_fail["from"], fail["from"])
        self.assertEqual(repair_fail["to"], fail["to"])

        triggers = self._triggers(repair_fail)
        self.assertIn(
            "failure_spawns_repair_job",
            triggers,
            "CurationJob.FailWithRepair must declare the repair-job trigger",
        )
        trigger = triggers["failure_spawns_repair_job"]
        self.assertEqual(trigger["kind"], "entity")
        self.assertEqual(trigger["target_entity"], "CurationJob")
        self.assertEqual(trigger["target_action"], "ConfigureAndSubmit")
        self.assertEqual(
            trigger["params_from"]["input"],
            "repair_input",
            "the repair brief must travel from the failed job's own field",
        )
        # `field`, NOT `create_if_missing`. The latter falls back to
        # "{source_id}-derived" on an empty id, turning a blank verdict into a
        # malformed repair job with no brief; `field` resolves to nothing and
        # the rule drops. The id itself is verifier-derived, so the failed job
        # keeps a forward link and a redelivered verdict lands on the same
        # entity instead of a second agent session.
        self.assertEqual(trigger["resolve_target"]["type"], "field")
        self.assertEqual(trigger["resolve_target"]["field"], "repair_job_id")
        self.assertNotEqual(
            trigger["resolve_target"]["type"],
            "create_if_missing",
            "create_if_missing fails OPEN on an empty id field",
        )
        self.assertTrue(
            trigger.get("drop_ok"),
            "two paths drop by design — a blank verdict and a redelivered one — "
            "so the intentional drop has to be declared",
        )

        # A sanity gate, not the verdict. An empty or unknown lane spawns nothing.
        self.assertEqual(trigger["guard"]["type"], "field_in")
        self.assertEqual(trigger["guard"]["field"], "repair_job_type")
        self.assertNotIn(
            "",
            trigger["guard"]["values"],
            "an empty job type must never satisfy the repair gate",
        )

        for param in (
            "repair_job_id",
            "repair_input",
            "repair_job_type",
            "repair_language_id",
            "repair_model",
            "repair_provider",
            "repair_direction_id",
        ):
            self.assertIn(
                param,
                repair_fail["params"],
                f"CurationJob.FailWithRepair must declare '{param}' so the "
                "finalizer's verdict lands on a field the trigger can read",
            )

    def test_a_repairable_failure_propagates_exactly_like_an_ordinary_one(self):
        """FailWithRepair must not quietly become a softer failure.

        The propagation triggers live on Fail. A second failure action that
        forgot to carry them would leave the direction and query un-failed —
        the fan-out barrier would stall on a job that is already dead.
        """
        spec = self._curation_job_spec()
        fail = self._triggers(next(a for a in spec["action"] if a["name"] == "Fail"))
        repair = self._triggers(
            next(a for a in spec["action"] if a["name"] == "FailWithRepair")
        )

        def propagation(triggers):
            return {
                (t["target_entity"], t["target_action"]): (
                    t.get("guard"),
                    t.get("params_from"),
                    t.get("resolve_target"),
                    t.get("drop_ok"),
                )
                for t in triggers.values()
                if t["kind"] == "entity" and t["name"] != "failure_spawns_repair_job"
            }

        self.assertEqual(
            propagation(fail),
            propagation(repair),
            "FailWithRepair must fail its direction and query exactly as Fail "
            "does — same targets, same guards, same resolvers",
        )
        self.assertEqual(
            {t["module"] for t in fail.values() if t["kind"] == "wasm"},
            {t["module"] for t in repair.values() if t["kind"] == "wasm"},
            "both failure actions must still run the finalizer so the agent "
            "session is recorded as failed",
        )

    def test_the_finalizer_returns_both_failure_verdicts(self):
        source = (WASM_ROOT / "finalize_spawned_session" / "src" / "lib.rs").read_text()
        self.assertIn('set_success_result("Fail", &params)', source)
        self.assertIn('set_success_result("FailWithRepair", &params)', source)
        self.assertIn(
            'format!("{job_id}-repair-{next_attempt}")',
            source,
            "the repair job id must be derived from the failed job and the "
            "attempt, so create_if_missing is idempotent and the forward link "
            "survives",
        )
        self.assertIn(
            ".max(0)",
            source,
            "repair_attempt rides in caller-authorable job input; a negative "
            "counter would sail past MAX_REPAIR_ATTEMPTS and climb from below it",
        )


if __name__ == "__main__":
    unittest.main()
