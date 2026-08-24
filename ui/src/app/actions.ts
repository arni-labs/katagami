"use server";

import { revalidatePath } from "next/cache";
import { getDesignLanguage } from "@/lib/odata";
import { createEntity, deleteEntity, dispatchAction } from "@/lib/odata-mutations";
import { assertOwnerBearer } from "@/lib/owner";

const OWNER_ARCHIVE_NOTE = "Archived from the owner gallery controls.";
const OWNER_REVIEW_NOTE = "Sent back to review from owner controls.";
const OWNER_TASTE_ACCEPT_NOTE = "Accepted from owner taste review.";
const OWNER_TASTE_REJECT_NOTE = "Rejected from owner taste review.";

export async function deleteLanguage(id: string): Promise<void> {
  const bearer = await assertOwnerBearer();
  const lang = await getDesignLanguage(id);
  const status = lang.status ?? lang.fields?.Status;
  if (status !== "Archived") {
    await dispatchAction("DesignLanguages", id, "Archive", {
      curator_notes: OWNER_ARCHIVE_NOTE,
    }, { bearer });
  }
  revalidatePath("/");
  revalidatePath(`/language/${id}`);
}

/**
 * Catalog lanes whose cards can be archived from owner-mode controls, mapped
 * to the paths to revalidate after the status changes. Design languages keep
 * their own `deleteLanguage` action; this covers the other lanes the same way.
 */
const CATALOG_ARCHIVE_TARGETS: Record<string, (id: string) => string[]> = {
  PaletteSystems: (id) => ["/palettes", `/palettes/${id}`],
  ArtStyles: (id) => ["/art-styles", `/art-styles/${id}`],
};

export async function archiveCatalogItem(
  entitySet: string,
  id: string,
): Promise<void> {
  const bearer = await assertOwnerBearer();
  const revalidate = CATALOG_ARCHIVE_TARGETS[entitySet];
  if (!revalidate) {
    throw new Error(`Archiving ${entitySet} is not supported.`);
  }
  await dispatchAction(entitySet, id, "Archive", {
    curator_notes: OWNER_ARCHIVE_NOTE,
  }, { bearer });
  for (const path of revalidate(id)) {
    revalidatePath(path);
  }
}

export async function sendLanguageToReview(id: string): Promise<void> {
  const bearer = await assertOwnerBearer();
  const lang = await getDesignLanguage(id);
  const status = lang.status ?? lang.fields?.Status;
  if (status === "Published") {
    await dispatchAction("DesignLanguages", id, "Revise", {
      curator_notes: OWNER_REVIEW_NOTE,
    }, { bearer });
  } else if (status !== "UnderReview") {
    throw new Error("Only published languages can be sent back to review.");
  }
  revalidatePath("/");
  revalidatePath(`/language/${id}`);
}

export async function setLanguageFeatured(
  id: string,
  featured: boolean,
  displayOrder = 0,
): Promise<void> {
  const bearer = await assertOwnerBearer();
  await dispatchAction("DesignLanguages", id, "SetFeatured", {
    featured,
    display_order: displayOrder,
  }, { bearer });
  revalidatePath("/");
  revalidatePath(`/language/${id}`);
  revalidatePath("/owner/visitor-shelf");
}

export async function addCuratorNotes(
  id: string,
  notes: string,
): Promise<void> {
  const bearer = await assertOwnerBearer();
  await dispatchAction("DesignLanguages", id, "AddCuratorNotes", {
    curator_notes: notes,
  }, { bearer });
  revalidatePath(`/language/${id}`);
}

export async function deleteTaxonomy(id: string): Promise<void> {
  const bearer = await assertOwnerBearer();
  await deleteEntity("Taxonomies", id, { bearer });
  revalidatePath("/taxonomy");
}

export async function queueTasteDistillation(): Promise<void> {
  const bearer = await assertOwnerBearer();
  const job = await createEntity("CurationJobs");
  await dispatchAction("CurationJobs", job.entity_id, "ConfigureAndSubmit", {
    job_type: "taste_distillation",
    input: JSON.stringify({ limit: 100 }),
    completion_contract: "typed-v1",
    inline_job_docs: true,
  }, { bearer });
  revalidatePath("/owner");
}

export async function acceptTasteRule(id: string): Promise<void> {
  const bearer = await assertOwnerBearer();
  await dispatchAction("TasteRules", id, "Accept", {
    curator_notes: OWNER_TASTE_ACCEPT_NOTE,
  }, { bearer });
  revalidatePath("/owner");
}

export async function rejectTasteRule(id: string): Promise<void> {
  const bearer = await assertOwnerBearer();
  await dispatchAction("TasteRules", id, "Reject", {
    curator_notes: OWNER_TASTE_REJECT_NOTE,
  }, { bearer });
  revalidatePath("/owner");
}
