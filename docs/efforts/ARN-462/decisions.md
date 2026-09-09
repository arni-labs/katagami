# ARN-462 decisions

## 1. Accept three names for the identifier instead of renaming the parameter

**Decision** — every `get_*` tool takes the identifier under `id_or_slug`, `id`,
or `slug`, all optional, resolved in that order.

**Came up because** a real caller's session showed 8 of 26 `get_*` calls refused
before reaching a handler. Their agent had just read a search result, where the
identifier is carried as `id`, and passed it back under that name.

**Options** — (a) rename the parameter to `id`, which is what the search returns;
(b) accept all three; (c) leave the schema and reword the description.

**Chose (b) over (a)** because a rename breaks every caller already passing
`id_or_slug`, and there is no way to tell how many there are. Accepting three
names costs one shared schema fragment and one reader function; it cannot break
anyone. (c) was rejected because the rejection happens in schema validation,
before any description the agent might reread is in play.

**Given up**: the schema no longer states a single canonical name, so three keys
appear in `tools/list` where one used to.

**Where** — `ui/src/app/mcp/route.ts`, `ID_ALIASES` / `idOf` / `missingId`.

## 2. Return the missing-identifier error as a tool result, not a protocol error

**Decision** — a call with no identifier gets `isError: true` carrying
`{"error":"missing_id", "message": …}` naming all three keys.

**Came up because** all three keys are optional, so a call passing none now
passes schema validation and reaches the handler.

**Options** — mark one key required (impossible, they are alternatives); throw,
which becomes a generic protocol error; return a readable tool result.

**Chose the tool result** because the whole point of this effort is that an agent
should be able to read the error and retry. A protocol-level rejection is exactly
what it was stuck on.

**Where** — `ui/src/app/mcp/route.ts`, `missingId()`.

## 3. `arg_keys` records key names against a closed allow-list

**Decision** — `mcp_tool_call` gains `arg_keys`: the call's argument key names,
sorted, comma-joined, each mapped through a fixed set, anything outside it
becoming the literal `(other)`, capped at six.

**Came up because** the `invalid_arguments` counter said rejections were
happening but not what shape was refused, so there was nothing to act on.

**Options** — log the raw key list; log the whole arguments object; log a clamped
key list.

**Chose the clamp** because argument keys are caller-controlled strings. Sending
them verbatim puts an attacker-chosen value into a log attribute, and an
arguments object would carry the values themselves. The clamp means the attribute
can only hold names from a set we wrote. Verified live: a call carrying
`bogus_key` arrived in Datadog as `(other),id`.

**Given up**: a genuinely new key name shows as `(other)` until the set is
extended. That is the trade the safety is worth.

**Where** — `ui/src/app/mcp/route.ts` `KNOWN_ARG_KEYS`/`argKeysOf`;
`ui/src/lib/server-telemetry.ts:169`; allow-list in
`ui/src/lib/server-telemetry-core.mjs`.

## 4. Production telemetry now requires a real Vercel invocation

**Decision** — `telemetryEnv` returns `production` or `preview` only when
`VERCEL_REGION` is set; otherwise `local-verify`.

**Came up because** verifying this change locally paged Rita. `vercel env pull`
writes `VERCEL_ENV=production` and `VERCEL=1` into `.env.local`, so the local
server emitted events tagged `env:production, service:katagami-server` —
indistinguishable from deployed traffic. Three of my own rejected calls tripped
monitor 320493082, and eight failed rollup dispatches for my synthetic subject
tripped 320492983. Both alerts emailed her. The same traffic also sits in the
per-user activity numbers she reads as real usage.

**Options** — (a) remember to edit `.env.local` after every pull; (b) a
`KATAGAMI_TELEMETRY_ENV` override a developer must set; (c) hang the tag on a
variable only a real invocation has.

**Chose (c) over (a) and (b)** because both of those are things a person has to
remember, and the failure is silent when they do not. `VERCEL_REGION` is set per
invocation at runtime and `vercel env pull` does not write it — verified both
ways: deployed traffic from 2026-09-07 carries `hostname: iad1`, and the pulled
file has no such variable. A laptop can no longer forge the production tag.

**Given up**: if Vercel ever stops setting `VERCEL_REGION`, production events
would tag as `local-verify` and the monitors would go quiet. That failure is
silent, so a contract assertion pins both directions.

**Where** — `ui/src/lib/server-telemetry-core.mjs` `telemetryEnv`; assertion in
`ui/scripts/check-telemetry-contract.mjs`.

## 5. Monitor definitions are committed, not left in the Datadog UI alone

**Decision** — the six monitors' JSON lives in `infra/datadog/monitors/` with a
README naming each id and its trigger.

**Came up because** the alerting set is the deliverable Rita asked for, and a
monitor that exists only in a web UI cannot be reviewed in a PR or rebuilt.

**Options** — leave them in Datadog; commit the definitions; adopt Terraform.

**Chose committing the JSON** over Terraform because six monitors do not justify
introducing a provisioning tool and its state, and the JSON is what the API
takes.

**Given up**: the files can drift from Datadog, since nothing enforces the match.

**Where** — `infra/datadog/monitors/`.
