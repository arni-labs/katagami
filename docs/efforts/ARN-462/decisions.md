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

## 6. Panel round 1 — four confirmed findings, one that did not reproduce

**Decision** — fixed all four confirmed findings; recorded the fifth as not
reproducing rather than changing code to satisfy it.

**Came up because** grok and codex reviewed the first commit.

**What was confirmed and fixed**

- *Explicit JSON null on the unused aliases* (grok). A client that materializes
  every declared property sends `{id_or_slug: "…", id: null, slug: null}`;
  `.optional()` rejects null, so a call carrying a good identifier failed — and
  it worked before those keys existed. `idArg` is now `.nullish()`. Reproduced
  live before the fix (`Invalid input: expected string, received null`) and
  passing after.
- *A handler-side missing id was invisible to the alert* (codex). Since all
  three keys are optional, a caller using a name we do not take (`identifier`)
  now reaches the handler and gets `missing_id` — with no `error_kind`, so the
  monitor watching for a schema/caller disagreement stayed green on exactly
  that disagreement. The path now records `errorKind: "missing_id"` and
  `arg_keys`, and monitor m1 matches `(invalid_arguments OR missing_id)`.
- *A Google outage filed as a user decline* (codex). The callback labelled every
  Google error redirect `reason: "consent"`, and the sign-in monitor excludes
  consent as a choice — so `server_error`, `temporarily_unavailable` and an org
  policy block would have been silently excluded too. `access_denied` keeps
  `consent`; everything else is `provider`.
- *The RUM monitor could page on another app's errors, and on a laptop's*
  (codex and grok). Its query gained `service:katagami-web`. The RUM env tag is
  baked at build time, so the `VERCEL_REGION` guard cannot reach it; instead
  `initRum()` returns early on localhost, which the browser knows for certain.

**What did not reproduce** — codex claimed a `tools/call` with no `arguments`
property is refused by the SDK before `missingId()` runs. Driven live against
the build, `{"name":"get_design_language"}` with no arguments returns our
`missing_id` message. Not changed.

**Where** — `ui/src/app/mcp/route.ts`, `ui/src/lib/analytics.ts`,
`ui/src/app/api/auth/google/callback/route.ts`,
`infra/datadog/monitors/m1,m5,m6`.

## 7. The argument names are captured before the schema strips them

**Decision** — layer 2 stashes the clamped key list on `extra` while the raw
request is in hand; layer 1 prefers it over the parsed arguments.

**Came up because** the first fix to finding 2 above shipped and reported
`arg_keys: (none)` for a call that plainly sent `identifier`. Zod strips
undeclared keys, so by the time a registered handler runs, the one name worth
seeing is gone.

**Options** — report the parsed keys and accept the blind spot; re-read the raw
request in layer 1 (it does not have it); pass the raw keys down.

**Chose passing them down** because the whole diagnostic exists to answer
"which name did they reach for", and `(none)` answers it wrongly rather than
incompletely. Verified live: the same call now arrives as `(other)`.

**Given up**: a symbol-keyed field on the SDK's `extra` object, which is
in-process only and never serialized.

**Where** — `ui/src/app/mcp/route.ts` `RAW_ARG_KEYS` / `stashRawArgKeys` /
`rawArgKeys`.

## 8. Panel round 2 (Fable) — RUM env by hostname, and a monitor for the silence

**Decision** — three more fixes; the seat's two act-on findings were already
closed by decision 6/7 before its report arrived.

**Came up because** the Fable seat reviewed commit `9618689b`. Its two act-on
findings — the stale `reason: "consent"` assertion turning the suite red, and
`arg_keys` reading post-zod arguments so a novel key name reported `(none)` —
are the same two defects decisions 6 and 7 record, fixed the same way it
recommended (stash the raw keys from layer 2 onto `extra`). Nothing to redo.

**What was still open and is now fixed**

- *The localhost guard was a deny-list.* A phone testing against
  `192.168.1.20:3000`, a tunnel, or any preview deployment still tagged its
  browser errors `env:production` and could page a human. Rather than widen the
  deny-list or drop RUM on those hosts, `rumEnvFor()` decides the env from the
  hostname the browser is actually on: only katagami.ai and its subdomains are
  production, everything else is `preview`. Preview and LAN sessions keep
  sending RUM — the data is real — under a tag that cannot page anyone. An
  explicit `NEXT_PUBLIC_DD_RUM_ENV` still wins.
