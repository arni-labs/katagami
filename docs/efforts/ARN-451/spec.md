# Spec: Per-user activity (ARN-451)
Intent: docs/efforts/ARN-451/intent.md. One identifier joins three layers.

## The identifier
`user_hash` = HMAC-SHA256(`KATAGAMI_TELEMETRY_PEPPER`, Google sub), truncated
to 16 hex (`hashPrincipal`, unchanged from ARN-436). Computed only
server-side. Unset pepper → no hash, every per-user layer no-ops. The raw
sub, email, and name never reach Datadog or the browser identifier.

## Layer 1 — browsing (RUM join)
- `/api/auth/me` (already fetched by the header chip on every page) returns
  `user_hash` (nullable) alongside `user`/`owner`. Never the sub. `no-store`.
- One memoized client fetch (`session-me.ts`) serves the chip AND the RUM
  join; RumInit applies `datadogRum.setUser({ id: hash })` — id only — and
  `clearUser()` when signed out. Buffered events flush only after identity
  is known, so the first `language_view` of a signed-in hard reload carries
  `@usr.id`.
- Sign-out clears on the post-sign-out page load; Sign-out-everywhere clears
  in-tab without a reload, notifies other tabs (storage key), and an
  out-of-order pre-revocation response can never restore the identity
  (session epoch guard).
- Client-attached `usr.id` is spoofable by that client — accepted: RUM is
  product analytics, not authorization; the RUM client token is public and
  whole payloads were always forgeable; server events remain the record.

## Layer 2 — identity (Member row)
- `Member.Register` (katagami-commons spec) gains a `user_hash` param; the
  sign-in upsert computes and sends it every login (idempotent, self-heals
  a pepper rotation). Kernel projects params to fields, so both rollout
  orders are safe.
- Existing identified members are backfilled operationally (idempotent
  Register re-dispatch, verified by read-back).
- Mapping query: `GET /tdata/Members?$filter=user_hash eq '<hash>'`.

## Layer 3 — durable history (MemberActivityDays)
- New automaton `MemberActivityDay` (file `member_activity_day.ioa.toml` —
  the FILENAME's PascalCase must equal the automaton name, or load-dir
  registers a table OData cannot route to). One row per (user_hash, UTC
  day), id `act:<hash>:<YYYY-MM-DD>`; dispatch-on-missing-id auto-creates.
- Counters `logins`, `mcp_calls`, `mcp_errors` via `{ type = "increment",
  var = ... }` effects (the `field =` spelling parses to nothing) —
  kernel-serialized per entity actor, so concurrent invocations cannot lose
  counts. RecordMcpError increments both calls and errors.
- Written best-effort at event time from the sign-in callback's and the MCP
  wrapper's post-response tasks, bounded (4s < the 5s telemetry reserve),
  concurrent with — never in front of — the Datadog emit, bucketed on
  request-path event time, gated on a valid 16-hex hash. Independent of
  `DD_API_KEY` by design. Cedar: writes locked to System/Admin/operator.

## Layer 4 — rejection reasons
- `mcp_auth_challenge` gains `@reason` when `has_auth:true`: a CLOSED
  vocabulary (`AUTH_REJECTION_REASONS`: expired, signature, claims,
  audience, scope, generation, grant_revoked, as_unconfigured, unknown)
  computed inside the claim path itself (`accessPayloadRejection` is the
  single source; `identityFromAccessPayload` derives from it), clamped at
  the verifier AND again at the emit boundary. Carried per-request via
  `WeakMap<Request, string>`. Never a token, client id, or sub.

## Guarantees (contract-tested in ui/scripts/check-telemetry-contract.mjs)
Attribute keys stay allow-listed per event; the `user_hash` VALUE must be
16-hex or it drops; caller-controlled tool names clamp to the registered
set; telemetry never blocks a route or the session cookie; every bound and
ordering above has a check that fails if it is removed.
