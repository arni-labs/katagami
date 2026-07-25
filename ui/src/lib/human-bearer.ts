import "server-only";
import { headers } from "next/headers";
import { getUser } from "@/lib/user-auth";
import { issueHumanToken } from "@/lib/oauth-as";

// Human-write routing (RFC-0002, ARN-255): a signed-in human's per-user
// mutations can carry a short-lived Customer token minted from their session,
// so the kernel verifies their identity + role and enforces per-user Cedar
// (the generated requires_role / requires="creator" overlays). Off by default —
// flip on only after the kernel that verifies these tokens is deployed; until
// then per-user writes stay on the shared service key (current behavior).
//
// This deliberately does NOT touch public catalog reads: those are cached by
// path and legitimately service-level (a per-user Authorization header would
// opt every read out of Next's Data Cache and mix users' data).

export function humanTokensEnabled(): boolean {
  return (process.env.KATAGAMI_HUMAN_TOKENS ?? "") === "1";
}

/** The request's own origin, used as the token issuer — must match the issuer
 *  registered with the kernel as a TrustedIssuer. Override with
 *  KATAGAMI_ISSUER_ORIGIN when the public origin differs from the request host. */
async function requestOrigin(): Promise<string> {
  const override = process.env.KATAGAMI_ISSUER_ORIGIN;
  if (override) return override;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

/** Mint a short-lived Customer bearer for the signed-in human, or null when
 *  the flag is off or nobody is signed in (callers then fall back to the
 *  shared service key). Never throws to the mutation path. */
export async function humanBearer(): Promise<string | null> {
  if (!humanTokensEnabled()) return null;
  try {
    const user = await getUser();
    if (!user) return null;
    const origin = await requestOrigin();
    if (!origin) return null;
    const { token } = await issueHumanToken(origin, {
      sub: user.sub,
      email: user.email,
      name: user.name ?? "",
    });
    return token;
  } catch {
    return null;
  }
}
