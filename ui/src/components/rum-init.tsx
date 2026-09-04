"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { clearRumUser, initRum, setRumUser } from "@/lib/analytics";
import {
  fetchSessionMe,
  invalidateSessionMe,
  sessionMeEpoch,
  SESSION_REVOKED_STORAGE_KEY,
} from "@/lib/session-me";

/** Initializes Datadog RUM once on the client. Renders nothing.
 *  No-op when NEXT_PUBLIC_DD_RUM_* env vars are absent, so it is safe to
 *  mount unconditionally (e.g. in local dev without credentials). The SDK
 *  then auto-tracks sessions + per-route views; custom actions come from the
 *  typed helpers in lib/analytics.
 *
 *  Also joins browsing to the account (ARN-451): the session endpoint hands
 *  back the peppered user_hash (never the sub), which becomes @usr.id on
 *  every RUM event. The session is applied before buffered events flush, so
 *  a signed-in hard reload's first language_view already carries @usr.id.
 *  Signed out — including the page load right after sign-out — clears the
 *  user, so a shared browser doesn't keep attributing views to the previous
 *  account.
 *
 *  Sign out everywhere does not remount this component and does not clear
 *  cookies. The memoized /api/auth/me would otherwise keep the old hash on
 *  this document until a full reload. dropRevokedRumUser / resyncRumUser
 *  run on revoke, visibility, and soft nav so later events do not. */

function dropRevokedRumUser(): void {
  invalidateSessionMe();
  clearRumUser();
}

/** Apply a session fetch to RUM — but only if no invalidate happened while
 *  it was in flight. An out-of-order pre-revocation response must never
 *  restore a revoked identity (epoch check). */
async function applySessionToRum(): Promise<void> {
  const before = sessionMeEpoch();
  const me = await fetchSessionMe();
  if (before !== sessionMeEpoch()) return; // superseded — a newer sync owns it
  if (me.user_hash) setRumUser(me.user_hash);
  else clearRumUser();
}

async function resyncRumUser(): Promise<void> {
  invalidateSessionMe();
  await applySessionToRum();
}

export function RumInit() {
  const pathname = usePathname();
  const skipPathnameResync = useRef(true);

  useEffect(() => {
    // Start the SDK import and the session fetch together, but initRum
    // awaits this identity (setRumUser / clearRumUser) before flushPending.
    // Flushing earlier would replay buffered events — language_view on a
    // signed-in hard reload — with no @usr.id.
    void (async () => {
      const rumReady = initRum();
      await applySessionToRum();
      await rumReady;
    })();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void resyncRumUser();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_REVOKED_STORAGE_KEY) return;
      dropRevokedRumUser();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (skipPathnameResync.current) {
      skipPathnameResync.current = false;
      return;
    }
    void resyncRumUser();
  }, [pathname]);

  return null;
}
