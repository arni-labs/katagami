#!/usr/bin/env bash
# Replay the three #251 leftovers against run-local.sh with a stub Temper.
# Does not need a real temper checkout or Next install.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKDIR="$(mktemp -d)"
trap 'cleanup' EXIT

cleanup() {
  if [ -n "${PORT1:-}" ]; then PORT="$PORT1" UI_PORT="$UI1" bash "$ROOT/scripts/run-local.sh" --stop >/dev/null 2>&1 || true; fi
  if [ -n "${PORT2:-}" ]; then PORT="$PORT2" UI_PORT="$UI2" bash "$ROOT/scripts/run-local.sh" --stop >/dev/null 2>&1 || true; fi
  rm -rf "$WORKDIR"
}

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok  $*" ; }

# Pick free high ports so we do not touch a human's 3467/3000.
pick_port() {
  python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])'
}

PORT1="$(pick_port)"
UI1="$(pick_port)"
PORT2="$(pick_port)"
UI2="$(pick_port)"

# Fake temper-fs tree so the script's directory check passes.
mkdir -p "$WORKDIR/temper/os-apps/temper-fs/specs"
echo "# stub" >"$WORKDIR/temper/os-apps/temper-fs/specs/.keep"

# Fake ui dir so we do not touch the real gallery env files.
mkdir -p "$WORKDIR/ui"
# node_modules marker so the script does not nag; npm is stubbed anyway.
mkdir -p "$WORKDIR/ui/node_modules"

# Stub PATH: temper listens on --port; npm listens on --port; pkill fails the test.
STUB="$WORKDIR/bin"
mkdir -p "$STUB"

cat >"$STUB/temper" <<'PY'
#!/usr/bin/env python3
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

port = 3467
args = sys.argv[1:]
for i, a in enumerate(args):
    if a == "--port" and i + 1 < len(args):
        port = int(args[i + 1])

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"value":[]}')
    def do_POST(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"all_passed":true}')
    def log_message(self, *args):
        pass

HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
chmod +x "$STUB/temper"

cat >"$STUB/npm" <<'PY'
#!/usr/bin/env python3
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

port = 3000
args = sys.argv[1:]
for i, a in enumerate(args):
    if a == "--port" and i + 1 < len(args):
        port = int(args[i + 1])

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")
    def log_message(self, *args):
        pass

HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
chmod +x "$STUB/npm"

# Seed stub: the recorded 409. run-local.sh must not exit 1.
cat >"$WORKDIR/seed-409.mjs" <<'JS'
console.error("SEED FAILED: ArtStyles('seed').SubmitForReview -> 409: ActionFailed: Action 'SubmitForReview' not valid from state 'Draft'");
process.exit(1);
JS

# pkill stub: leftover 3. Any invocation fails the replay.
cat >"$STUB/pkill" <<'SH'
#!/usr/bin/env bash
echo "FAIL: pkill invoked: $*" >&2
exit 99
SH
chmod +x "$STUB/pkill"

export PATH="$STUB:$PATH"
export TEMPER_REPO="$WORKDIR/temper"
export KATAGAMI_UI_DIR="$WORKDIR/ui"
export KATAGAMI_SEED_SCRIPT="$WORKDIR/seed-409.mjs"

# Replay 1: seed 409 must still reach ==> ready, write env, listen on UI_PORT.
echo "==> replay 1: PORT=$PORT1 UI_PORT=$UI1 with seed 409"
set +e
OUT1="$(PORT="$PORT1" UI_PORT="$UI1" bash "$ROOT/scripts/run-local.sh" 2>&1)"
RC1=$?
set -e
printf '%s\n' "$OUT1" | tail -20
[ "$RC1" = 0 ] || fail "replay 1 exited $RC1"
printf '%s\n' "$OUT1" | grep -q "==> ready" || fail "replay 1 missing ==> ready"
[ -f "$WORKDIR/ui/.env.local" ] || fail "replay 1 did not write ui/.env.local"
[ -f "$WORKDIR/ui/.env.$PORT1.local" ] || fail "replay 1 did not write stack env"
grep -q "localhost:$PORT1" "$WORKDIR/ui/.env.local" || fail "replay 1 env URL"
curl -sf "http://127.0.0.1:$UI1/" >/dev/null || fail "replay 1 Next not listening on $UI1"
pass "replay 1 reached ready, wrote env, UI on $UI1"

# Replay 2: second stack must not retarget the first env / URL.
echo "==> replay 2: PORT=$PORT2 UI_PORT=$UI2"
set +e
OUT2="$(PORT="$PORT2" UI_PORT="$UI2" bash "$ROOT/scripts/run-local.sh" 2>&1)"
RC2=$?
set -e
[ "$RC2" = 0 ] || fail "replay 2 exited $RC2"
printf '%s\n' "$OUT2" | grep -q "==> ready" || fail "replay 2 missing ==> ready"
[ -f "$WORKDIR/ui/.env.$PORT2.local" ] || fail "replay 2 did not write its stack env"
grep -q "localhost:$PORT1" "$WORKDIR/ui/.env.$PORT1.local" || fail "stack 1 env clobbered"
grep -q "localhost:$PORT2" "$WORKDIR/ui/.env.$PORT2.local" || fail "stack 2 env wrong"
# Shared convenience file must still point at the first live stack.
grep -q "localhost:$PORT1" "$WORKDIR/ui/.env.local" || fail "shared ui/.env.local clobbered by second PORT"
curl -sf "http://127.0.0.1:$UI1/" >/dev/null || fail "replay 2 killed first UI"
curl -sf "http://127.0.0.1:$UI2/" >/dev/null || fail "replay 2 UI not listening"
pass "replay 2: two PORT stacks keep distinct env files and URLs"

# Replay 3: --stop must not call pkill (stub exits 99 if it does).
echo "==> replay 3: stop() does not pkill"
set +e
OUT3="$(PORT="$PORT1" UI_PORT="$UI1" bash "$ROOT/scripts/run-local.sh" --stop 2>&1)"
RC3=$?
set -e
[ "$RC3" = 0 ] || fail "replay 3 --stop exited $RC3 (pkill stub is 99)"
printf '%s\n' "$OUT3" | grep -q "pkill invoked" && fail "replay 3 stop used pkill"
# Port 1 should be released; port 2 still up.
if curl -sf "http://127.0.0.1:$UI1/" >/dev/null 2>&1; then
  fail "replay 3 did not release UI1"
fi
curl -sf "http://127.0.0.1:$UI2/" >/dev/null || fail "replay 3 stop on stack 1 killed stack 2"
pass "replay 3: stop() kills by port only, no pkill"

echo "ALL PASSED"
