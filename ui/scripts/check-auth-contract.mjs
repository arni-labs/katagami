// Human sign-in contract (ARN-143): the Google OIDC flow stays secure and the
// Studio stays gated. Source-greps in the style of the other check-* scripts —
// these encode the invariants a refactor must not silently drop.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const session = read("src/lib/user-auth.ts");
const oidc = read("src/lib/google-oidc.ts");
const start = read("src/app/api/auth/google/start/route.ts");
const callback = read("src/app/api/auth/google/callback/route.ts");
const me = read("src/app/api/auth/me/route.ts");
const actions = read("src/app/remix-actions.ts");
const signin = read("src/app/(site)/signin/page.tsx");
const account = read("src/app/(site)/account/page.tsx");
const layout = read("src/app/(site)/layout.tsx");
const studio = read("src/app/(site)/studio/page.tsx");
const authActions = read("src/app/auth-actions.ts");
const inlineRemix = read("src/components/remix/inline-remix.tsx");

const required = [
  // The session is off, never insecurely on: no fallback secret anywhere.
  ["session secret has no fallback", session, /raw \? new TextEncoder/],
  ["session cookie is httpOnly", callback, /httpOnly: true/],
  // Redirect targets are validated by resolution, not by prefix (a prefix
  // check is bypassable with URL-parser-stripped control characters).
  ["safe path validates by resolving against a fixed origin", session, /katagami\.invalid/],
  ["callback follows only internal redirect targets", callback, /safeInternalPath/],
  ["callback checks the state cookie (CSRF)", callback, /state !== cookieState/],
  ["callback requires the PKCE verifier and nonce cookies", callback, /!verifier ||\s*!nonce/],
  ["start route refuses when unconfigured", start, /isAuthConfigured\(\)/],
  ["start route clears a stale next-target cookie", start, /cookies\.delete\(OAUTH_NEXT_COOKIE\)/],
  ["PKCE: S256 challenge on the authorization request", oidc, /code_challenge_method: "S256"/],
  ["ID token is verified against Google JWKS", oidc, /createRemoteJWKSet/],
  ["ID-token nonce must match ours (fail closed)", oidc, /payload\.nonce !== expectedNonce/],
  ["email_verified must be present and true (fail closed)", oidc, /email_verified !== true/],
  ["sign-out is a server action, not a GET route", authActions, /"use server"/],
  // The Studio is a signed-in space for making, open for browsing.
  ["saveRemix requires a signed-in human", actions, /saveRemix[\s\S]*?requireUser/],
  ["saved mixes are attributed via SetCreator", actions, /"SetCreator"/],
  ["rateRemix keys ownership on the stable Google sub", actions, /creator_sub[\s\S]*?creator can rate/],
  ["studio scopes saved mixes by creator_sub", studio, /creator_sub/],
  ["save failures are caught, not thrown to the boundary", inlineRemix, /doSave[\s\S]*?catch/],
  // The front of the house exists and degrades gracefully.
  ["signin page names its error states", signin, /errorCopy/],
  ["signin page explains the unconfigured state", signin, /KATAGAMI_AUTH_SECRET/],
  ["account page bounces signed-out visitors to /signin", account, /redirect\("\/signin/],
  ["header renders the user menu", layout, /<UserMenu \/>/],
  // The shared layout must never read cookies — it would make every route
  // dynamic; the header chip hydrates from /api/auth/me instead.
  ["layout stays cookie-free (full-route cache preserved)", layout, /^(?![\s\S]*getUser)[\s\S]*$/],
  ["identity endpoint is uncacheable", me, /no-store/],
];

let failed = 0;
for (const [name, source, pattern] of required) {
  if (pattern.test(source)) {
    console.log(`ok: ${name}`);
  } else {
    console.error(`MISSING: ${name}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} auth contract check(s) failed.`);
  process.exit(1);
}
console.log("\nauth contract holds.");
