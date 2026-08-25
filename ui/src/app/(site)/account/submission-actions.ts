"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/user-auth";
import { dispatchAction } from "@/lib/odata-mutations";
import { humanBearer } from "@/lib/human-bearer";

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
 *  Cedar authorizes this on the contributor's OWN token: ReturnToDraft permits
 *  the creator (resource.creator_sub == principal.id) in addition to curators
 *  (design_language/palette_system/art_style.cedar). So this carries the
 *  contributor's bearer and the KERNEL is the authorization gate — a non-creator
 *  is denied by Cedar. The in-app creator/status check below stays as a fast UX
 *  guard (skip a guaranteed 403, and only offer withdrawal on UnderReview rows);
 *  it is defence in depth, not the sole gate. */
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

  // Fail closed: a signed-in write mints the contributor's token or aborts —
  // never falls back to the service key.
  const bearer = await humanBearer();
  if (!bearer) throw new Error("Could not verify your identity to withdraw.");
  await dispatchAction(
    set,
    id,
    "ReturnToDraft",
    { curator_notes: "Withdrawn by the owner before review." },
    { bearer },
  );
  revalidatePath("/account");
  revalidatePath("/under-review");
}
