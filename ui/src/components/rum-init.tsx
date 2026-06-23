"use client";

import { useEffect } from "react";
import { initRum } from "@/lib/analytics";

/** Initializes Datadog RUM once on the client. Renders nothing.
 *  No-op when NEXT_PUBLIC_DD_RUM_* env vars are absent, so it is safe to
 *  mount unconditionally (e.g. in local dev without credentials). The SDK
 *  then auto-tracks sessions + per-route views; custom actions come from the
 *  typed helpers in lib/analytics. */
export function RumInit() {
  useEffect(() => {
    void initRum();
  }, []);
  return null;
}
