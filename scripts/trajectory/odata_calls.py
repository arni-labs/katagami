#!/usr/bin/env python3
"""Where a governed OData action can be READ OFF a harness tool call.

One definition, used by the producer (`claude_session_to_ots`) and by the
offline checker (`conformance_check`). Two copies of this rule drift, and a
drifted copy means the document a judge reads and the replay that judges it
disagree about what the run even did.

The question is narrow: given one harness tool call, which governed actions did
it actually REQUEST? Not which action names appear in its text. Most of a tool
call is prose the agent authored — a `Write` that documents an endpoint, an
`Agent` prompt quoting a call that 404'd, an `echo` into a scratch file — and
none of that is an attempt to act on the governed system.

Three narrowings, applied in order:

1. **The field.** Only arguments that name a request are read at all
   (`REQUEST_ARGUMENTS`): `Bash.command`, `WebFetch.url`, `http_request.path`,
   and the code field of an MCP execute-style tool. A tool that issues no
   request contributes nothing, whatever its arguments contain, so `Write`,
   `Edit`, `Read`, `Agent` and friends are never scanned. `PROSE_ARGUMENTS`
   names the free-prose fields explicitly and they are refused even if some
   later edit lists one as a request field.
2. **The context.** Inside a command or a snippet of code, the path has to sit
   in a segment that issues a request: a segment that only prints or reads text
   (`echo`, `cat`, `grep`) made no request whatever text it moved, and a
   segment with no HTTP client in it is not a request either.
3. **The shape.** The full OData bound-action path,
   `/tdata/<Set>('<id>')/<Namespace>.<Action>` — never a bare `Namespace.Action`
   token floating in text.

Getting this wrong in the permissive direction is the expensive direction. A
fabricated action name that the actor's spec does not declare has no kernel row
behind it, so layer 1 reports `unknown_action` against a run that never
attempted it — a formalism failing in a systematic direction, which is exactly
the failure mode the study's verification log already records. Under-reporting
is the safe direction: the kernel's own dispatch rows remain the authority on
what actually ran.

## The namespace segment

Optional, deliberately. The kernel takes the LAST dot-segment of the action
path as the action name (`action.rsplit('.').next()` —
`temper-server/src/odata/write.rs`), so `Katagami.RecordDraft` and
`Temper.RecordDraft` dispatch the same action, and a scan constrained to
`Temper.` would miss a real dispatched call. Callers decide what a match with
NO namespace means, because that is where the two callers legitimately differ:
`/tdata/CuratorAgents('r')/State` reads a property, so the checker accepts a
namespace-less segment only when it names an action the actor actually has,
and the producer — which has no spec in hand — does not accept one at all.
"""

from __future__ import annotations

import json
import re
from typing import Any, NamedTuple


class ODataCall(NamedTuple):
    """One governed action a tool call requested, and where it was read from."""

    entity_set: str
    entity_id: str
    namespace: str
    action: str
    field: str


# POST /tdata/CuratorAgents('<id>')/Temper.SelfReview — the OData bound-action
# shape, however it was issued: a curl in a Bash command, a WebFetch url, code
# in an MCP execute call.
ODATA_ACTION = re.compile(
    r"/tdata/(?P<set>[A-Za-z][A-Za-z0-9_]*)\((?P<id>[^)]*)\)/"
    r"(?P<namespace>[A-Za-z][A-Za-z0-9_]*\.)?(?P<action>[A-Za-z][A-Za-z0-9_]*)"
)

# The two kinds of request-bearing argument, which are read differently.
COMMAND = "command"  # a shell command line, or a snippet of code that runs
TARGET = "target"  # the request target itself

# Which argument of which tool carries a request target.
#
# The scan used to run over every argument of every call, serialized. That
# counted a URL that was WRITTEN as a call that was MADE: editing this
# repository's own skill documentation, which is full of
# `/tdata/CuratorAgents('<run id>')/Temper.SelfReview` examples, registered as
# the run performing those transitions.
#
# Keys are the tool name lowercased, with any `mcp__server__` prefix dropped.
REQUEST_ARGUMENTS: dict[str, dict[str, str]] = {
    "bash": {"command": COMMAND},
    "shell": {"command": COMMAND},
    "run_command": {"command": COMMAND},
    "curl": {"url": TARGET, "command": COMMAND},
    "fetch": {"url": TARGET},
    "webfetch": {"url": TARGET},
    "web_fetch": {"url": TARGET},
    "http_request": {"url": TARGET, "path": TARGET, "endpoint": TARGET},
    # MCP execute-style tools run code that makes the calls.
    "execute": {"code": COMMAND, "script": COMMAND},
}

# Arguments whose value is prose the agent authored rather than a request it
# issued. Never scanned, whatever tool they arrive on.
#
# The allowlist above already excludes every one of these, so this set is the
# second gate rather than the first: it makes the intent explicit, and a test
# asserts the two never overlap, so an edit that adds `prompt` or `content` to
# a tool's request arguments fails rather than quietly turning documentation
# into evidence.
PROSE_ARGUMENTS = frozenset(
    {
        "content",  # Write
        "old_string",  # Edit
        "new_string",  # Edit
        "new_source",  # NotebookEdit
        "prompt",  # Agent / Task
        "description",  # Bash's own summary line
        "instructions",
        "message",
        "thought",
    }
)

