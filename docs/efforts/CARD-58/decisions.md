# Decisions - Gallery /mcp Grok card

## Contribute tokens do not unlock the gallery catalog
- **Decision:** Gallery `/mcp` requires `aud=https://katagami.ai/mcp` and `scope` containing `read`. Contribute-adapter tokens (`aud=https://mcp.katagami.ai`, `scope=contribute`) are rejected.
- **Came up because:** Rei's hold asked whether contribute-adapter tokens should unlock gallery `/mcp`. Mixing audiences would let a write-side grant read the catalog.
- **Options:** Accept contribute tokens on gallery `/mcp`; require an explicit `read` audience/scope; invent a third combined scope.
- **Chose** the explicit read audience **because** the two MCP surfaces are different products. Gave up one-token-everywhere convenience.
- **Where:** `ui/src/lib/catalog-auth-core.mjs`, `ui/src/lib/oauth-as.ts`, PR 268.

## DCR allow-list is https, loopback http, cursor, grok
- **Decision:** Reject every other scheme, including `ftp://`.
- **Came up because:** The first head accepted any custom scheme; Rei leftover 4.
- **Options:** Any non-http scheme; a broad custom-scheme allow-list; the four families above.
- **Chose** the four families **because** those are the hosts that actually register, and `ftp` must 400 in a real POST `/api/oauth/register` test.
- **Where:** `ui/src/lib/mcp-oauth.mjs` `isAllowedRedirectUri`, PR 268.

## Unauthenticated /mcp must 401 (no sample on this URL)
- **Decision:** `withMcpAuth` `required: true`. No `/mcp/sample`. `/connect` must not claim a no-login sample.
- **Came up because:** Anonymous initialize 200 made Grok Bot return `no_auth_link`.
- **Options:** Keep anonymous sample + a second URL; 401 on `/mcp` and tell the truth on `/connect`.
- **Chose** required auth on the public MCP URL **because** that is the handshake Grok Bot templates clone.
- **Where:** `ui/src/app/mcp/route.ts`, `ui/src/app/(site)/connect/page.tsx`, PR 268.
