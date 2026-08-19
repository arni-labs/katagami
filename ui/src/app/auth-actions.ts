"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionCookieDomain } from "@/lib/user-auth";

// Sign-out is a POST (server action), never a GET route: links and
// prefetchers must not be able to end a session.
export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const host = (await headers()).get("host") ?? "";
  const domain = sessionCookieDomain(host.split(":")[0] ?? "");
  cookieStore.delete(SESSION_COOKIE);
  if (domain) {
    cookieStore.delete({ name: SESSION_COOKIE, path: "/", domain });
  }
  redirect("/");
}
