import { NextRequest, NextResponse } from "next/server";
import { googleAuthUrl } from "@/lib/google-oidc";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
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
  const res = NextResponse.redirect(googleAuthUrl(origin, state));
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  } as const;
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookie);
  if (next !== "/") res.cookies.set(OAUTH_NEXT_COOKIE, next, cookie);
  return res;
}
