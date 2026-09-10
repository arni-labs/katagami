# shellcheck shell=bash
# UI_DIR and the port/log paths are supplied by run-local.sh.
# shellcheck disable=SC2153
# Shared helpers for scripts/run-local.sh. Sourced, not executed.
# Keep this file free of side effects so the contract tests can source it.

# True when one SubmitForReview -> 409 payload is the recorded Draft
# refusal. A guard/policy 409 is not this, even on a line that also
# mentions Draft or "left in Draft".
is_known_draft_409_event() {
  printf '%s\n' "$1" | grep -Fq "not valid from state 'Draft'"
}

# Classify seed-local-remix.mjs stdout/stderr.
# Prints one of: complete | verifying | known_submit_break | failed
#
# Each "SubmitForReview -> 409" is its own event (same line or later).
# known_submit_break only when every such event is the recorded Draft
# refusal. A Draft 409 plus a later guard 409 is failed — leftover 6.
classify_seed_output() {
  local out="$1"
  if printf '%s\n' "$out" | grep -q "=== Seed complete ==="; then
    printf '%s\n' complete
    return
  fi
  if printf '%s\n' "$out" | grep -q "VerificationRequired"; then
    printf '%s\n' verifying
    return
  fi

  local known=0
  local other_fail=0
  local line rest event
  if printf '%s\n' "$out" | grep -q \
      "=== Seed incomplete: SubmitForReview refused from Draft"; then
    known=1
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    [ -n "$line" ] || continue
    rest="$line"
    while [[ "$rest" == *"SubmitForReview -> 409"* ]]; do
      rest="${rest#*SubmitForReview -> 409}"
      if [[ "$rest" == *"SubmitForReview -> 409"* ]]; then
        event="${rest%%SubmitForReview -> 409*}"
      else
        event="$rest"
      fi
      if is_known_draft_409_event "$event"; then
        known=1
      else
        other_fail=1
      fi
    done
    if [[ "$line" == *"SEED FAILED"* ]] && \
        [[ "$line" != *"SubmitForReview -> 409"* ]]; then
      other_fail=1
    fi
  done <<EOF
$out
EOF

  if [ "$other_fail" = 1 ]; then
    printf '%s\n' failed
    return
  fi
  if [ "$known" = 1 ]; then
    printf '%s\n' known_submit_break
    return
  fi
  printf '%s\n' failed
}

# Kill the process recorded in a port-keyed pidfile. This is not a name match:
# the pidfile is written by the launcher after setsid, before exec, so it
# covers a server that has not bound its port yet.
kill_pidfile() {
  local f="$1"
  local pid
  [ -f "$f" ] || return 0
  pid="$(tr -d '[:space:]' < "$f" 2>/dev/null || true)"
  rm -f "$f"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
}

# Kill LISTEN-ers on a TCP port only. Never match by process name; never
# kill clients that merely connected to the port (a browser on the gallery,
# an agent curling /tdata).
# Unquoted expansion is intentional: one PID per argument.
kill_port_listeners() {
  local port="$1"
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
  fi
}

ui_stack_env_file() {
  local ui_dir="$1"
  local port="$2"
  printf '%s\n' "$ui_dir/.env.$port.local"
}

write_ui_env_file() {
  local dest="$1"
  local temper_port="$2"
  local tenant="$3"
  local key="$4"
  cat > "$dest" <<EOF
NEXT_PUBLIC_TEMPER_API_URL=http://localhost:$temper_port
NEXT_PUBLIC_TEMPER_TENANT=$tenant
TEMPER_API_KEY=$key
EOF
}

# Read the Temper port a UI env file points at, or empty if none.
ui_env_temper_port() {
  local dest="$1"
  if [ ! -f "$dest" ]; then
    return 0
  fi
  sed -n 's/^NEXT_PUBLIC_TEMPER_API_URL=http:\/\/localhost:\([0-9][0-9]*\).*/\1/p' "$dest" | head -1
}

# Write the shared ui/.env.local only when it would not retarget a stack
# that is still listening. Each stack's live file is ui/.env.$PORT.local.
maybe_write_shared_ui_env() {
  local dest="$1"
  local temper_port="$2"
  local tenant="$3"
  local key="$4"
  local existing
  existing="$(ui_env_temper_port "$dest")"
  if [ -n "$existing" ] && [ "$existing" != "$temper_port" ] && \
      lsof -ti :"$existing" >/dev/null 2>&1; then
    printf '%s\n' "    leaving $dest pointed at :$existing (still listening)"
    return 0
  fi
  write_ui_env_file "$dest" "$temper_port" "$tenant" "$key"
}

