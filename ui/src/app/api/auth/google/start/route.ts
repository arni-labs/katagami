import { NextRequest, NextResponse } from "next/server";
import { beginGoogleAuth } from "@/lib/google-oidc";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  isAuthConfigured,
  safeInternalPath,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!isAuthConfigured()) {
    // Fail loudly at our door instead of bouncing off Google's error page.
    return NextResponse.redirect(new URL("/signin?error=config", origin));
  }
  const state = crypto.randomUUID();
  const next = safeInternalPath(req.nextUrl.searchParams.get("next"));
  const handshake = await beginGoogleAuth(origin, state);
  const res = NextResponse.redirect(handshake.url);
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  } as const;
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookie);
  res.cookies.set(OAUTH_VERIFIER_COOKIE, handshake.verifier, cookie);
  res.cookies.set(OAUTH_NONCE_COOKIE, handshake.nonce, cookie);
  if (next !== "/") {
    res.cookies.set(OAUTH_NEXT_COOKIE, next, cookie);
  } else {
    // Clear any leftover target from an abandoned attempt so it can't
    // redirect this fresh sign-in.
    res.cookies.delete(OAUTH_NEXT_COOKIE);
  }
  return res;
}
