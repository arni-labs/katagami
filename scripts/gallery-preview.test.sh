#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/ui"
printf 'NEXT_PUBLIC_TEMPER_API_URL=https://example.com\nTEMPER_API_KEY=secret\n' > "$tmp/ui/.env.local"
cp "$tmp/ui/.env.local" "$tmp/before"
if KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only >"$tmp/out" 2>&1; then
  echo 'FAIL: missing dependencies accepted'; exit 1
fi
grep -q 'npm ci' "$tmp/out" || { cat "$tmp/out"; echo 'FAIL: no dependency remedy'; exit 1; }
if grep -q '==> ready' "$tmp/out"; then echo 'FAIL: false ready claim'; exit 1; fi
cmp "$tmp/before" "$tmp/ui/.env.local"
echo 'PASS: missing dependencies fail before launch and preserve environment'

# Missing Node must fail precisely, even when the project is otherwise configured.
mkdir -p "$tmp/bin"
for tool in dirname cat; do ln -s "$(command -v "$tool")" "$tmp/bin/$tool"; done
if PATH="$tmp/bin" KATAGAMI_UI_DIR="$tmp/ui" /bin/bash "$ROOT/scripts/run-local.sh" --gallery-only >"$tmp/out" 2>&1; then
  echo 'FAIL: missing Node accepted'; exit 1
fi
grep -q "'node' not found on PATH" "$tmp/out"
if grep -q '==> ready' "$tmp/out"; then echo 'FAIL: false ready claim'; exit 1; fi
echo 'PASS: missing Node has a precise failure'
ln -s "$(command -v node)" "$tmp/bin/node"
if PATH="$tmp/bin" KATAGAMI_UI_DIR="$tmp/ui" /bin/bash "$ROOT/scripts/run-local.sh" --gallery-only >"$tmp/out" 2>&1; then
  echo 'FAIL: missing npm accepted'; exit 1
fi
grep -q "'npm' not found on PATH" "$tmp/out"
echo 'PASS: missing npm has a precise failure'

# Use actual npm/environment/dependency loading with a small HTTP process in place of Next.
# The separate live proof uses the real Next page and backend.
cp "$ROOT/ui/package.json" "$ROOT/ui/package-lock.json" "$tmp/ui/"
ln -s "$ROOT/ui/node_modules" "$tmp/ui/node_modules"
node -e 'const fs=require("fs"),p=process.argv[1];let x=JSON.parse(fs.readFileSync(p));x.dependencies.next="0.0.0";fs.writeFileSync(p,JSON.stringify(x));' "$tmp/ui/package.json"
if KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: mismatched lockfile accepted'; exit 1
fi
grep -q 'package.json and lockfile differ' "$tmp/out"
cp "$ROOT/ui/package.json" "$tmp/ui/package.json"
echo 'PASS: stale lockfile fails before launch'

# Use a real incomplete dependency tree without changing the shared installation.
mkdir -p "$tmp/missing-env-ui/node_modules"
cp "$tmp/ui/package.json" "$tmp/ui/package-lock.json" "$tmp/ui/.env.local" "$tmp/missing-env-ui/"
node - "$ROOT/ui" "$tmp/missing-env-ui" <<'JS'
const fs = require("node:fs"), path = require("node:path");
const [source, target] = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(path.join(source, "package.json"), "utf8"));
for (const name of Object.keys({...pkg.dependencies, ...pkg.devDependencies})) {
  const link = path.join(target, "node_modules", name);
  fs.mkdirSync(path.dirname(link), {recursive: true});
  fs.symlinkSync(path.join(source, "node_modules", name), link);
}
JS
if KATAGAMI_UI_DIR="$tmp/missing-env-ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: missing environment loader accepted'; exit 1
fi
grep -q 'npm ci' "$tmp/out" || { cat "$tmp/out"; echo 'FAIL: missing loader has no installation remedy'; exit 1; }
if grep -q 'starting gallery' "$tmp/out"; then echo 'FAIL: detached without environment loader'; exit 1; fi
echo 'PASS: missing environment loader gives installation remedy before detachment'

