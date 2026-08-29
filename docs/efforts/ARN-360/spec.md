# Spec: Gallery /mcp required auth + Grok connect card
Status: accepted. Intent: docs/efforts/ARN-360/intent.md

## Requirements
1. `POST /mcp` with no Authorization → HTTP 401, `WWW-Authenticate` contains
   `resource_metadata="https://katagami.ai/.well-known/oauth-protected-resource"`,
   body/description `No authorization provided`.
2. `POST /mcp` with a garbage Bearer → HTTP 401, description `Invalid token`
   (not “No authorization provided”).
3. `GET /.well-known/oauth-protected-resource` and
   `GET /.well-known/oauth-protected-resource/mcp` both return
   `resource=https://katagami.ai/mcp`, `bearer_methods_supported=["header"]`,
   `scopes_supported=["read"]`.
4. A production-shaped ES256 JWT with `aud=https://katagami.ai/mcp` and
   `scope` containing `read` → initialize 200 and whoami `tier: full`.
5. A contribute-adapter token (`aud=https://mcp.katagami.ai`,
   `scope=contribute`) is rejected on gallery `/mcp`.
6. `POST /api/oauth/register` rejects `ftp://` (`invalid_redirect_uri`) and
   accepts `cursor://` and `grok://`.
7. `/connect` does not claim a no-login sample or “Works instantly with no login”.

## Design
`withMcpAuth` `required: true`. `resourceUrl` is the gallery origin so
mcp-handler emits origin-level `resource_metadata` (not `/mcp/.well-known/...`).
`readMcpAuthInfo` maps missing bearer → undefined and invalid bearer → throw.
`verifyReadAccessToken` / `identityFromAccessPayload` enforce audience and
`read` scope. The AS mints `read` when the resource is the gallery `/mcp` URL
and `contribute` otherwise.

## Policy / invariants
Contribute tokens never unlock the gallery catalog. DCR schemes are an
allow-list, not “any custom scheme”. Tests hit the real verifier, not a
`withMcpAuth` stub.

## Deferred / out of scope
Refresh-grant default resource when the client omits RFC 8707 `resource`
(consider: falls back to the contribute adapter). Live Grok Bot UI of the
card after production deploy. Plugin / marketplace install path.
