import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { currentGeneration } from "@/lib/oauth-as";

// Human sign-in sessions (Google identity), sibling of the curator-only owner
// mode in owner.ts. Stateless by design: the signed cookie IS the account —
// there is no user table. Google proves who you are once; the session carries
// {sub, email, name, picture} until it expires.

export const SESSION_COOKIE = "katagami_user";
export const OAUTH_STATE_COOKIE = "katagami_oauth_state";
export const OAUTH_NEXT_COOKIE = "katagami_oauth_next";
export const OAUTH_VERIFIER_COOKIE = "katagami_oauth_verifier";
export const OAUTH_NONCE_COOKIE = "katagami_oauth_nonce";
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

// Sign-out-everywhere (ARN-255): the session carries the human's kernel
// generation at mint time, and every verification compares it against the
// current value. Bumping the generation therefore ends existing sessions on
// every device, not only outstanding API tokens. Reads are cached briefly, so
// this costs one kernel read per human per window rather than one per request.
const GEN_CACHE_MS = 30_000;
const genCache = new Map<string, { gen: number; at: number }>();

async function currentGenerationCached(sub: string): Promise<number | null> {
  const hit = genCache.get(sub);
  if (hit && Date.now() - hit.at < GEN_CACHE_MS) return hit.gen;
  try {
    const gen = await currentGeneration(sub);
    genCache.set(sub, { gen, at: Date.now() });
    return gen;
  } catch (err) {
    // A failed read must not read as "never revoked". Prefer the last known
    // value; with none, refuse the session rather than accept a possibly
    // revoked one — the kernel is unreachable, so the request cannot be served
    // meaningfully anyway.
    console.error("[auth] generation read failed", err);
    return hit?.gen ?? null;
  }
}

/** Drop a human's cached generation so a bump takes effect immediately in this
 *  process, instead of trailing the cache window. */
export function forgetCachedGeneration(sub: string): void {
  genCache.delete(sub);
}

export async function signSession(user: SessionUser): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  // A fresh sign-in must not mint below the current generation, so an
  // unreadable counter fails the sign-in rather than issuing a stale session.
  const gen = await currentGenerationCached(user.sub);
  if (gen === null) return null;
  return new SignJWT({
    email: user.email,
    name: user.name,
    picture: user.picture,
    gen,
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

    // Sign-out-everywhere: a session minted before the human's current
    // generation is dead. Sessions predating this claim count as generation 0,
    // so a single bump ends them too.
    const sessionGen = typeof payload.gen === "number" ? payload.gen : 0;
    const currentGen = await currentGenerationCached(payload.sub);
    if (currentGen === null || sessionGen < currentGen) return null;

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

// Post-sign-in redirect targets must stay on this site. Control characters
// are rejected outright — the WHATWG URL parser strips tab/CR/LF, so
// "/\t/evil.com" would sail past a prefix check and resolve off-site — and
// the survivor is validated by actually resolving it against a fixed origin.
export function safeInternalPath(p?: string | null): string {
  if (!p || /[\u0000-\u001f\\]/.test(p) || !/^\/(?!\/)/.test(p)) return "/";
  try {
    const url = new URL(p, "https://katagami.invalid");
    if (url.origin !== "https://katagami.invalid") return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
