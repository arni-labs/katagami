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
  // Authoring a mix is the contributor's own write: carry the human's token so
  // the kernel attributes it and Cedar enforces the remix ownership boundary
  // (katagami-commons/policies/remix.cedar). Mint it once and thread it through
  // the create + every dispatch — none may fall back to the service key. The
  // human is signed in (requireUser above), so a null bearer means the mint
  // failed and the write must fail, never run as SERVICE. SetSelection runs
  // before SetCreator while creator_sub is still empty, which the policy's
  // "creator_sub == '' " clause allows.
  const bearer = await humanBearer();
  if (!bearer) {
    throw new Error("Could not obtain your bearer to save this mix.");
  }
  const remix = await createEntity("Remixes", {}, { bearer });
  await dispatchAction("Remixes", remix.entity_id, "SetSelection", {
    design_language_id: sel.designLanguageId,
    palette_system_id: sel.paletteSystemId,
    art_style_id: sel.artStyleId,
    composition_key: sel.compositionKey,
  }, { bearer });
  await dispatchAction("Remixes", remix.entity_id, "SetCreator", {
    creator_sub: user.sub,
    creator_email: user.email,
    creator_name: user.name,
    creator_avatar_url: user.picture,
  }, { bearer });
  if (sel.slotAssignments) {
    await dispatchAction("Remixes", remix.entity_id, "SetSlotAssignments", {
      slot_assignments: sel.slotAssignments,
    }, { bearer });
  }
  await dispatchAction("Remixes", remix.entity_id, "Save", {}, { bearer });
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
  // Carry the human's own token so the kernel sees who is rating and Cedar
  // enforces the creator boundary in katagami-commons/policies/remix.cedar.
  // The rater is signed in (requireUser above), so fail CLOSED: a null bearer
  // means the mint failed and the write must fail, never fall back to the
  // shared service key (which would skip the kernel's ownership check).
  const bearer = await humanBearer();
  if (!bearer) {
    throw new Error("Could not obtain your bearer to rate this mix.");
  }
  await dispatchAction("Remixes", id, "Rate", { rating: clamped }, { bearer });
  revalidatePath("/studio");
  revalidatePath("/account");
}
