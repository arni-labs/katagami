"use server";

import { revalidatePath } from "next/cache";
import { deleteEntity, dispatchAction } from "@/lib/odata";

export async function deleteLanguage(id: string): Promise<void> {
  await deleteEntity("DesignLanguages", id);
  revalidatePath("/");
}

export async function addCuratorNotes(
  id: string,
  notes: string,
): Promise<void> {
  await dispatchAction("DesignLanguages", id, "AddCuratorNotes", {
    curator_notes: notes,
  });
  revalidatePath(`/language/${id}`);
}

export async function deleteTaxonomy(id: string): Promise<void> {
  await deleteEntity("Taxonomies", id);
  revalidatePath("/taxonomy");
}
