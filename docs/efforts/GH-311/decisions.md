# Decisions

- Existing gallery-preview effort ARN-489 / PR #307 is separate; do not duplicate launcher work.
- Home layout currently awaits a tier-specific cached search index; on a cache miss it reads full language, palette, and art-style catalogs serially before rendering children. Remove this dependency rather than shortening authentication checks.
- Vercel app connection returned UNAUTHORIZED / oauth_token_invalid_grant (reauthentication required). Do not retry it. GitHub and Temper work; public production remains reachable.
- No signed-in website session is present. User asked about an existing approved session; do not forge production login or weaken its gate for verification.

## PR identity

Decision: use GH-311, the actual GitHub pull-request/issue number, for CI artifact discovery. Came up because the PR body mentioned an unrelated credential-recovery issue and the checker selected it. Options: reuse that unrelated issue or identify the gallery effort explicitly. Chose GH-311 because it keeps the scopes separate and satisfies the repository's existing issue-key convention without changing the checker. Where: PR title/body and docs/efforts/GH-311.
