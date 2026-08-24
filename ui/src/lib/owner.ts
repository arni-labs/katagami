import "server-only";

import { getUser } from "@/lib/user-auth";
import {
  parseOwnerAllowlist,
  sessionMatchesOwner,
} from "@/lib/owner-allowlist";
import { humanBearer } from "@/lib/human-bearer";

// Owner mode is identity, not a passphrase: the signed-in Google account's
// stable subject id (or, for launch recovery, its email) must be on the
// allowlist. Find a sub via an attributed Remix (creator_sub).

function ownerAllowlist() {
  return parseOwnerAllowlist(
    process.env.KATAGAMI_OWNER_SUBS,
    process.env.KATAGAMI_OWNER_EMAILS,
  );
}

export function isOwnerModeConfigured(): boolean {
  const list = ownerAllowlist();
  return list.subs.length + list.emails.length > 0;
}

export async function isOwner(): Promise<boolean> {
  // Always read the session cookie first. Short-circuiting on a missing
  // env at build time let Next prerender /owner and /owner/visitor-shelf
  // as the signed-out tree, so a live owner session never saw the picker.
  const user = await getUser();
  if (!user || !isOwnerModeConfigured()) return false;
  return sessionMatchesOwner(user, ownerAllowlist());
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
