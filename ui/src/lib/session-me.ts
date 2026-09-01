"use client";

// One shared /api/auth/me fetch until it is invalidated (ARN-451). Two
// consumers need the session: the header identity chip (UserMenu) and the
// RUM user join (RumInit, which mounts in the root layout — including
// pages without the site header). Memoizing the promise keeps that at one
// request. A full navigation resets the module; Sign out everywhere does
// not — it bumps generation and revokes grants without clearing cookies
// or remounting RumInit — so inflight MUST be dropped on revoke /
// visibility / soft nav. Otherwise later RUM events keep the old @usr.id.
//
// The fetch aborts at SESSION_ME_TIMEOUT_MS (the 5s telemetry bound). A
// hung /api/auth/me must resolve as signed-out — never stall RUM init.

import { sessionMeAbortSignal } from "./session-me-core.mjs";

export type SessionMeUser = { name: string; email: string; picture: string };

export type SessionMe = {
  user: SessionMeUser | null;
  owner: boolean;
  /** Peppered telemetry hash of the signed-in account's Google sub — the same
   *  value server events carry as @user_hash. Null when signed out or when
   *  the pepper is unset. Never the raw sub. */
  user_hash: string | null;
};

const SIGNED_OUT: SessionMe = { user: null, owner: false, user_hash: null };

/** localStorage key other tabs hear after Sign out everywhere. The `storage`
 *  event does not fire in the tab that wrote it. */
export const SESSION_REVOKED_STORAGE_KEY = "katagami-session-revoked";

let inflight: Promise<SessionMe> | null = null;

/** Drop the memoized /api/auth/me so the next fetchSessionMe hits the
 *  network. Sign out everywhere leaves cookies in place; a cached signed-in
 *  promise would keep attributing RUM to the revoked account. */
export function invalidateSessionMe(): void {
  inflight = null;
}

/** Invalidate this tab's memo and tell other tabs the session was revoked. */
export function notifySessionRevoked(): void {
  invalidateSessionMe();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_REVOKED_STORAGE_KEY, String(Date.now()));
  } catch {
    /* private mode / storage blocked — visibility / soft nav still resync */
  }
}

export function fetchSessionMe(): Promise<SessionMe> {
  if (!inflight) {
    inflight = fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: sessionMeAbortSignal(),
    })
      .then((r) => (r.ok ? (r.json() as Promise<Partial<SessionMe>>) : SIGNED_OUT))
      .then((d) => ({
        user: d.user ?? null,
        owner: Boolean(d.owner),
        user_hash: typeof d.user_hash === "string" ? d.user_hash : null,
      }))
      .catch(() => SIGNED_OUT);
  }
  return inflight;
}