if NEXT_PUBLIC_TEMPER_API_URL='https://example-user:example-password@example.com' bash -ec '
  source "$1/scripts/lib/run-local-lib.sh"
  UI_DIR="$2"
  gallery_preflight
' _ "$ROOT" "$tmp/ui" > "$tmp/out" 2>&1; then
  echo 'FAIL: URL credentials accepted by preflight'; exit 1
fi
grep -q 'NEXT_PUBLIC_TEMPER_API_URL' "$tmp/out"
if grep -Eq 'example-user|example-password' "$tmp/out"; then echo 'FAIL: URL credentials in diagnostic'; exit 1; fi
echo 'PASS: URL credentials rejected without logging them'


if TEMPER_API_KEY="" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: missing bearer accepted'; exit 1
fi
grep -q 'set TEMPER_API_KEY' "$tmp/out"
if grep -q 'starting gallery' "$tmp/out"; then echo 'FAIL: detached before credential failure'; exit 1; fi
echo 'PASS: missing bearer fails before detachment'

if TEMPER_API_KEY='\n' KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: escaped-newline bearer accepted'; exit 1
fi
grep -q 'set TEMPER_API_KEY' "$tmp/out"
if grep -q 'starting gallery' "$tmp/out"; then echo 'FAIL: detached with an empty normalized bearer'; exit 1; fi
echo 'PASS: escaped-newline bearer fails before detachment'

failure_port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
mkdir "$tmp/no-temp"
printf '#!/bin/sh\nexit 1\n' > "$tmp/no-temp/mktemp"
chmod +x "$tmp/no-temp/mktemp"
if PATH="$tmp/no-temp:$PATH" UI_PORT="$failure_port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: unusable temporary directory accepted'; exit 1
fi
if [ -e "/tmp/katagami-ui-$failure_port.owner" ]; then
  rm -f "/tmp/katagami-ui-$failure_port.owner"
  echo 'FAIL: temporary-file failure reserved ownership'; exit 1
fi
grep -q 'writable TMPDIR' "$tmp/out"
echo 'PASS: temporary-file failure leaves no ownership'

mkdir "$tmp/no-cat"
for tool in dirname node npm python3 curl lsof ps head sed rm mktemp grep sleep; do
  ln -s "$(command -v "$tool")" "$tmp/no-cat/$tool"
done
if PATH="$tmp/no-cat" UI_PORT="$failure_port" KATAGAMI_UI_DIR="$tmp/ui" /bin/bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: missing cat accepted'; exit 1
fi
if [ -e "/tmp/katagami-ui-$failure_port.owner" ]; then
  rm -f "/tmp/katagami-ui-$failure_port.owner"
  echo 'FAIL: missing cat reserved ownership'; exit 1
fi
grep -q "'cat' not found on PATH" "$tmp/out"
echo 'PASS: missing launcher writer fails before reservation'

# The lifecycle must reject an unavailable process inspector before launch or stop.
mkdir "$tmp/no-ps"
for tool in dirname cat node npm python3 curl lsof head sed rm mktemp grep sleep; do
  ln -s "$(command -v "$tool")" "$tmp/no-ps/$tool"
done
if PATH="$tmp/no-ps" KATAGAMI_UI_DIR="$tmp/ui" /bin/bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: missing ps accepted'; exit 1
fi
grep -q "'ps' not found on PATH" "$tmp/out"
echo 'PASS: missing process inspector fails before detachment'
npm_bin="$(command -v npm)"
node_bin="$(command -v node)"
cat > "$tmp/server.cjs" <<'JS'
const http = require("node:http");
const port = Number(process.argv.at(-1));
http.createServer((req,res) => {
  if(req.url !== "/encyclopedia") {res.writeHead(404);res.end();return;}
  res.end('<main aria-label="Encyclopedia map"><div>12 cells</div></main>');
}).listen(port);
JS
cat > "$tmp/bin/npm" <<SH2
#!/usr/bin/env bash
if [ "\$1" = run ]; then
  exec "$node_bin" "$tmp/server.cjs" "\$@"
