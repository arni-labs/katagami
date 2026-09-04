import { NextResponse } from "next/server";
import { getUser } from "@/lib/user-auth";
import { isOwner } from "@/lib/owner";
import { hashPrincipal } from "@/lib/server-telemetry-core.mjs";

// The header identity chip reads the session from here, client-side, so the
// shared (site) layout never touches cookies() — keeping /language/[id],
// /taxonomy, and friends in the full-route cache.
//
// `user_hash` (ARN-451) is the peppered telemetry hash of the caller's OWN
// Google sub — the same value the server stamps on auth_login/mcp_tool_call
// events — handed to the browser so RUM can join browsing to the account
// (datadogRum.setUser). The raw sub never leaves the server; the hash is a
// truncated HMAC that identifies nothing outside our own analytics. Null when
// signed out or when KATAGAMI_TELEMETRY_PEPPER is unset.
export const dynamic = "force-dynamic";

/** The owner flag rides a Temper Member-role read. Slow Temper must cost the
 *  chip the owner shortcut, never the whole signed-in identity: past this
 *  bound the route answers owner:false and still returns user + user_hash
 *  (otherwise the shared client fetch aborts at its own 5s and the header
 *  shows "sign in" to a signed-in visitor for the rest of the document). */
const OWNER_LOOKUP_TIMEOUT_MS = 3_000;

function ownerWithTimeout(): Promise<boolean> {
  return Promise.race([
    isOwner().catch(() => false),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), OWNER_LOOKUP_TIMEOUT_MS),
    ),
  ]);
}

export async function GET() {
  const user = await getUser();
  const owner = await ownerWithTimeout();
  let userHash: string | null = null;
  if (user) {
    try {
      userHash = (await hashPrincipal(user.sub)) ?? null;
    } catch (err) {
      console.error("[telemetry] hashPrincipal failed in /api/auth/me", err);
    }
  }
  return NextResponse.json(
    {
      user: user
        ? { name: user.name, email: user.email, picture: user.picture }
        : null,
      owner,
      user_hash: userHash,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
