# Plan: Gallery /mcp 401 + Grok connect card
Spec: docs/efforts/ARN-360/spec.md

## What we are addressing
Grok Bot showed no login card because anonymous `/mcp` initialize returned 200.
This plan is the leftover close on the same branch after Rei held `baaff0f`.

## Approach
Require bearer on the gallery read MCP, publish RFC 9728 metadata whose
`resource` is `/mcp`, mint `read` for that resource only, keep contribute
tokens off the gallery, lock DCR to https / loopback / cursor / grok, and
make `/connect` tell the truth. Prove it with a contract that signs real JWTs.

## Steps
1. `withMcpAuth` required + origin `resourceUrl`; well-known documents.
2. Audience/scope split (`read` vs `contribute`); missing vs invalid bearer.
3. DCR allow-list; `/connect` copy.
4. `check-mcp-oauth-contract.mjs` + catalog-auth attack suite on the real verifier.
5. SDLC records for this head, then merge #268.

## Files / surfaces touched
`ui/src/app/mcp/route.ts`, `ui/src/lib/mcp-oauth.mjs`,
`ui/src/lib/catalog-auth-core.mjs`, `ui/src/lib/catalog-auth.ts`,
`ui/src/lib/oauth-as.ts`, `ui/src/app/api/oauth/*`, well-known routes,
`ui/src/app/(site)/connect/page.tsx`, `ui/scripts/check-mcp-oauth-contract.mjs`,
`ui/scripts/check-catalog-auth-attacks.mjs`.

## Expected end state
Preview and (after merge) production: no-bearer `/mcp` is 401 + WWW-Authenticate;
metadata resource is `https://katagami.ai/mcp`; `/connect` has no no-login claim.
Vercel picks up `master`.
