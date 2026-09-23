# Muse connector packet

Paste-ready values for Meta's Muse Connector Platform form (https://muse.ai/platform, Submit a connector). Nothing here is submitted by itself: the form needs a logged-in Muse account and three attestations only the account owner ticks.

| File | What it is |
|---|---|
| `submission.json` | Every form field, keyed like the form's payload. Limits checked: name 80 chars, company 120, short description 160, HTTPS endpoint, http(s) URLs. |
| `icon-512.png` | The site icon at 512x512, 16 KB (the form wants a 512x512 PNG or SVG of 256 KiB or less). Rendered from `/icon.svg` in Chromium so the multiply blend is right. |

## Filling the form

1. Sign in at https://muse.ai/platform and click Submit a connector.
2. Overview: paste `productName`, `companyName`, `website`, the descriptions, and one line of `useCases` per example prompt. Upload `icon-512.png`.
3. Technical specs: choose Existing MCP. Endpoint `https://katagami.ai/mcp`. Documentation `https://katagami.ai/connect`. Access requirements: paste `limits`. Tick OAuth with PKCE, and put the no-sign-in address in Other so reviewers can test without an account.
4. Review: read the Muse Connector Terms and tick the three attestations.

## What Muse needs from the server, and where it stands

| Need | Status |
|---|---|
| Public HTTPS MCP endpoint over streamable HTTP | `https://katagami.ai/mcp` (401 with RFC 9728 resource metadata until signed in) and `https://katagami.ai/mcp/open` (no sign-in, visitor shelf) |
| OAuth 2.1: PKCE S256, dynamic client registration | Advertised at `/.well-known/oauth-authorization-server` |
| Client ID metadata documents (CIMD) | Not advertised. DCR covers Muse; if reviewers ask for a fixed client id, register one against Muse's callback host |
| Privacy policy, terms, support | `/privacy`, `/terms`, `/support`, live since 2026-09-22 |
| Icon | `icon-512.png` |

## Testing in Muse before submitting

Muse builds custom connectors itself: in the Muse app, ask it to create a custom connector, give it `https://katagami.ai/mcp/open`, and say it is a remote MCP server over streamable HTTP. That address needs no sign-in, so the whole flow can be tried before the directory review. Then try the example prompts above.
