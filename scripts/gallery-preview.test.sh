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
! grep -q '==> ready' "$tmp/out"
cmp "$tmp/before" "$tmp/ui/.env.local"
echo 'PASS: missing dependencies fail before launch and preserve environment'

# Missing Node must fail precisely, even when the project is otherwise configured.
mkdir -p "$tmp/bin"
for tool in dirname cat; do ln -s "$(command -v "$tool")" "$tmp/bin/$tool"; done
if PATH="$tmp/bin" KATAGAMI_UI_DIR="$tmp/ui" /bin/bash "$ROOT/scripts/run-local.sh" --gallery-only >"$tmp/out" 2>&1; then
  echo 'FAIL: missing Node accepted'; exit 1
fi
grep -q "'node' not found on PATH" "$tmp/out"
! grep -q '==> ready' "$tmp/out"
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
PATH="$tmp/bin:$PATH" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1
grep -q '==> ready' "$tmp/out"
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
cmp "$tmp/before" "$tmp/ui/.env.local"
! grep -q secret "$tmp/out"
echo 'PASS: detached route survives invoking shell and environment is unchanged'

mkdir "$tmp/other"
if UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/other" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop > "$tmp/out" 2>&1; then
  echo 'FAIL: another worktree stopped preview'; exit 1
fi
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
echo 'PASS: other worktree cannot stop preview'

UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop
sleep 1
if curl -sf "http://localhost:$port/encyclopedia" >/dev/null 2>&1; then
  echo 'FAIL: owned stop left preview running'; exit 1
fi
echo 'PASS: owned stop releases preview'

# An unrelated listener remains running both when launch refuses its port and when stopped.
"$node_bin" "$tmp/server.cjs" "$port" &
unrelated=$!
trap 'kill "$unrelated" 2>/dev/null || true; cleanup_preview' EXIT
sleep 1
if PATH="$tmp/bin:$PATH" UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only > "$tmp/out" 2>&1; then
  echo 'FAIL: occupied port accepted'; exit 1
fi
grep -q occupied "$tmp/out"
UI_PORT="$port" KATAGAMI_UI_DIR="$tmp/ui" bash "$ROOT/scripts/run-local.sh" --gallery-only --stop
curl -sf "http://localhost:$port/encyclopedia" >/dev/null
echo 'PASS: unrelated listener survives launch refusal and stop'

