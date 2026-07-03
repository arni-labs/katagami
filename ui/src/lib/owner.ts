import "server-only";

import { getUser } from "@/lib/user-auth";

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
  const user = await getUser();
  return Boolean(user && ownerSubs().includes(user.sub));
}

export async function assertOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Owner access requires an allowlisted signed-in account.");
  }
}
