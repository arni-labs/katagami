# Intent: Gallery /mcp 401 so Grok Bot shows a login card
Author: Rita Agafonova (owner). Status: accepted.

## Problem
Anonymous `initialize` on `https://katagami.ai/mcp` returned 200 with a sample
catalog. Grok Bot (and other MCP hosts) only draw a connect card when that
handshake 401s with `WWW-Authenticate` pointing at RFC 9728 protected-resource
metadata. Without the card, a template clone of katagami.ai/mcp has no in-chat
login. `/connect` also still sold a no-login sample on the URL that must 401.

## Proposed outcome
Unauthenticated `/mcp` is 401 + `WWW-Authenticate` with `resource_metadata`
at the origin well-known URL. Metadata `resource` is `https://katagami.ai/mcp`.
A valid Google-backed **read** token unlocks the full catalog. Contribute-adapter
tokens do not. `/connect` tells people to tap the login card and sign in with
Google. DCR accepts https, loopback http, `cursor://`, and `grok://` only.

## Affected users and systems
Grok Bot / Cursor MCP hosts hitting the gallery read MCP. The contribution
adapter at mcp.katagami.ai is unchanged except that its tokens stay scoped off
the gallery. `/connect` copy. OAuth DCR + token minting for the `read` resource.

## Constraints
Plugin / marketplace path is out. Do not invent `/mcp/sample`. Keep DCR + PKCE
+ Google authorize. `token_endpoint_auth_method: none`. After a valid bearer,
full catalog, not a sample. No Galley publish. No spend.

## Open questions
None remaining — leftover review items (connect lie, missing vs invalid bearer,
contribute audience, ftp DCR, stubbed tests) are closed on this head.
