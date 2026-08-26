#!/usr/bin/env bash
# Contract tests for scripts/lib/run-local-lib.sh — the three #251 leftovers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/run-local-lib.sh
. "$ROOT/scripts/lib/run-local-lib.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok  $*" ; }

# Leftover 3: stop helpers and run-local.sh must never pkill by process name.
if grep -nE 'pkill( |$)' "$ROOT/scripts/run-local.sh" "$ROOT/scripts/lib/run-local-lib.sh"; then
  fail "stop() must not pkill by process name"
fi
pass "no pkill in run-local.sh or lib"

# Leftover 1: the recorded SubmitForReview 409 is not a launch failure.
case "$(classify_seed_output "SEED FAILED: ArtStyles('x').SubmitForReview -> 409: ActionFailed: Action 'SubmitForReview' not valid from state 'Draft'")" in
  known_submit_break) pass "classify 409 SubmitForReview from Draft" ;;
  *) fail "expected known_submit_break for the recorded 409" ;;
esac
case "$(classify_seed_output "=== Seed incomplete: SubmitForReview refused from Draft (known break) ===")" in
  known_submit_break) pass "classify seed incomplete marker" ;;
  *) fail "expected known_submit_break for the incomplete marker" ;;
esac
case "$(classify_seed_output "=== Seed complete ===")" in
  complete) pass "classify seed complete" ;;
  *) fail "expected complete" ;;
esac
case "$(classify_seed_output "create PaletteSystems -> 423: VerificationRequired")" in
  verifying) pass "classify VerificationRequired" ;;
  *) fail "expected verifying" ;;
esac
case "$(classify_seed_output "SEED FAILED: PaletteSystems not reachable (404)")" in
  failed) pass "classify other seed failure as failed" ;;
  *) fail "expected failed for a non-409 seed error" ;;
esac

# Leftover 2: each PORT has its own env file; contents follow the port.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
f3499="$(ui_stack_env_file "$tmp" 3499)"
f3511="$(ui_stack_env_file "$tmp" 3511)"
[ "$f3499" = "$tmp/.env.3499.local" ] || fail "stack env path for 3499"
[ "$f3511" = "$tmp/.env.3511.local" ] || fail "stack env path for 3511"
write_ui_env_file "$f3499" 3499 default test-local-key
write_ui_env_file "$f3511" 3511 default test-local-key
grep -q 'NEXT_PUBLIC_TEMPER_API_URL=http://localhost:3499' "$f3499" || fail "3499 env URL"
grep -q 'NEXT_PUBLIC_TEMPER_API_URL=http://localhost:3511' "$f3511" || fail "3511 env URL"
[ "$(ui_env_temper_port "$f3499")" = 3499 ] || fail "read back 3499"
[ "$(ui_env_temper_port "$f3511")" = 3511 ] || fail "read back 3511"
pass "two PORT stacks write distinct env files"

# Shared ui/.env.local is left alone when it points at a listening port.
holder_port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
python3 -c "
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.end_headers()
    def log_message(self, *args):
        pass
HTTPServer(('127.0.0.1', $holder_port), H).serve_forever()
" >/dev/null 2>&1 &
holder_pid=$!
for _ in $(seq 1 40); do
  lsof -ti :"$holder_port" >/dev/null 2>&1 && break
  sleep 0.05
done
lsof -ti :"$holder_port" >/dev/null 2>&1 || fail "holder never listened on $holder_port"
write_ui_env_file "$tmp/.env.local" "$holder_port" default key-a
maybe_write_shared_ui_env "$tmp/.env.local" 3511 default key-b
grep -q "localhost:$holder_port" "$tmp/.env.local" || fail "shared env clobbered while holder listened"
grep -q 'key-a' "$tmp/.env.local" || fail "shared env key overwritten while holder listened"
grep -q 'key-b' "$tmp/.env.local" && fail "shared env took the new key while holder listened"
pass "shared .env.local not clobbered while its PORT still listens"

kill "$holder_pid" 2>/dev/null || true
kill_port_listeners "$holder_port"
for _ in $(seq 1 40); do
  lsof -ti :"$holder_port" >/dev/null 2>&1 || break
  sleep 0.05
done
maybe_write_shared_ui_env "$tmp/.env.local" 3511 default key-b
grep -q 'localhost:3511' "$tmp/.env.local" || fail "shared env should update once the old port is free"
pass "shared .env.local updates when the previous PORT is gone"

echo "ALL PASSED"
