import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/google-oidc";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  safeInternalPath,
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
    return NextResponse.redirect(new URL("/signin?error=state", origin));
  }

  const user = await exchangeGoogleCode(origin, code, verifier, nonce);
  const token = user ? await signSession(user) : null;
  if (!token) {
    return NextResponse.redirect(new URL("/signin?error=google", origin));
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
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(OAUTH_VERIFIER_COOKIE);
  res.cookies.delete(OAUTH_NONCE_COOKIE);
  res.cookies.delete(OAUTH_NEXT_COOKIE);
  return res;
}
