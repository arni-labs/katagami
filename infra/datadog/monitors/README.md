# Katagami Datadog monitors

The alerting set that tells us a person or an agent is stuck, before they tell us.
Seven monitors, each named for what a human loses rather than for the metric it
watches. Six are live in Datadog; these files are the reviewable copy.

**m1, m5 and m6 carry query or message edits that are not applied live yet, and
m7 has never been created.** Applying them needs a Datadog application key.

| File | Monitor ID | Fires on |
| --- | --- | --- |
| `m1-mcp-arg-rejections.json` | 320493082 | An MCP call is refused for its argument shape (`invalid_arguments` or `missing_id`), 3+ in an hour |
| `m2-expired-tokens.json` | 320493085 | A presented bearer keeps being rejected, 20+ in an hour |
| `m3-rollup-dead.json` | 320492983 | `activity_dispatch_failed`: the durable per-member activity rollup stopped writing |
| `m4-backend-outage.json` | 320492987 | Temper is unreachable, so signed-in callers are locked out |
| `m5-site-errors.json` | 320492995 | Browser errors on katagami.ai, 10+ in an hour |
| `m6-signin-failures.json` | 320493005 | Sign-in failures excluding ordinary consent declines, 5+ in an hour |
| `m7-telemetry-dark.json` | not created yet | No production server event in 4 hours — the condition under which none of the six above can fire |

To change one, edit the file and PUT it:

```sh
curl -X PUT "https://api.datadoghq.com/api/v1/monitor/<id>" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H 'Content-Type: application/json' --data @m1-mcp-arg-rejections.json
```

The events these read are emitted by `ui/src/lib/server-telemetry.ts` and are
constrained by the per-event allow-list in `server-telemetry-core.mjs`. An
attribute a monitor groups by has to be in that allow-list or it never arrives.
