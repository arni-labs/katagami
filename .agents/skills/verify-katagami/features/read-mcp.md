# The read MCP at /mcp

## Sub-features
The in-app MCP server at `ui/src/app/mcp/route.ts` — the surface outside agents consume the catalog through. Eleven tools: `describe_catalog`, `whoami`, three searches (`search_design_languages`, `search_palettes`, `search_art_styles`) and six getters (`get_design_language`, `get_design_md`, `get_tokens`, `get_palette`, `get_art_style`, `get_embodiment`). One shared bearer gate (`readMcpAuthInfo` over `verifyReadBearer`) decides the tier, and every call is counted through `trackMcpToolCall`.

This is a different server from the contribution MCP in `mcp/` — that one writes, this one only reads, and it is the one published at katagami.ai/mcp.

## How to get to it (user POV)
Someone points their agent at `https://katagami.ai/mcp`, signs in through the OAuth flow, and asks it to find and read design languages.

## Driving it
Needs a bearer. Mint one locally with the AS private key from `ui/.env.local`: sign an ES256 JWT with `sub`, `scope: "read"`, `auth_generation: 0`, and an audience of `${KATAGAMI_PUBLIC_URL}/mcp` (defaults to `https://katagami.ai/mcp`, NOT the Railway resource URL — `readMcpResource()` in `ui/src/lib/mcp-oauth.mjs` is the authority).

```bash
B=<bearer>
call() { curl -s -X POST http://localhost:3012/mcp \
  -H "Authorization: Bearer $B" -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' -d "$1" | sed 's/^data: //' | grep '^{'; }

call '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
call '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_art_styles","arguments":{"limit":1}}}'
call '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_art_style","arguments":{"id":"cathode-ray"}}}'
```

## What proves it
`tools/list` returns all eleven tools; a search returns a non-zero `total_matching` with real ids; and the id a search hands back fetches the same entity through `get_*` under any of `id`, `slug`, or `id_or_slug`. A call with no identifier returns `missing_id` naming all three, not a bare SDK rejection. Every one of those calls appears in Datadog within about a minute as `@evt:mcp_tool_call`, and a rejected one carries `@arg_keys`.

## Gotchas
Run against a **production build** (`npm run build && npx next start`), not `next dev`: `NEXT_PUBLIC_*` values are inlined at build time, so a server built without `NEXT_PUBLIC_TEMPER_API_URL` silently reads `http://localhost:3500` and every search returns `total_matching: 0` while still answering 200.

`vercel env pull` writes values containing a trailing `\n` and, more importantly, `VERCEL_ENV=production` — which used to make a laptop emit `env:production` telemetry indistinguishable from the deployed app. `telemetryEnv` now requires `VERCEL_REGION` (runtime-only, never written by a pull), so local runs land under `env:local-verify`. Search there, not in `env:production`, when verifying locally.

The working `TEMPER_API_KEY` lives on Railway, not in any local file or in Vercel; a 401 on every entity set is a stale key, not a Cedar denial.

Telemetry is emitted in an `after()` task, so killing the server immediately after a call loses the event. Wait for the response, then a few seconds, before querying Datadog.