- *Production going dark was silent.* Every monitor filters `env:production`
  with `notify_no_data:false`, so if `VERCEL_REGION` ever stops being set, all
  six match nothing and none of them says so — the exact silent failure decision
  4 admitted and claimed a contract assertion covered. It does not; that
  assertion only exercises the local helper. `m7-telemetry-dark.json` fires when
  no production server event has arrived in four hours, and its message names
  the `env:local-verify` bucket as the first thing to check.
- *One contract assertion pinned a helper, not its wiring.* Reverting the
  layer-2 `argKeys` line alone left every check green with the feature dead.
  Pinned, along with the RUM env call.

**Options for the RUM env** — allow-list the hostname and start RUM only on
katagami.ai; widen the localhost deny-list; derive the env from the hostname.

**Chose deriving the env** because an allow-list throws away preview and
device-testing data to solve a labelling problem, and a wider deny-list is the
same guess with more entries. Deciding from the hostname is what the browser
knows for certain, and it is the same shape as the server-side `VERCEL_REGION`
guard: trust the runtime, not a baked variable.

**Given up**: preview RUM now lands under `env:preview`, so anything that read
preview data as production stops seeing it — which is the point.

**Where** — `ui/src/lib/analytics.ts` `rumEnvFor`;
`infra/datadog/monitors/m7-telemetry-dark.json`;
`ui/scripts/check-telemetry-contract.mjs`.

## 9. The Linear issue id is unverified

**Decision** — used `ARN-462` consistently and flagged it for confirmation
rather than leaving two different invented ids in the tree.

**Came up because** the panel noticed the code comments said `ARN-478` while the
effort folder said `ARN-462`. Both are ids I introduced; the Linear MCP has been
returning "requires re-authorization" for this whole effort, so neither could be
checked against a real issue.

**Options** — pick one and flag it; drop the id and name the folder for the
work; block until Linear is reachable.

**Chose one id plus a flag** because the repo convention is
`docs/efforts/<issue-id>/`, the id appears in two commit messages already, and a
rename before merge is cheap. Blocking the whole effort on an expired token is
not proportionate.

**Given up**: if `ARN-462` turns out to be a different real issue, the folder,
the comments and two commit messages need renaming before this merges. Rita has
to confirm the number.

**Where** — `docs/efforts/ARN-462/`, `ui/src/app/mcp/route.ts`,
`ui/scripts/check-telemetry-contract.mjs`.

## 10. Panel round 2, second seat — an unauthenticated GET could page a human

**Decision** — a `provider` sign-in failure is only recorded when our own
httpOnly state cookie is present. `state` deliberately stays ungated, and both
monitors now say in their own text which of their counts can be forged.

**Came up because** the Fable seat pointed out that decision 6's consent/provider
split made a forgeable path pageable. Before it, every unsolicited
`GET /api/auth/google/callback?error=x` filed as `consent`, which the alert
excludes. After it, the same five requests file as `provider` and page Rita —
with no account, no OAuth flow, and no way to tell it from a Google outage. I
introduced that.

**Options** — gate on the state cookie; drop the reason from the alert; note the
limit in the message and accept it.

**Chose the cookie gate** because our authorize redirect sets it, it is httpOnly,
and nobody else can plant it — so its presence means this really is a flow we
started. Dropping the reason would give back the outage blindness decision 6
just fixed.

**Deliberately not gated: `state`.** A state failure is most often the cookie
being missing, so requiring the cookie would suppress exactly the case that
reason reports. It stays mintable, and m6's message now says so and tells the
reader to weight a `provider` spike heavier and check whether events cluster on
one IP. m2 carries the same note, since 20 garbage bearers are equally cheap.

**Known limit, recorded rather than guessed at**: Google also returns
`access_denied` when a Workspace admin blocks the app, so a policy-blocked
organization files as a decline and stays out of the alert. The redirect carries
nothing that separates that from a person clicking Cancel. Written into m6's
message.

**Where** — `ui/src/app/api/auth/google/callback/route.ts` (`ours`);
`infra/datadog/monitors/m2`, `m6`; assertion in
`ui/scripts/check-telemetry-contract.mjs`.
