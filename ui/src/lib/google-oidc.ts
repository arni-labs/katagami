import "server-only";

// Minimal Google OIDC (same in-house flow as the Aya UI): build the consent
// URL, exchange the code server-side, verify the returned ID token against
// Google's JWKS. No provider framework — this is the whole dance.
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { SessionUser } from "@/lib/user-auth";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

function redirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function googleAuthUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH}?${p.toString()}`;
}

export async function exchangeGoogleCode(
  origin: string,
  code: string,
): Promise<SessionUser | null> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const tok = (await res.json()) as { id_token?: string };
  if (!tok.id_token) return null;
  try {
    const { payload } = await jwtVerify(tok.id_token, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const sub = String(payload.sub ?? "");
    const email = String(payload.email ?? "");
    if (!sub || !email || payload.email_verified === false) return null;
    return {
      sub,
      email,
      name: String(payload.name ?? email.split("@")[0]),
      picture: String(payload.picture ?? ""),
    };
  } catch {
    return null;
  }
}
