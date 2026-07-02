import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Human sign-in sessions (Google identity), sibling of the curator-only owner
// mode in owner.ts. Stateless by design: the signed cookie IS the account —
// there is no user table. Google proves who you are once; the session carries
// {sub, email, name, picture} until it expires.

export const SESSION_COOKIE = "katagami_user";
export const OAUTH_STATE_COOKIE = "katagami_oauth_state";
export const OAUTH_NEXT_COOKIE = "katagami_oauth_next";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = {
  /** Google's stable subject id — survives email/name changes. */
  sub: string;
  email: string;
  name: string;
  picture: string;
};

function sessionSecret(): Uint8Array | null {
  const raw = process.env.KATAGAMI_AUTH_SECRET ?? "";
  // No dev fallback secret: unset means sign-in is off, never insecurely on.
  return raw ? new TextEncoder().encode(raw) : null;
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.KATAGAMI_AUTH_SECRET,
  );
}

export async function signSession(user: SessionUser): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  return new SignJWT({
    email: user.email,
    name: user.name,
    picture: user.picture,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySession(
  token?: string,
): Promise<SessionUser | null> {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const email = String(payload.email ?? "");
    if (!payload.sub || !email) return null;
    return {
      sub: payload.sub,
      email,
      name: String(payload.name ?? ""),
      picture: String(payload.picture ?? ""),
    };
  } catch {
    return null;
  }
}

/** The signed-in human, or null. */
export async function getUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Guard for server actions that create or mutate a human's own work. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new Error("Sign in with Google to do this.");
  return user;
}

// Post-sign-in redirect targets must stay on this site: a single leading
// slash (no scheme, no //host, no /\host). Anything else falls back to "/".
export function safeInternalPath(p?: string | null): string {
  return p && /^\/(?![/\\])/.test(p) ? p : "/";
}
