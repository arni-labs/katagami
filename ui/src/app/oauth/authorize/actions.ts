"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/user-auth";
import {
  clientById,
  createGrant,
  issueAuthCode,
  resolveResource,
} from "@/lib/oauth-as";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "katagami.ai";
  return `${proto}://${host}`;
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

/** Approving IS the activation: the grant this creates is what the human
 *  later sees (and can revoke) on the Agents & access page. */
export async function approveAuthorization(formData: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = str(formData.get("client_id"));
  const redirectUri = str(formData.get("redirect_uri"));
  const state = str(formData.get("state"));
  const codeChallenge = str(formData.get("code_challenge"));
  const resource = resolveResource(str(formData.get("resource")));

  // Re-validate against the registry — hidden form fields are attacker input.
  const client = await clientById(clientId);
  if (!client || !client.redirect_uris.includes(redirectUri) || !codeChallenge) {
    throw new Error("Authorization request is no longer valid.");
  }

  const grantId = await createGrant({
    memberSub: user.sub,
    memberEmail: user.email,
    clientId,
    clientName: client.client_name,
    grantKind: "consent",
  });

  const code = await issueAuthCode(await requestOrigin(), {
    sub: user.sub,
    email: user.email,
    name: user.name,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    grant_id: grantId,
    resource,
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  redirect(target.toString());
}

export async function denyAuthorization(formData: FormData): Promise<void> {
  const clientId = str(formData.get("client_id"));
  const redirectUri = str(formData.get("redirect_uri"));
  const state = str(formData.get("state"));

  const client = await clientById(clientId);
  if (!client || !client.redirect_uris.includes(redirectUri)) {
    redirect("/");
  }

  const target = new URL(redirectUri);
  target.searchParams.set("error", "access_denied");
  if (state) target.searchParams.set("state", state);
  redirect(target.toString());
}
