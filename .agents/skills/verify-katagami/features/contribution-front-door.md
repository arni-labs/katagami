# Contribution front door (MCP and CLI)

## Sub-features
The MCP server in `mcp/` with ten tools (whoami, search_styles, katagami_search, get_style, remix, import_art_style_proof_image, submit_art_style, submit_palette_system, submit_design_language, submission_status), mounted in the gallery at `/mcp`, and the `katagami` CLI in `cli/` whose eight commands (login, logout, whoami, search, pull, remix, submit, status) are thin calls into those same tools.

## How to get to it (user POV)
A contributor points an agent harness at mcp.katagami.ai, or runs `katagami login` in a terminal, then pulls a style, remixes it, and submits. Submissions land UnderReview attributed to the contributor; curators publish.

## Driving it
```bash
cd cli && npm run build
KATAGAMI_MCP_URL=http://localhost:3500 node dist/cli.js search language
KATAGAMI_MCP_URL=http://localhost:3500 node dist/cli.js pull language <id>
```
Headless runs read `KATAGAMI_REFRESH_TOKEN` (minted at katagami.ai/account/agents) instead of the browser consent flow. The MCP endpoint itself is a JSON-RPC POST to `/mcp` with a bearer token; `callTool` in `cli/src/cli.ts` shows the exact shape, including that the response comes back as an SSE `data:` line.

## What proves it
The tool returns the style, and a submit lands the entity in UnderReview with the contributor's identity on it rather than the operator's. Because the CLI is a client of the MCP server, one validation path is exercised either way: a rule proven through the CLI holds for agents too.

## Gotchas
Verified-unreachable locally past the read tools. Every write needs a signed-in identity: `KATAGAMI_AS_PRIVATE_KEY` (ES256 PKCS#8) must be set and its public JWKS registered with the kernel as a TrustedIssuer, or `humanBearer()` throws and the owner and curator Server Actions fail closed rather than silently running on the shared operator key. `run-local.sh` sets none of that up. Roles come from the durable `Member.role` field, not an env allowlist; provisioning a curator means dispatching `Member.SetRole` with the operator credential, because `member.cedar` closes that action to everyone but System, Admin, and operator so nobody can self-promote.