# Gallery previews use Next's normal environment precedence and never write env.
gallery_preflight() {
  local tool
  for tool in node npm python3 curl lsof; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "error: '$tool' not found on PATH. Install it or add its bin directory to PATH before retrying." >&2
      return 1
    fi
  done
  node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<20||(a===20&&b<9)){console.error("error: Node >=20.9 is required; select a supported Node runtime on PATH.");process.exit(1)}'
  npm --version >/dev/null
  if [ ! -f "$UI_DIR/node_modules/next/package.json" ] || [ ! -f "$UI_DIR/package-lock.json" ]; then
    echo "error: UI dependencies or package-lock.json are missing. Run: cd \"$UI_DIR\" && npm ci" >&2
    return 1
  fi
  (
    cd "$UI_DIR" || exit
    node <<'JS'
const fs = require("node:fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
try {
  for (const group of ["dependencies", "devDependencies"]) {
    const wanted = pkg[group] || {};
    const recorded = lock.packages?.[""]?.[group] || {};
    if (JSON.stringify(Object.entries(wanted).sort()) !== JSON.stringify(Object.entries(recorded).sort())) throw Error("package.json and lockfile differ");
    for (const name of Object.keys(wanted)) {
      const installed = JSON.parse(fs.readFileSync("node_modules/" + name + "/package.json", "utf8"));
      if (installed.version !== lock.packages?.["node_modules/" + name]?.version) throw Error("installed " + name + " differs from lockfile");
    }
  }
} catch (error) {
  console.error("error: " + error.message + ". Run npm ci in " + process.cwd());
  process.exit(1);
}
require("@next/env").loadEnvConfig(process.cwd(), true);
const raw = (process.env.NEXT_PUBLIC_TEMPER_API_URL || "").replace(/\\n/g, "").trim();
try {
  const backend = new URL(raw);
  if (!["https:", "http:"].includes(backend.protocol)) throw Error();
  console.log("==> configured backend: " + backend.host);
} catch {
  console.error("error: set NEXT_PUBLIC_TEMPER_API_URL in the selected Next development environment before launching.");
  process.exit(1);
}
JS
    npm ls --depth=0 >/dev/null 2>&1 || {
      echo "error: UI dependency tree is incomplete or invalid. Run: cd \"$UI_DIR\" && npm ci" >&2
      return 1
    }
  )
}

gallery_stop() {
  local owner="/tmp/katagami-ui-$UI_PORT.owner" pid recorded actual
  if [ ! -f "$owner" ]; then
    echo "==> no owned gallery preview on :$UI_PORT"
    return
  fi
  if [ "$(head -1 "$owner")" != "$UI_DIR" ]; then
    echo "error: :$UI_PORT belongs to a different worktree; run stop from that worktree." >&2
    return 1
  fi
  pid="$(sed -n '2p' "$owner")"
  recorded="$(sed -n '3p' "$owner")"
  actual="$(ps -p "$pid" -o lstart= 2>/dev/null || true)"
  if [ -n "$actual" ] && [ "$actual" = "$recorded" ]; then
    # The existing launcher makes this PID the session/process-group leader.
    kill -TERM -- "-$pid" 2>/dev/null || true
  fi
  rm -f "$UI_PID" "$owner"
  echo "==> stopped gallery preview on :$UI_PORT"
}

gallery_start() (
  gallery_preflight
  local owner="/tmp/katagami-ui-$UI_PORT.owner" response pid
  if [ -e "$owner" ] || lsof -nP -iTCP:"$UI_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "error: :$UI_PORT is occupied or has an owned preview. Stop that preview or select another UI_PORT." >&2
    return 1
  fi
  # Reserve ownership atomically so simultaneous launches cannot share a PID file.
  if ! (set -o noclobber; printf '%s\n' "$UI_DIR" > "$owner") 2>/dev/null; then
    echo "error: another launch reserved :$UI_PORT; select another UI_PORT." >&2
    return 1
  fi
  response="$(mktemp)"
  trap 'rm -f "$response"; gallery_stop >/dev/null' EXIT
  LAUNCH="/tmp/katagami-launch-ui-$UI_PORT.py"
  write_launcher
  echo "==> starting gallery only on :$UI_PORT (detached)"
  ( cd "$UI_DIR" && exec python3 "$LAUNCH" "$UI_LOG" "$UI_PID" npm run dev -- --port "$UI_PORT" ) &
  pid=$!
  # Register ownership before waiting for the real route.
  printf '%s\n%s\n%s\n' "$UI_DIR" "$pid" "$(ps -p "$pid" -o lstart=)" > "$owner"
  echo "    ui log: $UI_LOG"
  local deadline=$((SECONDS + 120))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "error: UI exited before readiness; inspect $UI_LOG" >&2
      return 1
    fi
    if curl --max-time 15 -sf "http://localhost:$UI_PORT/encyclopedia" > "$response" 2>/dev/null &&
       grep -q 'aria-label="Encyclopedia map' "$response" &&
       grep -Eq '>[1-9][0-9]* cells<' "$response"; then
      rm -f "$response"
      trap - EXIT
      echo "==> ready (encyclopedia rendered with cells)"
      echo "    http://localhost:$UI_PORT/encyclopedia"
      echo "    stop: UI_PORT=$UI_PORT bash scripts/run-local.sh --gallery-only --stop"
      return
    fi
    sleep 1
  done
  echo "error: /encyclopedia did not render nonempty content; inspect $UI_LOG and the selected backend credentials. For local owner preview set KATAGAMI_LAB_PREVIEW=1." >&2
  return 1
)
