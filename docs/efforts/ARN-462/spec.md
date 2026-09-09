# ARN-462 spec — accept the identifier agents already have, and alert on the ones we turn away

## Contract

**Every `get_*` tool accepts the identifier under any of three keys.** `id_or_slug`,
`id`, and `slug` are the same optional string. A call passing exactly one of them
resolves. A call passing none returns a readable error naming all three, in the
tool result rather than as a protocol-level rejection, so the agent reads it and
retries.

The six tools: `get_design_language`, `get_design_md`, `get_tokens`, `get_palette`,
`get_art_style`, `get_embodiment`.

Widening a schema cannot break a caller: `id_or_slug` keeps working byte for byte,
and the three keys resolve to one value with a fixed precedence
(`id_or_slug`, then `id`, then `slug`).

## Diagnostics

`mcp_tool_call` gains one attribute, `arg_keys`: the argument key names of the
call, sorted, joined with commas. It is clamped against a fixed allow-list —
anything outside it becomes the literal `(other)`, an argument-free call becomes
`(none)`, and at most six keys are kept. The clamp is what makes it safe: the
attribute can only ever hold key NAMES from a closed set, never a value, so no
caller-supplied string reaches Datadog through it.

This turns the flat `invalid_arguments` counter into something actionable: the
next time a client and our schema disagree, the rejection carries the shape that
was refused.

## Alerting

Six Datadog monitors, each named for the human consequence rather than the metric.
They cover the two systems Rita named, MCP and the website, for both audiences:

| Monitor | Fires on |
| --- | --- |
| Agents are being rejected by the MCP | `invalid_arguments` >= 3 in 1h |
| Someone's MCP token keeps being rejected | `mcp_auth_challenge` with `has_auth:true` >= 20 in 1h |
| The durable activity rollup has stopped writing | `activity_dispatch_failed` >= 1 in 1h |
| Temper is unreachable, real users are locked out | `backend_unavailable` >= 3 in 15m |
| Humans are hitting errors on katagami.ai | RUM errors >= 10 in 1h |
| People cannot sign in | `auth_login_failed`, consent excluded, >= 5 in 1h |

Definitions are committed under `infra/datadog/monitors/` so the alerting set is
reviewable and rebuildable rather than living only in the Datadog UI.

## Out of scope

Renaming `id_or_slug`, changing any search response, and touching the tier gate.
