# ARN-462 plan

1. `ui/src/app/mcp/route.ts` — one shared `ID_ALIASES` schema fragment and one
   `idOf()` reader, applied to all six `get_*` tools. A `missingId()` helper
   returns the readable error. No per-tool copies.
2. Same file — `argKeysOf()` derives the clamped `arg_keys` string in the layer-2
   diagnostics path, where the raw tool-call request is still in hand.
3. `ui/src/lib/server-telemetry.ts` — `trackMcpToolCall` takes `argKeys` and emits
   it as `arg_keys`.
4. `ui/src/lib/server-telemetry-core.mjs` — add `arg_keys` to the `mcp_tool_call`
   attribute allow-list, which is what actually lets the attribute through.
5. `ui/scripts/check-telemetry-contract.mjs` — four assertions so a later edit
   cannot silently undo any of it.
6. Six Datadog monitors, created live, definitions committed under
   `infra/datadog/monitors/`.
7. Verify against a locally built production server with a minted read bearer:
   the schema advertises all three keys, each key resolves the same entity, and
   an argument-free call returns our message.
8. Four-seat review panel, then merge and deploy.
