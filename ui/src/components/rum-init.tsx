"use client";

import { useEffect } from "react";
import { clearRumUser, initRum, setRumUser } from "@/lib/analytics";
import { fetchSessionMe } from "@/lib/session-me";

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
 *  account. */
export function RumInit() {
  useEffect(() => {
    // Start the SDK import and the session fetch together, but initRum
    // awaits this identity (setRumUser / clearRumUser) before flushPending.
    // Flushing earlier would replay buffered events — language_view on a
    // signed-in hard reload — with no @usr.id.
    void (async () => {
      const rumReady = initRum();
      const me = await fetchSessionMe();
      if (me.user_hash) setRumUser(me.user_hash);
      else clearRumUser();
      await rumReady;
    })();
  }, []);
  return null;
}
