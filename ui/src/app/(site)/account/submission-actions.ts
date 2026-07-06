"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/user-auth";
import { dispatchAction } from "@/lib/odata-mutations";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

const SETS: Record<string, string> = {
  language: "DesignLanguages",
  palette: "PaletteSystems",
  art_style: "ArtStyles",
};

/** The owning human pulls a submission back before a curator sees it —
 *  the veto half of "agents act, humans own". */
export async function withdrawSubmission(formData: FormData): Promise<void> {
  const user = await requireUser();
  const kind = formData.get("kind");
  const id = formData.get("id");
  const set = typeof kind === "string" ? SETS[kind] : undefined;
  if (!set || typeof id !== "string" || !id) return;

  // The row is attacker input until the creator matches the session.
  const res = await fetch(`${API_BASE}/tdata/${set}('${encodeURIComponent(id)}')`, {
    headers: {
      "X-Tenant-Id": TENANT,
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) return;
  const row = (await res.json()) as {
    status?: string;
    fields?: Record<string, unknown>;
  };
  if (row.status !== "UnderReview") return;
  if (String(row.fields?.creator_sub ?? "") !== user.sub) return;

  await dispatchAction(set, id, "ReturnToDraft", {
    curator_notes: "Withdrawn by the owner before review.",
  });
  revalidatePath("/account");
  revalidatePath("/under-review");
}
