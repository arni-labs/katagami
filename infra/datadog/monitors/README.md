# Katagami Datadog monitors

The alerting set that tells us a person or an agent is stuck, before they tell us.
Six monitors, each named for what a human loses rather than for the metric it
watches. They are live in Datadog; these files are the reviewable copy.

| File | Monitor ID | Fires on |
| --- | --- | --- |
| `m1-mcp-arg-rejections.json` | 320493082 | An MCP call is refused before it runs (`invalid_arguments`), 3+ in an hour |
| `m2-expired-tokens.json` | 320493085 | A presented bearer keeps being rejected, 20+ in an hour |
| `m3-rollup-dead.json` | 320492983 | `activity_dispatch_failed`: the durable per-member activity rollup stopped writing |
| `m4-backend-outage.json` | 320492987 | Temper is unreachable, so signed-in callers are locked out |
| `m5-site-errors.json` | 320492995 | Browser errors on katagami.ai, 10+ in an hour |
| `m6-signin-failures.json` | 320493005 | Sign-in failures excluding ordinary consent declines, 5+ in an hour |

To change one, edit the file and PUT it:

```sh
curl -X PUT "https://api.datadoghq.com/api/v1/monitor/<id>" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H 'Content-Type: application/json' --data @m1-mcp-arg-rejections.json
```

The events these read are emitted by `ui/src/lib/server-telemetry.ts` and are
constrained by the per-event allow-list in `server-telemetry-core.mjs`. An
attribute a monitor groups by has to be in that allow-list or it never arrives.
