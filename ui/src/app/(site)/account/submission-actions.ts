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
 *  the veto half of "agents act, humans own".
 *
 *  DELIBERATE SERVICE-KEY EXCEPTION (ARN-255): this is the one human-attributed
 *  write that does NOT carry the contributor's own token. ReturnToDraft is a
 *  curator-gated action in Cedar (design_language/palette_system/art_style
 *  .cedar list it among the owner|curator-only actions), so a contributor's own
 *  token would be DENIED — threading it here would break a creator withdrawing
 *  their OWN submission. Until a proper Cedar "creator may withdraw own
 *  submission" action exists (follow-up), authorization is enforced IN-APP: the
 *  dispatch runs on the operator key ONLY after the block below verifies the
 *  signed-in user's stable sub is exactly the submission's creator_sub and the
 *  row is still UnderReview. Do not add a bearer here, and do not invent a
 *  policy change to make one work. */
export async function withdrawSubmission(formData: FormData): Promise<void> {
  const user = await requireUser();
  const kind = formData.get("kind");
  const id = formData.get("id");
  const set = typeof kind === "string" ? SETS[kind] : undefined;
  if (!set || typeof id !== "string" || !id) return;

  // The row is attacker input until BOTH checks below pass: the submission is
  // still in review, and its creator_sub is exactly this session's stable
  // Google subject id. Only then does the operator-key dispatch fire.
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
  const creatorSub = String(row.fields?.creator_sub ?? "");
  // Never match an empty creator_sub to an empty session — both must be a real,
  // equal sub. requireUser() guarantees user.sub is non-empty, so a row missing
  // creator_sub cannot slip through here.
  if (!creatorSub || creatorSub !== user.sub) return;

  await dispatchAction(set, id, "ReturnToDraft", {
    curator_notes: "Withdrawn by the owner before review.",
  });
  revalidatePath("/account");
  revalidatePath("/under-review");
}
