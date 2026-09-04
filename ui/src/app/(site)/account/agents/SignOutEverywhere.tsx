"use client";

import { clearRumUser } from "@/lib/analytics";
import { notifySessionRevoked } from "@/lib/session-me";
import { signOutEverywhere } from "./actions";

/** Sign out everywhere is a server action: bumpGeneration + revoke grants.
 *  It does not clear cookies and does not remount root RumInit. After it
 *  returns, this tab must drop the memoized /api/auth/me and the RUM user
 *  so later events on this document are not attributed to the revoked
 *  account. Other tabs hear SESSION_REVOKED_STORAGE_KEY. */
export function SignOutEverywhere() {
  async function action() {
    await signOutEverywhere();
    notifySessionRevoked();
    clearRumUser();
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
