import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/google-oidc";
import { recordLoginActivity } from "@/lib/member-activity";
import { countMembers, upsertMember } from "@/lib/oauth-as";
import {
  emitServerEvent,
  hashPrincipal,
  runAfter,
  serverTelemetryEnabled,
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
    // Emit only for hits that look like a real handshake coming back.
    // Scanners GET this URL bare (no code, no error) constantly; emitting
    // for them would drown real failures in warn noise and pump ingest cost.
    if (req.nextUrl.searchParams.get("error")) {
      // Google redirected back with an explicit error (user denied consent,
      // policy block, …) — that is Google talking, not a broken handshake.
      trackServerEvent("auth_login_failed", { reason: "consent" }, "warn");
    } else if (code) {
      trackServerEvent("auth_login_failed", { reason: "state" }, "warn");
    }
    return NextResponse.redirect(new URL("/signin?error=state", origin));
  }

  // reason:"google" = the Google exchange itself failed; reason:"session" =
  // Google succeeded but WE could not mint the session (secret missing,
  // generation counter unreadable). Conflating them sent diagnosis at the
  // wrong dependency — a signSession outage would look like a Google outage.
  let user;
  try {
    user = await exchangeGoogleCode(origin, code, verifier, nonce);
  } catch (err) {
    console.error("Google exchange failed:", err);
    trackServerEvent("auth_login_failed", { reason: "google" }, "warn");
    return NextResponse.redirect(new URL("/signin?error=google", origin));
  }
  if (!user) {
    trackServerEvent("auth_login_failed", { reason: "google" }, "warn");
    return NextResponse.redirect(new URL("/signin?error=google", origin));
  }
  let token;
  try {
    token = await signSession(user);
  } catch (err) {
    console.error("Session signing failed after Google exchange:", err);
    token = null;
  }
  if (!token) {
    trackServerEvent("auth_login_failed", { reason: "session" }, "warn");
    return NextResponse.redirect(new URL("/signin?error=session", origin));
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
      // Durable per-user rollup (ARN-451) — deliberately BEFORE the Datadog
      // fail-closed gate: the Temper MemberActivityDay row is the layer that
      // outlives log retention, so it must not depend on DD_API_KEY.
      await recordLoginActivity(userHash);
      // Fail-closed intake → do not hit Temper $count for a no-op emit.
      if (!serverTelemetryEnabled()) return;
      // auth_login FIRST. countMembers must never sit between a successful
      // sign-in and its own event: with Temper hung, this post-response task dies
      // at the function duration limit and the login (plus registration:true)
      // silently under-counts exactly during incidents.
      await emitServerEvent("auth_login", {
        ...(upsertOk ? { registration } : {}),
        upsert_ok: upsertOk,
        user_hash: userHash,
      });
      // A fresh members_total rides on its own best-effort snapshot event
      // (same @evt the daily cron emits, tagged source:login). countMembers
      // self-bounds at COUNT_MEMBERS_TIMEOUT_MS, so the worst case is a
      // skipped intraday datapoint — the daily cron remains the steady feed.
      try {
        const membersTotal = await countMembers();
        await emitServerEvent("members_snapshot", {
          members_total: membersTotal,
          source: "login",
        });
      } catch (err) {
        console.error("[telemetry] members_snapshot after login skipped:", err);
      }
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
