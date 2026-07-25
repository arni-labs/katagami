"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/user-auth";
import {
  bumpGeneration,
  createGrant,
  grantById,
  grantsForMember,
  issueRefreshToken,
  revokeGrant,
} from "@/lib/oauth-as";

export type MintResult =
  | { ok: true; label: string; refreshToken: string }
  | { ok: false; error: string }
  | null;

/** Pre-authorized grant for headless agents (CI, cron): the same consent
 *  entity as the browser flow, minted ahead of time — never a parallel key
 *  system. The refresh token is shown exactly once. */
export async function mintHeadlessGrant(
  _prev: MintResult,
  formData: FormData,
): Promise<MintResult> {
  const user = await requireUser();
  const raw = formData.get("label");
  const label =
    (typeof raw === "string" && raw.trim().slice(0, 80)) || "Headless agent";

  const clientId = `headless_${crypto.randomUUID().replaceAll("-", "")}`;
  try {
    const grantId = await createGrant({
      memberSub: user.sub,
      memberEmail: user.email,
      clientId,
      clientName: label,
      grantKind: "pre_authorized",
    });
    const refreshToken = await issueRefreshToken(grantId);
    revalidatePath("/account/agents");
    return { ok: true, label, refreshToken };
  } catch (err) {
    console.error("Headless grant mint failed:", err);
    return { ok: false, error: "Could not create the grant. Try again." };
  }
}

export async function revokeAgentGrant(formData: FormData): Promise<void> {
  const user = await requireUser();
  const grantId = formData.get("grant_id");
  if (typeof grantId !== "string" || !grantId) return;

  // Only the owning human may revoke — the grant row is attacker input
  // until proven theirs.
  const grant = await grantById(grantId);
  if (!grant || grant.memberSub !== user.sub) return;

  await revokeGrant(grantId, "revoked by owner from Agents & access");
  revalidatePath("/account/agents");
}

/** Sign out everywhere: end this human's sessions on every device and stop
 *  every agent acting for them (ARN-255).
 *
 *  Two steps, because tokens and grants expire differently:
 *  1. Bump the human's kernel generation — kills existing session cookies and
 *     any outstanding access token stamped with an older generation.
 *  2. Revoke their live grants — otherwise an agent simply refreshes and gets
 *     a fresh token stamped with the NEW generation, resuming within minutes.
 */
export async function signOutEverywhere(): Promise<void> {
  const user = await requireUser();

  await bumpGeneration(user.sub);

  const grants = await grantsForMember(user.sub);
  for (const grant of grants.filter((g) => g.status === "Active")) {
    try {
      await revokeGrant(grant.grantId, "signed out everywhere by owner");
    } catch (err) {
      // Surface, never silently leave an agent live.
      console.error(`[auth] failed to revoke grant ${grant.grantId}`, err);
      throw new Error("Could not stop every agent. Try again.");
    }
  }

  revalidatePath("/account/agents");
  revalidatePath("/account");
}
