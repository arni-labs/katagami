// Refresh-token rotation that survives two refreshes at once.
//
// Rotation used to be strict: each refresh stored the hash of a new random
// token, and the old one died instantly. A client whose sessions share one
// stored sign-in (every Claude Code session on a machine, two Cursor windows,
// one agent making parallel calls) refreshes with the same token in several
// places when the 15-minute access token expires. The first refresh won and
// every other one was refused as stale, so the client threw the sign-in away:
// on 2026-09-23 no signed-in caller in the previous week had made a call more
// than 15 minutes after signing in.
//
// The next token is now DERIVED, not random: an HMAC of the presented token's
// hash and the current minute, under a server secret. Two refreshes of the
// same token in the same minute compute the same next token and converge on
// one sign-in. A token that was just replaced still resolves, to its own
// successor, for GRACE_MINUTES; after that it is dead, which keeps the
// protection strict rotation gave against a stolen, already-rotated token.
//
// Plain .mjs: the token route uses it and node --test exercises it with an
// in-memory grant store.

export const BUCKET_SECONDS = 60;
/** How many minutes a replaced token still resolves to its successor. */
export const GRACE_MINUTES = 3;

const enc = new TextEncoder();
const hex = (buf) => Buffer.from(buf).toString("hex");

export async function sha256Hex(input) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

export const bucketOf = (nowMs) => Math.floor(nowMs / 1000 / BUCKET_SECONDS);

const keys = new Map();
async function hmacKey(secret) {
  if (!secret) throw new Error("refresh rotation needs a server secret");
  if (!keys.has(secret)) {
    const raw = await crypto.subtle.digest("SHA-256", enc.encode(`katagami refresh successor v1\0${secret}`));
    keys.set(secret, crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]));
  }
  return keys.get(secret);
}

/** The token that follows the one hashed as `presentedHash`, in minute `bucket`. */
export async function successorToken(presentedHash, bucket, secret) {
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${presentedHash}\0${bucket}`));
  return `krt_${Buffer.from(mac).toString("base64url")}`;
}

/**
 * What a presented refresh token means now:
 *  - { kind: "rotate", grant, next }: it is the grant's current token; store `next`.
 *  - { kind: "replay", grant, next }: it was replaced by `next` within the grace
 *    period (another session, or a response that never arrived); hand `next`
 *    back and store nothing.
 *  - { kind: "invalid" }: unknown, revoked, or replaced too long ago.
 * `findGrantByHash(hash)` returns the Active grant storing that hash, or null.
 */
export async function resolveRefresh({ presented, nowMs, secret, findGrantByHash }) {
  const presentedHash = await sha256Hex(presented);
  const bucket = bucketOf(nowMs);
  const current = await findGrantByHash(presentedHash);
  if (current) return { kind: "rotate", grant: current, next: await successorToken(presentedHash, bucket, secret) };
  for (let back = 0; back < GRACE_MINUTES; back++) {
    const next = await successorToken(presentedHash, bucket - back, secret);
    const grant = await findGrantByHash(await sha256Hex(next));
    if (grant) return { kind: "replay", grant, next };
  }
  return { kind: "invalid" };
}
