# Shared helpers for scripts/run-local.sh. Sourced, not executed.
# Keep this file free of side effects so the contract tests can source it.

# Classify seed-local-remix.mjs stdout/stderr.
# Prints one of: complete | verifying | known_submit_break | failed
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
  # Recorded platform break: SubmitForReview refused from Draft (409), or the
  # seed script's honest incomplete marker for the same event. Not a launch
  # failure — the stack can still write env and start Next.
  if printf '%s\n' "$out" | grep -Eq \
      "SubmitForReview -> 409|SubmitForReview' not valid from state 'Draft'|Seed incomplete:.*SubmitForReview"; then
    printf '%s\n' known_submit_break
    return
  fi
  printf '%s\n' failed
}

# Kill whatever is listening on a TCP port. Never match by process name:
# other sessions run `temper serve` / `next dev` on this machine.
# Unquoted expansion is intentional: one PID per argument. Quoting the
# whole lsof output into a single kill argument is the bug this replaced.
kill_port_listeners() {
  local port="$1"
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
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
