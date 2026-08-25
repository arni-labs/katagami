import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

// Owner mode is single-sourced on the durable Member.role (ARN-255) — the same
// field the authorization server stamps into the `role` claim and Cedar
// enforces on. There is no JS allowlist to drift from Cedar.
const ownerSrc = fs.readFileSync(`${here}/../src/lib/owner.ts`, "utf8");

// Derives owner status from the signed-in account's Member role.
assert.match(ownerSrc, /const user = await getUser\(\)/);
assert.match(ownerSrc, /roleForSub\(user\.sub\)\) === "owner"/);

// Memoized per request so the many isOwner() callers share one Member lookup.
assert.match(ownerSrc, /cache\(async \(\): Promise<boolean>/);
assert.match(ownerSrc, /from "react"/);

// A curator predicate exists so curator-role Members are not locked out of the
// curation/review surfaces Cedar grants to owner|curator (ARN-255). Owner is a
// strict superset, and it is memoized + fails closed like isOwner().
assert.match(ownerSrc, /hasCuratorAccess = cache\(async \(\): Promise<boolean>/);
assert.match(ownerSrc, /role === "owner" \|\| role === "curator"/);

// The bearer helpers fail CLOSED: both return a real string or throw — a
// signed-in write never coalesces a failed mint to the shared service key.
assert.match(ownerSrc, /assertOwnerBearer\(\): Promise<string>/);
assert.match(ownerSrc, /assertCuratorBearer\(\): Promise<string>/);
assert.doesNotMatch(
  ownerSrc,
  /Promise<string \| undefined>/,
  "the bearer helpers must not return string | undefined (fail-closed regression)",
);

// No env allowlist, no deleted module, no passphrase/HMAC grant path.
assert.doesNotMatch(ownerSrc, /KATAGAMI_OWNER_SUBS/);
assert.doesNotMatch(ownerSrc, /KATAGAMI_OWNER_EMAILS/);
assert.doesNotMatch(ownerSrc, /owner-allowlist/);
assert.doesNotMatch(ownerSrc, /isOwnerModeConfigured/);
assert.doesNotMatch(
  ownerSrc,
  /grantOwnerSession|createHmac|timingSafeEqual|KATAGAMI_OWNER_SECRET/,
);

// The deleted allowlist module must not come back.
assert.equal(
  fs.existsSync(`${here}/../src/lib/owner-allowlist.ts`),
  false,
  "owner-allowlist.ts must stay deleted",
);

// The owner surfaces read the session, so they must stay dynamic.
const ownerPage = fs.readFileSync(`${here}/../src/app/(site)/owner/page.tsx`, "utf8");
const shelf = fs.readFileSync(
  `${here}/../src/app/(site)/owner/visitor-shelf/page.tsx`,
  "utf8",
);
assert.match(ownerPage, /export const dynamic = "force-dynamic"/);
assert.match(shelf, /export const dynamic = "force-dynamic"/);

console.log("ok: owner mode keys on Member.role + owner pages stay dynamic");
