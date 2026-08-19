import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

function normalizeToken(raw) {
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

function splitList(raw) {
  return (raw ?? "")
    .split(/[\n,]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function parseOwnerAllowlist(subsRaw, emailsRaw) {
  const subs = [];
  const emails = [];
  for (const token of splitList(subsRaw)) {
    if (token.includes("@")) emails.push(token.toLowerCase());
    else subs.push(token);
  }
  for (const token of splitList(emailsRaw)) {
    emails.push(token.toLowerCase());
  }
  return { subs, emails };
}

function sessionMatchesOwner(user, allowlist) {
  if (user.sub && allowlist.subs.includes(user.sub)) return true;
  const email = user.email.trim().toLowerCase();
  return Boolean(email && allowlist.emails.includes(email));
}

const src = fs.readFileSync(`${here}/../src/lib/owner-allowlist.ts`, "utf8");
assert.match(src, /function normalizeToken/);
assert.match(src, /token\.includes\("@"\)/);
assert.match(src, /allowlist\.emails\.includes\(email\)/);

const list = parseOwnerAllowlist(
  "  123456789012345678901 , rita.mirai@gmail.com ",
  "",
);
assert.deepEqual(list.subs, ["123456789012345678901"]);
assert.deepEqual(list.emails, ["rita.mirai@gmail.com"]);
assert.equal(
  sessionMatchesOwner(
    { sub: "123456789012345678901", email: "other@example.com" },
    list,
  ),
  true,
);
assert.equal(
  sessionMatchesOwner({ sub: "999", email: "Rita.Mirai@gmail.com" }, list),
  true,
);
assert.equal(
  sessionMatchesOwner({ sub: "999", email: "not-owner@example.com" }, list),
  false,
);

const quoted = parseOwnerAllowlist(
  '"123456789012345678901"',
  "rita.mirai@gmail.com\n",
);
assert.deepEqual(quoted.subs, ["123456789012345678901"]);
assert.equal(
  sessionMatchesOwner({ sub: "x", email: "rita.mirai@gmail.com" }, quoted),
  true,
);

const ownerSrc = fs.readFileSync(`${here}/../src/lib/owner.ts`, "utf8");
assert.match(ownerSrc, /const user = await getUser\(\)/);
assert.match(ownerSrc, /sessionMatchesOwner/);
assert.doesNotMatch(
  ownerSrc,
  /if \(!isOwnerModeConfigured\(\)\) return false;\s*const user/,
);

const ownerPage = fs.readFileSync(`${here}/../src/app/(site)/owner/page.tsx`, "utf8");
const shelf = fs.readFileSync(
  `${here}/../src/app/(site)/owner/visitor-shelf/page.tsx`,
  "utf8",
);
assert.match(ownerPage, /export const dynamic = "force-dynamic"/);
assert.match(shelf, /export const dynamic = "force-dynamic"/);

console.log("ok: owner allowlist + owner pages stay dynamic");
