"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/user-auth";
import {
  createGrant,
  grantById,
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
