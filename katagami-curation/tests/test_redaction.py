"""Credential redaction contract (ARN-293).

A trajectory is a verbatim record, and verbatim records of agent work contain
credentials: a `.env` that was read, an `Authorization` header printed by a
failing request, a key pasted into a shell command. These assertions are what
notice when a shape stops being caught.

The fixtures here are invented strings shaped like credentials. No real secret
is ever committed to this repository.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAJECTORY_DIR = REPO_ROOT / "scripts" / "trajectory"


def _load(module_name):
    sys.path.insert(0, str(TRAJECTORY_DIR))
    try:
        spec = importlib.util.spec_from_file_location(
            module_name, TRAJECTORY_DIR / f"{module_name}.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.remove(str(TRAJECTORY_DIR))


redaction = _load("redaction")


class CredentialShapesTest(unittest.TestCase):
    CASES = {
        "bearer": "curl -H 'Authorization: Bearer abcdef0123456789abcdef' https://x",
        "github-token": "token ghp_0123456789abcdefghijklmnopqrstuvwxyz",
        "anthropic-key": "ANTHROPIC key sk-ant-api03-AAAABBBBCCCCDDDDEEEEFFFF",
        "openai-key": "sk-proj-AAAABBBBCCCCDDDDEEEEFFFFGGGG",
        "slack-token": "xoxb-1111111111-2222222222-abcdefghijkl",
        "google-key": "AIzaSyA1234567890abcdefghijklmnopqrstuvw",
        "aws-key-id": "AKIAIOSFODNN7EXAMPLE",
        "jwt": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27u",
        "private-key": "-----BEGIN RSA PRIVATE KEY-----\nAAAA\nBBBB\n-----END RSA PRIVATE KEY-----",
        "basic-auth": "Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==",
    }

    def test_every_known_shape_is_removed(self):
        for kind, sample in self.CASES.items():
            redacted = redaction.redact_text(sample)
            self.assertIn(f"[redacted:{kind}]", redacted, kind)

    def test_the_secret_itself_does_not_survive(self):
        secrets = [
            "ghp_0123456789abcdefghijklmnopqrstuvwxyz",
            "sk-ant-api03-AAAABBBBCCCCDDDDEEEEFFFF",
            "AKIAIOSFODNN7EXAMPLE",
        ]
        blob = "\n".join(self.CASES.values())
        redacted = redaction.redact_text(blob)
        for secret in secrets:
            self.assertNotIn(secret, redacted)

    def test_named_assignments_are_redacted_even_without_a_known_shape(self):
        source = "TEMPER_API_KEY=hunter2-not-a-shaped-token\nDB_PASSWORD: correct-horse"
        redacted = redaction.redact_text(source)
        self.assertNotIn("hunter2-not-a-shaped-token", redacted)
        self.assertNotIn("correct-horse", redacted)
        self.assertIn("TEMPER_API_KEY=[redacted:env]", redacted)

    def test_url_credentials_lose_the_password_and_keep_the_host(self):
        redacted = redaction.redact_text("https://user:s3cr3t-pass@example.com/repo")
        self.assertNotIn("s3cr3t-pass", redacted)
        self.assertIn("example.com/repo", redacted)

    def test_ordinary_prose_and_code_survive(self):
        # Redaction that eats the trajectory is a different kind of failure.
        text = (
            "Read DESIGN.md and tightened the spacing scale from 4 8 16 24 to 4 8 16.\n"
            "const spacing = [4, 8, 16];\n"
            "prompt_tokens=2000 completion_tokens=48"
        )
        self.assertEqual(redaction.redact_text(text), text)


class StructuredValueTest(unittest.TestCase):
    def test_secret_keys_lose_their_value_whatever_it_looks_like(self):
        redacted = redaction.redact_value(
            {"api_key": "plainish", "headers": {"Authorization": "whatever"}}
        )
        self.assertEqual(redacted["api_key"], "[redacted:key]")
        self.assertEqual(redacted["headers"]["Authorization"], "[redacted:key]")

    def test_token_accounting_is_not_mistaken_for_a_credential(self):
        redacted = redaction.redact_value(
            {"prompt_token_ids": [1, 2, 3], "token_count": 42, "max_tokens": 100}
        )
        self.assertEqual(redacted["prompt_token_ids"], [1, 2, 3])
        self.assertEqual(redacted["token_count"], 42)
        self.assertEqual(redacted["max_tokens"], 100)

    def test_redaction_reaches_into_nested_lists_and_dicts(self):
        redacted = redaction.redact_value(
            {"steps": [{"command": "export GH_TOKEN=ghp_0123456789abcdefghijklmnop"}]}
        )
        self.assertNotIn("ghp_0123456789abcdefghijklmnop", str(redacted))


class ExceptionBypassTest(unittest.TestCase):
    """The accounting exceptions must not become a way to smuggle a secret.

    Substring-matched exceptions did exactly that: every key below contains an
    entry from SECRET_KEY_EXCEPTIONS somewhere inside it, and every key below
    holds a credential.
    """

    BYPASS_KEYS = (
        # contains the exception "tokens"
        "refresh_tokens",
        "refresh_tokens_value",
        # contains the exception "token_budget", and says "secret" outright
        "token_budget_secret",
        # contains the exception "tokens", and says "api_key" outright
        "api_key_tokens",
        # contains the exception "token_count"
        "token_count_password",
        # contains the exception "max_tokens"
        "max_tokens_credential",
        # the singular is not on the exception list at all
        "refresh_token",
    )

    def test_a_key_that_merely_contains_an_exception_is_still_a_secret(self):
        for key in self.BYPASS_KEYS:
            redacted = redaction.redact_value({key: "s3cr3t-value-goes-here"})
            self.assertEqual(redacted[key], "[redacted:key]", key)

    def test_the_same_keys_are_redacted_as_text_assignments(self):
        for key in self.BYPASS_KEYS:
            redacted = redaction.redact_text(f"{key}=s3cr3t-value-goes-here")
            self.assertNotIn("s3cr3t-value-goes-here", redacted, key)

    def test_an_exception_only_applies_to_the_whole_key(self):
        self.assertFalse(redaction._is_secret_key("tokens"))
        self.assertTrue(redaction._is_secret_key("refresh_tokens"))

    def test_a_non_token_hint_outvotes_an_exact_exception(self):
        # Even if someone adds this exact key to the exception list, `secret`
        # is not a hint an exception may neutralize.
        self.assertTrue(
            redaction._is_secret_key("token_budget_secret"),
            "a key naming a secret must never be exempted as accounting",
        )

    def test_the_accounting_keys_it_exists_for_still_survive(self):
        for key in redaction.SECRET_KEY_EXCEPTIONS:
            self.assertFalse(redaction._is_secret_key(key), key)
            self.assertFalse(redaction._is_secret_key(key.upper()), key)


if __name__ == "__main__":
    unittest.main()
