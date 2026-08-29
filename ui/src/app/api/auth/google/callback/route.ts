import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/google-oidc";
import { countMembers, upsertMember } from "@/lib/oauth-as";
import {
  emitServerEvent,
  hashPrincipal,
  runAfter,
  trackServerEvent,
} from "@/lib/server-telemetry";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  safeInternalPath,
  sessionCookieDomain,
  signSession,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = req.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
  const nonce = req.cookies.get(OAUTH_NONCE_COOKIE)?.value;

  if (
    !code ||
    !state ||
    !cookieState ||
    state !== cookieState ||
    !verifier ||
    !nonce
  ) {
    trackServerEvent("auth_login_failed", { reason: "state" }, "warn");
    return NextResponse.redirect(new URL("/signin?error=state", origin));
  }

  let user;
  let token;
  try {
    user = await exchangeGoogleCode(origin, code, verifier, nonce);
    token = user ? await signSession(user) : null;
  } catch (err) {
    // fetch / JWKS / signSession throws used to skip auth_login_failed.
    console.error("Google exchange failed:", err);
    trackServerEvent("auth_login_failed", { reason: "google" }, "warn");
    return NextResponse.redirect(new URL("/signin?error=google", origin));
  }
  if (!token) {
    trackServerEvent("auth_login_failed", { reason: "google" }, "warn");
    return NextResponse.redirect(new URL("/signin?error=google", origin));
  }

  // Durable account behind the stateless session (ARN-151): grants, roles,
  // and submissions anchor on the Member. Best-effort — a backend hiccup
  // must never block the sign-in itself.
  let registration: boolean | undefined;
  let upsertOk = true;
  try {
    if (user) registration = (await upsertMember(user)).created;
  } catch (err) {
    upsertOk = false;
    console.error("Member upsert failed at sign-in:", err);
  }

  // Datadog auth events (ARN-436): every successful sign-in is a login; the
  // first sign-in of a sub is additionally a registration. Emitted after the
  // response with a hashed principal — no sub/email ever reaches Datadog.
  // members_total rides along so "total registered users" always has a fresh
  // datapoint (best-effort; the daily /api/telemetry/members snapshot is the
  // steady feed).
  //
  // If upsert threw, omit `registration` — a first-time login that failed
  // to land must not look like a returning user (registration:false).
  if (user) {
    const sub = user.sub;
    // Guarded like trackServerEvent: a throw from Next after must not skip
    // the katagami_user cookie after a successful Google exchange.
    runAfter(async () => {
      let userHash: string | undefined;
      try {
        const hashed = await hashPrincipal(sub);
        if (typeof hashed === "string") userHash = hashed;
      } catch (err) {
        console.error("[telemetry] hashPrincipal failed", err);
      }
      let membersTotal: number | undefined;
      try {
        membersTotal = await countMembers();
      } catch {
        membersTotal = undefined;
      }
      await emitServerEvent("auth_login", {
        ...(upsertOk ? { registration } : {}),
        upsert_ok: upsertOk,
        user_hash: userHash,
        members_total: membersTotal,
      });
    });
  }

  const next = safeInternalPath(req.cookies.get(OAUTH_NEXT_COOKIE)?.value);
  const res = NextResponse.redirect(new URL(next, origin));
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Transport-keyed like the handshake cookies in start/route.ts.
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    domain: sessionCookieDomain(req.nextUrl.hostname),
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(OAUTH_VERIFIER_COOKIE);
  res.cookies.delete(OAUTH_NONCE_COOKIE);
  res.cookies.delete(OAUTH_NEXT_COOKIE);
  return res;
}
