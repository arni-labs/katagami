# Decisions

- Existing gallery-preview effort ARN-489 / PR #307 is separate; do not duplicate launcher work.
- Home layout currently awaits a tier-specific cached search index; on a cache miss it reads full language, palette, and art-style catalogs serially before rendering children. Remove this dependency rather than shortening authentication checks.
- Vercel app connection returned UNAUTHORIZED / oauth_token_invalid_grant (reauthentication required). Do not retry it. GitHub and Temper work; public production remains reachable.
- No signed-in website session is present. User asked about an existing approved session; do not forge production login or weaken its gate for verification.
