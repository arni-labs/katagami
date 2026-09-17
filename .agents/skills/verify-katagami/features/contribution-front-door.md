# Contribution front door (MCP and CLI)

## Sub-features
The MCP server in `mcp/` with ten tools (whoami, search_styles, katagami_search, get_style, remix, import_art_style_proof_image, submit_art_style, submit_palette_system, submit_design_language, submission_status), deployed independently from the gallery’s read-only `/mcp`, and the `katagami` CLI in `cli/` whose commands include login, logout, whoami, search, pull, remix, import-image, submit and status are thin calls into those same tools.

## How to get to it (user POV)
A contributor discovers the endpoint at `https://katagami.ai/.well-known/mcp/server-card.json`, or runs `katagami login` in a terminal, then pulls a style, remixes it, and submits. Art styles return VerificationQueued with an engine-owned job ID; languages and palettes land UnderReview. All remain attributed to the contributor; curators publish.

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
Authenticated local writes can be verified with an ES256 test issuer, its exact-URL TrustedIssuer registration, and an Active contributor AgentGrant in the disposable local runtime. Every write needs a signed-in identity: `KATAGAMI_AS_PRIVATE_KEY` (ES256 PKCS#8) must be set and its public JWKS registered with the kernel as a TrustedIssuer, or `humanBearer()` throws and the owner and curator Server Actions fail closed rather than silently running on the shared operator key. `run-local.sh` sets none of that up. Roles come from the durable `Member.role` field, not an env allowlist; provisioning a curator means dispatching `Member.SetRole` with the operator credential, because `member.cedar` closes that action to everyone but System, Admin, and operator so nobody can self-promote.


## Image-import regression

With that local MCP and gallery running, use an existing contributor token in a
private file and a real PNG. From `mcp/`, run:

```bash
KATAGAMI_TEST_MCP_URL=http://127.0.0.1:3920/mcp \
KATAGAMI_TEST_GALLERY_URL=http://127.0.0.1:3902 \
KATAGAMI_TEST_TOKEN_FILE=/path/to/local-contributor.jwt \
KATAGAMI_TEST_IMAGE_FILE=/path/to/source.png npm run test:upload
```

The check imports through the actual MCP, verifies Locked and SHA-256, then
fetches the gallery file route and compares exact bytes and MIME. It fails when
File creation silently drops Path (for example, an unsupported `fields` wrapper).
A finalizer Completed state alone does not prove images load. Run CLI status on
valid and invalid submissions too: it must expose the recorded job state and
verification error without granting contributors job creation powers.
