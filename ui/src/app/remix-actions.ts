"use server";

import { revalidatePath } from "next/cache";
import { getRemix } from "@/lib/odata";
import { createEntity, dispatchAction } from "@/lib/odata-mutations";
import { requireUser } from "@/lib/user-auth";
import { humanBearer } from "@/lib/human-bearer";

export interface RemixSelection {
  designLanguageId: string;
  paletteSystemId: string;
  artStyleId: string;
  compositionKey: string;
  slotAssignments?: string; // JSON: slot key -> reference id/url
}

/**
 * Persist the current mix as a Remix entity, walked to Saved and attributed
 * to the signed-in human. Returns its id.
 */
export async function saveRemix(sel: RemixSelection): Promise<string> {
  const user = await requireUser();
  const remix = await createEntity("Remixes");
  await dispatchAction("Remixes", remix.entity_id, "SetSelection", {
    design_language_id: sel.designLanguageId,
    palette_system_id: sel.paletteSystemId,
    art_style_id: sel.artStyleId,
    composition_key: sel.compositionKey,
  });
  await dispatchAction("Remixes", remix.entity_id, "SetCreator", {
    creator_sub: user.sub,
    creator_email: user.email,
    creator_name: user.name,
    creator_avatar_url: user.picture,
  });
  if (sel.slotAssignments) {
    await dispatchAction("Remixes", remix.entity_id, "SetSlotAssignments", {
      slot_assignments: sel.slotAssignments,
    });
  }
  await dispatchAction("Remixes", remix.entity_id, "Save", {});
  revalidatePath("/studio");
  revalidatePath("/account");
  return remix.entity_id;
}

/** Rate one of your own mixes 1–5. Feeds the remix-compatibility taste signal. */
export async function rateRemix(id: string, rating: number): Promise<void> {
  const user = await requireUser();
  const remix = await getRemix(id);
  // Ownership is the stable Google subject id, not the email — emails change
  // hands (and Workspace recycles them); subs don't.
  if ((remix.fields.creator_sub ?? "") !== user.sub) {
    throw new Error("Only the mix's creator can rate it.");
  }
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  // Carry the human's own token when enabled so the kernel enforces the
  // generated `requires = "creator"` overlay on Rate; falls back to the shared
  // key (and the check above) until the kernel deploy lands (ARN-255).
  const bearer = (await humanBearer()) ?? undefined;
  await dispatchAction("Remixes", id, "Rate", { rating: clamped }, { bearer });
  revalidatePath("/studio");
  revalidatePath("/account");
}
