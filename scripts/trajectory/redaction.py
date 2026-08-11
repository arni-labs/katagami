"""Credential redaction for captured trajectories.

A trajectory is a verbatim record of what an agent read, wrote, and was told.
That is exactly what makes it useful training data, and exactly what makes it
dangerous to upload unfiltered: an agent that reads `.env`, prints a failing
request with its `Authorization` header, or pastes a key into a shell command
puts that secret in the transcript, and the transcript is what we post.

So every string that leaves this pipeline passes through here first. The rules
are deliberately blunt — a redaction that occasionally eats a harmless token is
a cost; a leaked credential in a durable training corpus is not recoverable.

Redaction is unconditional. There is no flag to turn it off, because the one
run where somebody turns it off is the run that leaks.

What this does NOT claim: it is not a proof that no secret survives. A secret
with no recognizable shape (a bare password, an internal URL) still passes. It
removes the shapes that are recognizable, and `scripts/trajectory/README.md`
says plainly what is uploaded so nobody has to guess.
"""

from __future__ import annotations

import re
from typing import Any

PLACEHOLDER = "[redacted:{kind}]"

# Keys whose VALUE is a credential whatever it looks like. Matched on the key
# name, case-insensitively, as a substring — `TEMPER_API_KEY`, `api_key`, and
# `authorization` all land here.
SECRET_KEY_HINTS = (
    "api_key",
    "apikey",
    "access_key",
    "secret",
    "password",
    "passwd",
    "token",
    "credential",
    "private_key",
    "authorization",
    "auth_header",
    "session_key",
)

# Keys that contain the word "token" but are counted, not secret. Without this
# every trajectory would have its token accounting redacted into uselessness.
SECRET_KEY_EXCEPTIONS = (
    "token_count",
    "tokens",
    "prompt_token_ids",
    "completion_token_ids",
    "max_tokens",
    "token_budget",
)

_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    # Whole private key blocks, before anything else can chew on their body.
    (
        "private-key",
        re.compile(
            r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----",
            re.S,
        ),
    ),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")),
    ("github-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{16,}")),
    ("github-token", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}")),
    ("anthropic-key", re.compile(r"\bsk-ant-[A-Za-z0-9\-_]{16,}")),
    ("openai-key", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9\-_]{20,}")),
    ("slack-token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("google-key", re.compile(r"\bAIza[0-9A-Za-z\-_]{35}")),
    ("aws-key-id", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    # Bearer credentials, in a header line or on their own.
    (
        "bearer",
        re.compile(r"(?i)\bbearer\s+[A-Za-z0-9\-._~+/=]{12,}"),
    ),
    (
        "basic-auth",
        re.compile(r"(?i)\bbasic\s+[A-Za-z0-9+/=]{16,}"),
    ),
    # user:password@host in a URL.
    (
        "url-credentials",
        re.compile(r"(?i)\b([a-z][a-z0-9+.-]*)://[^\s/:@]+:[^\s/@]+@"),
    ),
)

# NAME=value / NAME: value where the NAME itself says it is a credential.
# Runs after the shaped patterns so a recognizable token is labelled by kind.
_ENV_ASSIGNMENT = re.compile(
    r"(?i)\b([A-Za-z0-9_.-]*"
    r"(?:secret|token|password|passwd|api[_-]?key|access[_-]?key|private[_-]?key|credential)"
    r"[A-Za-z0-9_.-]*)"
    r"(\s*[:=]\s*)"
    r"(\"[^\"\n]{4,}\"|'[^'\n]{4,}'|[^\s\"',;]{4,})"
)

_ENV_ASSIGNMENT_SKIP = re.compile(r"(?i)^(?:\[redacted:[a-z-]+\]|null|none|true|false)$")


def _is_secret_key(key: str) -> bool:
    lowered = key.lower()
    if any(exception in lowered for exception in SECRET_KEY_EXCEPTIONS):
        return False
    return any(hint in lowered for hint in SECRET_KEY_HINTS)


def redact_text(text: str) -> str:
    """Replace every recognizable credential shape in one string."""
    if not text:
        return text
    for kind, pattern in _PATTERNS:
        if kind == "url-credentials":
            text = pattern.sub(
                lambda m: f"{m.group(1)}://{PLACEHOLDER.format(kind='url-credentials')}@",
                text,
            )
        else:
            text = pattern.sub(PLACEHOLDER.format(kind=kind), text)

    def _assignment(match: re.Match[str]) -> str:
        name, value = match.group(1), match.group(3).strip("\"'")
        # `prompt_tokens=2000` is accounting, not a credential. One definition
        # of "this name means a secret", shared with the key-based rule.
        if not _is_secret_key(name):
            return match.group(0)
        if _ENV_ASSIGNMENT_SKIP.match(value):
            return match.group(0)
        return f"{name}{match.group(2)}{PLACEHOLDER.format(kind='env')}"

    return _ENV_ASSIGNMENT.sub(_assignment, text)


def redact_value(value: Any, *, key: str | None = None) -> Any:
    """Redact recursively through the JSON shapes a tool call is made of.

    Dict keys are inspected as well as values: a `{"api_key": "..."}` argument
    is redacted whether or not the value itself looks like a credential.
    """
    if key is not None and _is_secret_key(key) and isinstance(value, (str, int, float)):
        return PLACEHOLDER.format(kind="key")
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, dict):
        return {k: redact_value(v, key=str(k)) for k, v in value.items()}
    if isinstance(value, list):
        return [redact_value(item) for item in value]
    return value
