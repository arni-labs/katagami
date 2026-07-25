import "server-only";

import { getUser } from "@/lib/user-auth";
import { humanBearer } from "@/lib/human-bearer";

// Owner mode is identity, not a passphrase: the signed-in Google account's
// stable subject id must be in the KATAGAMI_OWNER_SUBS allowlist
// (comma-separated). This replaced the KATAGAMI_OWNER_SECRET HMAC unlock —
// one door, backed by the owner's Google account and its 2FA, working on any
// device they sign in on. Find a sub via an attributed Remix (creator_sub).

function ownerSubs(): string[] {
  return (process.env.KATAGAMI_OWNER_SUBS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isOwnerModeConfigured(): boolean {
  return ownerSubs().length > 0;
}

export async function isOwner(): Promise<boolean> {
  // Short-circuit before touching cookies: an unconfigured deploy stays
  // fully static on the pages that ask (the old passphrase code behaved
  // the same way).
  if (!isOwnerModeConfigured()) return false;
  const user = await getUser();
  return Boolean(user && ownerSubs().includes(user.sub));
}

export async function assertOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Owner access requires an allowlisted signed-in account.");
  }
}

/** Assert owner access AND carry the acting human to the kernel (ARN-255).
 *
 *  Every curator action used to reach the backend on the shared service key, so
 *  Cedar only ever saw `Agent::"operator"` and the real gate was this process's
 *  own `isOwner()` check. Passing the returned bearer to the mutation means the
 *  kernel resolves the human, reads their role from the token, and enforces the
 *  curator boundary itself — the allowlist becomes defence in depth rather than
 *  the only thing standing there.
 *
 *  Returns undefined when human tokens are off, in which case the call falls
 *  back to the shared key and today's behaviour. */
export async function assertOwnerBearer(): Promise<string | undefined> {
  await assertOwner();
  return (await humanBearer()) ?? undefined;
}
