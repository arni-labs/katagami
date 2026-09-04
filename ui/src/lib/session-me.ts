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

/** Bumped on every invalidate. A consumer applying a fetch result compares
 *  the epoch it captured before awaiting: if an invalidate happened in
 *  between, the result is stale (possibly pre-revocation) and MUST NOT be
 *  applied — an out-of-order response could otherwise restore a revoked
 *  identity. */
let epoch = 0;

export function sessionMeEpoch(): number {
  return epoch;
}

// Consumers that render the session (header chip) subscribe so a resync
// triggered elsewhere (RumInit's visibility / soft-nav / revoke handlers)
// updates them too — otherwise RUM and the chip drift apart.
const listeners = new Set<(me: SessionMe) => void>();

export function subscribeSessionMe(cb: (me: SessionMe) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifySessionMe(me: SessionMe): void {
  for (const cb of listeners) {
    try {
      cb(me);
    } catch {
      /* a bad subscriber must not break the others */
    }
  }
}

/** Drop the memoized /api/auth/me so the next fetchSessionMe hits the
 *  network. Sign out everywhere leaves cookies in place; a cached signed-in
 *  promise would keep attributing RUM to the revoked account. */
export function invalidateSessionMe(): void {
  epoch += 1;
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
    const attempt: Promise<SessionMe> = fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: sessionMeAbortSignal(),
    })
      .then((r) => (r.ok ? (r.json() as Promise<Partial<SessionMe>>) : SIGNED_OUT))
      .then((d) => {
        const me: SessionMe = {
          user: d.user ?? null,
          owner: Boolean(d.owner),
          user_hash: typeof d.user_hash === "string" ? d.user_hash : null,
        };
        // Only broadcast a CURRENT answer: if an invalidate superseded this
        // fetch, its result may predate a revocation.
        if (inflight === attempt) notifySessionMe(me);
        return me;
      })
      .catch(() => {
        // A hung/aborted fetch is NOT a signed-out answer — do not pin this
        // document to SIGNED_OUT. Resolve signed-out for the callers waiting
        // now, but drop the memo so the next consumer (visibility resync,
        // soft nav) retries instead of inheriting the failure. Only clear
        // our own attempt — an invalidate may have already started a newer
        // fetch this failure must not discard.
        if (inflight === attempt) inflight = null;
        return SIGNED_OUT;
      });
    inflight = attempt;
  }
  return inflight;
}