fi
exec "$npm_bin" "\$@"
SH2
chmod +x "$tmp/bin/npm"
port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
cleanup_preview() {
  UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop >/dev/null
  rm -rf "$tmp"
}
trap cleanup_preview EXIT
TZ=UTC PATH="$tmp/bin:$PATH" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1
grep -q '==> ready' "$tmp/out"
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
cmp "$tmp/before" "$tmp/ui/.env.local"
if grep -q secret "$tmp/out"; then echo "FAIL: secret in output"; exit 1; fi
echo 'PASS: detached route survives invoking shell and environment is unchanged'

mkdir "$tmp/other"
if UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/other" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop > "$tmp/out" 2>&1; then
  echo 'FAIL: another worktree stopped preview'; exit 1
fi
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
echo 'PASS: other worktree cannot stop preview'

owner="/tmp/katagami-ui-$port.owner"
cp "$owner" "$tmp/owner-before"
if PATH="$tmp/no-ps" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" /bin/bash "$ROOT/scripts/run-local.sh" --gallery-only --stop > "$tmp/out" 2>&1; then
  echo 'FAIL: stop accepted missing ps'; exit 1
fi
grep -q "'ps' not found on PATH" "$tmp/out"
cmp "$owner" "$tmp/owner-before"
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
echo 'PASS: missing process inspector preserves ownership for retry'

head -2 "$tmp/owner-before" > "$owner"
if UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop > "$tmp/out" 2>&1; then
  echo 'FAIL: incomplete ownership reported stopped'; exit 1
fi
grep -q 'ownership is incomplete' "$tmp/out"
test -f "$owner"
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
cp "$tmp/owner-before" "$owner"
echo 'PASS: incomplete startup ownership is retained without a false stop'

cp "/tmp/katagami-ui-$port.pid" "$tmp/pid-before"
{ head -2 "$tmp/owner-before"; echo 'different process start time'; } > "$owner"
UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop > "$tmp/out" 2>&1
grep -q 'no matching process was stopped' "$tmp/out"
if grep -q '^==> stopped gallery preview' "$tmp/out"; then echo 'FAIL: stale record claimed a stop'; exit 1; fi
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
cp "$tmp/owner-before" "$owner"
cp "$tmp/pid-before" "/tmp/katagami-ui-$port.pid"
echo 'PASS: stale ownership never claims or signals a matching stop'

backend_port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
PORT="$backend_port" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --stop
test ! -e "$owner"
TZ=UTC PATH="$tmp/bin:$PATH" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1
grep -q '==> ready' "$tmp/out"
echo 'PASS: full-stack stop releases gallery ownership for relaunch'

TZ=America/New_York UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop
sleep 1
if curl -sf "http://localhost:$port/encyclopedia" >/dev/null 2>&1; then
  echo 'FAIL: owned stop left preview running'; exit 1
fi
echo 'PASS: owned stop releases preview across timezones'

# Both launches race for the same port; the loser must not touch the winner's files/process.
TZ=UTC PATH="$tmp/bin:$PATH" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/race-one" 2>&1 &
first=$!
TZ=UTC PATH="$tmp/bin:$PATH" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/race-two" 2>&1 &
second=$!
successes=0
if wait "$first"; then successes=$((successes + 1)); fi
if wait "$second"; then successes=$((successes + 1)); fi
[ "$successes" = 1 ] || { echo 'FAIL: racing launches did not produce one owner'; exit 1; }
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop
echo 'PASS: concurrent launches preserve exactly one live owner'

# An unrelated listener remains running both when launch refuses its port and when stopped.
"$node_bin" "$tmp/server.cjs" "$port" &
unrelated=$!
trap 'kill "$unrelated" 2>/dev/null || true; cleanup_preview' EXIT
sleep 1
if TZ=UTC PATH="$tmp/bin:$PATH" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: occupied port accepted'; exit 1
fi
grep -q occupied "$tmp/out"
UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
echo 'PASS: unrelated listener survives launch refusal and stop'

