"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/owner";
import { dispatchAction } from "@/lib/odata-mutations";

const SETS: Record<string, string> = {
  language: "DesignLanguages",
  palette: "PaletteSystems",
  art_style: "ArtStyles",
};

/** Curator rejection with feedback: back to Draft, notes readable by the
 *  contributor via submission_status (ARN-154). */
export async function rejectSubmission(formData: FormData): Promise<void> {
  await assertOwner();
  const kind = formData.get("kind");
  const id = formData.get("id");
  const notes = formData.get("notes");
  const set = typeof kind === "string" ? SETS[kind] : undefined;
  if (!set || typeof id !== "string" || !id) return;

  await dispatchAction(set, id, "ReturnToDraft", {
    curator_notes:
      typeof notes === "string" && notes.trim()
        ? notes.trim().slice(0, 2000)
        : "Returned to draft by a curator.",
  });
  revalidatePath("/under-review");
  revalidatePath("/account");
}
