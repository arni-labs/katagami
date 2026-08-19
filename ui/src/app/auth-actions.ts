"use server";

import { redirect } from "next/navigation";

// Older callers. Real sign-out is POST /api/auth/signout — it can emit
// multiple Set-Cookie lines; cookies().set cannot.
export async function signOut(): Promise<void> {
  redirect("/");
}
