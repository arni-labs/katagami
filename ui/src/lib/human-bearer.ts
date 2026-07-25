import "server-only";
import { headers } from "next/headers";
import { getUser } from "@/lib/user-auth";
import { issueHumanToken } from "@/lib/oauth-as";

// Human-write routing (RFC-0002, ARN-255): a signed-in human's per-user
// mutations can carry a short-lived Customer token minted from their session,
// so the kernel verifies their identity + role and Cedar enforces the
// per-user boundaries in katagami-commons/policies/. Off by default —
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

/** Mint a short-lived Customer bearer for the signed-in human.
 *
 *  Returns null only when this routing is genuinely not in play: the flag is
 *  off, or nobody is signed in. Callers then use the shared service key, which
 *  is the pre-existing behaviour.
 *
 *  It deliberately does NOT swallow mint failures. Falling back to the shared
 *  key would run the write with SERVICE authority instead of the caller's own,
 *  quietly skipping the kernel's ownership and role checks — a failure that
 *  grants more access than intended. When human routing is on and a human is
 *  signed in, a mint failure fails the write instead.
 */
export async function humanBearer(): Promise<string | null> {
  if (!humanTokensEnabled()) return null;

  const user = await getUser();
  if (!user) return null;

  const origin = await requestOrigin();
  if (!origin) {
    throw new Error(
      "Cannot establish the request origin to mint a user token. Set KATAGAMI_ISSUER_ORIGIN.",
    );
  }

  try {
    const { token } = await issueHumanToken(origin, {
      sub: user.sub,
      email: user.email,
      name: user.name ?? "",
    });
    return token;
  } catch (err) {
    console.error("[auth] failed to mint a user token", err);
    throw new Error("Could not verify your identity for this action. Try again.");
  }
}
