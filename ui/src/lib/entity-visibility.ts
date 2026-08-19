import "server-only";
import { NextResponse } from "next/server";
import { isOwner } from "@/lib/owner";
import { getUser, isAuthConfigured } from "@/lib/user-auth";

// ARN-331: by-id readers must not serve non-Published entities to the public.
// Route handlers that export derived artifacts (DESIGN.md, shadcn.*, BRIEF.md)
// call artifactGate() before rendering: Published stays CDN-cacheable, the
// owner can still fetch a draft (never CDN-cached), everyone else gets 404.

const PUBLIC_CACHE = "public, max-age=60, s-maxage=300";
const OWNER_CACHE = "private, no-store";

export type ArtifactGate =
  | { allowed: true; cacheControl: string }
  | { allowed: false; response: NextResponse };

export async function artifactGate(
  status: string | undefined,
): Promise<ArtifactGate> {
  if (status === "Published") {
    return { allowed: true, cacheControl: PUBLIC_CACHE };
  }
  if (await isOwner()) {
    // Owner preview of a draft: the isOwner() cookie read makes the request
    // dynamic, and the response must never land in a shared cache.
    return { allowed: true, cacheControl: OWNER_CACHE };
  }
  return {
    allowed: false,
    response: new NextResponse("not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  };
}

/** Page-level variant: may this viewer see a non-Published entity at all? */
export async function canViewNonPublished(): Promise<boolean> {
  return isOwner();
}

/**
 * ARN-385: does this viewer get the full language gallery (vs the signed-out
 * owner-picked featured shelf)? Anyone signed in does. When sign-in isn't
 * configured (local dev, self-hosters without Google OAuth) the gallery stays
 * fully open — a teaser whose "Sign in" door doesn't exist would lock the
 * catalog for everyone.
 */
export async function hasFullGalleryAccess(): Promise<boolean> {
  if (!isAuthConfigured()) return true;
  return (await getUser()) !== null;
}
