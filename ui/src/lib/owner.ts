import "server-only";

import { cache } from "react";
import { getUser } from "@/lib/user-auth";
import { roleForSub } from "@/lib/oauth-as";
import { humanBearer } from "@/lib/human-bearer";

// Owner mode is identity, single-sourced on the durable Member.role — the
// exact field the authorization server stamps into the `role` claim and Cedar
// enforces on. A signed-in account whose Member.role is "owner" gets the
// curator controls; there is no separate JS allowlist to drift from Cedar.
//
// Memoized per request with React's cache(): isOwner() is called from many
// places in one render (the gallery, language/art-style detail pages, file
// and revalidate routes), and this collapses them to a single Member lookup.

export const isOwner = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;
  try {
    return (await roleForSub(user.sub)) === "owner";
  } catch (err) {
    // The Member lookup is a kernel query now, not a local env read. A backend
    // hiccup must fail CLOSED for authorization (deny the owner controls) while
    // keeping the public gallery renderable — never crash the page or, worse,
    // read an unresolvable role as owner.
    console.error("[owner] Member role lookup failed; denying owner access", err);
    return false;
  }
});

export async function assertOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Owner access requires an owner-role signed-in account.");
  }
}

/** Curator access: the signed-in account's Member.role is owner OR curator —
 *  the exact set Cedar grants the curator/review actions to
 *  (katagami-commons/policies/*.cedar, katagami-curation/policies/*.cedar list
 *  `["owner", "curator"].contains(principal.role)`). Owner is a strict superset
 *  of curator, so every owner passes. Memoized per request like isOwner(), and
 *  fails CLOSED on a backend hiccup so an unresolvable role never reads as
 *  curator. */
export const hasCuratorAccess = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;
  try {
    const role = await roleForSub(user.sub);
    return role === "owner" || role === "curator";
  } catch (err) {
    console.error("[owner] Member role lookup failed; denying curator access", err);
    return false;
  }
});

export async function assertCurator(): Promise<void> {
  if (!(await hasCuratorAccess())) {
    throw new Error(
      "Curator access requires an owner- or curator-role signed-in account.",
    );
  }
}

/** Assert owner access AND carry the acting human to the kernel (ARN-255).
 *
 *  Every curator action reaches the backend carrying the acting human's own
 *  Customer token, so the kernel resolves the human, reads their role from the
 *  token, and enforces the curator boundary itself — this process's isOwner()
 *  check is defence in depth, not the only thing standing there.
 *
 *  Fails CLOSED: assertOwner() confirms a signed-in owner, then humanBearer()
 *  mints their token — a signed-in write must never coalesce a failed mint to
 *  the shared service key (that would run the write with SERVICE authority and
 *  skip the kernel's ownership/role checks). Returns a real bearer or throws. */
export async function assertOwnerBearer(): Promise<string> {
  await assertOwner();
  const bearer = await humanBearer();
  if (!bearer) {
    throw new Error("Could not obtain the owner's bearer for this action.");
  }
  return bearer;
}

/** Assert curator (owner|curator) access AND carry the acting human's token to
 *  the kernel. Same fail-closed contract as assertOwnerBearer — used on the
 *  curation/review surfaces Cedar grants to both owner and curator. */
export async function assertCuratorBearer(): Promise<string> {
  await assertCurator();
  const bearer = await humanBearer();
  if (!bearer) {
    throw new Error("Could not obtain the curator's bearer for this action.");
  }
  return bearer;
}
