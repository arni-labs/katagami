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
const actions = read("src/app/remix-actions.ts");
const signin = read("src/app/(site)/signin/page.tsx");
const account = read("src/app/(site)/account/page.tsx");
const layout = read("src/app/(site)/layout.tsx");
const studio = read("src/app/(site)/studio/page.tsx");
const authActions = read("src/app/auth-actions.ts");

const required = [
  // The session is off, never insecurely on: no fallback secret anywhere.
  ["session secret has no fallback", session, /raw \? new TextEncoder/],
  ["session cookie is httpOnly", callback, /httpOnly: true/],
  ["callback checks the state cookie (CSRF)", callback, /state !== cookieState/],
  ["callback follows only internal redirect targets", callback, /safeInternalPath/],
  ["start route refuses when unconfigured", start, /isAuthConfigured\(\)/],
  ["ID token is verified against Google JWKS", oidc, /createRemoteJWKSet/],
  ["unverified Google emails are rejected", oidc, /email_verified === false/],
  ["sign-out is a server action, not a GET route", authActions, /"use server"/],
  // The Studio is a signed-in space for making, open for browsing.
  ["saveRemix requires a signed-in human", actions, /saveRemix[\s\S]*?requireUser/],
  ["saved mixes are attributed via SetCreator", actions, /"SetCreator"/],
  ["rateRemix checks the mix's creator", actions, /creator_email[\s\S]*?creator can rate/],
  ["studio scopes saved mixes to the signed-in human", studio, /creator_email/],
  // The front of the house exists and degrades gracefully.
  ["signin page names its error states", signin, /errorCopy/],
  ["signin page explains the unconfigured state", signin, /KATAGAMI_AUTH_SECRET/],
  ["account page bounces signed-out visitors to /signin", account, /redirect\("\/signin/],
  ["header renders the user menu", layout, /<UserMenu user=/],
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