# What makes a command segment a REQUEST rather than text about one.
#
# Explicit clients only. `http`/`httpie` are deliberately absent: `\bhttp\b`
# matches inside any `http://` URL, which would make every quoted URL its own
# request context and give back the false positives this module exists to stop.
# A run that reaches Temper through httpie is therefore under-reported here and
# is still visible in the kernel's dispatch rows.
REQUEST_ISSUING = re.compile(
    r"\bcurl\b"
    r"|\bwget\b"
    r"|\bxh\b"
    r"|\bInvoke-(?:WebRequest|RestMethod)\b"
    r"|--request\b"
    r"|(?:^|\s)-X\s"  # curl's explicit method flag
    r"|\burlopen\b|\burlretrieve\b"
    r"|\bfetch\s*\("
    # requests.post(, session.put(, temper.post(, client.request(
    r"|\b\w+\.(?:get|post|put|patch|delete|head|request)\s*\(",
    re.IGNORECASE,
)

# Commands that move text around and issue nothing. A segment led by one of
# these made no request, whatever it printed — `echo "curl .../Temper.X" > notes`
# is a note about a call, not a call.
TEXT_ONLY_COMMANDS = frozenset(
    {
        "echo",
        "printf",
        "cat",
        "bat",
        "tee",
        "head",
        "tail",
        "grep",
        "egrep",
        "fgrep",
        "rg",
        "ag",
        "sed",
        "awk",
        "cut",
        "sort",
        "uniq",
        "wc",
        "less",
        "more",
        "strings",
        "diff",
        "comm",
        "jq",
        "yq",
    }
)

_ENV_ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")


def tool_key(tool: Any) -> str:
    """`mcp__temper__execute` -> `execute`; `Bash` -> `bash`."""
    if not isinstance(tool, str):
        return ""
    return tool.rsplit("__", 1)[-1].strip().lower()


def entity_id(raw: Any) -> str:
    """`'run-1'` or `run-1` -> `run-1`. An id is an id, quoted or not."""
    if not isinstance(raw, str):
        return ""
    return raw.strip().strip("'\"").strip()


def command_segments(text: str) -> list[str]:
    """One shell command line split into the commands it actually runs.

    Quote aware, because the split is what decides whether a URL belongs to the
    `curl` beside it or to the `echo` beside it, and a `;` inside a JSON body
    would otherwise cut a real request in half and lose it.
    """
    segments: list[str] = []
    current: list[str] = []
    quote: str | None = None
    index = 0
    while index < len(text):
        char = text[index]
        if quote:
            if char == "\\" and quote == '"' and index + 1 < len(text):
                current.append(char)
                current.append(text[index + 1])
                index += 2
                continue
            if char == quote:
                quote = None
            current.append(char)
            index += 1
            continue
        if char in "'\"":
            quote = char
            current.append(char)
            index += 1
            continue
        if char in ";|&\n":
            segments.append("".join(current))
            current = []
            index += 1
            while index < len(text) and text[index] in ";|&":
                index += 1
            continue
        current.append(char)
        index += 1
    segments.append("".join(current))
    return [segment for segment in segments if segment.strip()]


def _leading_command(segment: str) -> str:
    """The program a segment runs, past any `FOO=bar` prefixes."""
    for token in segment.strip().split():
        if _ENV_ASSIGNMENT.match(token):
            continue
        return token.rsplit("/", 1)[-1].strip("\"'`()").lower()
    return ""


def issues_request(segment: str) -> bool:
    """Whether this command segment makes an HTTP request."""
    if _leading_command(segment) in TEXT_ONLY_COMMANDS:
        return False
    return bool(REQUEST_ISSUING.search(segment))


def _as_fields(arguments: Any) -> dict[str, Any] | None:
    """Tool arguments as the field map they are, or nothing.

    A harness that hands its arguments over as the raw JSON string is read as
    the object it encodes. Anything that is not an object of named fields is
    refused rather than scanned as text: without a field there is no way to
    tell a request from a paragraph about one, and scanning it anyway is the
    fabrication this module exists to stop.
    """
    if isinstance(arguments, dict):
        return arguments
    if isinstance(arguments, str):
        try:
            parsed = json.loads(arguments)
        except (TypeError, ValueError):
            return None
        if isinstance(parsed, dict):
            return parsed
    return None


def request_texts(tool: Any, arguments: Any) -> list[tuple[str, str]]:
    """The (field, text) pairs of one tool call that name a request.

    A command argument contributes only the segments that issue a request; a
    target argument contributes its whole value, because the field's own
    meaning is "this is what was requested".
    """
    fields = REQUEST_ARGUMENTS.get(tool_key(tool))
    arguments = _as_fields(arguments)
    if not fields or arguments is None:
        return []

    texts: list[tuple[str, str]] = []
    for field, kind in fields.items():
        if field in PROSE_ARGUMENTS:
            continue
        value = arguments.get(field)
        if not isinstance(value, str) or not value:
            continue
        if kind == TARGET:
            texts.append((field, value))
            continue
        texts.extend(
            (field, segment)
            for segment in command_segments(value)
            if issues_request(segment)
        )
    return texts


def odata_calls(tool: Any, arguments: Any) -> list[ODataCall]:
    """Every governed OData action this tool call requested, in order.

    Matches with no namespace segment are returned with an empty `namespace`
    rather than dropped; see the module docstring for why that decision belongs
    to the caller.
    """
    calls: list[ODataCall] = []
    for field, text in request_texts(tool, arguments):
        for match in ODATA_ACTION.finditer(text):
            calls.append(
                ODataCall(
                    entity_set=match.group("set"),
                    entity_id=entity_id(match.group("id")),
                    namespace=(match.group("namespace") or "").rstrip("."),
                    action=match.group("action"),
                    field=field,
                )
            )
    return calls
