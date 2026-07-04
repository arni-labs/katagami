"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/owner";
import { dispatchAction } from "@/lib/odata-mutations";

// The curator gate's other half: the finalizer stops writing styles at
// UnderReview with every Publish guard satisfied; the owner reads the voice
// and publishes it from the contract page.
export async function publishWritingStyle(id: string): Promise<void> {
  await assertOwner();
  await dispatchAction("WritingStyles", id, "Publish", {});
  revalidatePath("/voice");
  revalidatePath(`/voice/${id}`);
  revalidatePath("/under-review");
}
