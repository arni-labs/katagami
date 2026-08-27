"use server";

import { revalidatePath } from "next/cache";
import {
  getDesignLanguage,
  listVisibleArtStyles,
  listVisibleDesignLanguages,
  listVisiblePaletteSystems,
  visitorOrderOf,
} from "@/lib/odata";
import { createEntity, deleteEntity, dispatchAction } from "@/lib/odata-mutations";
import { assertCuratorBearer } from "@/lib/owner";

type VisitorShelfEntitySet = "DesignLanguages" | "PaletteSystems" | "ArtStyles";

/** Current on-shelf rows per lane — the reader whose max visitor_order gives the
 *  next append position (max+1). Same source the visitor shelf page lists from. */
const VISITOR_SHELF_ON_SHELF: Record<
  VisitorShelfEntitySet,
  () => Promise<Array<Parameters<typeof visitorOrderOf>[0]>>
> = {
  DesignLanguages: listVisibleDesignLanguages,
  PaletteSystems: listVisiblePaletteSystems,
  ArtStyles: listVisibleArtStyles,
};

const OWNER_ARCHIVE_NOTE = "Archived from the owner gallery controls.";
const OWNER_REVIEW_NOTE = "Sent back to review from owner controls.";
const OWNER_TASTE_ACCEPT_NOTE = "Accepted from owner taste review.";
const OWNER_TASTE_REJECT_NOTE = "Rejected from owner taste review.";

export async function deleteLanguage(id: string): Promise<void> {
  const bearer = await assertCuratorBearer();
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
  const bearer = await assertCuratorBearer();
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
  const bearer = await assertCuratorBearer();
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

/** HIGHLIGHT writer (ARN-385 split): SetFeatured sets the `featured` flag +
 *  display_order — the seal + curator's-picks lead for signed-in users. It does
 *  NOT decide visitor visibility; that is setVisitorVisibility below. */
export async function setLanguageFeatured(
  id: string,
  featured: boolean,
  displayOrder = 0,
): Promise<void> {
  const bearer = await assertCuratorBearer();
  await dispatchAction("DesignLanguages", id, "SetFeatured", {
    featured,
    display_order: displayOrder,
  }, { bearer });
  revalidatePath("/");
  revalidatePath(`/language/${id}`);
}

/** The paths whose anonymous view changes when an entity goes on/off the
 *  visitor shelf — the lane home + its detail page. */
const VISITOR_SHELF_REVALIDATE: Record<string, (id: string) => string[]> = {
  DesignLanguages: (id) => ["/", `/language/${id}`],
  PaletteSystems: (id) => ["/palettes", `/palettes/${id}`],
  ArtStyles: (id) => ["/art-styles", `/art-styles/${id}`],
};

/** ANON-ALLOWLIST writer (ARN-385 split): SetVisitorVisibility sets
 *  `shown_to_visitors` — the ONLY flag that decides what a signed-out visitor
 *  sees on the website and the read MCP, for languages, palettes, and art
 *  styles alike. Independent of the `featured` highlight.
 *
 *  `order` sets the shelf position (lower comes first) and is sent as the
 *  INDEPENDENT `visitor_order` field. It is written ONLY when supplied — a plain
 *  add/remove toggle omits it, so an item keeps its current position and toggling
 *  never resets order. A reorder passes the new order with `shown = true`. This
 *  writer NEVER sends display_order and NEVER dispatches SetFeatured — the
 *  featured lead and its display_order stay entirely with setLanguageFeatured. */
export async function setVisitorVisibility(
  entitySet: string,
  id: string,
  shown: boolean,
  order?: number,
): Promise<void> {
  const revalidate = VISITOR_SHELF_REVALIDATE[entitySet];
  if (!revalidate) {
    throw new Error(`Visitor visibility for ${entitySet} is not supported.`);
  }
  const bearer = await assertCuratorBearer();
  const params: Record<string, unknown> = { shown_to_visitors: shown };
  if (order !== undefined) {
    params.visitor_order = order;
  }
  await dispatchAction(entitySet, id, "SetVisitorVisibility", params, {
    bearer,
  });
  for (const path of revalidate(id)) {
    revalidatePath(path);
  }
  revalidatePath("/owner/visitor-shelf");
}

/** Owner-gated: append `id` to the END of its lane's visitor shelf. Reads the
 *  current on-shelf max `visitor_order` and pins this one at max+1 so a
 *  card-added item never lands at the front or ties an existing pick — the same
 *  collision-free placement the picker's Add does. Toggle-OFF stays a plain
 *  setVisitorVisibility(..., false) (no order). Only ever writes shown_to_visitors
 *  + visitor_order — never display_order, never SetFeatured. */
export async function addToVisitorShelf(
  entitySet: VisitorShelfEntitySet,
  id: string,
): Promise<void> {
  // assertCuratorBearer inside setVisitorVisibility gates the write; the read
  // below runs on the shared service key like every other listVisible* read.
  const onShelf = await VISITOR_SHELF_ON_SHELF[entitySet]();
  const nextOrder =
    onShelf.reduce((max, e) => Math.max(max, visitorOrderOf(e)), 0) + 1;
  await setVisitorVisibility(entitySet, id, true, nextOrder);
}

export async function addCuratorNotes(
  id: string,
  notes: string,
): Promise<void> {
  const bearer = await assertCuratorBearer();
  await dispatchAction("DesignLanguages", id, "AddCuratorNotes", {
    curator_notes: notes,
  }, { bearer });
  revalidatePath(`/language/${id}`);
}

export async function deleteTaxonomy(id: string): Promise<void> {
  const bearer = await assertCuratorBearer();
  await deleteEntity("Taxonomies", id, { bearer });
  revalidatePath("/taxonomy");
}

export async function queueTasteDistillation(): Promise<void> {
  const bearer = await assertCuratorBearer();
  // Carry the curator's token on the create too — CurationJob.create is
  // governed like the action (curation_job.cedar closes it to all but
  // owner/curator/pipeline), so the create must not run on the service key
  // while only the action carries the bearer.
  const job = await createEntity("CurationJobs", {}, { bearer });
  await dispatchAction("CurationJobs", job.entity_id, "ConfigureAndSubmit", {
    job_type: "taste_distillation",
    input: JSON.stringify({ limit: 100 }),
    completion_contract: "typed-v1",
    inline_job_docs: true,
  }, { bearer });
  revalidatePath("/owner");
}

export async function acceptTasteRule(id: string): Promise<void> {
  const bearer = await assertCuratorBearer();
  await dispatchAction("TasteRules", id, "Accept", {
    curator_notes: OWNER_TASTE_ACCEPT_NOTE,
  }, { bearer });
  revalidatePath("/owner");
}

export async function rejectTasteRule(id: string): Promise<void> {
  const bearer = await assertCuratorBearer();
  await dispatchAction("TasteRules", id, "Reject", {
    curator_notes: OWNER_TASTE_REJECT_NOTE,
  }, { bearer });
  revalidatePath("/owner");
}
