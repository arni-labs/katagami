# Shared helpers for scripts/run-local.sh. Sourced, not executed.
# Keep this file free of side effects so the contract tests can source it.

# True when a single line is the recorded Draft SubmitForReview 409
# (or the seed script's honest marker for that event). A later
# SubmitForReview -> 409 for a missing guard is not this.
is_known_draft_409_line() {
  local line="$1"
  printf '%s\n' "$line" | grep -Eq \
      "Seed incomplete:.*SubmitForReview|left in Draft|SubmitForReview -> 409.*not valid from state 'Draft'"
}

# Classify seed-local-remix.mjs stdout/stderr.
# Prints one of: complete | verifying | known_submit_break | failed
#
# known_submit_break only when every seed failure is the recorded Draft
# 409. A Draft 409 plus a later guard 409 is failed — do not Ev-strip
# every "SubmitForReview -> 409" (that hid leftover 6).
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
  local line
  while IFS= read -r line || [ -n "$line" ]; do
    [ -n "$line" ] || continue
    if is_known_draft_409_line "$line"; then
      known=1
      continue
    fi
    if printf '%s\n' "$line" | grep -q "SEED FAILED"; then
      other_fail=1
      continue
    fi
    if printf '%s\n' "$line" | grep -q "SubmitForReview -> 409"; then
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
