"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDesignLanguage } from "@/lib/odata";
import { deleteEntity, dispatchAction } from "@/lib/odata-mutations";
import {
  assertOwner,
  grantOwnerSession,
  isOwnerModeConfigured,
  revokeOwnerSession,
} from "@/lib/owner";

export async function deleteLanguage(id: string): Promise<void> {
  await assertOwner();
  const lang = await getDesignLanguage(id);
  if (lang.status === "Published") {
    await dispatchAction("DesignLanguages", id, "Archive", {});
  } else {
    await deleteEntity("DesignLanguages", id);
  }
  revalidatePath("/");
  revalidatePath(`/language/${id}`);
}

export async function setLanguageFeatured(
  id: string,
  featured: boolean,
  displayOrder = 0,
): Promise<void> {
  await assertOwner();
  await dispatchAction("DesignLanguages", id, "SetFeatured", {
    featured,
    display_order: displayOrder,
  });
  revalidatePath("/");
  revalidatePath(`/language/${id}`);
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
  await assertOwner();
  await deleteEntity("Taxonomies", id);
  revalidatePath("/taxonomy");
}

export async function unlockOwnerMode(formData: FormData): Promise<void> {
  if (!isOwnerModeConfigured()) {
    redirect("/owner?error=not-configured");
  }

  const passphrase = String(formData.get("passphrase") ?? "");
  if (!(await grantOwnerSession(passphrase))) {
    redirect("/owner?error=bad-passphrase");
  }

  revalidatePath("/", "layout");
  redirect("/owner?unlocked=1");
}

export async function lockOwnerMode(): Promise<void> {
  await revokeOwnerSession();
  revalidatePath("/", "layout");
  redirect("/owner?locked=1");
}
