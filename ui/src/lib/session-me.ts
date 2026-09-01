"use client";

// One shared /api/auth/me fetch per full page load (ARN-451). Two consumers
// need the session: the header identity chip (UserMenu) and the RUM user
// join (RumInit, which mounts in the root layout — including pages without
// the site header). Memoizing the promise keeps that at one request; the
// module resets on a full navigation, and sign-out is a full navigation, so
// staleness cannot outlive the page.

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

let inflight: Promise<SessionMe> | null = null;

export function fetchSessionMe(): Promise<SessionMe> {
  if (!inflight) {
    inflight = fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
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
