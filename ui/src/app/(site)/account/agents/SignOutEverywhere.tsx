"use client";

import { clearRumUser } from "@/lib/analytics";
import { notifySessionRevoked } from "@/lib/session-me";
import { signOutEverywhere } from "./actions";

/** Sign out everywhere is a server action: bumpGeneration + revoke grants.
 *  It does not clear cookies by itself — and the kernel generation is cached
 *  per serverless instance for 30s, so a still-valid cookie could be
 *  re-validated by ANOTHER instance and re-attach the revoked identity
 *  (Fable panel finding). So this tab also signs out the BROWSER: POST
 *  /api/auth/signout (Clear-Site-Data drops the cookie for every tab) and
 *  full-navigate home. With no cookie left, no cache staleness anywhere can
 *  resurrect the session. Other tabs hear SESSION_REVOKED_STORAGE_KEY and
 *  clear RUM immediately; their next fetch is cookieless. */
export function SignOutEverywhere() {
  async function action() {
    // finally: bumpGeneration lands FIRST inside the server action, so even a
    // partial failure (a later grant revoke throwing) means the session is
    // already dead — this tab and the others must still drop the identity.
    try {
      await signOutEverywhere();
    } finally {
      notifySessionRevoked();
      clearRumUser();
      try {
        await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });
      } catch {
        /* the generation bump already killed the session server-side */
      }
      window.location.assign("/");
    }
  }

  return (
    <form action={action}>
      <button
        type="submit"
        className="bg-black text-white text-[15px] font-medium px-5 py-2.5 hover:bg-neutral-800 transition-colors"
      >
        Sign out everywhere
      </button>
    </form>
  );
}
