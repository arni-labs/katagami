"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { expireSessionCookies } from "@/lib/user-auth";

// Sign-out is a POST (server action), never a GET route: links and
// prefetchers must not be able to end a session.
export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const host = (await headers()).get("host") ?? "";
  const proto = (await headers()).get("x-forwarded-proto") ?? "https";
  expireSessionCookies(cookieStore, host, proto === "https");
  redirect("/");
}
