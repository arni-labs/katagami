"use server";

import { revalidatePath } from "next/cache";
import { createEntity, dispatchAction } from "@/lib/odata-mutations";

export interface RemixSelection {
  designLanguageId: string;
  paletteSystemId: string;
  artStyleId: string;
  compositionKey: string;
  slotAssignments?: string; // JSON: slot key -> reference id/url
}

/** Persist the current mix as a Remix entity, walked to Saved. Returns its id. */
export async function saveRemix(sel: RemixSelection): Promise<string> {
  const remix = await createEntity("Remixes");
  await dispatchAction("Remixes", remix.entity_id, "SetSelection", {
    design_language_id: sel.designLanguageId,
    palette_system_id: sel.paletteSystemId,
    art_style_id: sel.artStyleId,
    composition_key: sel.compositionKey,
  });
  if (sel.slotAssignments) {
    await dispatchAction("Remixes", remix.entity_id, "SetSlotAssignments", {
      slot_assignments: sel.slotAssignments,
    });
  }
  await dispatchAction("Remixes", remix.entity_id, "Save", {});
  revalidatePath("/studio");
  return remix.entity_id;
}

/** Rate a saved mix 1–5. Feeds the remix-compatibility taste signal. */
export async function rateRemix(id: string, rating: number): Promise<void> {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  await dispatchAction("Remixes", id, "Rate", { rating: clamped });
  revalidatePath("/studio");
}
